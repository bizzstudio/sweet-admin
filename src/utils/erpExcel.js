// src/utils/erpExcel.js
// ליבה משותפת לייבוא קבצי האקסל של ההנהח"ש (מוצרים, לקוחות).
// הקבצים מגיעים עם כמה שורות כותרת חופשיות מעל שורת שמות העמודות, ולכן
// שורת הכותרות מזוהה לפי שמות העמודות ולא לפי מספר שורה קבוע.
import * as XLSX from "xlsx";

// נרמול שם עמודה להשוואה: בלי גרשיים, מקפים ורווחים.
// כך "בר-קוד" / "ברקוד" / "בר קוד" זהים, וגם 'מע"מ' = 'מעמ'.
const normalizeHeader = (value) =>
  String(value ?? "")
    .replace(/["'`״׳]/g, "")
    .replace(/[-–—_]/g, "")
    .replace(/\s+/g, "")
    .trim()
    .toLowerCase();

export const buildAliasLookup = (columnAliases) =>
  Object.entries(columnAliases).reduce((acc, [field, aliases]) => {
    aliases.forEach((alias) => {
      acc[normalizeHeader(alias)] = field;
    });
    return acc;
  }, {});

export const toText = (value) => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
};

export const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const cleaned = String(value)
    .replace(/[^\d.,-]/g, "")
    .replace(/,/g, "");
  if (cleaned === "" || cleaned === "-") return null;
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
};

const TRUE_VALUES = new Set(["1", "כן", "yes", "true", "y", "v"]);
const FALSE_VALUES = new Set(["0", "לא", "no", "false", "n", ""]);

export const toBoolean = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const text = String(value).trim().toLowerCase();
  if (TRUE_VALUES.has(text)) return true;
  if (FALSE_VALUES.has(text)) return false;
  return null;
};

// תאריכים בקובץ מגיעים כמספר סידורי של אקסל (ימים מ-30/12/1899).
// ההמרה נעשית כאן ולא דרך cellDates של xlsx, כי שם התוצאה מוסטת
// בשעות אזור הזמן (46230 יצא 26/07 20:59 במקום 27/07 00:00).
const EXCEL_EPOCH_OFFSET_DAYS = 25569; // 30/12/1899 -> 01/01/1970
const MS_PER_DAY = 86400 * 1000;

export const toDateISO = (value) => {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  const serial = toNumber(value);
  // טווח סידורי שפוי: 1900 עד 2100 בקירוב. הגבול התחתון נמוך בכוונה,
  // אחרת תאריכי לידה לפני 1954 (סידורי < 20000) לא היו מומרים
  if (serial !== null && serial >= 1 && serial < 80000) {
    const ms = Math.round((serial - EXCEL_EPOCH_OFFSET_DAYS) * MS_PER_DAY);
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

/**
 * מחלץ כתובת מייל תקנית מתוך תא שיכול להכיל גם שמות, הערות או שני מיילים.
 * מחזיר את המייל הראשון שנמצא ואת שאר הטקסט בנפרד.
 */
export const extractEmail = (value) => {
  const text = toText(value).replace(/[‎‏‪-‮]/g, "");
  if (!text) return { email: "", rest: "" };

  const match = text.match(EMAIL_RE);
  if (!match) return { email: "", rest: text };

  const email = match[0].replace(/[.,;:]+$/, "").toLowerCase();
  const rest = text.replace(match[0], " ").replace(/\s+/g, " ").trim();
  return { email, rest };
};

// רצף של 7 ספרות ומעלה, עם מקפים/רווחים/סוגריים באמצע
const PHONE_RE = /(?:\+?\d[\d\-\s()]{5,}\d)/;

/**
 * מנרמל מספר ישראלי: מוריד קידומת בינלאומית ומשלים אפס מוביל חסר.
 * בקובץ ההנהח"ש מספרים שנשמרו כמספר איבדו את האפס
 * (526159260 -> 0526159260, 36090530 -> 036090530).
 */
const normalizeIsraeliPhone = (digits) => {
  let value = String(digits || "").replace(/\D/g, "");
  if (!value) return "";

  if (value.startsWith("972")) value = `0${value.slice(3)}`;
  if (value.startsWith("00972")) value = `0${value.slice(5)}`;

  if (!value.startsWith("0")) {
    // נייד / VoIP בלי אפס מוביל
    if (/^[57]\d{8}$/.test(value)) value = `0${value}`;
    // קווי בלי אפס מוביל
    else if (/^[234689]\d{7}$/.test(value)) value = `0${value}`;
  }

  return value;
};

const isMobilePhone = (phone) => /^05\d{8}$/.test(String(phone || ""));

/**
 * מחלץ מספר טלפון מתוך תא שיכול להכיל גם שם איש קשר,
 * למשל "0526200824 עתליה" או "ליאת0528459703".
 * מחזיר מספר מנורמל, סימון אם הוא נייד, ואת שאר הטקסט.
 */
export const extractPhone = (value) => {
  if (value === null || value === undefined || value === "") {
    return { phone: "", rest: "", isMobile: false };
  }

  if (typeof value === "number") {
    const phone = normalizeIsraeliPhone(value);
    return { phone, rest: "", isMobile: isMobilePhone(phone) };
  }

  const text = toText(value).replace(/[‎‏‪-‮]/g, "");
  const match = text.match(PHONE_RE);
  if (!match) return { phone: "", rest: text, isMobile: false };

  const raw = match[0].replace(/[^\d]/g, "");
  if (raw.length < 7) return { phone: "", rest: text, isMobile: false };

  const phone = normalizeIsraeliPhone(raw);
  const rest = text.replace(match[0], " ").replace(/\s+/g, " ").trim();
  return { phone, rest, isMobile: isMobilePhone(phone) };
};

/**
 * מזהה את שורת הכותרות: השורה עם מספר ההתאמות הגבוה ביותר,
 * בתנאי שהיא מכילה את כל השדות שחייבים להופיע.
 */
export const detectHeaderRow = (rows, aliasLookup, requiredFields, maxScan = 40) => {
  let best = { index: -1, matches: 0, map: {} };

  const limit = Math.min(rows.length, maxScan);
  for (let i = 0; i < limit; i++) {
    const row = rows[i] || [];
    const map = {};
    let matches = 0;

    row.forEach((cell, colIndex) => {
      const field = aliasLookup[normalizeHeader(cell)];
      // העמודה הראשונה שמתאימה לשדה מנצחת (למשל "קוד מטבע" לפני "קוד מטבע עלות")
      if (field && map[field] === undefined) {
        map[field] = colIndex;
        matches += 1;
      }
    });

    const hasRequired = requiredFields.every((field) => map[field] !== undefined);
    if (hasRequired && matches > best.matches) {
      best = { index: i, matches, map };
    }
  }

  return best;
};

// ── קידוד של קובצי CSV ──
//
// ‏CSV שיוצא מתוכנת ההנהח"ש נשמר ב-windows-1255 ולא ב-UTF-8. ‏xlsx מפענח
// מערך בתים כ-UTF-8, ולכן קובץ כזה היה מגיע כג'יבריש: שורת הכותרות לא הייתה
// מזוהה, וגם אם כן — שמות המוצרים והלקוחות היו נשמרים משובשים.
//
// הזיהוי הוא לפי התוצאה ולא לפי ניחוש: טקסט עברי ב-windows-1255 אינו UTF-8 תקין
// ולכן מייצר תווי החלפה (U+FFFD). קובץ UTF-8 תקין אינו מייצר אותם ונשאר כמו שהוא.
const decodeCsvBuffer = (buffer) => {
  const utf8 = new TextDecoder("utf-8").decode(buffer);
  if (!utf8.includes("�")) return utf8;
  try {
    return new TextDecoder("windows-1255").decode(buffer);
  } catch {
    return utf8;
  }
};

const isCsvFile = (file) => /\.(csv|txt)$/i.test(file?.name || "");

/**
 * קורא קובץ אקסל/CSV ומחזיר גריד של שורות.
 * blankrows: true נשמר בכוונה - כך האינדקס בגריד תואם למספר השורה
 * באקסל, ודיווחי השגיאות מפנים לשורה הנכונה בקובץ.
 */
export const readSheetGrid = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("קריאת הקובץ נכשלה"));

    reader.onload = (event) => {
      try {
        // cellDates: false בכוונה - התאריכים מומרים ב-toDateISO,
        // כי ההמרה של xlsx מסיטה את התוצאה בשעות אזור הזמן
        const workbook = isCsvFile(file)
          ? XLSX.read(decodeCsvBuffer(event.target.result), {
              type: "string",
              cellDates: false,
            })
          : XLSX.read(event.target.result, {
              type: "array",
              cellDates: false,
            });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throw new Error("לא נמצא גליון בקובץ");

        const grid = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
          header: 1,
          raw: true,
          defval: null,
          blankrows: true,
        });

        resolve({ grid });
      } catch (err) {
        reject(err);
      }
    };

    reader.readAsArrayBuffer(file);
  });

// מצמצם שורה לשדות שהשרת צריך, כדי לא לנפח את גוף הבקשה
export const pickServerFields = (row, fields) =>
  fields.reduce((acc, field) => {
    const value = row[field];
    if (value !== null && value !== undefined && value !== "") acc[field] = value;
    return acc;
  }, {});
