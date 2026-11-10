// src/components/customer/RecentPurchasesModal.jsx
//
// "קניות אחרונות" — מה הלקוח קנה בחודשים האחרונים, כל קנייה בתאריך שלה.
// נפתח מטופס התעודה/החשבונית, ולחיצה על "הוסף" מכניסה את המוצר לטופס.
//
// ── במה זה שונה מחלון "היסטוריית הלקוח" ──
//
// ההיסטוריה היא הקובץ שיובא מההנהח"ש: שורה אחת למוצר עם התאריך האחרון, והיא
// אינה מתעדכנת מתעודות שהופקו במערכת. כאן מוצגות הקניות עצמן, משני מקורות:
// תעודות המשלוח שבמערכת והזמנות הארכיון שנוצרו מהקובץ. כל קנייה מסומנת במקור
// שלה, כי אין דרך אמינה לזהות "אותה קנייה" בשניהם (ראה utils/recentPurchases
// בשרת).

import React, { Fragment, useEffect, useMemo, useState } from "react";
import { Button, Input, Modal, ModalBody, ModalFooter } from "@windmill/react-ui";
import { FiAlertTriangle, FiChevronDown, FiChevronLeft, FiPlus, FiShoppingBag } from "react-icons/fi";

import { customerNameOf, useCustomers } from "@/components/billing/CustomerPicker";
import CustomerHistoryServices from "@/services/CustomerHistoryServices";
import { formatFileDate, formatMoney, formatNumber } from "@/utils/displayFormat";

export const PERIODS = [
  { months: 1, label: "חודש" },
  { months: 3, label: "3 חודשים" },
  { months: 6, label: "חצי שנה" },
  { months: 12, label: "שנה" },
];

// המק"ט בטופס ובתשובה יכול להיות "0077" מול "77" — אותה השוואה כמו בבורר
const skuKey = (sku) => {
  const text = String(sku ?? "").trim();
  return /^\d+$/.test(text) && Number.isSafeInteger(Number(text)) ? String(Number(text)) : text;
};

const SOURCE_STYLE = {
  note: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200",
  archive: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
};

/**
 * @param {boolean}  isOpen
 * @param {function} onClose
 * @param {string}   customerId
 * @param {string[]} [formSkus]  המק"טים שכבר בטופס — הכפתור שלהם מושבת
 * @param {function} [onAdd]     נקרא עם { sku, name } של מוצר מהקטלוג
 */
const RecentPurchasesModal = ({ isOpen, onClose, customerId, formSkus = [], onAdd }) => {
  const { customers } = useCustomers();
  const customerName = useMemo(
    () => customerNameOf(customers.find((c) => String(c._id) === String(customerId))),
    [customers, customerId]
  );

  const [months, setMonths] = useState(3);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(() => new Set());
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!isOpen || !customerId) return;
    // תשובה של תקופה או לקוח קודמים, שמגיעה אחרי החדשה, אסור שתדרוס אותה
    let cancelled = false;
    // החלון נשאר מורכב בין פתיחות; בלי האיפוס פתיחה ללקוח אחר הייתה מציגה
    // לרגע את הקניות של הקודם
    setData(null);
    setLoading(true);
    setError("");
    CustomerHistoryServices.getRecentPurchases(customerId, months)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (cancelled) return;
        setData(null);
        setError(err?.response?.data?.message || err.message || "הטעינה נכשלה");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, customerId, months, reloadKey]);

  const inForm = useMemo(() => new Set(formSkus.map(skuKey).filter(Boolean)), [formSkus]);

  const products = useMemo(() => {
    const all = data?.products || [];
    const term = search.trim().toLowerCase();
    if (!term) return all;
    return all.filter(
      (p) => p.name?.toLowerCase().includes(term) || String(p.sku || "").toLowerCase().includes(term)
    );
  }, [data, search]);

  const toggle = (key) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const actionFor = (p) => {
    if (!p.inCatalog || !p.sku) {
      return <span className="text-xs text-orange-500">אינו בקטלוג</span>;
    }
    if (inForm.has(skuKey(p.sku))) {
      return <span className="text-xs text-gray-500">כבר בטופס</span>;
    }
    return (
      <Button size="small" layout="outline" onClick={() => onAdd?.({ sku: p.sku, name: p.name })}>
        <FiPlus className="ml-1" /> הוסף
      </Button>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="w-full bg-white rounded-lg dark:bg-gray-800 sm:rounded-lg m-4 sm:max-w-4xl custom-modal"
    >
      <ModalBody className="text-sm text-gray-800 dark:text-gray-400 px-6 pt-6 pb-2 text-right max-h-[75vh] overflow-y-auto">
        <h2 className="text-xl font-medium mb-1 flex items-center gap-2 dark:text-gray-200">
          <FiShoppingBag className="text-customGreen" />
          {customerName ? `קניות אחרונות — ${customerName}` : "קניות אחרונות"}
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          כל קנייה בתאריך שלה: תעודות שהופקו במערכת, ומסמכים מקובץ ההנהח&quot;ש שיובא (ארכיון).
        </p>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="flex gap-1" role="group" aria-label="תקופה">
            {PERIODS.map((p) => (
              <button
                key={p.months}
                type="button"
                onClick={() => setMonths(p.months)}
                aria-pressed={months === p.months}
                className={`px-3 py-1 rounded-md border text-sm focus:outline-none ${
                  months === p.months
                    ? "bg-customGreen text-white border-customGreen"
                    : "bg-white text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Input
            className="flex-1 min-w-[180px]"
            placeholder='חיפוש לפי שם או מק"ט'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <p className="py-6 text-center text-gray-500">טוען...</p>
        ) : error ? (
          <div className="flex items-start gap-2 text-red-600 py-3">
            <FiAlertTriangle className="mt-0.5 shrink-0" />
            <span>
              {error}
              <button
                type="button"
                onClick={() => setReloadKey((k) => k + 1)}
                className="mr-2 underline focus:outline-none"
              >
                נסה שוב
              </button>
            </span>
          </div>
        ) : data ? (
          <>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              {`${data.products?.length || 0} מוצרים · ${data.notesCount || 0} תעודות במערכת · ${
                data.archiveCount || 0
              } מסמכי ארכיון · מאז ${formatFileDate(data.since)}`}
            </p>
            {data.truncated && (
              <p className="text-xs text-orange-600 mb-2">
                יש יותר מדי מסמכים בתקופה — מוצגים רק האחרונים. לבחירת תקופה קצרה יותר יש ללחוץ על הכפתורים למעלה.
              </p>
            )}

            {products.length ? (
              <div className="rounded-md border border-gray-200 dark:border-gray-600 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    <tr>
                      <th className="px-2 py-1.5 text-right font-medium">מוצר</th>
                      <th className="px-2 py-1.5 text-center font-medium">פעמים</th>
                      <th className="px-2 py-1.5 text-center font-medium">כמות כוללת</th>
                      <th className="px-2 py-1.5 text-center font-medium">קנייה אחרונה</th>
                      <th className="px-2 py-1.5 text-center font-medium">כמות אחרונה</th>
                      <th className="px-2 py-1.5 text-center font-medium">מחיר אחרון</th>
                      <th className="px-2 py-1.5 text-center font-medium">
                        <span className="sr-only">פעולה</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => {
                      const open = expanded.has(p.key);
                      return (
                        <Fragment key={p.key}>
                          <tr className="border-t border-gray-200 dark:border-gray-600">
                            <td className="px-2 py-1.5 text-right dark:text-gray-200">
                              <button
                                type="button"
                                onClick={() => toggle(p.key)}
                                aria-expanded={open}
                                className="flex items-start gap-1 text-right focus:outline-none"
                                title="הצג את כל הקניות"
                              >
                                {open ? (
                                  <FiChevronDown className="mt-0.5 shrink-0" />
                                ) : (
                                  <FiChevronLeft className="mt-0.5 shrink-0" />
                                )}
                                <span>
                                  <span className="block">{p.name || "—"}</span>
                                  {p.sku && <span className="font-mono text-gray-500">{p.sku}</span>}
                                </span>
                              </button>
                            </td>
                            <td className="px-2 py-1.5 text-center dark:text-gray-300">{p.count}</td>
                            <td className="px-2 py-1.5 text-center dark:text-gray-300">
                              {formatNumber(p.totalQty)}
                            </td>
                            <td className="px-2 py-1.5 text-center dark:text-gray-300">
                              {formatFileDate(p.lastDay)}
                            </td>
                            <td className="px-2 py-1.5 text-center dark:text-gray-300">
                              {formatNumber(p.lastQty)}
                            </td>
                            <td className="px-2 py-1.5 text-center dark:text-gray-300">
                              {formatMoney(p.lastPrice)}
                            </td>
                            <td className="px-2 py-1.5 text-center whitespace-nowrap">{actionFor(p)}</td>
                          </tr>
                          {open &&
                            p.purchases.map((buy, i) => (
                              <tr
                                key={`${p.key}-${i}`}
                                className="bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                              >
                                <td className="px-2 py-1 pr-7 text-right">
                                  <span
                                    className={`inline-block rounded px-1.5 py-0.5 ${
                                      SOURCE_STYLE[buy.source] || SOURCE_STYLE.archive
                                    }`}
                                  >
                                    {buy.source === "archive" ? `ארכיון · ${buy.doc}` : buy.doc}
                                  </span>
                                </td>
                                <td className="px-2 py-1" />
                                <td className="px-2 py-1" />
                                <td className="px-2 py-1 text-center">{formatFileDate(buy.day)}</td>
                                <td className="px-2 py-1 text-center">{formatNumber(buy.quantity)}</td>
                                <td className="px-2 py-1 text-center">{formatMoney(buy.unitPrice)}</td>
                                <td className="px-2 py-1" />
                              </tr>
                            ))}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-6 text-center text-gray-500">
                {search.trim() ? "אין מוצר שמתאים לחיפוש." : "אין קניות בתקופה הזו."}
              </p>
            )}
          </>
        ) : null}
      </ModalBody>

      <ModalFooter className="px-6 py-3">
        <Button layout="outline" onClick={onClose}>
          סגירה
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default RecentPurchasesModal;
