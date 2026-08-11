// src/utils/bulkCustomerPriceListExcel.js
// פענוח קובץ מחירונים מרוכז: קובץ אחד שמכיל את המחירונים של **כל** הלקוחות,
// כפי שהוא יוצא מתוכנת ההנהח"ש ("מחירוני לקוחות").
//
// ההבדל היחיד מקובץ מחירון של לקוח בודד (customerPriceListExcel.js) הוא עמודת
// מספר הלקוח: השורות מקובצות לפיה, וכל קבוצה הופכת למחירון של לקוח אחד.
// ההתאמה ללקוח במערכת היא לפי מספר הלקוח (erp.customerNumber) — אותו מזהה
// שלפיו מיובאים הלקוחות עצמם. השם בקובץ הוא לתצוגה בלבד.
import {
  buildAliasLookup,
  detectHeaderRow,
  pickServerFields,
  readSheetGrid,
  toNumber,
  toText,
} from "./erpExcel";

const COLUMN_ALIASES = {
  // ההשוואה על טקסט מנורמל (בלי גרשיים, מקפים ורווחים), ולכן "מספר לקוח"
  // ו-"מספרלקוח" הם אותו דבר. "שם הלקוח" ו"שם המוצר" נשארים נפרדים לגמרי
  customerNumber: ["מספר לקוח", "קוד לקוח", "מספר הלקוח", "לקוח"],
  customerName: ["שם הלקוח", "שם לקוח"],
  sku: ["מקט", "מקט פנימי", "קוד מוצר", "sku"],
  name: ["שם המוצר", "שם מוצר", "תאור", "תיאור", "פריט"],
  price: ["מחיר", "מחירון", "מחיר יחידה", "מחיר ללקוח", "מחיר מיוחד", "price"],
};

// שם הלקוח ושם המוצר אינם נדרשים: ההתאמה היא לפי מספר לקוח ומק"ט בלבד
const REQUIRED_FIELDS = ["customerNumber", "sku", "price"];

const SERVER_FIELDS = ["rowNumber", "sku", "name", "price"];

const ALIAS_LOOKUP = buildAliasLookup(COLUMN_ALIASES);

/**
 * מפענח קובץ מחירונים מרוכז ומחזיר את המחירונים מקובצים לפי לקוח.
 * @param {File} file
 */
export const parseBulkPriceListFile = async (file) => {
  const { grid } = await readSheetGrid(file);

  const header = detectHeaderRow(grid, ALIAS_LOOKUP, REQUIRED_FIELDS);
  if (header.index === -1) {
    throw new Error(
      'לא זוהתה שורת כותרות. ודא שהקובץ מכיל עמודות "מספר לקוח", "מק"ט" ו"מחיר"'
    );
  }

  // Map ולא אובייקט: הסדר נשמר כסדר הופעת הלקוחות בקובץ, וכך גם דוח היבוא
  const customers = new Map();
  const invalidRows = [];
  let duplicateSkus = 0;

  const readField = (row, field) => {
    const colIndex = header.map[field];
    return colIndex === undefined ? null : row[colIndex];
  };

  for (let i = header.index + 1; i < grid.length; i++) {
    const rawRow = grid[i] || [];
    const rowNumber = i + 1; // מספר השורה כפי שהוא נראה באקסל

    const customerNumber = toText(readField(rawRow, "customerNumber"));
    const customerName = toText(readField(rawRow, "customerName"));
    const sku = toText(readField(rawRow, "sku"));
    const name = toText(readField(rawRow, "name"));
    const price = toNumber(readField(rawRow, "price"));

    // שורה ריקה לגמרי — קובצי ההנהח"ש מפרידים בין לקוחות בשורות ריקות
    if (!customerNumber && !sku && !name && price === null) continue;

    if (!customerNumber) {
      invalidRows.push({ rowNumber, sku, name, reason: "חסר מספר לקוח" });
      continue;
    }
    if (!sku) {
      invalidRows.push({ rowNumber, customerNumber, name, reason: 'חסר מק"ט' });
      continue;
    }
    if (price === null) {
      invalidRows.push({ rowNumber, customerNumber, sku, name, reason: "חסר מחיר" });
      continue;
    }
    // מחיר 0 אינו "חינם" אלא "לא הוגדר": שורה כזו הייתה מייצרת שורת הזמנה
    // בסך 0 ש"ח בלי שאיש ישים לב
    if (price <= 0) {
      invalidRows.push({
        rowNumber,
        customerNumber,
        sku,
        name,
        reason: "מחיר אינו חיובי",
      });
      continue;
    }

    if (!customers.has(customerNumber)) {
      customers.set(customerNumber, {
        customerNumber,
        customerName,
        // מק"ט → שורה. מק"ט שחוזר אצל אותו לקוח נלקח מהשורה האחרונה, בדיוק
        // כמו ביבוא הבודד ובשרת
        rowsBySku: new Map(),
      });
    }

    const entry = customers.get(customerNumber);
    // השם נלקח מהשורה הראשונה שבה הוא מופיע — בקובץ הוא חוזר בכל שורה
    if (!entry.customerName && customerName) entry.customerName = customerName;
    if (entry.rowsBySku.has(sku)) duplicateSkus += 1;
    entry.rowsBySku.set(sku, { rowNumber, sku, name, price });
  }

  const list = [...customers.values()].map((entry) => ({
    customerNumber: entry.customerNumber,
    customerName: entry.customerName,
    rows: [...entry.rowsBySku.values()],
  }));

  return {
    fileName: file.name,
    headerRowNumber: header.index + 1,
    hasNameColumn: header.map.name !== undefined,
    customers: list,
    invalidRows,
    stats: buildStats(list, invalidRows, duplicateSkus),
  };
};

const buildStats = (customers, invalidRows, duplicateSkus) => {
  const prices = [];
  const skus = new Set();
  let totalRows = 0;

  customers.forEach((customer) => {
    totalRows += customer.rows.length;
    customer.rows.forEach((row) => {
      prices.push(row.price);
      skus.add(row.sku);
    });
  });

  const skippedReasons = new Map();
  invalidRows.forEach((row) => {
    skippedReasons.set(row.reason, (skippedReasons.get(row.reason) || 0) + 1);
  });

  return {
    customers: customers.length,
    totalRows,
    uniqueSkus: skus.size,
    duplicateSkus,
    minPrice: prices.length ? Math.min(...prices) : null,
    maxPrice: prices.length ? Math.max(...prices) : null,
    skipped: invalidRows.length,
    skippedReasons: [...skippedReasons.entries()].map(([reason, count]) => ({
      reason,
      count,
    })),
  };
};

/**
 * כל המק"טים הייחודיים בקובץ, כל אחד עם השם שליד ההופעה הראשונה שלו —
 * לבדיקה המקדימה מול הקטלוג.
 *
 * השם נשלח ולא רק המק"ט, כי הוא הסימן היחיד לקובץ שהעמודות בו הוזזו: ההתאמה
 * למוצר היא לפי מק"ט בלבד, ולכן קובץ מוזז ייראה תקין לגמרי — כל המק"טים
 * קיימים — ויתמחר כל מוצר במחיר של מוצר אחר, אצל כל הלקוחות בבת אחת.
 *
 * הרשימה ייחודית לפי מק"ט ולא לפי שורה: בקובץ אמיתי אותם ~4,000 מוצרים חוזרים
 * אצל מאות לקוחות, ושליחת כל השורות הייתה מנפחת את הבדיקה פי עשרות.
 */
export const collectUniqueProducts = (customers = []) => {
  const bySku = new Map();
  customers.forEach((customer) => {
    customer.rows.forEach((row) => {
      if (!bySku.has(row.sku)) bySku.set(row.sku, row.name || "");
      // שם ריק בהופעה הראשונה אינו נועל את המק"ט: אם אצל לקוח אחר יש שם, הוא
      // זה שיאפשר את בדיקת ההתאמה
      else if (!bySku.get(row.sku) && row.name) bySku.set(row.sku, row.name);
    });
  });
  return [...bySku.entries()].map(([sku, name]) => ({ sku, name }));
};

/**
 * פיצול לאצוות שליחה — **לפי לקוח, לא לפי שורה**.
 *
 * מחירון של לקוח חייב להישלח שלם: היבוא דורס את המחירון הקודם במלואו, ולקוח
 * שהמחירון שלו התפצל בין שתי בקשות היה נשאר עם החצי השני בלבד אם הראשונה
 * נכשלה. לכן החיתוך הוא בין לקוחות, ולקוח בודד אף פעם אינו נחתך.
 */
export const chunkCustomers = (customers, { maxCustomers, maxRows }) => {
  const chunks = [];
  let current = [];
  let rows = 0;

  customers.forEach((customer) => {
    const size = customer.rows.length;
    if (
      current.length > 0 &&
      (current.length >= maxCustomers || rows + size > maxRows)
    ) {
      chunks.push(current);
      current = [];
      rows = 0;
    }
    current.push(customer);
    rows += size;
  });

  if (current.length > 0) chunks.push(current);
  return chunks;
};

/**
 * צמצום לקוח לשדות שהשרת צריך, כדי לא לנפח את גוף הבקשה.
 */
export const toServerCustomer = (customer) => ({
  customerNumber: customer.customerNumber,
  customerName: customer.customerName || undefined,
  rows: customer.rows.map((row) => pickServerFields(row, SERVER_FIELDS)),
});

export default parseBulkPriceListFile;
