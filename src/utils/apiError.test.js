// בדיקות ל-describeApiError.
//
// מה הן שומרות עליו: שני מקרים שכבר נשברו בפועל.
//   1. ‏404 בלי גוף JSON — express מחזיר אותו לנתיב שאינו קיים, ו-axios מתרגם
//      אותו ל-"Request failed with status code 404". ההודעה הזו נראית כמו תקלה
//      בנתונים, בזמן שהסיבה היא שרת שמריץ גרסה קודמת.
//   2. שגיאה **מקומית** (פענוח אקסל שנכשל) אינה שגיאת רשת. בגרסה קודמת היא
//      נפלה לענף "לא הצלחנו להגיע לשרת" כי אין לה `response` — כלומר המשתמש
//      קיבל אבחנה שגויה במקום לדעת מה לא בסדר בקובץ שלו.

import { describe, expect, it } from "vitest";

import { describeApiError } from "@/utils/apiError";

// שגיאת axios מזויפת, במבנה שהיא מגיעה בו בפועל
const axiosError = ({ status, data, withRequest = true }) => {
  const err = new Error(`Request failed with status code ${status}`);
  err.isAxiosError = true;
  if (withRequest) err.request = {};
  err.response = { status, data };
  return err;
};

describe("describeApiError", () => {
  it("מעדיף את ההודעה שהשרת עצמו החזיר", () => {
    const err = axiosError({ status: 404, data: { message: "לקוח לא נמצא" } });
    expect(describeApiError(err)).toBe("לקוח לא נמצא");
  });

  it("מתרגם 404 בלי גוף JSON לשרת שמריץ גרסה קודמת", () => {
    const err = axiosError({ status: 404, data: "<html>Cannot GET /api/x</html>" });
    expect(describeApiError(err)).toMatch(/גרסה קודמת/);
    // ולא ההודעה הגנרית של axios
    expect(describeApiError(err)).not.toMatch(/status code/);
  });

  it("מתרגם 401 ו-403 ו-413 להודעות מדויקות", () => {
    expect(describeApiError(axiosError({ status: 401, data: {} }))).toMatch(/הזדהות/);
    expect(describeApiError(axiosError({ status: 403, data: {} }))).toMatch(/הרשאה/);
    expect(describeApiError(axiosError({ status: 413, data: {} }))).toMatch(/גדולה מדי/);
  });

  it("מזהה בקשה שלא קיבלה תשובה בכלל כתקלת חיבור", () => {
    const err = new Error("Network Error");
    err.isAxiosError = true;
    err.request = {};
    expect(describeApiError(err)).toMatch(/לא הצלחנו להגיע לשרת/);
  });

  it("מחזיר שגיאה מקומית כמו שהיא ולא כתקלת רשת", () => {
    const local = new Error("לא נמצאו שורות מחירון תקינות בקובץ");
    expect(describeApiError(local)).toBe("לא נמצאו שורות מחירון תקינות בקובץ");
    expect(describeApiError(local)).not.toMatch(/שרת/);
  });

  it("נופל ל-fallback כשאין שום מידע", () => {
    expect(describeApiError(null, "הפעולה נכשלה")).toBe("הפעולה נכשלה");
    expect(describeApiError(new Error(""), "ברירת מחדל")).toBe("ברירת מחדל");
  });
});
