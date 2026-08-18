// src/components/billing/CustomerBillingPanel.jsx
//
// הגדרות החיוב של הלקוח: סנכרון הכרטיס ל-iCount, מסלול החיוב, ופיצול
// החשבונית החודשית לפי קטגוריה.
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

const CustomerBillingPanel = ({ customerId, billing, editing = false, fallbackEmail }) => {
  const [split, setSplit] = useState(Boolean(billing?.splitInvoiceByCategory));
  const [mode, setMode] = useState(billing?.mode || "monthly");
  const [clientId, setClientId] = useState(billing?.icountClientId || null);
  const [invoiceEmail, setInvoiceEmail] = useState(billing?.invoiceEmail || "");
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSplit(Boolean(billing?.splitInvoiceByCategory));
    setMode(billing?.mode || "monthly");
    setClientId(billing?.icountClientId || null);
    setInvoiceEmail(billing?.invoiceEmail || "");
  }, [billing]);

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
              במקום חשבונית אחת, הלקוח יקבל חשבונית לכל קטגוריה (מזון, משרד,
              ניקיון וכו'). חל גם על המסלול המיידי.
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
