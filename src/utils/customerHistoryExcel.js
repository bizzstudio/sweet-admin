// src/utils/customerHistoryExcel.js
// פענוח קובץ "היסטוריה ללקוח" מההנהח"ש: שורת מסמך אחת לכל שורה בקובץ.
//
// הקובץ מגיע כרשימת שורות מסמך ולא כרשימת מוצרים — אותו מק"ט חוזר בכל תעודת
// משלוח שבה נקנה. הסיכום למוצר אחד לכל מק"ט נעשה **בשרת** ולא כאן, מאותה סיבה
// שהמחירון מסתכם שם: מה שהדפדפן שולח אינו נתון מהימן, וספירה שהגיעה מבחוץ
// הייתה קובעת אילו שורות יאושרו אוטומטית בהזמנות עתידיות.
//
// עמודת **מקט** היא המפתח היחיד להתאמה מול הקטלוג. השם נשמר לתצוגה ולאימות
// (מק"ט ששמו בקובץ רחוק מהשם בקטלוג מסמן עמודה שהוזזה), ולא להתאמה.
import {
  buildAliasLookup,
  detectHeaderRow,
  pickServerFields,
  readSheetGrid,
  toDateISO,
  toNumber,
  toText,
} from "./erpExcel";

const COLUMN_ALIASES = {
  sku: ["מקט", "מקט פנימי", "קוד מוצר", "קוד", "sku"],
  name: ["שם המוצר", "שם מוצר", "שם", "תאור", "תיאור", "פריט"],
  date: ["תאריך", "תאריך מסמך", "date"],
  quantity: ["כמות", "כמות שנמכרה", "qty", "quantity"],
  price: ["מחיר", "מחיר יחידה", "price"],
  docType: ["מסמך", "סוג מסמך", "סוג"],
  docNumber: ["מספר", "מספר מסמך", "אסמכתא"],
  customerNumber: ["מספר לקוח", "קוד לקוח", "לקוח"],
};

// ── מה חייב להופיע כדי שנזהה את שורת הכותרות ──
//
// המק"ט לבדו אינו מספיק: בקובץ ההנהח"ש יש כמה עמודות מספריות ("מספר",
// "מספר לקוח", "בר-קוד"), ושורת כותרות שזוהתה לפי עמודה אחת יכולה להיות
// השורה הלא נכונה. הצירוף מק"ט + שם מוצר מופיע רק בשורת הכותרות האמיתית.
const REQUIRED_FIELDS = ["sku", "name"];

const SERVER_FIELDS = [
  "rowNumber",
  "sku",
  "name",
  "date",
  "quantity",
  "price",
  "docType",
  "docNumber",
];

const ALIAS_LOOKUP = buildAliasLookup(COLUMN_ALIASES);

// ── שורות שאינן מוצר ──
//
// בקובץ הדוגמה: "ריכוז תעודות משלוח" (מק"ט 3570, 1319.38 ש"ח) — שורת סיכום
// שההנהח"ש מדפיסה בתוך רשימת השורות. המק"ט שלה קיים בקטלוג, ולכן אין דרך
// לזהות אותה מלבד השם.
//
// הרשימה מכוונת להיות צרה. שורה שסוננה בטעות רק מחסירה אות מהפרופיל, ושורת
// זבל שנשארה כמעט לעולם לא תופיע כמועמדת להזמנה — שני הכיוונים זולים, אבל
// הראשון מוחק מידע אמיתי. "פיקדון" אינו כאן במפורש: הוא מוצר לכל דבר בקובץ.
// ‏(\s|$) ולא \b: גבול מילה ברגקס מוגדר על [A-Za-z0-9_] בלבד, ואות עברית
// אינה תו מילה. ‏/^ריכוז\b/ אינו תופס את "ריכוז תעודות משלוח" — שני הצדדים
// אינם תווי מילה ולכן אין מעבר. הגרסה הראשונה כאן נכתבה כך ולא סיננה כלום.
const NON_PRODUCT_PATTERNS = [
  /^ריכוז(\s|$)/,
  /^סה["'׳״]?כ(\s|$)/,
  /^עיגול(\s|$)/,
  /^הפרשי\s/,
];

const isNonProductRow = (name) => NON_PRODUCT_PATTERNS.some((re) => re.test(name.trim()));

// ── תאריך dd/mm/yyyy, ולמה הוא לא עובר דרך toDateISO ──
//
// ‏toDateISO נופל בסוף על `new Date(String(value))`, והפורמט בקובץ הזה הוא
// יום/חודש/שנה. שני כשלים נמדדו על קובץ הדוגמה:
//
//     "30/06/2026 10:41"  ->  Invalid Date   (נבלע, השורה מאבדת תאריך)
//     "05/06/2026 10:41"  ->  6 במאי         (במקום 5 ביוני!)
//
// השני מסוכן יותר מהראשון: הוא שקט. כל תאריך שהיום בו קטן מ-13 נקרא הפוך,
// ודירוג הרלוונטיות בצינור (utils/purchaseHistoryRanking) נשען בדיוק על
// התאריך הזה — כלומר "מה הלקוח קנה לאחרונה" היה מחושב על נתונים הפוכים.
//
// ‏Date.UTC ולא בנאי מקומי: בנייה באזור זמן מקומי מזיזה את התוצאה ליום הקודם
// כשממירים ל-ISO, וזו בדיוק התקלה שתועדה ב-toDateISO על סדרות אקסל.
const DMY_RE = /^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})(?:[\sT]+(\d{1,2}):(\d{2}))?/;

export const parseHistoryDate = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  // מספר סידורי של אקסל — אותה המרה בדיוק כמו בשאר היבואים
  if (typeof value === "number") return toDateISO(value);

  const match = DMY_RE.exec(String(value).trim());
  if (!match) return toDateISO(value);

  const [, d, m, y, hh, mm] = match;
  const day = Number(d);
  const month = Number(m);
  // שנה דו-ספרתית בקובץ הנהח"ש היא תמיד המאה הזו — אין היסטוריית רכש מ-1926
  const year = y.length <= 2 ? 2000 + Number(y) : Number(y);

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(Date.UTC(year, month - 1, day, Number(hh) || 0, Number(mm) || 0));
  // ‏31/02 היה "מתגלגל" ל-3 במרץ בלי הבדיקה הזו — תאריך שגוי במקום שורה פסולה
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;

  return date.toISOString();
};

/**
 * מפענח קובץ היסטוריית רכישות של לקוח ומחזיר שורות מנורמלות + סטטיסטיקה.
 * @param {File} file
 */
export const parseCustomerHistoryFile = async (file) => {
  // ‏rawCells: הקובץ כותב יום/חודש/שנה, ו-xlsx מפרש תאי CSV בסדר האמריקאי —
  // "04/12/2025" היה חוזר כ-12 באפריל במקום 4 בדצמבר, כמספר סידורי שנראה
  // תקין לחלוטין. ראה ההסבר המלא ב-readSheetGrid.
  const { grid } = await readSheetGrid(file, { rawCells: true });

  const header = detectHeaderRow(grid, ALIAS_LOOKUP, REQUIRED_FIELDS);
  if (header.index === -1) {
    throw new Error(
      'לא זוהתה שורת כותרות. ודא שהקובץ מכיל עמודת "מק"ט" ועמודת "שם המוצר"'
    );
  }

  const rows = [];
  const invalidRows = [];
  const skus = new Set();
  const customerNumbers = new Set();
  let earliest = null;
  let latest = null;

  const readField = (row, field) => {
    const colIndex = header.map[field];
    return colIndex === undefined ? null : row[colIndex];
  };

  for (let i = header.index + 1; i < grid.length; i++) {
    const rawRow = grid[i] || [];
    const rowNumber = i + 1; // מספר השורה כפי שהוא נראה באקסל

    const sku = toText(readField(rawRow, "sku"));
    const name = toText(readField(rawRow, "name"));
    const quantity = toNumber(readField(rawRow, "quantity"));
    const price = toNumber(readField(rawRow, "price"));
    const date = parseHistoryDate(readField(rawRow, "date"));
    const docType = toText(readField(rawRow, "docType"));
    const docNumber = toText(readField(rawRow, "docNumber"));
    const customerNumber = toText(readField(rawRow, "customerNumber"));

    // שורה ריקה לגמרי — קובצי ההנהח"ש מפרידים בשורות ריקות. לא שגיאה.
    if (!sku && !name && quantity === null && price === null) continue;

    if (!sku) {
      invalidRows.push({ rowNumber, sku, name, reason: 'חסר מק"ט' });
      continue;
    }
    if (isNonProductRow(name)) {
      invalidRows.push({ rowNumber, sku, name, reason: "שורת סיכום ולא מוצר" });
      continue;
    }

    // ── שורה בלי תאריך אינה נפסלת ──
    //
    // התאריך קובע רלוונטיות, לא קיום: "הלקוח קנה את זה" נכון גם בלי לדעת מתי,
    // והדירוג מטפל בחוסר במפורש (פריט בלי תאריך אינו מכריע לבדו). פסילת השורה
    // הייתה מוחקת את הראיה כולה בגלל עמודה חסרה אחת.
    if (date) {
      if (!earliest || date < earliest) earliest = date;
      if (!latest || date > latest) latest = date;
    }

    if (customerNumber) customerNumbers.add(customerNumber);
    skus.add(sku);

    rows.push({
      rowNumber,
      sku,
      name: name || undefined,
      date: date || undefined,
      quantity: quantity === null ? undefined : quantity,
      price: price === null ? undefined : price,
      docType: docType || undefined,
      docNumber: docNumber || undefined,
    });
  }

  return {
    fileName: file.name,
    headerRowNumber: header.index + 1,
    // ── מספר הלקוח שבקובץ ──
    //
    // מוחזר כדי שאפשר יהיה להשוות אותו ל-erp.customerNumber שבכרטיס לפני
    // היבוא. העלאת היסטוריה של לקוח אחד על כרטיס של אחר היא הכשל הסביר ביותר
    // בהעלאה פר-לקוח, והיא מרעילה את ההזמנות שלו בשקט — הפרופיל ייראה תקין
    // לגמרי ויכריע שורות לפי מה שלקוח אחר קונה.
    //
    // יותר ממספר אחד בקובץ פירושו ייצוא של כמה לקוחות; מי שמשווה יראה זאת.
    customerNumbers: [...customerNumbers],
    rows,
    invalidRows,
    stats: buildStats(rows, invalidRows, skus, earliest, latest),
  };
};

const buildStats = (rows, invalidRows, skus, earliest, latest) => {
  const skippedReasons = new Map();
  invalidRows.forEach((row) => {
    skippedReasons.set(row.reason, (skippedReasons.get(row.reason) || 0) + 1);
  });

  return {
    total: rows.length,
    distinctSkus: skus.size,
    // כמה שורות אין להן תאריך. מוצג כי היסטוריה בלי תאריכים עדיין שימושית,
    // אבל היא מאבדת את דירוג הרלוונטיות — וזה הבדל שמי שמעלה צריך לדעת עליו.
    withoutDate: rows.filter((row) => !row.date).length,
    from: earliest,
    to: latest,
    skipped: invalidRows.length,
    skippedReasons: [...skippedReasons.entries()].map(([reason, count]) => ({
      reason,
      count,
    })),
  };
};

export const toServerRow = (row) => pickServerFields(row, SERVER_FIELDS);

export default parseCustomerHistoryFile;
