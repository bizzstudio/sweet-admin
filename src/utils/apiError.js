// src/utils/apiError.js
// תרגום שגיאה להודעה שאומרת למשתמש מה לעשות.
//
// למה זה קיים: ‏axios מחזיר "Request failed with status code 404" כשהשרת ענה
// בלי גוף JSON — וזו בדיוק התשובה של express לנתיב שאינו קיים. ההודעה הזו
// נראית כמו תקלה בנתונים ("הלקוח לא נמצא") בזמן שהסיבה האמיתית היא ששרת ה-API
// מריץ גרסה שאין בה עוד את הנתיב, כלומר צריך לפרוס או להפעיל אותו מחדש.

// הודעה מהשרת עצמו קודמת לכל ניחוש — היא כתובה לבן אדם וממוקדת יותר
const serverMessage = (err) => {
  const message = err?.response?.data?.message;
  return typeof message === "string" && message.trim() ? message.trim() : "";
};

// ── רק שגיאות axios מתורגמות ──
//
// הפונקציה מקבלת גם שגיאות מקומיות (פענוח אקסל שנכשל, קובץ גדול מדי), ולהן יש
// הודעה מדויקת משלהן. בלי ההבחנה הזו שגיאה מקומית — שאין לה `response` — הייתה
// נופלת לענף "לא הצלחנו להגיע לשרת", כלומר המשתמש היה מקבל אבחנה שגויה על
// תקלת רשת במקום לדעת מה לא בסדר בקובץ שלו.
const isAxiosError = (err) =>
  Boolean(err?.isAxiosError || err?.response || err?.request);

/**
 * @param {Error} err - שגיאת axios או שגיאה מקומית
 * @param {string} [fallback] - מה להגיד כשאין לנו שום דבר טוב יותר
 * @returns {string} הודעה בעברית
 */
export const describeApiError = (err, fallback = "הפעולה נכשלה") => {
  const fromServer = serverMessage(err);
  if (fromServer) return fromServer;

  // שגיאה מקומית — ההודעה שלה היא התשובה
  if (!isAxiosError(err)) return err?.message || fallback;

  const status = err?.response?.status;

  // 404 בלי גוף JSON = הנתיב אינו קיים בשרת שאליו האדמין מדבר
  if (status === 404) {
    return "הנתיב לא נמצא בשרת ה-API. נראה שהשרת מריץ גרסה קודמת — יש לפרוס אותו מחדש או להפעיל אותו מחדש.";
  }
  if (status === 401) {
    return "ההזדהות נכשלה. יש לצאת ולהיכנס לחשבון מחדש.";
  }
  if (status === 403) {
    return "אין לך הרשאה לפעולה הזו.";
  }
  if (status === 413) {
    return "הבקשה גדולה מדי לשרת. יש לפצל את הקובץ.";
  }
  // בקשה שיצאה ולא קיבלה תשובה בכלל — השרת לא זמין או שהכתובת שגויה
  if (!err?.response) {
    return "לא הצלחנו להגיע לשרת ה-API. יש לבדוק שהשרת פועל ושכתובת ה-API נכונה.";
  }

  return err?.message || fallback;
};

export default describeApiError;
