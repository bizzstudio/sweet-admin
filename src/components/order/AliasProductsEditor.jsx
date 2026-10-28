// src/components/order/AliasProductsEditor.jsx
//
// רשימת מוצרים לשורה אחת של הלקוח — "חד פעמי סכו"ם וצלחות" → מזלגות, סכינים,
// כפות, צלחות גדולות, צלחות קטנות. כל מוצר ייכנס להזמנה כשורה נפרדת.
//
// משמש בשני מקומות: במסך ההזמנה (UnmatchedItemResolver), כשמכריעים על שורה
// לראשונה, ובכרטיס הלקוח (CustomerAliasesPanel), כשחוזרים להכרעה כדי להוסיף
// או להסיר מוצר. הרכיב רק מציג ועורך את הרשימה; השמירה אצל מי שמשתמש בו.
//
// ── הכמות ──
//
// ריק = "כמו בשורה": הכמות שהלקוח יכתוב בכל הזמנה. זו ברירת המחדל, כי מי
// שכותב "סכו"ם 3" מתכוון בדרך כלל ל-3 מכל אחד. מספר = כמות קבועה למוצר הזה.
//
// במסך ההזמנה השדה מתחיל בכמות של השורה, כדי שיהיה ברור מה ייכנס להזמנה
// הנוכחית. כמות שנשארה זהה לשורה נשמרת כ"כמו בשורה" (ראה toAliasProducts),
// אחרת "סכו"ם 3" של היום היה נשמר כ-3 קבוע גם להזמנה של 10 בשבוע הבא.

import React from "react";
import { FiTrash2 } from "react-icons/fi";

import ProductPicker from "@/components/billing/ProductPicker";

// שורה ברשימה: { sku, productId?, title, quantity: string }. מפתח השורה הוא
// המק"ט כשיש, אחרת מזהה המוצר (מוצר שנמחק מהקטלוג מגיע בלי מק"ט)
const rowKey = (row) => String(row.sku || row.productId);

/**
 * מוצרים מהשרת (‎{ productId, sku, title, quantity }‎) → שורות לעריכה.
 * ‏lineQuantity — כשיש שורה מולה (מסך ההזמנה), "כמו בשורה" מוצג כמספר שלה.
 */
export const toEditorRows = (products = [], lineQuantity = null) =>
  products.map((p) => ({
    productId: p.productId || null,
    sku: p.sku || null,
    title: p.title || "",
    missing: Boolean(p.missing),
    quantity:
      p.quantity !== null && p.quantity !== undefined
        ? String(p.quantity)
        : lineQuantity
          ? String(lineQuantity)
          : "",
  }));

/**
 * שורות → מה שנשלח לשרת. מוצר עם מק"ט נשלח לפי מק"ט (כך הבורר מזהה מוצרים),
 * ומוצר שנטען מהשרת בלי מק"ט — לפי המזהה שלו.
 */
export const toAliasProducts = (rows, lineQuantity = null) =>
  rows.map((row) => {
    const n = Number(row.quantity);
    const fixed =
      row.quantity !== "" && Number.isFinite(n) && n > 0 && !(lineQuantity && n === Number(lineQuantity))
        ? n
        : null;
    return {
      ...(row.productId ? { productId: row.productId } : { sku: row.sku }),
      quantity: fixed,
    };
  });

// תיאור קצר לתצוגה אחרי שמירה ובכרטיס הלקוח: "מזלגות ×6, צלחות ×כמו בשורה"
export const describeRows = (rows) =>
  rows.map((row) => `${row.title}${row.quantity ? ` ×${row.quantity}` : ""}`).join(", ");

const AliasProductsEditor = ({
  rows,
  onChange,
  lineQuantity = null,
  disabled = false,
  preferred,
  preferredLabel,
  onMenuOpen,
  inlineMenu = false,
}) => {
  const add = (sku, product) => {
    if (!sku || rows.some((row) => String(row.sku) === String(sku))) return;
    onChange([
      ...rows,
      {
        productId: null,
        sku: String(sku),
        title: product?.name || product?.title || String(sku),
        quantity: lineQuantity ? String(lineQuantity) : "",
      },
    ]);
  };
  const remove = (key) => onChange(rows.filter((row) => rowKey(row) !== key));
  const setQuantity = (key, quantity) =>
    onChange(rows.map((row) => (rowKey(row) === key ? { ...row, quantity } : row)));

  return (
    // ‏Enter בשדה כמות היה שולח את הטופס שהרכיב יושב בתוכו (כרטיס הלקוח הוא
    // טופס אחד גדול) — כלומר שומר את הלקוח באמצע עריכה של משהו אחר
    <div
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target.tagName === "INPUT") e.preventDefault();
      }}
    >
      {rows.length > 0 && (
        <ul className="mb-2 flex flex-col gap-1.5">
          {rows.map((row) => {
            const key = rowKey(row);
            return (
              <li
                key={key}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-600 dark:bg-gray-900/40"
              >
                <span className="min-w-0 flex-grow break-words text-sm font-medium text-gray-900 dark:text-gray-100">
                  {row.title}
                  {row.missing && (
                    <span className="mr-1 text-xs font-normal text-red-600">(נמחק מהקטלוג — להסיר)</span>
                  )}
                </span>
                <label className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                  כמות
                  <input
                    type="number"
                    min="1"
                    step="any"
                    inputMode="decimal"
                    value={row.quantity}
                    onChange={(e) => setQuantity(key, e.target.value)}
                    placeholder="כמו בשורה"
                    aria-label={`כמות של ${row.title}`}
                    disabled={disabled}
                    className="w-24 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus:border-gray-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => remove(key)}
                  disabled={disabled}
                  aria-label={`הסרת ${row.title}`}
                  title="הסרה מהרשימה"
                  className="rounded-md p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  <FiTrash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <ProductPicker
        value=""
        onChange={add}
        onMenuOpen={onMenuOpen}
        inlineMenu={inlineMenu}
        preferred={preferred}
        preferredLabel={preferredLabel}
        placeholder={rows.length ? "הוספת מוצר נוסף..." : "הקלידו שם מוצר, ברקוד או מק״ט..."}
        disabled={disabled}
      />
    </div>
  );
};

export default AliasProductsEditor;
