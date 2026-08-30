// src/components/billing/CustomerBillingPanel.jsx
//
// הגדרות החיוב של הלקוח: סנכרון הכרטיס ל-iCount, מסלול החיוב, אחוז ההנחה
// הקבוע, וצורת החשבונית החודשית (ריכוז לפי קטגוריה / פיצול לחשבוניות).
//
// הפאנל שומר בעצמו ולא דרך הטופס של כרטיס הלקוח. הסיבה: הטופס ההוא נשלח
// רק במצב עריכה ומעדכן את שדות ה-ERP, ואילו כאן מדובר בשתי הגדרות נקודתיות
// שצריכות להיות זמינות גם בצפייה רגילה.

import React, { useEffect, useState } from "react";
import { Badge, Button } from "@windmill/react-ui";
import { FiRefreshCw } from "react-icons/fi";

import BillingServices from "@/services/BillingServices";
import CustomerServices from "@/services/CustomerServices";
import { notifyError, notifySuccess } from "@/utils/toast";

// כתובת שנוצרה בייבוא ללקוח שלא היה לו מייל. היא נראית תקינה אבל אין
// מאחוריה תיבה, והשרת לא ישלח אליה — עדיף שזה ייאמר במסך ולא יתגלה בסוף החודש.
const isPlaceholderEmail = (email) => /@import\.local$/i.test(String(email || ""));

const CustomerBillingPanel = ({
  customerId,
  billing,
  editing = false,
  fallbackEmail,
  // אחוז ההנחה שהגיע בייבוא של מנוע. משמש כברירת מחדל כשלא נקבע אחוז
  // אצלנו — 21 לקוחות הגיעו עם הנחה בקובץ, ואין סיבה להקליד אותה מחדש
  erpDiscountPercent,
}) => {
  const [split, setSplit] = useState(Boolean(billing?.splitInvoiceByCategory));
  const [summarize, setSummarize] = useState(billing?.summarizeInvoiceLines !== false);
  const [discountPercent, setDiscountPercent] = useState(
    billing?.discountPercent === undefined || billing?.discountPercent === null
      ? ""
      : String(billing.discountPercent)
  );
  const [mode, setMode] = useState(billing?.mode || "monthly");
  const [clientId, setClientId] = useState(billing?.icountClientId || null);
  const [invoiceEmail, setInvoiceEmail] = useState(billing?.invoiceEmail || "");
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSplit(Boolean(billing?.splitInvoiceByCategory));
    setSummarize(billing?.summarizeInvoiceLines !== false);
    setDiscountPercent(
      billing?.discountPercent === undefined || billing?.discountPercent === null
        ? ""
        : String(billing.discountPercent)
    );
    setMode(billing?.mode || "monthly");
    setClientId(billing?.icountClientId || null);
    setInvoiceEmail(billing?.invoiceEmail || "");
  }, [billing]);

  // אותו סדר עדיפות כמו בשרת (lib/billing/pricing): מה שנקבע אצלנו, ובלעדיו
  // מה שהגיע בייבוא. 0 מפורש עוצר ואינו נופל לייבוא.
  const effectiveDiscount =
    billing?.discountPercent === undefined || billing?.discountPercent === null
      ? Number(erpDiscountPercent) || 0
      : Number(billing.discountPercent) || 0;

  // הכתובת שאליה החשבונית תישלח בפועל, לפי אותו סדר עדיפות שבשרת
  const effectiveEmail = (invoiceEmail || fallbackEmail || "").trim();
  const noDeliverableEmail = !effectiveEmail || isPlaceholderEmail(effectiveEmail);

  const sync = async () => {
    setSyncing(true);
    try {
      const res = await BillingServices.syncCustomerToIcount(customerId);
      setClientId(res.clientId);
      notifySuccess(res.message);
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setSyncing(false);
    }
  };

  /**
   * שמירת שדה בודד בהגדרות החיוב, עם אימות מול מה שחזר מהשרת.
   * משותף למסלול ולפיצול — שניהם אותה פעולה בדיוק.
   */
  const saveField = async (field, value, { onRollback, successText }) => {
    setSaving(true);
    try {
      const res = await CustomerServices.updateCustomer(customerId, {
        billing: { [field]: value },
      });

      // אימות ולא הנחה: השרת מחזיר 200 גם כשהוא בולע שדות שאין עליהם
      // הרשאה, ו"נשמר" שקרי בהגדרת חיוב מגיע בסוף לחשבונית.
      const saved = res?.billing?.[field];

      // ניקוי מכוון (null) חוזר מהשרת כשדה שאינו קיים, כלומר undefined.
      // ההשוואה הרגילה הייתה מכריזה על כישלון דווקא כשהשמירה הצליחה.
      if (value === null) {
        notifySuccess(successText);
        return true;
      }

      if (saved !== undefined && saved !== value) {
        onRollback();
        notifyError("השינוי לא נשמר בשרת. ייתכן שאין לך הרשאה לשנות הגדרות חיוב.");
        return false;
      }

      notifySuccess(successText);
      return true;
    } catch (err) {
      onRollback();
      notifyError(err?.response?.data?.message || err.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const changeMode = async (next) => {
    const previous = mode;
    setMode(next);
    await saveField("mode", next, {
      onRollback: () => setMode(previous),
      successText:
        next === "perDelivery"
          ? "מעכשיו הלקוח יקבל חשבונית מס עם כל משלוח"
          : "מעכשיו הלקוח יקבל תעודות משלוח וחשבונית מרכזת בסוף החודש",
    });
  };

  /**
   * שמירת המייל לחשבוניות ב-blur. נשלח רק כשהערך באמת השתנה — יציאה
   * מהשדה בלי לגעת בו אינה סיבה לפנות לשרת.
   */
  const saveInvoiceEmail = async () => {
    const previous = billing?.invoiceEmail || "";
    // אותו נרמול כמו בשרת. בלעדיו ההשוואה שאחרי השמירה ("מה שחזר שווה למה
    // ששלחתי") הייתה נכשלת על אות גדולה, והמסך היה מכריז על שמירה שנכשלה
    const next = invoiceEmail.trim().toLowerCase();
    if (next === previous) return;

    const ok = await saveField("invoiceEmail", next, {
      onRollback: () => setInvoiceEmail(previous),
      successText: next
        ? `החשבוניות יישלחו אל ${next}`
        : "החשבוניות יישלחו לכתובת הרגילה של הלקוח",
    });
    // נרמול לצורה שנשמרה בפועל, כדי שהשדה לא יציג רווחים שכבר לא קיימים
    if (ok) setInvoiceEmail(next);
  };

  const toggleSummarize = async (checked) => {
    setSummarize(checked);
    await saveField("summarizeInvoiceLines", checked, {
      onRollback: () => setSummarize(!checked),
      successText: checked
        ? "החשבונית תרכז שורה לכל קטגוריה, עם טבלת התעודות"
        : "החשבונית תפרט כל מוצר מכל תעודה",
    });
  };

  /**
   * שמירת אחוז ההנחה ב-blur, כמו המייל: שמירה בכל הקלדה הייתה בקשה לשרת
   * לכל ספרה, ו"5" בדרך ל-"5.5" היה נשמר בדרך.
   *
   * שדה ריק נשלח כ-null במפורש = ניקוי, וחזרה לאחוז מהייבוא. 0 נשמר כ-0
   * ואומר "בלי הנחה", כדי שייבוא אקסל לא יחזיר בשקט הנחה שבוטלה.
   */
  const saveDiscount = async () => {
    const previous =
      billing?.discountPercent === undefined || billing?.discountPercent === null
        ? ""
        : String(billing.discountPercent);
    const text = discountPercent.trim();
    if (text === previous) return;

    if (text !== "") {
      const pct = Number(text);
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        notifyError("אחוז ההנחה חייב להיות מספר בין 0 ל-100");
        setDiscountPercent(previous);
        return;
      }
    }

    const value = text === "" ? null : Number(text);
    const ok = await saveField("discountPercent", value, {
      onRollback: () => setDiscountPercent(previous),
      successText:
        value === null
          ? erpDiscountPercent > 0
            ? `ההנחה חזרה לאחוז מהייבוא (${erpDiscountPercent}%)`
            : "ההנחה הקבועה בוטלה"
          : value === 0
          ? "הלקוח לא יקבל הנחה קבועה"
          : `כל מסמך חדש ללקוח יקבל ${value}% הנחה`,
    });
    if (ok) setDiscountPercent(value === null ? "" : String(value));
  };

  const toggleSplit = async (checked) => {
    // עדכון אופטימי כדי שהתיבה תגיב מיד; מוחזר לאחור אם השמירה נכשלה
    setSplit(checked);
    await saveField("splitInvoiceByCategory", checked, {
      onRollback: () => setSplit(!checked),
      successText: checked
        ? "מעכשיו הלקוח יקבל חשבונית נפרדת לכל קטגוריה"
        : "מעכשיו הלקוח יקבל חשבונית אחת לחודש",
    });
  };

  return (
    <div className="sm:col-span-2 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">כרטיס ב-iCount</p>
          <p className="text-xs text-gray-500">
            נדרש כדי להפיק ללקוח חשבוניות. נוצר אוטומטית בחיוב הראשון.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {clientId ? (
            <Badge type="success">מסונכרן (#{clientId})</Badge>
          ) : (
            <Badge type="warning">לא מסונכרן</Badge>
          )}
          <Button size="small" layout="outline" onClick={sync} disabled={syncing}>
            <FiRefreshCw className="ml-2" />
            {syncing ? "מסנכרן..." : "סנכרן עכשיו"}
          </Button>
        </div>
      </div>

      {/* ── מסלול החיוב ── */}
      {editing ? (
        <div>
          <p className="text-sm font-medium mb-2">מסלול חיוב</p>
          <label className="flex items-start gap-3 cursor-pointer mb-2">
            <input
              type="radio"
              name="billingMode"
              checked={mode === "monthly"}
              disabled={saving}
              onChange={() => changeMode("monthly")}
              className="w-4 h-4 mt-1"
            />
            <span>
              <span className="text-sm">חודשי (ברירת מחדל)</span>
              <span className="block text-xs text-gray-500">
                כל משלוח מקבל תעודת משלוח, ובסוף החודש מופקת חשבונית אחת
                שמרכזת את כולן.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="billingMode"
              checked={mode === "perDelivery"}
              disabled={saving}
              onChange={() => changeMode("perDelivery")}
              className="w-4 h-4 mt-1"
            />
            <span>
              <span className="text-sm">חשבונית עם כל משלוח</span>
              <span className="block text-xs text-gray-500">
                חשבונית מס מופקת מיד עם כל משלוח, והיא מה שנמסר ללקוח במקום
                תעודת משלוח. אם ההפקה נכשלת (למשל iCount לא זמין), המשלוח
                ייאסף לחשבונית בסגירת החודש כרשת ביטחון.
              </span>
            </span>
          </label>
        </div>
      ) : (
        <div>
          <p className="text-sm font-medium">מסלול חיוב</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {mode === "perDelivery" ? (
              <>
                חשבונית מס עם כל משלוח{" "}
                <Badge type="primary">מיידי</Badge>
              </>
            ) : (
              "תעודות משלוח וחשבונית מרכזת בסוף החודש"
            )}
          </p>
        </div>
      )}

      {/* ── הנחה קבועה ──
          יורדת מכל מסמך שמופק ללקוח מכאן והלאה: תעודת משלוח, הצעת מחיר
          והחשבונית החודשית. אינה משנה מסמכים שכבר הופקו — הם צילום מצב */}
      {editing ? (
        <div>
          <p className="text-sm font-medium mb-1">הנחה קבועה</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              dir="ltr"
              value={discountPercent}
              disabled={saving}
              placeholder={erpDiscountPercent > 0 ? String(erpDiscountPercent) : "0"}
              onChange={(e) => setDiscountPercent(e.target.value)}
              onBlur={saveDiscount}
              className="w-28 text-sm px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
            />
            <span className="text-sm">%</span>
          </div>
          <span className="block text-xs text-gray-500 mt-1">
            יורדת מכל מסמך חדש שיופק ללקוח — תעודת משלוח, הצעת מחיר והחשבונית
            החודשית. מסמכים שכבר הופקו אינם משתנים.
            {erpDiscountPercent > 0 && (
              <>
                {" "}
                השארה ריקה = שימוש באחוז שהגיע בייבוא ממנוע (
                {erpDiscountPercent}%). הקלדת 0 = בלי הנחה, וגוברת על הייבוא.
              </>
            )}
          </span>
        </div>
      ) : (
        <div>
          <p className="text-sm font-medium">הנחה קבועה</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {effectiveDiscount > 0 ? (
              <>
                {effectiveDiscount}% על כל מסמך
                {billing?.discountPercent === undefined ||
                billing?.discountPercent === null ? (
                  <span className="text-xs text-gray-500"> (מהייבוא של מנוע)</span>
                ) : null}
              </>
            ) : (
              "אין"
            )}
          </p>
        </div>
      )}

      {/* ── צורת החשבונית החודשית ──
          ריכוז = שורה אחת לכל קטגוריה + טבלת מספרי התעודות בגוף המסמך.
          פירוט = כל שורות המוצרים מכל התעודות, שאצל לקוח עם 12 תעודות
          בחודש הן מאות שורות */}
      {editing ? (
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={summarize}
            disabled={saving}
            onChange={(e) => toggleSummarize(e.target.checked)}
            className="w-4 h-4 mt-1"
          />
          <span>
            <span className="text-sm font-medium">חשבונית מרוכזת לפי קטגוריה</span>
            <span className="block text-xs text-gray-500">
              במקום לפרט כל מוצר, החשבונית מציגה שורת "ריכוז תעודות משלוח" לכל
              קטגוריה (מזון, פירות, חד פעמי...), ובגוף המסמך טבלה עם כל מספרי
              תעודות המשלוח שנסגרו, התאריכים והסכומים.
              <br />
              חל על החשבונית המרכזת בלבד. חשבונית שמופקת עם משלוח בודד תמיד
              מפרטת את המוצרים — היא המסמך שהלקוח מקבל במקום תעודת משלוח.
            </span>
          </span>
        </label>
      ) : (
        <div>
          <p className="text-sm font-medium">צורת החשבונית החודשית</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {summarize
              ? "שורת ריכוז לכל קטגוריה + טבלת תעודות"
              : "פירוט מלא של כל המוצרים"}
          </p>
        </div>
      )}

      {/* ── פיצול לפי קטגוריה ──
          במצב צפייה מוצג טקסט ולא תיבת סימון. זו לא קוסמטיקה: כרטיס הלקוח
          מפריד בין צפייה לעריכה, ושדה עריכה שדולף למצב הצפייה הופך את
          המסך לניתן לשינוי בטעות בלי שנכנסו למצב עריכה */}
      {editing ? (
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={split}
            disabled={saving}
            onChange={(e) => toggleSplit(e.target.checked)}
            className="w-4 h-4 mt-1"
          />
          <span>
            <span className="text-sm font-medium">חשבונית נפרדת לכל קטגוריה</span>
            <span className="block text-xs text-gray-500">
              במקום חשבונית אחת, הלקוח יקבל חשבונית נפרדת לכל קטגוריה. תעודה
              שמערבת קטגוריות נכנסת בשלמותה לקטגוריה שרוב כספה בה — תעודה
              אחת אינה מתחלקת בין שתי חשבוניות. חל גם על המסלול המיידי.
              <br />
              ברוב המקרים אין צורך בזה: הפירוט לפי קטגוריה מופיע ממילא
              כשורות ריכוז בתוך החשבונית האחת.
            </span>
          </span>
        </label>
      ) : (
        <div>
          <p className="text-sm font-medium">פיצול לפי קטגוריה</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {split ? "חשבונית נפרדת לכל קטגוריה" : "חשבונית אחת"}
          </p>
        </div>
      )}

      {/* ── המייל שאליו נשלחות החשבוניות ──
          שדה נפרד מכתובת הכניסה לחנות, שהיא ייחודית במסד: הנהלת חשבונות
          אחת שמשרתת כמה לקוחות לא יכולה להופיע בה פעמיים. שמירה ב-blur
          ולא בכל הקלדה, אחרת כל אות הייתה בקשה לשרת */}
      {editing ? (
        <div>
          <p className="text-sm font-medium mb-1">מייל לשליחת חשבוניות</p>
          <input
            type="email"
            dir="ltr"
            value={invoiceEmail}
            disabled={saving}
            placeholder={fallbackEmail || "example@company.co.il"}
            onChange={(e) => setInvoiceEmail(e.target.value)}
            onBlur={saveInvoiceEmail}
            className="w-full text-sm px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
          />
          <span className="block text-xs text-gray-500 mt-1">
            אפשר להשאיר ריק — אז החשבונית נשלחת לכתובת הרגילה של הלקוח
            {fallbackEmail ? ` (${fallbackEmail})` : ""}. אותה כתובת יכולה
            לשמש כמה לקוחות, למשל הנהלת חשבונות משותפת.
          </span>
        </div>
      ) : (
        <div>
          <p className="text-sm font-medium">מייל לשליחת חשבוניות</p>
          <p className="text-sm text-gray-600 dark:text-gray-300" dir="ltr">
            {noDeliverableEmail ? "—" : effectiveEmail}
          </p>
          {noDeliverableEmail && (
            <p className="text-xs text-red-600 dark:text-red-400">
              אין ללקוח כתובת תקינה — החשבונית תופק אך לא תישלח אליו.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerBillingPanel;
