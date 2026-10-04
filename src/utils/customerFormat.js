// src/utils/customerFormat.js
// עיצוב ערכים ייחודי ללקוחות. הפורמטים הכלליים נמצאים ב-displayFormat.

// דומיין המייל הפנימי שיבוא האקסל מייצר ללקוח שאין לו כתובת אמיתית בקובץ
// (controller/customerController.js -> IMPORT_EMAIL_DOMAIN)
const PLACEHOLDER_EMAIL_DOMAIN = "@import.local";

export const isPlaceholderEmail = (email) =>
  String(email || "").toLowerCase().endsWith(PLACEHOLDER_EMAIL_DOMAIN);

// אותה צורה שהשרת בודק למייל איש הקשר (sweet-backend/lib/icount/clients.js
// -> EMAIL_SHAPE). שתי הגדרות שונות של "מה נחשב מייל" היו נותנות כאן אישור
// ובשרת דחייה
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// בדיקות המייל של טופס הלקוח, במקום הבדיקה של הדפדפן לשדה type="email".
// הדפדפן חוסם את השמירה בבועה שנעלמת מיד ולא אומרת בעברית מה לתקן - כך
// הלקוחה נתקעה עם "שגיאה" בכל ניסיון לרשום איש קשר (04/10/26).
// מחזירות true או את הודעת השגיאה, כמו validate של react-hook-form

// המייל הראשי: רק צורה בסיסית ולא EMAIL_SHAPE. השרת אינו בודק את צורתו,
// ובדיקה קשוחה יותר הייתה חוסמת שמירה של כרטיסים קיימים בגלל מייל ישן
// שאיש לא נגע בו. המזהה הפנימי של היבוא עובר בכוונה
export const validatePrimaryEmail = (value) =>
  /^[^\s@]+@[^\s@]+$/.test(String(value || "").trim()) ||
  "אימייל אינו כתובת מייל תקינה (למשל name@example.com)";

// מייל איש הקשר: ריק מותר (ניקוי השדה), והמזהה הפנימי נדחה כמו בשרת
export const validateContactEmail = (value) => {
  const email = String(value || "").trim();
  if (!email) return true;
  return (
    (EMAIL_SHAPE.test(email) && !isPlaceholderEmail(email)) ||
    "מייל איש קשר אינו כתובת מייל תקינה (למשל name@example.com). שם או טלפון של איש הקשר לא נכתבים כאן"
  );
};
