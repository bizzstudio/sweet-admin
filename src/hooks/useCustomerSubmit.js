import { useContext, useEffect, useState } from "react";
import { useForm } from "react-hook-form";

// Internal import
import { SidebarContext } from "@/context/SidebarContext";
import CustomerServices from "@/services/CustomerServices";
import { notifyError, notifySuccess } from "@/utils/toast";

const useCustomerSubmit = (id) => {
  const [imageUrl, setImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // הלקוח המלא כפי שנטען מהשרת. משמש כדי להציג במגירת העריכה גם את נתוני
  // ההנהח"ש (erp), ובעיקר כדי לא לאבד שדות כתובת שהטופס לא עורך - עדכון
  // הלקוח בשרת מחליף את אובייקט הכתובת כולו
  const [customer, setCustomer] = useState(null);
  const { closeDrawer, isDrawerOpen, setIsUpdate } = useContext(SidebarContext);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    try {
      // שומרים רק כשהלקוח שנטען הוא באמת זה שנערך. שני מקרים נחסמים כאן:
      // טעינה שנכשלה (הטופס ריק, ושמירה הייתה מוחקת את הכתובת ושאר הפרטים),
      // ומעבר ללקוח אחר שטעינתו נכשלה - שם נשארים בטופס הערכים של הקודם,
      // ושמירה הייתה כותבת אותם על הלקוח החדש
      if (id && String(customer?._id || "") !== String(id)) {
        return notifyError("פרטי הלקוח לא נטענו. סגור את החלון ונסה שוב.");
      }

      setIsSubmitting(true);

      // העיר לא נערכת כאן בכוונה. היא נשמרת כרשומה מלאה מנתוני הלמ"ס
      // (city_code, region_code וכו'), ומחיר המשלוח וימי החלוקה מסתמכים על
      // הקודים האלה. שדה טקסט חופשי היה מייצר עיר בלי קוד ושובר אותם, ולכן
      // אובייקט העיר הקיים עובר כמו שהוא
      const customerData = {
        name: data.name,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        address: {
          ...(customer?.address || {}),
          street: data.street || "",
          houseNumber: data.houseNumber || "",
          apartmentNumber: data.apartmentNumber || "",
          floor: data.floor || "",
          entryCode: data.entryCode || "",
          postalCode: data.postalCode || "",
        },
      };

      if (id) {
        const res = await CustomerServices.updateCustomer(id, customerData);
        setIsUpdate(true);
        notifySuccess(res.message);
        closeDrawer();
      }
      setIsSubmitting(false);
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
      setIsSubmitting(false);
      closeDrawer();
    }
  };

  useEffect(() => {
    // המגירה מרונדרת תמיד (גם סגורה), ובעמוד פרטי הלקוח היא מקבלת את המזהה
    // מהכתובת. בלי התנאי על isDrawerOpen הייתה נשלחת בקשה כפולה בכל כניסה
    // לעמוד, וגם בכל לחיצה על מחיקה ברשימת הלקוחות
    if (!id || !isDrawerOpen) {
      setCustomer(null);
      return;
    }

    // cancelled מונע מתשובה של לקוח קודם לדרוס את הטופס אם המשתמש פתח
    // לקוח אחר לפני שהבקשה הראשונה חזרה. בלי זה אפשר לערוך לקוח אחד
    // ולשמור מעליו את הפרטים של לקוח אחר
    let cancelled = false;
    // מאפסים לפני הטעינה כדי שהשמירה תיחסם כל עוד הלקוח החדש לא הגיע
    setCustomer(null);

    (async () => {
      try {
        // getCustomerDetails ולא getCustomerById: רק הוא מחזיר את erp
        // (מוגדר select:false במודל), וזה מה שמאפשר להציג במגירה את כל
        // הפרטים שהגיעו מיבוא האקסל
        const res = await CustomerServices.getCustomerDetails(id);
        if (cancelled || !res) return;

        setCustomer(res);
        setValue("name", res.name || "");
        setValue("lastName", res.lastName || "");
        setValue("phone", res.phone || "");
        setValue("email", res.email || "");
        setValue("street", res?.address?.street || "");
        setValue("houseNumber", res?.address?.houseNumber || "");
        setValue("apartmentNumber", res?.address?.apartmentNumber || "");
        setValue("floor", res?.address?.floor || "");
        setValue("entryCode", res?.address?.entryCode || "");
        setValue("postalCode", res?.address?.postalCode || "");
      } catch (err) {
        if (!cancelled) {
          notifyError(err?.response?.data?.message || err?.message);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, isDrawerOpen, setValue]);

  return {
    register,
    handleSubmit,
    onSubmit,
    errors,
    setImageUrl,
    imageUrl,
    isSubmitting,
    customer,
  };
};

export default useCustomerSubmit;
