// בדיקות להפרדה בין שני המיילים של הלקוח בקובץ ההנהח"ש.
//
// מה הן שומרות עליו: בקובץ "רשימת לקוחות" עמודת "איש קשר" מכילה לא פעם
// כתובת מייל, ועד 09/2026 הכתובת הזו הועלתה להיות המייל הראשי של הלקוח
// כשעמודת "דואר אלקטרוני" הייתה ריקה. המשמעות הייתה שהחשבונית החודשית
// הגיעה לאיש הקשר. הבדיקות כאן מקבעות את ההפרדה: המייל הראשי מגיע רק
// מעמודת המייל, ומה שנמצא באיש קשר נשמר ב-contactEmail בלבד.

import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";

import { parseErpCustomersFile, toServerRow } from "@/utils/erpCustomerExcel";

const HEADER = [
  "מספר",
  "שם",
  "דואר אלקטרוני",
  "איש קשר",
  "טלפון סלולרי",
];

const makeFile = (rows) => {
  const sheet = XLSX.utils.aoa_to_sheet([
    ["רשימת לקוחות", null, null, null, null],
    HEADER,
    ...rows,
  ]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "גיליון1");
  const buffer = XLSX.write(book, { type: "array", bookType: "xlsx" });
  return new File([buffer], "רשימת לקוחות.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
};

describe("parseErpCustomersFile — הפרדת המייל הראשי ממייל איש הקשר", () => {
  it("שומר את המייל מעמודת איש קשר בשדה נפרד ולא כמייל הראשי", async () => {
    const file = makeFile([
      ["1042", "מאפיית בני", "hanhala@bakery.co.il", "יעל yael@bakery.co.il", "0526200824"],
    ]);

    const { rows } = await parseErpCustomersFile(file);

    expect(rows[0].email).toBe("hanhala@bakery.co.il");
    expect(rows[0].contactEmail).toBe("yael@bakery.co.il");
    // השם שנשאר בתא אחרי חילוץ המייל ממשיך להישמר כאיש קשר
    expect(rows[0].contactPerson).toContain("יעל");
  });

  it("לא מעלה את מייל איש הקשר להיות המייל הראשי כשעמודת המייל ריקה", async () => {
    const file = makeFile([
      ["1043", "קיוסק הפינה", "", "רונן ronen@corner.co.il", "0526200825"],
    ]);

    const { rows } = await parseErpCustomersFile(file);

    // זו הרגרסיה עצמה: כאן היה קודם ronen@corner.co.il, והחשבונית
    // הייתה מופקת על שמו
    expect(rows[0].email).toBe("");
    expect(rows[0].contactEmail).toBe("ronen@corner.co.il");
  });

  it("משאיר את מייל איש הקשר ריק כשאין כזה בעמודה", async () => {
    const file = makeFile([["1044", "חנות מרכזית", "shop@central.co.il", "דנה", ""]]);

    const { rows } = await parseErpCustomersFile(file);

    expect(rows[0].email).toBe("shop@central.co.il");
    expect(rows[0].contactEmail).toBe("");
  });

  it("לא מכפיל את אותה כתובת כשהיא מופיעה בשתי העמודות", async () => {
    const file = makeFile([
      ["1046", "בילטון", "ap-il@bilton.tech", "ap-il@bilton.tech", ""],
    ]);

    const { rows } = await parseErpCustomersFile(file);

    expect(rows[0].email).toBe("ap-il@bilton.tech");
    // אחרת הכרטיס היה מציג את אותה כתובת פעמיים ברצף
    expect(rows[0].contactEmail).toBe("");
  });

  it("שולח את מייל איש הקשר לשרת", async () => {
    const file = makeFile([
      ["1045", "בית קפה", "acc@cafe.co.il", "טל tal@cafe.co.il", ""],
    ]);

    const { rows } = await parseErpCustomersFile(file);

    expect(toServerRow(rows[0])).toMatchObject({
      email: "acc@cafe.co.il",
      contactEmail: "tal@cafe.co.il",
    });
  });
});
