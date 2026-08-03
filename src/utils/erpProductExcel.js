// src/utils/erpProductExcel.js
// פענוח קובץ האקסל של ההנהח"ש ("רשימת המוצרים - כל הספקים") לשורות מנורמלות.
import {
  buildAliasLookup,
  detectHeaderRow,
  pickServerFields,
  readSheetGrid,
  toBoolean,
  toNumber,
  toText,
} from "./erpExcel";

// כל שדה ושמות העמודות שיכולים להצביע עליו (ההשוואה על טקסט מנורמל)
const COLUMN_ALIASES = {
  name: ["שם המוצר", "שם מוצר"],
  nameEn: ["שם באנגלית", "שם המוצר באנגלית"],
  unit: ["יחידת מידה", "יחידה"],
  groupName: ["שם קבוצה"],
  sku: ["מקט", "מקט פנימי"],
  externalSku: ["מקט חיצוני"],
  barcode: ["בר קוד", "ברקוד"],
  barcode2: ["בר קוד נוסף", "ברקוד נוסף"],
  active: ["פעיל"],
  supplierSku: ["מקט ספק"],
  trackStock: ["לעדכן מלאי"],
  stock: ["מלאי"],
  priceIncVat: ["צרכן כולל מעמ", "צרכן מעמ"],
  priceExVat: ["צרכן ללא מעמ"],
  storePriceIncVat: ["חנות כולל מעמ", "חנות מעמ"],
  storePriceExVat: ["חנות ללא מעמ"],
  distributorPriceExVat: ["משווק ללא מעמ"],
  distributorPriceIncVat: ["משווק מעמ", "משווק כולל מעמ"],
  specialPriceExVat: ["מיוחד ללא מעמ"],
  hasVat: ["עם מעמ"],
  currency: ["קוד מטבע"],
  cost: ["עלות"],
  notes: ["הערות"],
  costCurrency: ["קוד מטבע עלות"],
  supplierNumber: ["מספר ספק"],
  supplierName: ["שם הספק"],
  groupCode: ["קבוצה"],
  departmentCode: ["מחלקה"],
};

// שדות שבלעדיהם אין משמעות לייבוא
const REQUIRED_FIELDS = ["name", "sku"];

const TEXT_FIELDS = [
  "name",
  "nameEn",
  "unit",
  "groupName",
  "sku",
  "externalSku",
  "barcode",
  "barcode2",
  "supplierSku",
  "currency",
  "costCurrency",
  "notes",
  "supplierName",
];

const NUMBER_FIELDS = [
  "stock",
  "priceIncVat",
  "priceExVat",
  "storePriceIncVat",
  "storePriceExVat",
  "distributorPriceExVat",
  "distributorPriceIncVat",
  "specialPriceExVat",
  "cost",
  "supplierNumber",
  "groupCode",
  "departmentCode",
];

const BOOLEAN_FIELDS = ["active", "trackStock", "hasVat"];

// עמודות שנשלחות לשרת (השאר משמש רק לסטטיסטיקה בתצוגה המקדימה)
const SERVER_FIELDS = [
  "rowNumber",
  "name",
  "nameEn",
  "sku",
  "groupName",
  "unit",
  "barcode",
  "barcode2",
  "externalSku",
  "supplierSku",
  "supplierName",
  "supplierNumber",
  "groupCode",
  "departmentCode",
  "currency",
  "notes",
  "cost",
  "stock",
  "active",
  "trackStock",
  "hasVat",
  "priceIncVat",
  "priceExVat",
  "storePriceIncVat",
  "storePriceExVat",
];

const ALIAS_LOOKUP = buildAliasLookup(COLUMN_ALIASES);

/**
 * מפענח קובץ אקסל/CSV של רשימת המוצרים ומחזיר שורות מנורמלות + סטטיסטיקה.
 * @param {File} file
 */
export const parseErpProductsFile = async (file) => {
  const { grid } = await readSheetGrid(file);

  const header = detectHeaderRow(grid, ALIAS_LOOKUP, REQUIRED_FIELDS);
  if (header.index === -1) {
    throw new Error(
      'לא זוהתה שורת כותרות. ודא שהקובץ מכיל עמודות "שם המוצר" ו"מקט"'
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

    const parsed = { rowNumber };
    TEXT_FIELDS.forEach((field) => {
      parsed[field] = toText(readField(rawRow, field));
    });
    NUMBER_FIELDS.forEach((field) => {
      parsed[field] = toNumber(readField(rawRow, field));
    });
    BOOLEAN_FIELDS.forEach((field) => {
      parsed[field] = toBoolean(readField(rawRow, field));
    });

    if (!parsed.name && !parsed.sku) continue;

    if (!parsed.name) {
      invalidRows.push({ ...parsed, reason: "חסר שם מוצר" });
      continue;
    }
    if (!parsed.sku) {
      invalidRows.push({ ...parsed, reason: 'חסר מק"ט' });
      continue;
    }

    if (seenSkus.has(parsed.sku)) duplicateSkus.push(parsed.sku);
    seenSkus.add(parsed.sku);

    rows.push(parsed);
  }

  return {
    fileName: file.name,
    headerRowNumber: header.index + 1,
    rows,
    invalidRows,
    duplicateSkus: [...new Set(duplicateSkus)],
    stats: buildStats(rows),
  };
};

// סטטיסטיקה לתצוגה המקדימה - כדי שיהיה ברור מה באמת יש בקובץ
const buildStats = (rows) => {
  const groups = new Map();
  // רק מחיר כולל מע"מ יכול להיכנס לחנות (המחיר שם הוא מחיר סופי ללקוח),
  // ולכן הספירה מפרידה בין מחיר שייובא לבין מחיר שקיים אך לא ישמש
  let withVatInclusivePrice = 0;
  let withExVatPriceOnly = 0;
  let withoutAnyPrice = 0;
  let negativeStock = 0;
  let inactive = 0;

  rows.forEach((row) => {
    const group = row.groupName || "";
    groups.set(group, (groups.get(group) || 0) + 1);

    const vatInclusive = row.priceIncVat > 0 || row.storePriceIncVat > 0;
    const exVatOnly =
      !vatInclusive && (row.priceExVat > 0 || row.storePriceExVat > 0);
    if (vatInclusive) withVatInclusivePrice += 1;
    else if (exVatOnly) withExVatPriceOnly += 1;
    else withoutAnyPrice += 1;

    if (row.stock !== null && row.stock < 0) negativeStock += 1;
    if (row.active === false) inactive += 1;
  });

  return {
    total: rows.length,
    withVatInclusivePrice,
    withExVatPriceOnly,
    withoutAnyPrice,
    negativeStock,
    inactive,
    groups: [...groups.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
  };
};

export const toServerRow = (row) => pickServerFields(row, SERVER_FIELDS);


export default parseErpProductsFile;
