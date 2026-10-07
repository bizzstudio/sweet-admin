// src/components/billing/CustomerBalancePanel.jsx
//
// יתרת הלקוח: כסף שנשאר לזכותו מתשלום עודף, או חוב שנשאר מתשלום חסר —
// והתנועות שהרכיבו אותה.
//
// היתרה מתעדכנת מעצמה בכל רישום תשלום, זיכוי וביטול חשבונית ששולמה.
// התיקון הידני כאן הוא למה שקורה מחוץ למערכת: כסף שהוחזר ללקוח בהעברה,
// או יתרה שהייתה קיימת לפני שהתחלנו לנהל אותה.
//
// שדות הקלט מוצגים רק אחרי לחיצה על "תיקון ידני": כרטיס הלקוח במצב
// צפייה אינו אמור להכיל שדות עריכה.

import React, { useCallback, useEffect, useState } from "react";
import { Button, Input, Label, Select } from "@windmill/react-ui";

import BillingServices from "@/services/BillingServices";
import { notifyError, notifySuccess } from "@/utils/toast";

const shekel = (n) =>
  Number(n || 0).toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const hebDate = (d) => (d ? new Date(d).toLocaleDateString("he-IL") : "—");

const isZero = (n) => Math.abs(Number(n) || 0) < 0.005;

/** תיאור התנועה בשורה אחת, לפי מה שנרשם עליה. */
const describe = (e) => {
  const invoices = (e.invoices || []).map((i) => i.docNum).join(", ");
  switch (e.kind) {
    case "payment":
      return (
        `קבלה ${e.receiptDocNum || ""}: התקבלו ${shekel(e.received)} ₪` +
        (invoices ? ` על חשבונית ${invoices} (${shekel(e.invoiceTotal)} ₪)` : " על חשבון")
      );
    case "fromBalance":
      return `חשבונית ${invoices} (${shekel(e.invoiceTotal)} ₪) נסגרה מהיתרה`;
    case "invoiceCancelled":
      return `חשבונית ${invoices} ששולמה בוטלה (זיכוי ${e.creditDocNum || ""})`;
    case "creditInvoice":
      return `חשבונית זיכוי ${e.creditDocNum || ""}` + (invoices ? ` מול חשבונית ${invoices}` : "");
    default:
      return `תיקון ידני: ${e.reason || ""}`;
  }
};

const CustomerBalancePanel = ({ customerId }) => {
  const [balance, setBalance] = useState(0);
  const [entries, setEntries] = useState([]);
  // null = עוד נטען · true = נטען · false = הטעינה נכשלה
  const [loaded, setLoaded] = useState(null);

  const [adjusting, setAdjusting] = useState(false);
  const [direction, setDirection] = useState("credit");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await BillingServices.getCustomerBalance(customerId);
      setBalance(Number(res?.balance) || 0);
      setEntries(res?.entries || []);
      setLoaded(true);
    } catch {
      // הפאנל הוא תוספת לכרטיס הלקוח — תקלה בו אינה סיבה להפיל את הכרטיס
      setLoaded(false);
    }
  }, [customerId]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    const value = Number(amount);
    if (!(value > 0)) return notifyError("יש להזין סכום חיובי");
    if (!reason.trim()) return notifyError("חובה לציין סיבה");

    setSaving(true);
    try {
      const res = await BillingServices.adjustCustomerBalance(customerId, {
        delta: direction === "credit" ? value : -value,
        reason: reason.trim(),
      });
      notifySuccess(res.message);
      setAdjusting(false);
      setAmount("");
      setReason("");
      load();
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loaded === null) return <p className="text-sm text-gray-500">טוען...</p>;
  if (!loaded) {
    return <p className="text-sm text-gray-500">לא ניתן לטעון את יתרת הלקוח.</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p
            className={`text-2xl font-semibold ${
              isZero(balance)
                ? "text-gray-700 dark:text-gray-300"
                : balance > 0
                ? "text-green-700 dark:text-green-500"
                : "text-red-600"
            }`}
          >
            {isZero(balance)
              ? "אין יתרה"
              : `${balance > 0 ? "יתרת זכות" : "יתרת חוב"} ${shekel(Math.abs(balance))} ₪`}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {isZero(balance)
              ? "הלקוח מאוזן: אין לו כסף עודף אצלנו ואין חוב מתשלום חסר."
              : balance > 0
              ? "כסף שהלקוח שילם מעבר לחשבוניות. יקוזז ברישום התשלום הבא."
              : "הלקוח שילם פחות מסכום החשבוניות. ייתווסף לגבייה ברישום התשלום הבא."}
          </p>
        </div>
        {!adjusting && (
          <Button layout="outline" size="small" onClick={() => setAdjusting(true)}>
            תיקון ידני
          </Button>
        )}
      </div>

      {adjusting && (
        <div className="mt-4 p-3 rounded border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Label>
              <span>סוג התיקון</span>
              <Select
                className="mt-1"
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
              >
                <option value="credit">הוספת זכות ללקוח</option>
                <option value="debit">הפחתה (החזר ללקוח או חוב)</option>
              </Select>
            </Label>
            <Label>
              <span>סכום (₪)</span>
              <Input
                className="mt-1"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Label>
            <Label>
              <span>סיבה</span>
              <Input
                className="mt-1"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="לדוגמה: היתרה הוחזרה בהעברה"
              />
            </Label>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            התיקון משנה את היתרה במערכת בלבד. הוא אינו מפיק מסמך ואינו נרשם ב-iCount.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="small" onClick={submit} disabled={saving}>
              {saving ? "שומר..." : "שמירה"}
            </Button>
            <Button layout="outline" size="small" onClick={() => setAdjusting(false)}>
              ביטול
            </Button>
          </div>
        </div>
      )}

      {entries.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-200 dark:border-gray-700">
                <th scope="col" className="text-right font-normal py-1">תאריך</th>
                <th scope="col" className="text-right font-normal py-1">תנועה</th>
                <th scope="col" className="text-left font-normal py-1">שינוי</th>
                <th scope="col" className="text-left font-normal py-1">יתרה</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e._id} className="border-b border-gray-100 dark:border-gray-700">
                  <td className="py-1 whitespace-nowrap">{hebDate(e.createdAt)}</td>
                  <td className="py-1">{describe(e)}</td>
                  <td
                    className={`py-1 text-left whitespace-nowrap ${
                      e.delta > 0 ? "text-green-700" : e.delta < 0 ? "text-red-600" : ""
                    }`}
                    dir="ltr"
                  >
                    {e.delta > 0 ? "+" : ""}
                    {shekel(e.delta)}
                  </td>
                  <td className="py-1 text-left whitespace-nowrap" dir="ltr">
                    {shekel(e.balanceAfter)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CustomerBalancePanel;
