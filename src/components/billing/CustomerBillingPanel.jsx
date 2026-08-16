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

const CustomerBillingPanel = ({ customerId, billing, editing = false }) => {
  const [split, setSplit] = useState(Boolean(billing?.splitInvoiceByCategory));
  const [mode, setMode] = useState(billing?.mode || "monthly");
  const [clientId, setClientId] = useState(billing?.icountClientId || null);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSplit(Boolean(billing?.splitInvoiceByCategory));
    setMode(billing?.mode || "monthly");
    setClientId(billing?.icountClientId || null);
  }, [billing]);

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

    </div>
  );
};

export default CustomerBillingPanel;
