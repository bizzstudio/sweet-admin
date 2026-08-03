// src/utils/customerFormat.js
// עיצוב ערכים ייחודי ללקוחות. הפורמטים הכלליים נמצאים ב-displayFormat.

// דומיין המייל הפנימי שיבוא האקסל מייצר ללקוח שאין לו כתובת אמיתית בקובץ
// (controller/customerController.js -> IMPORT_EMAIL_DOMAIN)
const PLACEHOLDER_EMAIL_DOMAIN = "@import.local";

export const isPlaceholderEmail = (email) =>
  String(email || "").toLowerCase().endsWith(PLACEHOLDER_EMAIL_DOMAIN);
