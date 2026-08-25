// בדיקות ל-formatFileDate.
//
// מה היא שומרת עליו: תאריך בקובץ ההנהח"ש הוא שעון-קיר בלי אזור זמן, והוא
// נשמר כ-UTC. הצגתו דרך formatDate (שמתרגם לאזור הזמן של הצופה) מזיזה מסמך
// שנוצר בערב ליום שאחריו — תאריך שגוי שנראה תקין לגמרי.

import { describe, expect, it } from "vitest";

import { EMPTY, formatFileDate } from "@/utils/displayFormat";

describe("formatFileDate", () => {
  it("מציג את היום שכתוב בקובץ ולא את זה של אזור הזמן המקומי", () => {
    // ב-UTC+3 התאריך הזה נקרא כ-1 ביולי בתצוגה מקומית
    expect(formatFileDate("2026-06-30T22:00:00.000Z")).toBe("30/06/2026");
    expect(formatFileDate("2025-09-15T11:21:00.000Z")).toBe("15/09/2025");
  });

  it("מקבל גם אובייקט Date", () => {
    expect(formatFileDate(new Date("2026-06-08T00:30:00.000Z"))).toBe("08/06/2026");
  });

  it("ערך ריק מוצג כמקף", () => {
    expect(formatFileDate(null)).toBe(EMPTY);
    expect(formatFileDate("")).toBe(EMPTY);
    expect(formatFileDate(undefined)).toBe(EMPTY);
  });

  it("ערך שאינו ISO נופל לעיצוב הרגיל ולא מחזיר זבל", () => {
    expect(formatFileDate("לא תאריך")).toBe(EMPTY);
  });
});
