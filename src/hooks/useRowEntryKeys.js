// src/hooks/useRowEntryKeys.js
//
// הקלדה רצופה בלי עכבר בטופס של שורות (הצעת מחיר, זיכוי): בחירת מוצר
// מעבירה את המיקוד לשדה הכמות, ו-Enter שם עובר לשורה הבאה ופותח חדשה אם
// זו האחרונה. אותה התנהגות כמו בטופס תעודת המשלוח (ManualDeliveryNoteForm).

import { useEffect, useRef, useState } from "react";

// סורק ברקוד "מקליד" תו כל כמה אלפיות שנייה; אדם אינו מקליד ארבעה תווים
// ברצף בקצב כזה
const SCAN_GAP_MS = 35;
const SCAN_MIN_CHARS = 4;

/**
 * @param {object} p
 * @param {Array} p.rows
 * @param {Function} p.addRow - מוסיפה שורה ריקה בסוף
 * @param {Function} p.hasItem - (row) => יש בשורה מוצר או תיאור
 * @param {Function} [p.onScan] - (index) => נסרק ברקוד בשדה הכמות של השורה
 */
export default function useRowEntryKeys({ rows, addRow, hasItem, onScan }) {
  // המיקוד עובר דרך state ו-effect ולא ישירות: השדה של שורה שזה עתה נוספה
  // עוד לא קיים ברגע הלחיצה
  const itemRefs = useRef([]);
  const quantityRefs = useRef([]);
  const [focusTarget, setFocusTarget] = useState(null);

  useEffect(() => {
    if (!focusTarget) return;
    const refs = focusTarget.field === "item" ? itemRefs : quantityRefs;
    const el = refs.current[focusTarget.row];
    el?.focus?.();
    // הערך הקיים מסומן, כדי שהקלדה תחליף אותו ולא תתווסף אליו
    if (focusTarget.field === "quantity") el?.select?.();
  }, [focusTarget]);

  const focusQuantity = (index) => setFocusTarget({ row: index, field: "quantity" });

  const onRowEnter = (e, index) => {
    // repeat: Enter שנשאר לחוץ מבחירת המוצר לא ידלג הלאה על שדה הכמות
    if (e.key !== "Enter" || e.repeat) return;
    e.preventDefault();

    if (index < rows.length - 1) {
      // שורה שכבר נושאת מוצר — ישר לכמות שלה
      const next = rows[index + 1];
      return setFocusTarget({ row: index + 1, field: hasItem(next) ? "quantity" : "item" });
    }

    // שורה אחרונה שעוד לא מולאה: Enter נוסף לא יערום שורות ריקות מתחתיה
    const row = rows[index];
    if (!hasItem(row) || !(Number(row.quantity) > 0)) return;
    addRow();
    setFocusTarget({ row: index + 1, field: "item" });
  };

  // סריקת ברקוד שנחתה בשדה הכמות: רצף תווים בקצב של סורק שמסתיים ב-Enter
  // אינו כמות, ולכן אינו מתקדם לשורה הבאה
  const burst = useRef({ row: -1, count: 0, last: 0 });

  const onQuantityKeyDown = (e, index) => {
    const b = burst.current;
    const fast = b.row === index && e.timeStamp - b.last < SCAN_GAP_MS;

    if (e.key === "Enter") {
      const scanned = fast && b.count >= SCAN_MIN_CHARS;
      burst.current = { row: -1, count: 0, last: 0 };
      if (scanned) {
        e.preventDefault();
        return onScan?.(index);
      }
      return onRowEnter(e, index);
    }

    if (e.key.length !== 1) return;
    // מקש שנשאר לחוץ חוזר באותו קצב כמו סורק, ואינו סריקה
    burst.current = { row: index, count: fast && !e.repeat ? b.count + 1 : 1, last: e.timeStamp };
  };

  return {
    itemRef: (index) => (el) => (itemRefs.current[index] = el),
    quantityRef: (index) => (el) => (quantityRefs.current[index] = el),
    focusQuantity,
    onRowEnter,
    onQuantityKeyDown,
  };
}
