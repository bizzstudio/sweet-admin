// src/utils/erpCustomerExcel.js
// פענוח קובץ האקסל של ההנהח"ש ("רשימת לקוחות") לשורות מנורמלות.
// הנתונים בקובץ מעורבבים: בעמודות הטלפון מופיע גם שם איש קשר
// ("0526200824 עתליה"), ובעמודת האימייל לעיתים הערות או שני מיילים.
// לכן המייל והטלפון מחולצים מהטקסט, והשאר נשמר כאיש קשר/הערה.
//
// שתי כתובות מייל נפרדות יוצאות מכאן, ואסור לערבב ביניהן:
//   email        - עמודת "דואר אלקטרוני". זו הכתובת המרכזית של הלקוח:
//                  ההתחברות לחנות, החשבוניות וכל מה שנשלח.
//   contactEmail - הכתובת שהופיעה בתוך עמודת "איש קשר". פרט קשר בלבד,
//                  ולא נשלח אליה דבר.
// עד 09/2026 כתובת מעמודת "איש קשר" הועלתה להיות המייל הראשי כשהעמודה
// הראשית הייתה ריקה, וכך חשבוניות הגיעו לאיש הקשר. זה בוטל בכוונה.
import {
  buildAliasLookup,
  detectHeaderRow,
  extractEmail,
  extractPhone,
  pickServerFields,
  readSheetGrid,
  toBoolean,
  toDateISO,
  toNumber,
  toText,
} from "./erpExcel";

const COLUMN_ALIASES = {
  customerNumber: ["מספר"],
  name: ["שם"],
  mailingType: ["דוור"],
  address: ["כתובת"],
  city: ["עיר"],
  postalCode: ["מיקוד"],
  country: ["ארץ"],
  landline: ["טלפון קווי", "טלפון"],
  mobile: ["טלפון סלולרי", "סלולרי", "נייד"],
  fax: ["פקס"],
  email: ["דואר אלקטרוני", "אימייל", "מייל", "email"],
  contactPerson: ["איש קשר"],
  notes: ["הערות"],
  popupMessages: ["הודעות קופצות"],
  idNumber: ["מספר זהות", "תז"],
  birthDate: ["תאריך לידה"],
  active: ["פעיל"],
  points: ["נקודות"],
  paymentTerms: ["תנאי תשלום"],
  priceLevel: ["רמת מחירון"],
  username: ["שם משתמש"],
  openingBalance: ["יתרת פתיחה"],
  agent: ["סוכן"],
  customerType: ["סוג"],
  referredBy: ['הופנה עי'],
  openDate: ["תאריך פתיחה"],
  discountPercent: ["% הנחה", "אחוז הנחה"],
  lastPurchaseDate: ["תאריך קניה אחרון"],
  cumulativePurchase: ["קניה מצטברת"],
  credit: ["אשראי"],
};
// הערה: עמודת "סיסמא" מהאקסל לא ממופה בכוונה - סיסמאות לא מיובאות.

const REQUIRED_FIELDS = ["name", "customerNumber"];

const TEXT_FIELDS = [
  // customerNumber הוא טקסט ולא מספר בכוונה: הוא מזהה ההתאמה מול המערכת,
  // וקריאה כמספר הייתה הורסת אפסים מובילים ("007" -> 7) ומזהים לא-מספריים
  "customerNumber",
  "name",
  "address",
  "city",
  "postalCode",
  "country",
  "fax",
  "contactPerson",
  "notes",
  "popupMessages",
  "idNumber",
  "username",
  "agent",
  "customerType",
  "referredBy",
];

const NUMBER_FIELDS = [
  "mailingType",
  "points",
  "paymentTerms",
  "priceLevel",
  "openingBalance",
  "discountPercent",
  "cumulativePurchase",
  "credit",
];

const DATE_FIELDS = ["birthDate", "openDate", "lastPurchaseDate"];

const SERVER_FIELDS = [
  "rowNumber",
  "customerNumber",
  "name",
  "email",
  "contactEmail",
  "phone",
  "mobile",
  "landline",
  "address",
  "city",
  "postalCode",
  "country",
  "contactPerson",
  "notes",
  "idNumber",
  "active",
  "points",
  "discountPercent",
  "cumulativePurchase",
  "credit",
  "openingBalance",
  "agent",
  "customerType",
  "priceLevel",
  "paymentTerms",
  "birthDate",
  "openDate",
  "lastPurchaseDate",
];

const ALIAS_LOOKUP = buildAliasLookup(COLUMN_ALIASES);

// מאחד שאריות טקסט (שמות שהיו תקועים בתוך שדה טלפון/מייל) לערך אחד
const joinRest = (...parts) => {
  const seen = new Set();
  return parts
    .map((part) => toText(part))
    .filter((part) => {
      if (!part || seen.has(part)) return false;
      seen.add(part);
      return true;
    })
    .join(" | ");
};

/**
 * מפענח קובץ אקסל/CSV של רשימת הלקוחות ומחזיר שורות מנורמלות + סטטיסטיקה.
 * @param {File} file
 */
export const parseErpCustomersFile = async (file) => {
  const { grid } = await readSheetGrid(file);

  const header = detectHeaderRow(grid, ALIAS_LOOKUP, REQUIRED_FIELDS);
  if (header.index === -1) {
    throw new Error(
      'לא זוהתה שורת כותרות. ודא שהקובץ מכיל עמודות "שם" ו"מספר"'
    );
  }

  const rows = [];
  const invalidRows = [];
  const seenNumbers = new Set();
  const duplicateNumbers = [];
  const emailCounts = new Map();

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
    DATE_FIELDS.forEach((field) => {
      parsed[field] = toDateISO(readField(rawRow, field));
    });
    parsed.active = toBoolean(readField(rawRow, "active"));

    // חילוץ מייל וטלפונים מתאים שיכולים להכיל טקסט נוסף.
    // עמודת "איש קשר" מכילה בקובץ הזה לא מעט מיילים וטלפונים,
    // ולכן היא נסרקת גם היא ולא רק עמודות המייל והטלפון.
    const emailCell = extractEmail(readField(rawRow, "email"));
    const contactEmail = extractEmail(readField(rawRow, "contactPerson"));
    const contactPhone = extractPhone(contactEmail.rest);
    const mobileCell = extractPhone(readField(rawRow, "mobile"));
    const landlineCell = extractPhone(readField(rawRow, "landline"));

    // המייל הראשי מגיע *רק* מעמודת המייל. מה שנמצא בעמודת "איש קשר"
    // נשמר בנפרד ואינו הופך למייל של הלקוח - ראה ההערה בראש הקובץ
    parsed.email = emailCell.email;
    // אותה כתובת בדיוק בשתי העמודות (4 שורות בקובץ של 09/2026) אינה מייל
    // שני: היא הייתה מוצגת בכרטיס פעמיים ברצף ונראית כתקלה. במקרה הזה
    // הכתובת נשארת כמייל הראשי בלבד
    parsed.contactEmail =
      contactEmail.email === parsed.email ? "" : contactEmail.email;

    // עמודות הטלפון בקובץ מעורבבות (נייד בעמודת הקווי ולהיפך),
    // לכן הבחירה נעשית לפי צורת המספר ולא לפי העמודה שבה הוא נמצא
    const found = [mobileCell, landlineCell, contactPhone].filter((cell) => cell.phone);
    const mobiles = [...new Set(found.filter((c) => c.isMobile).map((c) => c.phone))];
    const others = [...new Set(found.filter((c) => !c.isMobile).map((c) => c.phone))];

    parsed.mobile = mobiles[0] || "";
    parsed.landline = others[0] || mobiles[1] || "";
    parsed.phone = mobiles[0] || others[0] || "";

    // כל מה שנשאר בתאים המעורבבים נשמר ולא נזרק
    parsed.contactPerson = joinRest(
      contactPhone.rest,
      mobileCell.rest,
      landlineCell.rest
    );
    parsed.notes = joinRest(parsed.notes, emailCell.rest, parsed.popupMessages);

    const isEmptyRow = !parsed.name && !parsed.customerNumber;
    if (isEmptyRow) continue;

    // החלטה מכוונת: לקוח מיובא גם בלי אימייל וגם בלי טלפון. המזהה שלו
    // נבנה בשרת ממספר הלקוח בהנהח"ש, ולכן אין שורה שנזרקת בגלל פרטי
    // קשר חסרים. אין להוסיף כאן דילוג על אימייל/טלפון.

    if (seenNumbers.has(parsed.customerNumber)) {
      duplicateNumbers.push(parsed.customerNumber);
    }
    seenNumbers.add(parsed.customerNumber);

    if (parsed.email) {
      emailCounts.set(parsed.email, (emailCounts.get(parsed.email) || 0) + 1);
    }

    rows.push(parsed);
  }

  const duplicateEmails = [...emailCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([email]) => email);

  return {
    fileName: file.name,
    headerRowNumber: header.index + 1,
    rows,
    invalidRows,
    duplicateNumbers: [...new Set(duplicateNumbers)],
    duplicateEmails,
    stats: buildStats(rows, invalidRows),
  };
};

const buildStats = (rows, invalidRows = []) => {
  let inactive = 0;

  rows.forEach((row) => {
    if (row.active === false) inactive += 1;
  });

  const skippedReasons = new Map();
  invalidRows.forEach((row) => {
    skippedReasons.set(row.reason, (skippedReasons.get(row.reason) || 0) + 1);
  });

  return {
    total: rows.length,
    inactive,
    skipped: invalidRows.length,
    skippedReasons: [...skippedReasons.entries()].map(([reason, count]) => ({
      reason,
      count,
    })),
  };
};

export const toServerRow = (row) => pickServerFields(row, SERVER_FIELDS);

export default parseErpCustomersFile;
