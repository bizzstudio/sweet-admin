// בדיקות למסך "קבלות".
//
// מה שהן שומרות עליו:
// 1. הרשימה מגיעה מבקשה אחת, והסינון לפי לקוח נלקח מהכתובת ולא מהמסך.
// 2. החיפוש הוא מקומי — הקלדה לא מייצרת בקשה נוספת לשרת. אם זה ישתנה,
//    כל הקלדה תפנה לשרת ואף אחד לא ישים לב עד שהמסך יאט.
// 3. הסיכום מחושב על מה שמוצג בפועל ולא על מה שהתקבל, אחרת "סה"כ
//    תקבולים" סותר את הטבלה שמתחתיו.
// 4. תשובת שרת ריקה מציגה מצב ריק ולא מסך שבור.

import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/BillingServices", () => ({
  default: { getReceipts: vi.fn() },
}));

vi.mock("@/utils/toast", () => ({
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

import BillingServices from "@/services/BillingServices";
import Receipts from "@/pages/Receipts";

const RECEIPTS = [
  {
    docNum: "7001",
    docUrl: "https://icount/doc/7001",
    customer: "c1",
    customerName: "אווינסד",
    customerNumber: "104",
    paidAt: "2026-08-10T00:00:00.000Z",
    grossEstimate: 1180,
    invoices: [{ docNum: "5001", docUrl: "https://icount/doc/5001" }],
    notes: [1001, 1002],
    hasCredit: false,
  },
  {
    docNum: "7002",
    docUrl: null,
    customer: "c2",
    customerName: "מכולת הדר",
    customerNumber: null,
    paidAt: "2026-08-05T00:00:00.000Z",
    grossEstimate: 590,
    invoices: [{ docNum: "5002", docUrl: null }],
    notes: [1003],
    hasCredit: true,
  },
];

let container;
let root;

const render = async (entry = "/receipts") => {
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[entry]}>
        <Receipts />
      </MemoryRouter>
    );
  });
  await act(async () => {
    await Promise.resolve();
  });
};

const searchInput = () =>
  [...container.querySelectorAll("input")].find(
    (i) => i.getAttribute("placeholder")?.includes("מספר קבלה")
  );

const type = async (input, value) => {
  // React מאזין ל-input ולא ל-change, והסטר הילידי נדרש כדי שהערך
  // שנכתב לא ידרס על ידי ה-value המבוקר
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  ).set;
  await act(async () => {
    setter.call(input, value);
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
};

const rowCount = () => container.querySelectorAll("tbody tr").length;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  vi.clearAllMocks();
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe("Receipts", () => {
  it("מציג את הקבלות מבקשה אחת, עם החשבונית והסכום", async () => {
    BillingServices.getReceipts.mockResolvedValue({ receipts: RECEIPTS });

    await render();

    expect(BillingServices.getReceipts).toHaveBeenCalledTimes(1);
    expect(BillingServices.getReceipts).toHaveBeenCalledWith({
      from: "",
      to: "",
      customer: "",
    });

    expect(rowCount()).toBe(2);
    expect(container.textContent).toContain("7001");
    expect(container.textContent).toContain("אווינסד");
    expect(container.textContent).toContain("5001");
    // סה"כ התקבולים של שתי הקבלות
    expect(container.textContent).toContain("1,770.00");
    // קבלה שהחשבונית שלה זוכתה מסומנת ככזו
    expect(container.textContent).toContain("זוכתה");
  });

  it("סינון לפי לקוח נלקח מהכתובת", async () => {
    BillingServices.getReceipts.mockResolvedValue({ receipts: [RECEIPTS[0]] });

    await render("/receipts?customer=c1");

    expect(BillingServices.getReceipts).toHaveBeenCalledWith({
      from: "",
      to: "",
      customer: "c1",
    });
  });

  it("החיפוש מסנן מקומית ומעדכן את הסיכום, בלי בקשה נוספת", async () => {
    BillingServices.getReceipts.mockResolvedValue({ receipts: RECEIPTS });

    await render();
    await type(searchInput(), "מכולת");

    expect(rowCount()).toBe(1);
    expect(container.textContent).toContain("7002");
    expect(container.textContent).not.toContain("7001");
    expect(container.textContent).toContain("590.00");
    expect(BillingServices.getReceipts).toHaveBeenCalledTimes(1);
  });

  it("קישור למסמך נפתח רק כשהוא http(s)", async () => {
    BillingServices.getReceipts.mockResolvedValue({
      receipts: [
        { ...RECEIPTS[0], docUrl: "javascript:alert(1)" },
        { ...RECEIPTS[1], docUrl: "https://icount/doc/7002" },
      ],
    });

    await render();

    const hrefs = [...container.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("https://icount/doc/7002");
    expect(hrefs.some((h) => h?.startsWith("javascript:"))).toBe(false);
    // המספר עצמו עדיין מוצג, רק בלי קישור
    expect(container.textContent).toContain("7001");
  });

  it("תשובה בלי invoices/notes לא מפילה את המסך", async () => {
    BillingServices.getReceipts.mockResolvedValue({
      receipts: [
        {
          docNum: "7009",
          customer: "c9",
          customerName: "לקוח ישן",
          paidAt: "2026-08-01T00:00:00.000Z",
          grossEstimate: 100,
        },
      ],
    });

    await render();

    expect(rowCount()).toBe(1);
    expect(container.textContent).toContain("7009");
    expect(container.textContent).toContain("100.00");
  });

  it("בורר התאריכים חוסם טווח הפוך", async () => {
    BillingServices.getReceipts.mockResolvedValue({ receipts: RECEIPTS });

    await render();

    const dates = [...container.querySelectorAll("input[type='date']")];
    expect(dates).toHaveLength(2);
    await type(dates[0], "2026-08-01");

    // "עד תאריך" לא יכול להיות מוקדם מ"מתאריך"
    expect(dates[1].getAttribute("min")).toBe("2026-08-01");
    expect(BillingServices.getReceipts).toHaveBeenLastCalledWith({
      from: "2026-08-01",
      to: "",
      customer: "",
    });
  });

  it("תשובה ישנה שמגיעה באיחור לא דורסת את החדשה", async () => {
    let resolveStale;
    BillingServices.getReceipts
      .mockImplementationOnce(() => new Promise((resolve) => { resolveStale = resolve; }))
      .mockResolvedValueOnce({ receipts: [RECEIPTS[1]] });

    await render();
    // שינוי הסינון לפני שהבקשה הראשונה חזרה
    await type(container.querySelector("input[type='date']"), "2026-08-01");
    // ורק עכשיו חוזרת הישנה
    await act(async () => {
      resolveStale({ receipts: [RECEIPTS[0]] });
      await Promise.resolve();
    });

    expect(container.textContent).toContain("7002");
    expect(container.textContent).not.toContain("7001");
  });

  it("רשימה ריקה מציגה מצב ריק ולא טבלה", async () => {
    BillingServices.getReceipts.mockResolvedValue({ receipts: [] });

    await render();

    expect(container.querySelector("tbody")).toBeNull();
    expect(container.textContent).toContain("לא נמצאו קבלות");
    expect(container.textContent).toContain("טרם הופקו קבלות במערכת");
  });
});
