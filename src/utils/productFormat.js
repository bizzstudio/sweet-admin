// src/utils/productFormat.js
// עזרים לקריאת שדות מוצר שנשמרים בפורמט לא אחיד.

// המוצרים נשמרים עם tag כמחרוזת JSON, אבל במסד הוא מוגדר כ-[String],
// ולכן הוא יכול לחזור כמערך ריק (כל המוצרים שיובאו מהאקסל), כמערך רגיל,
// כמחרוזת JSON בתוך איבר יחיד או כמחרוזת שאינה JSON תקין.
// הפונקציה מחזירה תמיד מערך ולא זורקת שגיאה - JSON.parse ישיר על מערך
// ריק זורק "Unexpected end of JSON input" ומפיל את המסך כולו.
export const parseTag = (tag) => {
  if (!tag) return [];
  if (Array.isArray(tag)) {
    if (tag.length === 0) return [];
    if (tag.length > 1) return tag;
    tag = tag[0];
  }
  if (typeof tag !== "string") return [];
  const trimmed = tag.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [trimmed];
  }
};
