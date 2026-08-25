// בדיקות לפענוח קובץ "היסטוריה ללקוח".
//
// מה הן שומרות עליו: הקובץ הזה קובע אילו שורות הזמנה יאושרו אוטומטית בעתיד,
// ולכן טעות בפענוח אינה "יבוא שנכשל" אלא מוצר שגוי שנכנס להזמנה בשקט. שני
// הדברים הרגישים כאן הם התאריך (שקובע רלוונטיות) והמק"ט (שהוא מפתח ההתאמה
// היחיד מול הקטלוג).

import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";

import {
  parseCustomerHistoryFile,
  parseHistoryDate,
  toServerRow,
} from "@/utils/customerHistoryExcel";

// בניית קובץ xlsx אמיתי מגריד, כדי שהבדיקה תעבור באותו נתיב קריאה כמו בדפדפן
const makeFile = (grid, name = "היסטוריה.xlsx") => {
  const sheet = XLSX.utils.aoa_to_sheet(grid);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "גיליון1");
  const buffer = XLSX.write(book, { type: "array", bookType: "xlsx" });
  return new File([buffer], name, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
};

// שורת הכותרות כפי שהיא בקובץ האמיתי, כולל העמודה הריקה הראשונה ("בחר")
const HEADER = [
  "בחר",
  "תאריך",
  "שם המוצר",
  "מחיר",
  "כמות",
  "מסמך",
  "מספר",
  "מספר לקוח",
  "בר-קוד",
  "מקט",
  "סוכן",
  "משתמש",
];

const line = (date, name, price, qty, doc, docNum, custNum, barcode, sku) => [
  null, date, name, price, qty, doc, docNum, custNum, barcode, sku, null, 4,
];

describe("parseHistoryDate", () => {
  // ── הבדיקה החשובה ביותר בקובץ הזה ──
  //
  // ‏new Date("05/06/2026") מחזיר 6 במאי, לא 5 ביוני. הכשל שקט: התאריך תקין
  // לגמרי, פשוט הפוך. כל דירוג ה"מה הלקוח קנה לאחרונה" נשען עליו.
  it("קורא יום/חודש/שנה ולא חודש/יום/שנה", () => {
    expect(parseHistoryDate("05/06/2026 10:41")).toBe("2026-06-05T10:41:00.000Z");
    expect(parseHistoryDate("30/06/2026 10:41")).toBe("2026-06-30T10:41:00.000Z");
  });

  it("קורא תאריך בלי שעה ועם מפרידים אחרים", () => {
    expect(parseHistoryDate("15.09.2025")).toBe("2025-09-15T00:00:00.000Z");
    expect(parseHistoryDate("4-12-2025")).toBe("2025-12-04T00:00:00.000Z");
  });

  it("קורא מספר סידורי של אקסל", () => {
    // 46203 = 30/06/2026
    expect(parseHistoryDate(46203)).toBe("2026-06-30T00:00:00.000Z");
  });

  it("פוסל תאריך שאינו קיים במקום לגלגל אותו לחודש הבא", () => {
    // בלי הבדיקה 31/02 היה הופך ל-3 במרץ — תאריך שגוי במקום ערך חסר
    expect(parseHistoryDate("31/02/2026")).toBeNull();
    expect(parseHistoryDate("10/13/2026")).toBeNull();
  });

  it("מחזיר null לערך ריק", () => {
    expect(parseHistoryDate("")).toBeNull();
    expect(parseHistoryDate(null)).toBeNull();
  });
});

describe("parseCustomerHistoryFile", () => {
  it("קורא שורות מסמך גם כששורת הכותרות אינה הראשונה", async () => {
    const file = makeFile([
      [" "],
      ["המתוקיה של בני בעמ"],
      ["היסטוריה ללקוח MED-1  רמלה - אבטחה"],
      HEADER,
      line("30/06/2026 10:41", "קפה טורקי עלית 200 גר", 19.8, 15, "חשבונית מס", 42322, 755, 107, 83),
      line("15/09/2025 11:21", "קפה טורקי עלית 200 גר", 18.4, 4, "תעודת משלוח", 195656, 755, 107, 83),
    ]);

    const result = await parseCustomerHistoryFile(file);

    expect(result.headerRowNumber).toBe(4);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      rowNumber: 5,
      sku: "83",
      name: "קפה טורקי עלית 200 גר",
      date: "2026-06-30T10:41:00.000Z",
      quantity: 15,
      price: 19.8,
      docType: "חשבונית מס",
    });
    // אותו מק"ט בשתי שורות — הסיכום נעשה בשרת, כאן שתי השורות נשמרות
    expect(result.rows[1].sku).toBe("83");
    expect(result.stats).toMatchObject({ total: 2, distinctSkus: 1, withoutDate: 0 });
    expect(result.stats.from).toBe("2025-09-15T11:21:00.000Z");
    expect(result.stats.to).toBe("2026-06-30T10:41:00.000Z");
  });

  it('שומר מק"ט שאקסל קרא כמספר בתור טקסט', async () => {
    const file = makeFile([
      HEADER,
      line("30/06/2026", "סוכר 1 קג בשקית", 5.5, 6, "חשבונית מס", 42322, 755, 112, 138),
    ]);

    const result = await parseCustomerHistoryFile(file);
    expect(result.rows[0].sku).toBe("138");
  });

  it("אוסף את מספרי הלקוח שבקובץ", async () => {
    const file = makeFile([
      HEADER,
      line("30/06/2026", "מוצר א", 5, 1, "חשבונית מס", 1, 755, 1, "10"),
      line("30/06/2026", "מוצר ב", 5, 1, "חשבונית מס", 1, 755, 2, "11"),
    ]);

    const result = await parseCustomerHistoryFile(file);
    expect(result.customerNumbers).toEqual(["755"]);
  });

  it("מסנן שורת סיכום שאינה מוצר, ומדווח עליה", async () => {
    const file = makeFile([
      HEADER,
      line("30/06/2026", "ריכוז תעודות משלוח", 1319.38, 1, "חשבונית מס", 42322, 755, 0, 3570),
      line("30/06/2026", "סוכר 1 קג בשקית", 5.5, 6, "חשבונית מס", 42322, 755, 112, 138),
    ]);

    const result = await parseCustomerHistoryFile(file);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].sku).toBe("138");
    expect(result.invalidRows[0]).toMatchObject({ reason: "שורת סיכום ולא מוצר" });
    expect(result.stats.skippedReasons).toEqual([
      { reason: "שורת סיכום ולא מוצר", count: 1 },
    ]);
  });

  it('פוסל שורה בלי מק"ט ומדלג על שורה ריקה בלי לדווח', async () => {
    const file = makeFile([
      HEADER,
      line("30/06/2026", "מוצר בלי מקט", 5.5, 6, "חשבונית מס", 42322, 755, 112, null),
      [null, null, null, null, null, null, null, null, null, null, null, null],
      line("30/06/2026", "סוכר 1 קג בשקית", 5.5, 6, "חשבונית מס", 42322, 755, 112, 138),
    ]);

    const result = await parseCustomerHistoryFile(file);

    expect(result.rows).toHaveLength(1);
    expect(result.invalidRows).toEqual([
      expect.objectContaining({ rowNumber: 2, reason: 'חסר מק"ט' }),
    ]);
  });

  it("שומר שורה בלי תאריך ומדווח כמה כאלה יש", async () => {
    // התאריך קובע רלוונטיות, לא קיום. פסילת השורה הייתה מוחקת ראיה אמיתית
    // בגלל עמודה חסרה אחת.
    const file = makeFile([
      HEADER,
      line(null, "סוכר 1 קג בשקית", 5.5, 6, "חשבונית מס", 42322, 755, 112, 138),
    ]);

    const result = await parseCustomerHistoryFile(file);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].date).toBeUndefined();
    expect(result.stats).toMatchObject({ withoutDate: 1, from: null, to: null });
  });

  // ── רגרסיה: הכשל שנמדד על קובץ ההנהח"ש האמיתי ──
  //
  // ‏xlsx מפרש תאי CSV בסדר האמריקאי, ולכן "08/06/2026" חזר כמספר סידורי של
  // 6 באוגוסט במקום 8 ביוני — בעוד "30/06/2026" נשאר מחרוזת, כי 30 אינו חודש
  // אפשרי. באותה עמודה התערבבו שני טיפוסים, וכל תאריך שהיום בו קטן מ-13
  // התהפך בשקט. הפענוח מבקש rawCells כדי לקרוא את הטקסט בעצמו.
  it("קורא תאריכים בקובץ CSV לפי יום/חודש ולא לפי חודש/יום", async () => {
    const csv = [
      "בחר,תאריך,שם המוצר,מחיר,כמות,מסמך,מספר,מספר לקוח,בר-קוד,מקט,סוכן,משתמש",
      ",08/06/2026 11:32,סוכר 1 קג בשקית,5.9,4,תעודת משלוח,195000,755,112,138,,4",
      ",04/12/2025 11:01,קפה טורקי עלית 200 גר,18.4,4,תעודת משלוח,194000,755,107,83,,4",
      ",30/06/2026 10:41,חלב טרי בקרטון 1 ליטר,6.21,17,חשבונית מס,42322,755,103,39,,4",
    ].join("\n");

    const result = await parseCustomerHistoryFile(new File([csv], "היסטוריה.csv", { type: "text/csv" }));

    expect(result.rows.map((row) => row.date)).toEqual([
      "2026-06-08T11:32:00.000Z",
      "2025-12-04T11:01:00.000Z",
      "2026-06-30T10:41:00.000Z",
    ]);
    // ‏rawCells מחזיר גם מספרים כמחרוזות — הם חייבים להמשיך להיקרא כמספרים
    expect(result.rows[0]).toMatchObject({ sku: "138", quantity: 4, price: 5.9 });
  });

  it("זורק שגיאה מובנת כשאין שורת כותרות", async () => {
    const file = makeFile([
      ["דוח כלשהו"],
      ["עמודה א", "עמודה ב"],
      [1, 2],
    ]);

    await expect(parseCustomerHistoryFile(file)).rejects.toThrow("לא זוהתה שורת כותרות");
  });
});

describe("toServerRow", () => {
  it("משמיט שדות ריקים כדי לא לנפח את גוף הבקשה", () => {
    expect(
      toServerRow({
        rowNumber: 5,
        sku: "83",
        name: "קפה",
        date: undefined,
        quantity: 15,
        price: undefined,
        docType: "חשבונית מס",
        docNumber: undefined,
      })
    ).toEqual({ rowNumber: 5, sku: "83", name: "קפה", quantity: 15, docType: "חשבונית מס" });
  });
});
