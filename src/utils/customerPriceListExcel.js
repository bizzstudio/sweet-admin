// src/utils/customerPriceListExcel.js
// פענוח קובץ מחירון של לקוח: מק"ט, שם המוצר, מחיר.
//
// שלוש עמודות ולא יותר. השם אינו משמש להתאמה — ההתאמה למוצר היא לפי מק"ט בלבד —
// אלא לאימות: השרת משווה אותו לשם בקטלוג ומסמן אי-התאמות בתצוגה המקדימה, כי
// קובץ שבו עמודה הוזזה בשורה אחת ייראה תקין לגמרי ויתמחר כל מוצר במחיר של אחר.
import {
  buildAliasLookup,
  detectHeaderRow,
  pickServerFields,
  readSheetGrid,
  toNumber,
  toText,
} from "./erpExcel";

const COLUMN_ALIASES = {
  // ההשוואה נעשית על טקסט מנורמל (בלי גרשיים, מקפים ורווחים), ולכן 'מק"ט'
  // ו-"מק ט" ו-"מקט" הם אותו דבר
  sku: ["מקט", "מקט פנימי", "קוד מוצר", "קוד", "sku"],
  name: ["שם המוצר", "שם מוצר", "שם", "תאור", "תיאור", "פריט"],
  price: ["מחיר", "מחירון", "מחיר יחידה", "מחיר ללקוח", "מחיר מיוחד", "price"],
};

// שם המוצר אינו נדרש: מחירון של שתי עמודות (מק"ט + מחיר) הוא קובץ תקין
const REQUIRED_FIELDS = ["sku", "price"];

const SERVER_FIELDS = ["rowNumber", "sku", "name", "price"];

const ALIAS_LOOKUP = buildAliasLookup(COLUMN_ALIASES);

/**
 * מפענח קובץ אקסל/CSV של מחירון לקוח ומחזיר שורות מנורמלות + סטטיסטיקה.
 * @param {File} file
 */
export const parseCustomerPriceListFile = async (file) => {
  const { grid } = await readSheetGrid(file);

  const header = detectHeaderRow(grid, ALIAS_LOOKUP, REQUIRED_FIELDS);
  if (header.index === -1) {
    throw new Error(
      'לא זוהתה שורת כותרות. ודא שהקובץ מכיל עמודת "מק"ט" ועמודת "מחיר"'
    );
  }

  const rows = [];
  const invalidRows = [];
  const seenSkus = new Set();
  const duplicateSkus = [];

  const readField = (row, field) => {
    const colIndex = header.map[field];
    return colIndex === undefined ? null : row[colIndex];
  };

  for (let i = header.index + 1; i < grid.length; i++) {
    const rawRow = grid[i] || [];
    const rowNumber = i + 1; // מספר השורה כפי שהוא נראה באקסל

    const sku = toText(readField(rawRow, "sku"));
    const name = toText(readField(rawRow, "name"));
    const price = toNumber(readField(rawRow, "price"));

    // שורה ריקה לגמרי (קובצי ההנהח"ש מפרידים בשורות ריקות) — לא שגיאה
    if (!sku && !name && price === null) continue;

    if (!sku) {
      invalidRows.push({ rowNumber, sku, name, price, reason: 'חסר מק"ט' });
      continue;
    }
    if (price === null) {
      invalidRows.push({ rowNumber, sku, name, price, reason: "חסר מחיר" });
      continue;
    }
    // מחיר 0 אינו "חינם" אלא "לא הוגדר". שורה כזו הייתה מייצרת שורת הזמנה
    // בסך 0 ש"ח בלי שאיש ישים לב, ולכן היא מדולגת ומדווחת
    if (price <= 0) {
      invalidRows.push({
        rowNumber,
        sku,
        name,
        price,
        reason: "מחיר אינו חיובי",
      });
      continue;
    }

    if (seenSkus.has(sku)) duplicateSkus.push(sku);
    seenSkus.add(sku);

    rows.push({ rowNumber, sku, name, price });
  }

  return {
    fileName: file.name,
    headerRowNumber: header.index + 1,
    // האם עמודת השם קיימת בקובץ — בלעדיה אין בדיקת אימות שמות
    hasNameColumn: header.map.name !== undefined,
    rows,
    invalidRows,
    duplicateSkus: [...new Set(duplicateSkus)],
    stats: buildStats(rows, invalidRows),
  };
};

const buildStats = (rows, invalidRows = []) => {
  const prices = rows.map((row) => row.price);
  const skippedReasons = new Map();
  invalidRows.forEach((row) => {
    skippedReasons.set(row.reason, (skippedReasons.get(row.reason) || 0) + 1);
  });

  return {
    total: rows.length,
    minPrice: prices.length ? Math.min(...prices) : null,
    maxPrice: prices.length ? Math.max(...prices) : null,
    skipped: invalidRows.length,
    skippedReasons: [...skippedReasons.entries()].map(([reason, count]) => ({
      reason,
      count,
    })),
  };
};

export const toServerRow = (row) => pickServerFields(row, SERVER_FIELDS);

export default parseCustomerPriceListFile;
