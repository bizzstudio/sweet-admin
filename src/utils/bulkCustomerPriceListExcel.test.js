// בדיקות לפענוח קובץ המחירונים המרוכז (כל הלקוחות בקובץ אחד).
//
// מה הן שומרות עליו: הקובץ מגיע מההנהח"ש עם שורות כותרת חופשיות מעל שורת שמות
// העמודות, עם עמודת "שם הלקוח" **ועמודת "שם המוצר"** זו לצד זו, ולעיתים כ-CSV
// בקידוד windows-1255. כל אחד מאלה שובר את היבוא בשקט: או שהעמודות מתחלפות
// והמחירים נכנסים למוצר הלא נכון, או שהשמות נשמרים משובשים.
//
// בנוסף: הפיצול לאצוות חייב לחתוך **בין** לקוחות ולא בתוך לקוח, כי היבוא דורס
// את המחירון הקיים — לקוח שהתפצל בין שתי בקשות היה נשאר עם חצי מחירון.

import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";

import {
  chunkCustomers,
  collectUniqueProducts,
  parseBulkPriceListFile,
  toServerCustomer,
} from "@/utils/bulkCustomerPriceListExcel";

// בניית קובץ xlsx אמיתי מגריד, כדי שהבדיקה תעבור באותו נתיב קריאה כמו בדפדפן
const makeFile = (grid, name = "מחירונים.xlsx") => {
  const sheet = XLSX.utils.aoa_to_sheet(grid);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "גיליון1");
  const buffer = XLSX.write(book, { type: "array", bookType: "xlsx" });
  return new File([buffer], name, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
};

// הכותרות בדיוק כפי שהן יוצאות מההנהח"ש
const HEADER = ["שם הלקוח", "מספר לקוח", "שם המוצר", "מקט", "בר-קוד", "מחיר"];

describe("parseBulkPriceListFile", () => {
  it("מקבץ את השורות לפי מספר לקוח, גם כששורת הכותרות אינה הראשונה", async () => {
    const file = makeFile([
      ["המתוקיה של בני בעמ", null, null, null, null, null],
      ["מחירוני לקוח ללא מעמ", null, null, null, null, null],
      HEADER,
      ["ולנשטיין ושות'", "552", "אובלטים", "85", "1071", 14.5],
      ["ולנשטיין ושות'", "552", "בייגלה דגים", 3139, "648", 13.9],
      ["יאנגו דלי", 691, "אובלטים", "85", "1071", 12.9],
    ]);

    const result = await parseBulkPriceListFile(file);

    expect(result.headerRowNumber).toBe(3);
    expect(result.hasNameColumn).toBe(true);
    expect(result.customers).toHaveLength(2);

    expect(result.customers[0]).toMatchObject({
      customerNumber: "552",
      customerName: "ולנשטיין ושות'",
    });
    expect(result.customers[0].rows).toEqual([
      { rowNumber: 4, sku: "85", name: "אובלטים", price: 14.5 },
      // מק"ט שאקסל קרא כמספר נשמר כטקסט — הוא מזהה ההתאמה מול הקטלוג
      { rowNumber: 5, sku: "3139", name: "בייגלה דגים", price: 13.9 },
    ]);

    // מספר לקוח שנקרא כמספר נשמר כטקסט — הוא מזהה ההתאמה מול erp.customerNumber
    expect(result.customers[1].customerNumber).toBe("691");
    expect(result.stats).toMatchObject({
      customers: 2,
      totalRows: 3,
      uniqueSkus: 2,
      minPrice: 12.9,
      maxPrice: 14.5,
    });
  });

  it('אינו מבלבל בין "שם הלקוח" ל"שם המוצר"', async () => {
    const file = makeFile([
      HEADER,
      ["לקוח א", "10", "שקדים", "500", "999", 20],
    ]);

    const result = await parseBulkPriceListFile(file);

    expect(result.customers[0].customerName).toBe("לקוח א");
    expect(result.customers[0].rows[0].name).toBe("שקדים");
  });

  it("מדלג על שורות פגומות ומדווח למה, בלי להפיל את הפענוח", async () => {
    const file = makeFile([
      HEADER,
      ["לקוח א", "10", "תקין", "500", "999", 20],
      [null, null, "בלי מספר לקוח", "501", "998", 20],
      ["לקוח א", "10", "בלי מקט", null, "997", 20],
      ["לקוח א", "10", "בלי מחיר", "502", "996", null],
      ["לקוח א", "10", "מחיר אפס", "503", "995", 0],
      [null, null, null, null, null, null], // שורה ריקה — אינה שגיאה
    ]);

    const result = await parseBulkPriceListFile(file);

    expect(result.customers).toHaveLength(1);
    expect(result.customers[0].rows).toHaveLength(1);
    expect(result.stats.skipped).toBe(4);
    expect(result.stats.skippedReasons).toEqual(
      expect.arrayContaining([
        { reason: "חסר מספר לקוח", count: 1 },
        { reason: 'חסר מק"ט', count: 1 },
        { reason: "חסר מחיר", count: 1 },
        { reason: "מחיר אינו חיובי", count: 1 },
      ])
    );
  });

  it("מק\"ט שחוזר אצל אותו לקוח נלקח מהשורה האחרונה", async () => {
    const file = makeFile([
      HEADER,
      ["לקוח א", "10", "שקדים", "500", "999", 20],
      ["לקוח א", "10", "שקדים", "500", "999", 18],
    ]);

    const result = await parseBulkPriceListFile(file);

    expect(result.customers[0].rows).toEqual([
      { rowNumber: 3, sku: "500", name: "שקדים", price: 18 },
    ]);
    expect(result.stats.duplicateSkus).toBe(1);
  });

  it("אותו מק\"ט אצל שני לקוחות אינו כפילות", async () => {
    const file = makeFile([
      HEADER,
      ["לקוח א", "10", "שקדים", "500", "999", 20],
      ["לקוח ב", "11", "שקדים", "500", "999", 18],
    ]);

    const result = await parseBulkPriceListFile(file);

    expect(result.stats.duplicateSkus).toBe(0);
    expect(result.customers).toHaveLength(2);
    // המק"ט נשלח לבדיקה פעם אחת עם השם שלו — בקובץ אמיתי אותם ~4,000 מוצרים
    // חוזרים אצל מאות לקוחות
    expect(collectUniqueProducts(result.customers)).toEqual([
      { sku: "500", name: "שקדים" },
    ]);
  });

  it("זורק שגיאה מפורשת כשאין שורת כותרות מזוהה", async () => {
    const file = makeFile([
      ["סתם", "טבלה"],
      [1, 2],
    ]);

    await expect(parseBulkPriceListFile(file)).rejects.toThrow(
      /לא זוהתה שורת כותרות/
    );
  });

  it("קורא CSV בקידוד UTF-8 כרגיל (רגרסיה: זיהוי הקידוד לא שבר את המקרה התקין)", async () => {
    // ‏readSheetGrid משותף גם לייבוא הלקוחות ולייבוא המוצרים. הוספת פענוח
    // windows-1255 מחליפה את נתיב הקריאה של **כל** קובץ CSV בשלושתם, ולכן
    // קובץ UTF-8 תקין חייב להמשיך להיקרא בדיוק כמו קודם
    const csv = [
      "שם הלקוח,מספר לקוח,שם המוצר,מקט,בר-קוד,מחיר",
      "לקוח א,10,שקדים,500,999,20",
    ].join("\n");

    const file = new File([new TextEncoder().encode(csv)], "מחירונים.csv", {
      type: "text/csv",
    });
    const result = await parseBulkPriceListFile(file);

    expect(result.customers[0]).toMatchObject({
      customerNumber: "10",
      customerName: "לקוח א",
    });
    expect(result.customers[0].rows[0]).toEqual({
      rowNumber: 2,
      sku: "500",
      name: "שקדים",
      price: 20,
    });
  });

  it("קורא CSV בקידוד windows-1255 בלי לשבש את העברית", async () => {
    // הקידוד שבו תוכנת ההנהח"ש שומרת CSV. פענוח כ-UTF-8 היה מייצר ג'יבריש,
    // ואז שורת הכותרות כלל לא הייתה מזוהה
    const csv = [
      "שם הלקוח,מספר לקוח,שם המוצר,מקט,בר-קוד,מחיר",
      "לקוח א,10,שקדים,500,999,20",
    ].join("\n");

    const bytes = new Uint8Array(csv.length);
    for (let i = 0; i < csv.length; i++) {
      const code = csv.charCodeAt(i);
      // עברית ב-windows-1255: א (U+05D0) הוא 0xE0
      bytes[i] = code >= 0x05d0 && code <= 0x05ea ? code - 0x05d0 + 0xe0 : code;
    }

    const file = new File([bytes], "מחירונים.csv", { type: "text/csv" });
    const result = await parseBulkPriceListFile(file);

    expect(result.customers[0]).toMatchObject({
      customerNumber: "10",
      customerName: "לקוח א",
    });
    expect(result.customers[0].rows[0].name).toBe("שקדים");
  });
});

describe("collectUniqueProducts", () => {
  it("לוקח שם מלקוח אחר כשאצל הראשון העמודה ריקה", () => {
    // בלי זה מק"ט שהופיע קודם בשורה בלי שם היה נשלח לבדיקה בלי שם, ואימות
    // אי-התאמת השמות — הבדיקה שתופסת עמודות שהוזזו — היה מדלג עליו
    const products = collectUniqueProducts([
      { rows: [{ sku: "500", name: "" }] },
      { rows: [{ sku: "500", name: "שקדים" }] },
    ]);

    expect(products).toEqual([{ sku: "500", name: "שקדים" }]);
  });

  it("השם הראשון שנמצא הוא הקובע", () => {
    const products = collectUniqueProducts([
      { rows: [{ sku: "500", name: "שקדים" }] },
      { rows: [{ sku: "500", name: "שקדים מסוכרים" }] },
    ]);

    expect(products).toEqual([{ sku: "500", name: "שקדים" }]);
  });
});

describe("chunkCustomers", () => {
  const customer = (number, rows) => ({
    customerNumber: number,
    rows: Array.from({ length: rows }, (_, i) => ({ sku: String(i), price: 1 })),
  });

  it("חותך בין לקוחות ולא בתוך לקוח", () => {
    const chunks = chunkCustomers(
      [customer("1", 60), customer("2", 60), customer("3", 10)],
      { maxCustomers: 10, maxRows: 100 }
    );

    expect(chunks.map((chunk) => chunk.map((item) => item.customerNumber))).toEqual([
      ["1"],
      ["2", "3"],
    ]);
  });

  it("לקוח שגדול מתקרת השורות בעצמו נשלח שלם באצווה משלו", () => {
    // פיצול שלו היה משאיר אותו עם חצי מחירון — הדריסה חייבת להיות אטומית.
    // השרת יחזיר עליו שגיאה ברורה במקום לשמור חצי
    const chunks = chunkCustomers([customer("1", 500)], {
      maxCustomers: 10,
      maxRows: 100,
    });

    expect(chunks).toHaveLength(1);
    expect(chunks[0][0].rows).toHaveLength(500);
  });

  it("מכבד את תקרת מספר הלקוחות באצווה", () => {
    const chunks = chunkCustomers(
      [customer("1", 1), customer("2", 1), customer("3", 1)],
      { maxCustomers: 2, maxRows: 1000 }
    );

    expect(chunks.map((chunk) => chunk.length)).toEqual([2, 1]);
  });
});

describe("toServerCustomer", () => {
  it("משאיר רק את השדות שהשרת צריך", () => {
    expect(
      toServerCustomer({
        customerNumber: "552",
        customerName: "לקוח א",
        rows: [{ rowNumber: 4, sku: "85", name: "", price: 14.5, extra: "x" }],
      })
    ).toEqual({
      customerNumber: "552",
      customerName: "לקוח א",
      rows: [{ rowNumber: 4, sku: "85", price: 14.5 }],
    });
  });
});
