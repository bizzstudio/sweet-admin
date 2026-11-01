// בדיקות למסך "חובות לקוחות לפי חודש".
//
// מה שהן שומרות עליו:
// 1. כל לקוח מוצג עם החוב שלו לפי חודש, והסכום הכולל הוא סכום מה שמוצג.
// 2. סינון לפי חודש משנה את הסכום של השורה ומוציא לקוח בלי חוב באותו חודש.
// 3. החיפוש מקומי — הקלדה אינה בקשה נוספת לשרת.

import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/BillingServices", () => ({
  default: {
    getDebtReport: vi.fn(),
    getIcountMode: vi.fn(() => Promise.resolve({ mode: "live" })),
  },
}));

vi.mock("@/utils/toast", () => ({
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

import BillingServices from "@/services/BillingServices";
import DebtReport from "@/pages/DebtReport";

const REPORT = {
  total: 17590,
  months: [
    { month: "2026-10", count: 2, amount: 9000 },
    { month: "2026-11", count: 2, amount: 8590 },
  ],
  customers: [
    {
      customerId: "c1",
      name: "קפה נמרוד",
      customerNumber: "104",
      total: 17000,
      balance: 100,
      netDue: 16900,
      months: [
        { month: "2026-10", count: 1, amount: 9000 },
        { month: "2026-11", count: 1, amount: 8000 },
      ],
    },
    {
      customerId: "c2",
      name: "מכולת הדר",
      customerNumber: "220",
      total: 590,
      balance: 0,
      netDue: 590,
      months: [{ month: "2026-11", count: 1, amount: 590 }],
    },
  ],
};

const flush = () => act(() => new Promise((r) => setTimeout(r, 0)));

describe("DebtReport", () => {
  let container;
  let root;

  beforeEach(async () => {
    BillingServices.getDebtReport.mockResolvedValue(REPORT);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(
        <MemoryRouter>
          <DebtReport />
        </MemoryRouter>
      );
    });
    await flush();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });

  const rows = () => [...container.querySelectorAll("tbody tr")];

  const change = async (el, value) => {
    const proto = el.tagName === "SELECT" ? window.HTMLSelectElement : window.HTMLInputElement;
    Object.getOwnPropertyDescriptor(proto.prototype, "value").set.call(el, value);
    await act(async () => {
      el.dispatchEvent(new window.Event(el.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
    });
  };

  it("מציג חוב לפי חודש לכל לקוח", () => {
    expect(rows()).toHaveLength(2);
    expect(rows()[0].textContent).toContain("אוקטובר 2026: 9,000.00 ₪");
    expect(rows()[0].textContent).toContain("נובמבר 2026: 8,000.00 ₪");
    expect(rows()[0].textContent).toContain("17,000.00 ₪");
    expect(rows()[0].textContent).toContain("זכות 100.00 ₪");
    expect(rows()[0].textContent).toContain("16,900.00 ₪");
    expect(container.textContent).toContain("17,590.00 ₪");
  });

  it("סינון לפי חודש", async () => {
    await change(container.querySelector("select"), "2026-10");
    expect(rows()).toHaveLength(1);
    expect(rows()[0].textContent).not.toContain("נובמבר");
    expect(rows()[0].textContent).toContain("9,000.00 ₪");
  });

  it("החיפוש מקומי", async () => {
    await change(container.querySelector("input[type='search']"), "220");
    expect(rows()).toHaveLength(1);
    expect(rows()[0].textContent).toContain("מכולת הדר");
    expect(BillingServices.getDebtReport).toHaveBeenCalledTimes(1);
  });
});
