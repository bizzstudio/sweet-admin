import dayjs from "dayjs";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

// Internal import
import { SidebarContext } from "@/context/SidebarContext";
import CustomerServices from "@/services/CustomerServices";
import { notifyError, notifySuccess } from "@/utils/toast";

// מיפוי בין שמות השדות בטופס לשמות השדות ב-erp. מוחזק במקום אחד כדי שהמילוי
// של הטופס ובניית גוף הבקשה לא ייצאו מסנכרון (אותו דפוס כמו במוצר).
// הערכים הגולמיים מהקובץ (rawEmail, rawAddress, rawCity) ו-syncedAt אינם
// נערכים בכוונה: הם התיעוד של מה שהגיע ביבוא
const ERP_FORM_FIELDS = {
  erpCustomerNumber: { key: "customerNumber" },
  erpIdNumber: { key: "idNumber" },
  erpCustomerType: { key: "customerType" },
  erpContactPerson: { key: "contactPerson" },
  erpLandline: { key: "landline" },
  erpAgent: { key: "agent" },
  erpPoints: { key: "points", numeric: true },
  erpDiscountPercent: { key: "discountPercent", numeric: true },
  // ⛔ "קנייה מצטברת" (cumulativePurchase) הוסרה מהמיפוי יחד עם האריח
  // שהציג אותה (31/08/26). המפה הזו חייבת להכיל *רק* שדות שהטופס מרנדר:
  // שדה מספרי שנשאר כאן בלי קלט נשלח כ-null ומוחק במסד ערך שהיבוא הביא.
  // להחזרה: להחזיר את השורה כאן ואת האריח ב-CustomerErpPanel.
  erpCredit: { key: "credit", numeric: true },
  erpOpeningBalance: { key: "openingBalance", numeric: true },
  erpPriceLevel: { key: "priceLevel", numeric: true },
  erpPaymentTerms: { key: "paymentTerms", numeric: true },
  erpBirthDate: { key: "birthDate", date: true },
  erpOpenDate: { key: "openDate", date: true },
  erpLastPurchaseAt: { key: "lastPurchaseAt", date: true },
  erpNotes: { key: "notes" },
};

// שדה תאריך ב-HTML עובד רק בפורמט הזה; ערך ריק משאיר את השדה ריק
const toDateInput = (value) =>
  value && dayjs(value).isValid() ? dayjs(value).format("YYYY-MM-DD") : "";

// מחרוזת ריקה בשדה מספרי או בשדה תאריך חייבת להישלח כ-null: השרת אינו יכול
// להמיר "" ל-Number/Date, ובלי ההמרה כל שמירה עם שדה ריק הייתה נכשלת
const toNumberOrNull = (value) =>
  value === "" || value === null || value === undefined ? null : Number(value);

// הערך שנשלח לשרת עבור שדה erp אחד, לפי סוג השדה
const erpValueToSend = (field, value) => {
  if (field.numeric) return toNumberOrNull(value);
  if (field.date) return value || null;
  return value ?? "";
};

// options מאפשר לטופס לרוץ בתוך העמוד עצמו ולא במגירה:
//   inline      - העריכה מתרחשת בעמוד; המגירה לא מעורבת בכלל
//   isOpen      - האם מצב העריכה פעיל (במקום isDrawerOpen)
//   onDone      - מה לעשות אחרי שמירה מוצלחת (במקום closeDrawer)
//   initialData - הלקוח שכבר נטען בעמוד, כדי למלא את הטופס בלי בקשה נוספת
const useCustomerSubmit = (id, options = {}) => {
  const {
    inline = false,
    isOpen: inlineIsOpen = false,
    onDone,
    initialData = null,
  } = options;

  const [imageUrl, setImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // דלוק בזמן שהערכים נטענים מהשרת לתוך הטופס. בעריכה בעמוד השדות כבר
  // מוצגים, ובלי הסימון הזה אפשר היה ללחוץ שמירה לפני שהערכים הגיעו
  const [isFormLoading, setIsFormLoading] = useState(false);
  // הלקוח המלא כפי שנטען מהשרת. משמש כדי להציג בטופס גם את נתוני
  // ההנהח"ש (erp), ובעיקר כדי לא לאבד שדות שהטופס לא עורך - עדכון
  // הלקוח בשרת מחליף את אובייקט הכתובת כולו
  const [customer, setCustomer] = useState(null);

  // שדות שאינם שדות טקסט של הטופס: העיר היא רשומה שלמה, והדגלים בוליאניים
  const [city, setCity] = useState(null);
  const [isCashier, setIsCashier] = useState(false);
  const [inBlackList, setInBlackList] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [shippingRewardIssued, setShippingRewardIssued] = useState(false);
  const [welcomeGiftUsed, setWelcomeGiftUsed] = useState(false);
  const [erpActive, setErpActive] = useState(true);

  // המזהה שהטופס כבר מולא עבורו בכניסה הנוכחית למצב עריכה. נתוני העמוד
  // נטענים מחדש בכל שינוי בקונטקסט (למשל אחרי פעולה אחרת במסך), ובלי
  // הסימון הזה כל רענון כזה היה דורס באמצע העריכה את מה שהמשתמש הקליד
  const filledForRef = useRef(null);

  // הסיסמה כפי שהיא הוקראה מהרשומה למילוי הטופס. הסיסמה נשלחת רק כשהוקלד
  // ערך אחר ממנה: ללקוח שקבע לעצמו סיסמה בחנות אין ערך גלוי, השדה מוצג ריק,
  // ובלי ההשוואה הזו כל שמירה של הכרטיס הייתה מוחקת לו את הסיסמה
  const passwordFromRecordRef = useRef("");

  // רשומת הלקוח שממנה נערכה השמירה האחרונה. נתוני העמוד מתרעננים בהשהיה,
  // ובלי הסימון הזה כניסה חוזרת לעריכה מיד אחרי שמירה הייתה ממלאת את הטופס
  // בערכים שלפני השמירה - ושמירה נוספת הייתה מחזירה אותם למסד
  const savedFromRef = useRef(null);

  const { closeDrawer, isDrawerOpen, setIsUpdate } = useContext(SidebarContext);

  const isFormOpen = inline ? inlineIsOpen : isDrawerOpen;
  const finish = useCallback(() => {
    if (inline) {
      onDone?.();
      return;
    }
    closeDrawer();
  }, [inline, onDone, closeDrawer]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm();

  // רשומת הבסיס לשמירה: ממנה נלקחים השדות שהטופס אינו עורך (שאר הכתובת,
  // מזהי המתנה). כשהרשומה שכבר נטענה בעמוד היא של אותו לקוח היא תקפה לגמרי,
  // גם אם באותו רגע מתבצעת טעינה מרעננת - אחרת נוצר רגע שבו הטופס מלא על
  // המסך אבל השמירה נחסמת בהודעה "פרטי הלקוח לא נטענו"
  const pageRecord =
    String(initialData?._id || "") === String(id) ? initialData : null;
  const baseCustomer =
    String(customer?._id || "") === String(id) ? customer : pageRecord;

  const onSubmit = async (data) => {
    try {
      // שומרים רק כשהרשומה שבידינו היא באמת של הלקוח שנערך. שני מקרים
      // נחסמים כאן: טעינה שנכשלה (הטופס ריק, ושמירה הייתה מוחקת את הכתובת
      // ושאר הפרטים), ומעבר ללקוח אחר שטעינתו נכשלה - שם נשארים בטופס
      // הערכים של הקודם, ושמירה הייתה כותבת אותם על הלקוח החדש
      if (id && !baseCustomer) {
        return notifyError("פרטי הלקוח לא נטענו. רענן את העמוד ונסה שוב.");
      }

      // רשת ביטחון: שמירה לפני שהערכים נכנסו לטופס הייתה שולחת שדות ריקים
      // ומוחקת ללקוח את הכתובת, הדגלים ונתוני ההנהח"ש. שולחים רק אחרי
      // שהטופס באמת מולא עבור הרשומה הזו
      if (id && filledForRef.current !== String(id)) {
        return notifyError("פרטי הלקוח עדיין נטענים. נסה שוב בעוד רגע.");
      }

      setIsSubmitting(true);

      const customerData = {
        name: data.name,
        lastName: data.lastName,
        email: data.email,
        // המייל המשני של איש הקשר. תצוגה בלבד - השרת לא שולח אליו דבר,
        // וכל מה שיוצא ללקוח הולך ל-email
        contactEmail: data.contactEmail || "",
        phone: data.phone,
        address: {
          ...(baseCustomer?.address || {}),
          // העיר נבחרת מרשימת היישובים של הלמ"ס ונשמרת כרשומה מלאה
          // (city_code, region_code וכו'), כי מחיר המשלוח וימי החלוקה
          // מסתמכים על הקודים האלה
          city: city || null,
          street: data.street || "",
          houseNumber: data.houseNumber || "",
          apartmentNumber: data.apartmentNumber || "",
          floor: data.floor || "",
          entryCode: data.entryCode || "",
          postalCode: data.postalCode || "",
        },
        isCashier,
        inBlackList,
        isRegistered,
        shippingRewardIssued,
        welcomeGift: {
          ...(baseCustomer?.welcomeGift || {}),
          isUsed: welcomeGiftUsed,
        },
      };

      // הסיסמה נשלחת רק כשהיא באמת שונתה בטופס. השרת מצפין מחדש כל ערך
      // שמגיע, ומחרוזת ריקה מבטלת ללקוח את הכניסה עם סיסמה - ולכן אסור
      // לשלוח את השדה סתם בכל שמירה
      const typedPassword = (data.password ?? "").trim();
      if (typedPassword !== passwordFromRecordRef.current) {
        customerData.password = typedPassword;
      }

      // נתוני ההנהח"ש נשלחים רק ללקוח שיש לו כאלה. ללקוח שנרשם בחנות אין erp,
      // ושליחת שדות ריקים הייתה יוצרת לו אובייקט erp ומסמנת אותו בטעות
      // כלקוח שהגיע מיבוא האקסל
      if (baseCustomer?.erp) {
        customerData.erp = Object.entries(ERP_FORM_FIELDS).reduce(
          (acc, [formField, field]) => {
            acc[field.key] = erpValueToSend(field, data[formField]);
            return acc;
          },
          { active: erpActive }
        );
      }

      if (id) {
        const res = await CustomerServices.updateCustomer(id, customerData);
        savedFromRef.current = pageRecord;
        setIsUpdate(true);
        notifySuccess(res.message);
        finish();
      }
      setIsSubmitting(false);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
      setIsSubmitting(false);
      // בעריכה בעמוד נשארים בטופס עם מה שהוקלד, כדי שהמשתמש יוכל לתקן
      // ולנסות שוב; במגירה ההתנהגות המקורית נשמרת
      if (!inline) closeDrawer();
    }
  };

  // מילוי הטופס מרשומת לקוח. מוחזק בפונקציה אחת כדי ששני מקורות הנתונים -
  // הבקשה שהמגירה שולחת והלקוח שכבר נטען בעמוד - ימלאו בדיוק אותם שדות
  const fillForm = useCallback(
    (res) => {
      setValue("name", res.name || "");
      setValue("lastName", res.lastName || "");
      setValue("phone", res.phone || "");
      setValue("email", res.email || "");
      setValue("contactEmail", res.contactEmail || "");
      setValue("street", res?.address?.street || "");
      setValue("houseNumber", res?.address?.houseNumber || "");
      setValue("apartmentNumber", res?.address?.apartmentNumber || "");
      setValue("floor", res?.address?.floor || "");
      setValue("entryCode", res?.address?.entryCode || "");
      setValue("postalCode", res?.address?.postalCode || "");

      // הסיסמה נשמרת גם כטקסט גלוי (plainPassword), ולכן היא נטענת לשדה
      // כמו כל שדה אחר. ללקוח שקבע אותה בעצמו בחנות אין ערך גלוי, והשדה
      // נשאר ריק עד שתיקבע לו סיסמה חדשה מכאן
      passwordFromRecordRef.current = res?.plainPassword || "";
      setValue("password", passwordFromRecordRef.current);

      setCity(res?.address?.city || null);
      setIsCashier(Boolean(res.isCashier));
      setInBlackList(Boolean(res.inBlackList));
      setIsRegistered(Boolean(res.isRegistered));
      setShippingRewardIssued(Boolean(res.shippingRewardIssued));
      setWelcomeGiftUsed(Boolean(res?.welcomeGift?.isUsed));
      // ברירת המחדל היא "פעיל": כך הלקוח מוצג גם בכרטיס כשאין ערך בקובץ
      setErpActive(res?.erp?.active !== false);

      Object.entries(ERP_FORM_FIELDS).forEach(([formField, field]) => {
        const value = res?.erp?.[field.key];
        setValue(
          formField,
          field.date
            ? toDateInput(value)
            : value === null || value === undefined
            ? ""
            : value
        );
      });
    },
    [setValue]
  );

  useEffect(() => {
    // המגירה מרונדרת תמיד (גם סגורה), ובעמוד פרטי הלקוח היא מקבלת את המזהה
    // מהכתובת. בלי התנאי על isFormOpen הייתה נשלחת בקשה כפולה בכל כניסה
    // לעמוד, וגם בכל לחיצה על מחיקה ברשימת הלקוחות
    if (!id || !isFormOpen) {
      filledForRef.current = null;
      setCustomer(null);
      setIsFormLoading(false);
      return;
    }

    const pageRecordMatches = String(initialData?._id || "") === String(id);

    // הרשומה שכבר נטענה בעמוד היא של אותו לקוח, ולכן היא תקפה כרשומת בסיס
    // לשמירה גם בזמן טעינה מרעננת. בלי זה נוצר רגע שבו הטופס מלא על המסך
    // אבל השמירה נחסמת ב"פרטי הלקוח לא נטענו"
    if (inline && pageRecordMatches) setCustomer(initialData);

    // כשנתוני העמוד עדיין לא התרעננו אחרי השמירה האחרונה (אותו אובייקט
    // בדיוק), מביאים את הלקוח מהשרת כדי למלא ערכים מעודכנים
    const isStaleAfterSave =
      savedFromRef.current !== null && initialData === savedFromRef.current;

    // בעריכה בעמוד הלקוח כבר נטען שם, ואין טעם לבקש אותו שוב. המילוי רץ
    // פעם אחת בכל כניסה למצב עריכה, ולכן "ביטול" ולחיצה חוזרת על "עריכה"
    // מחזירים את הערכים המקוריים ולא את מה שהוקלד ונזנח - אבל רענון של
    // נתוני העמוד באמצע העריכה אינו דורס את מה שהוקלד
    if (inline && pageRecordMatches && !isStaleAfterSave) {
      setIsFormLoading(false);
      if (filledForRef.current !== String(id)) {
        filledForRef.current = String(id);
        fillForm(initialData);
      }
      return;
    }

    // cancelled מונע מתשובה של לקוח קודם לדרוס את הטופס אם המשתמש פתח
    // לקוח אחר לפני שהבקשה הראשונה חזרה. בלי זה אפשר לערוך לקוח אחד
    // ולשמור מעליו את הפרטים של לקוח אחר
    let cancelled = false;
    // כשאין בעמוד רשומה של הלקוח הזה, אין רשומת בסיס לשמירה עד שהבקשה חוזרת
    if (!(inline && pageRecordMatches)) setCustomer(null);
    setIsFormLoading(true);

    (async () => {
      try {
        // getCustomerDetails ולא getCustomerById: רק הוא מחזיר את erp
        // (מוגדר select:false במודל), וזה מה שמאפשר להציג בטופס את כל
        // הפרטים שהגיעו מיבוא האקסל
        const res = await CustomerServices.getCustomerDetails(id);
        if (cancelled || !res) return;

        setCustomer(res);
        if (filledForRef.current !== String(id)) {
          // מסמנים שהטופס כבר מולא לכניסה הזו, כדי שרענון של נתוני העמוד
          // מיד אחרי כן לא ימלא אותו שוב וידרוס את מה שהוקלד
          filledForRef.current = String(id);
          fillForm(res);
        }
      } catch (err) {
        if (!cancelled) {
          notifyError(err?.response?.data?.message || err?.message);
          // כשהבקשה נכשלה אבל יש בעמוד רשומה של אותו לקוח, ממלאים ממנה.
          // בלי זה העריכה נתקעת: השדות ריקים והשמירה חסומה עד יציאה וכניסה
          if (inline && pageRecordMatches && filledForRef.current !== String(id)) {
            filledForRef.current = String(id);
            fillForm(initialData);
          }
        }
      } finally {
        if (!cancelled) setIsFormLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, isFormOpen, inline, initialData, fillForm]);

  return {
    register,
    handleSubmit,
    onSubmit,
    // setValue נחוץ לכפתור "יצירת סיסמה אקראית" בכרטיס הלקוח, שכותב ערך
    // לשדה בלי שהמשתמש הקליד אותו
    setValue,
    errors,
    setImageUrl,
    imageUrl,
    isSubmitting,
    isFormLoading,
    customer,
    city,
    setCity,
    isCashier,
    setIsCashier,
    inBlackList,
    setInBlackList,
    isRegistered,
    setIsRegistered,
    shippingRewardIssued,
    setShippingRewardIssued,
    welcomeGiftUsed,
    setWelcomeGiftUsed,
    erpActive,
    setErpActive,
  };
};

export default useCustomerSubmit;
