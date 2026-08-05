// בדיקות לפענוח קובץ מחירון של לקוח.
//
// מה הן שומרות עליו: קובצי המחירון מגיעים מההנהח"ש עם שורות כותרת חופשיות מעל
// שורת שמות העמודות, עם שמות עמודות שנכתבים בכמה וריאציות ('מק"ט' / "מקט"),
// ועם מק"טים שאקסל קורא כמספר ולא כטקסט. כל אחד מאלה שובר את היבוא בשקט:
// המחירון נשמר, לא זורק שגיאה — ופשוט לא תופס באף הזמנה.

import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";

import {
  parseCustomerPriceListFile,
  toServerRow,
} from "@/utils/customerPriceListExcel";

// בניית קובץ xlsx אמיתי מגריד, כדי שהבדיקה תעבור באותו נתיב קריאה כמו בדפדפן
const makeFile = (grid, name = "מחירון.xlsx") => {
  const sheet = XLSX.utils.aoa_to_sheet(grid);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "גיליון1");
  const buffer = XLSX.write(book, { type: "array", bookType: "xlsx" });
  return new File([buffer], name, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
};

describe("parseCustomerPriceListFile", () => {
  it("קורא מק\"ט, שם ומחיר גם כששורת הכותרות אינה הראשונה", async () => {
    const file = makeFile([
      ["מחירון ללקוח 1042", null, null],
      [null, null, null],
      ['מק"ט', "שם המוצר", "מחיר"],
      ["1001", "תמרים מג'הול", 24.9],
      [1002, "פקאן מסוכר", 31],
    ]);

    const result = await parseCustomerPriceListFile(file);

    expect(result.headerRowNumber).toBe(3);
    expect(result.hasNameColumn).toBe(true);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      rowNumber: 4,
      sku: "1001",
      name: "תמרים מג'הול",
      price: 24.9,
    });
    // מק"ט שאקסל קרא כמספר נשמר כטקסט — הוא מזהה ההתאמה מול הקטלוג
    expect(result.rows[1].sku).toBe("1002");
    expect(result.stats).toMatchObject({ total: 2, minPrice: 24.9, maxPrice: 31 });
  });

  it("מזהה את העמודות גם בשמות חלופיים ובלי עמודת שם", async () => {
    const file = makeFile([
      ["מקט פנימי", "מחיר ללקוח"],
      ["7", 9.5],
    ]);

    const result = await parseCustomerPriceListFile(file);

    expect(result.hasNameColumn).toBe(false);
    expect(result.rows).toEqual([
      { rowNumber: 2, sku: "7", name: "", price: 9.5 },
    ]);
  });

  it("מדלג על שורות בלי מק\"ט, בלי מחיר או עם מחיר לא חיובי, ומדווח למה", async () => {
    const file = makeFile([
      ['מק"ט', "שם המוצר", "מחיר"],
      ["1001", "תקין", 10],
      [null, "בלי מקט", 12],
      ["1003", "בלי מחיר", null],
      ["1004", "מחיר אפס", 0],
      ["1005", "מחיר שלילי", -3],
      [null, null, null], // שורה ריקה — אינה שגיאה
    ]);

    const result = await parseCustomerPriceListFile(file);

    expect(result.rows).toHaveLength(1);
    expect(result.stats.skipped).toBe(4);
    expect(result.stats.skippedReasons).toEqual(
      expect.arrayContaining([
        { reason: 'חסר מק"ט', count: 1 },
        { reason: "חסר מחיר", count: 1 },
        { reason: "מחיר אינו חיובי", count: 2 },
      ])
    );
  });

  it("מסמן מק\"טים כפולים בקובץ בלי להפיל את הפענוח", async () => {
    const file = makeFile([
      ['מק"ט', "מחיר"],
      ["1001", 10],
      ["1001", 12],
    ]);

    const result = await parseCustomerPriceListFile(file);

    // שתי השורות נשלחות; השרת לוקח את האחרונה. הכפילות מדווחת למסך
    expect(result.rows).toHaveLength(2);
    expect(result.duplicateSkus).toEqual(["1001"]);
  });

  it("זורק שגיאה מפורשת כשאין שורת כותרות מזוהה", async () => {
    const file = makeFile([
      ["סתם", "טבלה"],
      [1, 2],
    ]);

    await expect(parseCustomerPriceListFile(file)).rejects.toThrow(
      /לא זוהתה שורת כותרות/
    );
  });

  it("toServerRow משאיר רק את השדות שהשרת צריך", async () => {
    const row = { rowNumber: 4, sku: "1001", name: "", price: 24.9, extra: "x" };
    expect(toServerRow(row)).toEqual({ rowNumber: 4, sku: "1001", price: 24.9 });
  });
});
