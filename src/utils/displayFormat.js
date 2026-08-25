// src/utils/displayFormat.js
// עיצוב ערכים לתצוגות "לקריאה בלבד" בפאנל (כרטיס לקוח, כרטיס מוצר).
// מוחזק במקום אחד כדי שכל המסכים יציגו את אותם נתונים באותה צורה.
import dayjs from "dayjs";

export const EMPTY = "—";

export const formatDate = (value) =>
  value && dayjs(value).isValid() ? dayjs(value).format("DD/MM/YYYY") : EMPTY;

export const formatDateTime = (value) =>
  value && dayjs(value).isValid() ? dayjs(value).format("DD/MM/YYYY HH:mm") : EMPTY;

// ── תאריך שמקורו בקובץ, ולא רגע בזמן ──
//
// תאריך בקובץ הנהח"ש הוא שעון-קיר ("30/06/2026 10:41") בלי אזור זמן, והוא
// נשמר כ-UTC. הצגתו ב-formatDate מתרגמת אותו לאזור הזמן של הצופה ומזיזה
// אותו: מסמך מ-22:00 היה מוצג ביום שאחריו. השעה עצמה אינה מוצגת בשום מקום,
// ולכן מה שנכון להראות הוא בדיוק את היום שכתוב בקובץ.
//
// ‏slice ולא dayjs.utc: התוסף utc אינו טעון בפרויקט, וטעינתו כאן הייתה
// משנה התנהגות גלובלית של dayjs בשביל שדה אחד.
export const formatFileDate = (value) => {
  if (!value) return EMPTY;
  const iso = value instanceof Date ? value.toISOString() : String(value);
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return formatDate(value);
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
};

// סכומים. 0 הוא ערך אמיתי (יתרה מאופסת, עלות שנשמרה כ-0 בקובץ) ולכן
// אינו הופך ל-"—". ברירת המחדל היא שקל: נתוני ההנהח"ש מגיעים במטבע ISL.
// מחירי החנות מעבירים את סמל המטבע מהגדרות החנות
export const formatMoney = (value, currency = "₪") =>
  value === null || value === undefined || value === ""
    ? EMPTY
    : `${Number(value).toLocaleString("he-IL", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} ${currency}`;

export const formatNumber = (value) =>
  value === null || value === undefined || value === ""
    ? EMPTY
    : Number(value).toLocaleString("he-IL", { maximumFractionDigits: 3 });

export const formatBool = (value, yes = "כן", no = "לא") =>
  value === null || value === undefined ? EMPTY : value ? yes : no;

export const text = (value) => {
  const clean = value === null || value === undefined ? "" : String(value).trim();
  return clean || EMPTY;
};
