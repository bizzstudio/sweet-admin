// בדיקות למסך "ריכוז הכנסות".
//
// מה שהן שומרות עליו:
// 1. הכניסה למסך טוענת את החודש הנוכחי עד היום, ולא את כל ההיסטוריה.
// 2. קיצור טווח ("מתחילת השנה") מריץ את הדוח מיד, עד היום.
// 3. הסכומים של התעודות ושל החשבוניות מוצגים בנפרד, וגם הטבלה לפי לקוח.
// 4. תשובה שאינה במבנה הצפוי מוצגת כשגיאה ולא כאפסים.

import dayjs from "dayjs";
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/BillingServices", () => ({
  default: { getSummaryReport: vi.fn() },
}));

vi.mock("@/services/CustomerServices", () => ({
  default: { getAllCustomers: vi.fn(() => Promise.resolve([])) },
}));

vi.mock("@/utils/toast", () => ({
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

import BillingServices from "@/services/BillingServices";
import CustomerServices from "@/services/CustomerServices";
import SummaryReport from "@/pages/SummaryReport";
import { notifyError } from "@/utils/toast";

const m = (count, net, gross) => ({ count, net, gross, vat: gross - net });

const REPORT = {
  from: "2026-10-01",
  to: "2026-10-25",
  notes: {
    total: m(2, 150, 168),
    billed: m(1, 100, 118),
    open: m(1, 50, 50),
    cancelled: m(1, 999, 1178.82),
  },
  invoices: {
    total: m(2, 300, 354),
    paid: m(1, 100, 118),
    unpaid: m(1, 200, 236),
    credits: m(1, 20, 23.6),
    afterCredits: m(2, 280, 330.4),
  },
  customers: [
    {
      customerId: "c1",
      name: "טבולה קום",
      customerNumber: "553",
      notes: m(1, 100, 118),
      invoices: m(2, 300, 354),
      credits: m(1, 20, 23.6),
    },
  ],
  truncated: false,
  limit: 20000,
};

let container;
let root;

const render = async () => {
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={["/reports/summary"]}>
        <SummaryReport />
      </MemoryRouter>
    );
  });
  await act(async () => {
    await Promise.resolve();
  });
};

const buttonByText = (text) =>
  [...container.querySelectorAll("button")].find((b) => b.textContent.trim().includes(text));

const click = async (element) => {
  await act(async () => {
    element.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  });
  await act(async () => {
    await Promise.resolve();
  });
};

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  vi.clearAllMocks();
  CustomerServices.getAllCustomers.mockResolvedValue([]);
  BillingServices.getSummaryReport.mockResolvedValue(REPORT);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe("SummaryReport", () => {
  it("loads this month until today on entry", async () => {
    await render();
    expect(BillingServices.getSummaryReport).toHaveBeenCalledTimes(1);
    expect(BillingServices.getSummaryReport).toHaveBeenCalledWith({
      from: dayjs().startOf("month").format("YYYY-MM-DD"),
      to: dayjs().format("YYYY-MM-DD"),
      customer: "",
    });
  });

  it("runs the report immediately from a range shortcut", async () => {
    await render();
    await click(buttonByText("מתחילת השנה"));
    expect(BillingServices.getSummaryReport).toHaveBeenLastCalledWith({
      from: dayjs().startOf("year").format("YYYY-MM-DD"),
      to: dayjs().format("YYYY-MM-DD"),
      customer: "",
    });
  });

  it("shows notes and invoices separately, plus the customer table", async () => {
    await render();
    const text = container.textContent;
    expect(text).toContain("תעודות משלוח");
    expect(text).toContain("מתוכן טרם חויבו");
    expect(text).toContain("מתוכן טרם שולמו");
    // תעודה שבוטלה מוזכרת, אבל מחוץ לסכום
    expect(text).toContain("שבוטלו בטווח");
    // זיכוי חלקי והסכום שאחריו
    expect(text).toContain("אחרי הזיכויים");
    expect(container.querySelector('a[href="/customer/c1"]').textContent).toBe("טבולה קום");
  });

  it("reports an unexpected response as an error, not as zeros", async () => {
    BillingServices.getSummaryReport.mockResolvedValue({ customers: [] });
    await render();
    expect(notifyError).toHaveBeenCalledTimes(1);
  });
});
