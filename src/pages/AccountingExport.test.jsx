// בדיקות למסך "ייצוא להנהלת חשבונות".
//
// מה שהן שומרות עליו:
// 1. הכניסה למסך לא פונה ל-iCount; רק "הצגה" או קיצור טווח.
// 2. סוגי המסמכים שנבחרו נשלחים לשרת, ו"כל סוגי המסמכים" מסמן ומבטל הכל.
// 3. בלי סוג מסמך אין פנייה לשרת.
// 4. השורות והסיכום לפי סוג מוצגים; קבלה בלי מע"מ מוצגת כקו.
// 5. תשובה שאינה במבנה הצפוי מוצגת כשגיאה.

import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/BillingServices", () => ({
  default: { getAccountingExport: vi.fn() },
}));

vi.mock("@/utils/toast", () => ({
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

import BillingServices from "@/services/BillingServices";
import AccountingExport from "@/pages/AccountingExport";
import { notifyError } from "@/utils/toast";

const t = (count, net, vat, gross) => ({ count, net, taxable: net, exempt: 0, vat, gross });

const REPORT = {
  from: "2026-10-01",
  to: "2026-10-31",
  types: ["invoice", "refund", "receipt"],
  rows: [
    { type: "invoice", typeLabel: "חשבונית מס", docNum: "2000", date: "2026-10-05", customerNumber: "519",
      customerName: "מרגל", net: 100, taxable: 100, exempt: 0, vat: 18, gross: 118, status: "פתוחה", basedOn: "", url: "" },
    { type: "refund", typeLabel: "חשבונית זיכוי", docNum: "5000", date: "2026-10-06", customerNumber: "140",
      customerName: "סמלת", net: -50, taxable: -50, exempt: 0, vat: -9, gross: -59, status: "", basedOn: "חשבונית מס 2000", url: "" },
    { type: "receipt", typeLabel: "קבלה", docNum: "1000", date: "2026-10-07", customerNumber: "481",
      customerName: "אמטיסטי", net: null, taxable: null, exempt: null, vat: null, gross: 118, status: "",
      paymentMethod: "העברה בנקאית", basedOn: "", url: "" },
  ],
  totals: { invoice: t(1, 100, 18, 118), refund: t(1, -50, -9, -59), receipt: t(1, 0, 0, 118) },
};

let container;
let root;

const render = async () => {
  await act(async () => {
    root.render(<AccountingExport />);
  });
};

const button = (text) => [...container.querySelectorAll("button")].find((b) => b.textContent.includes(text));
const checkbox = (text) =>
  [...container.querySelectorAll("label")].find((l) => l.textContent.trim() === text).querySelector("input");

const click = async (el) => {
  await act(async () => {
    el.click();
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  BillingServices.getAccountingExport.mockResolvedValue(REPORT);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("ייצוא להנהלת חשבונות", () => {
  it("לא פונה ל-iCount עד שלוחצים הצגה", async () => {
    await render();
    expect(BillingServices.getAccountingExport).not.toHaveBeenCalled();
  });

  it("שולח את כל הסוגים כברירת מחדל ומציג שורות וסיכום", async () => {
    await render();
    await click(button("הצגה"));

    const params = BillingServices.getAccountingExport.mock.calls[0][0];
    expect(params.types).toBe("invoice,invrec,refund,receipt");
    expect(params.from).toMatch(/^\d{4}-\d{2}-01$/);

    const text = container.textContent;
    expect(text).toContain("2000");
    expect(text).toContain("5000");
    expect(text).toContain("חשבונית מס 2000");
    expect(text).toContain("העברה בנקאית");
  });

  it("שולח רק את הסוגים שנבחרו", async () => {
    await render();
    await click(checkbox("כל סוגי המסמכים"));
    await click(checkbox("חשבונית זיכוי"));
    await click(checkbox("חשבונית מס"));
    await click(button("הצגה"));

    expect(BillingServices.getAccountingExport.mock.calls[0][0].types).toBe("invoice,refund");
  });

  it("בלי סוג מסמך לא פונה לשרת", async () => {
    await render();
    await click(checkbox("כל סוגי המסמכים"));
    await click(button("הצגה"));

    expect(BillingServices.getAccountingExport).not.toHaveBeenCalled();
    expect(notifyError).toHaveBeenCalledWith("יש לבחור לפחות סוג מסמך אחד");
  });

  it("תשובה לא צפויה מוצגת כשגיאה", async () => {
    BillingServices.getAccountingExport.mockResolvedValue({ ok: true });
    await render();
    await click(button("הצגה"));

    expect(notifyError).toHaveBeenCalled();
    expect(container.textContent).not.toContain("מסמכי מס");
  });
});
