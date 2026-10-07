// בדיקות לחלון "רישום תשלום" במסך החשבוניות — החלק שנוגע ליתרת הלקוח.
//
// מה שהן שומרות עליו:
// 1. יתרת זכות מקטינה את הסכום המוצע לגבייה, ויתרת חוב מגדילה אותו.
//    הסכום המוצע הוא מה שנשלח ברוב המקרים בלי שאיש נוגע בו.
// 2. המסך אומר מראש מה יישאר ביתרה — תשלום עודף או חסר לא מתגלה רק
//    אחרי שהקבלה, מסמך מס שאי אפשר למחוק, כבר הופקה.
// 3. כשהיתרה מכסה את כל החשבונית נשלח סכום 0, והשרת סוגר בלי קבלה.

import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/BillingServices", () => ({
  default: {
    getInvoices: vi.fn(),
    getInvoiceTotal: vi.fn(),
    getCustomerBalance: vi.fn(),
    createReceipt: vi.fn(),
    getIcountMode: vi.fn(() => Promise.resolve({ mode: "live" })),
  },
}));

vi.mock("@/utils/toast", () => ({
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

// טופס התעודה הידנית אינו חלק מהבדיקה, והוא גורר אחריו חצי מהמערכת
vi.mock("@/components/billing/ManualDeliveryNoteForm", () => ({ default: () => null }));

import BillingServices from "@/services/BillingServices";
import Invoices from "@/pages/Invoices";

const invoice = (customerBalance) => ({
  docNum: "5001",
  customer: "c1",
  customerName: "אווינסד",
  customerNumber: "104",
  billedAt: "2026-09-30T00:00:00.000Z",
  dueDate: null,
  grossEstimate: 800,
  notes: [1001],
  credits: [],
  isPaid: false,
  isOverdue: false,
  customerBalance,
});

let container;
let root;

const flush = async () => {
  for (let i = 0; i < 5; i++) {
    await act(async () => {
      await Promise.resolve();
    });
  }
};

/** טוען את המסך עם חשבונית אחת של 800 ₪ ופותח עליה את חלון התשלום. */
const openDialog = async (balance) => {
  BillingServices.getInvoices.mockResolvedValue({ invoices: [invoice(balance)] });
  BillingServices.getInvoiceTotal.mockResolvedValue({
    totalWithVat: 800,
    totalBeforeVat: 677.97,
    vat: 122.03,
  });
  BillingServices.getCustomerBalance.mockResolvedValue({ balance, entries: [] });

  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={["/invoices"]}>
        <Invoices />
      </MemoryRouter>
    );
  });
  await flush();

  const button = [...document.querySelectorAll("button")].find((b) =>
    b.textContent.includes("רשום תשלום")
  );
  await act(async () => {
    button.click();
  });
  await flush();
};

const amountInput = () => document.querySelector('input[type="number"]');

const typeAmount = async (value) => {
  const input = amountInput();
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  await act(async () => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const clickButton = async (text) => {
  const button = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === text);
  expect(button, `כפתור "${text}"`).toBeTruthy();
  await act(async () => {
    button.click();
  });
  await flush();
};

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  vi.clearAllMocks();
  BillingServices.getIcountMode.mockResolvedValue({ mode: "live" });
  BillingServices.createReceipt.mockResolvedValue({ message: "ok" });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("רישום תשלום — יתרת הלקוח", () => {
  it("בלי יתרה מוצע סכום החשבונית, ואין הודעת יתרה", async () => {
    await openDialog(0);
    expect(amountInput().value).toBe("800");
    expect(document.body.textContent).not.toContain("אחרי הרישום");
  });

  it("תשלום עודף: המסך אומר כמה יישאר לזכות הלקוח", async () => {
    await openDialog(0);
    await typeAmount("1000");
    expect(document.body.textContent).toContain("יישארו ללקוח 200.00 ₪ זכות");

    await clickButton("הפק קבלה");
    expect(BillingServices.createReceipt).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 1000, forInvoices: ["5001"] })
    );
  });

  it("יתרת זכות מקוזזת מהסכום המוצע", async () => {
    await openDialog(200);
    expect(amountInput().value).toBe("600");
    expect(document.body.textContent).toContain("יתרת זכות של 200.00 ₪");
    expect(document.body.textContent).toContain("תהיה מאוזנת");
  });

  it("יתרת חוב מתווספת לסכום המוצע", async () => {
    await openDialog(-300);
    expect(amountInput().value).toBe("1100");
    expect(document.body.textContent).toContain("יתרת חוב של 300.00 ₪");
  });

  it("תשלום חסר: אזהרה שההפרש יירשם כחוב", async () => {
    await openDialog(0);
    await typeAmount("500");
    expect(document.body.textContent).toContain("300.00 ₪ יירשמו כחוב");
  });

  it("יתרה שמכסה את החשבונית: נסגרת בלי קבלה, בסכום 0", async () => {
    await openDialog(1000);
    expect(amountInput().value).toBe("0");
    expect(document.body.textContent).toContain("לא תופק קבלה");
    expect(document.body.textContent).toContain("יישארו ללקוח 200.00 ₪ זכות");

    await clickButton("סגירה מהיתרה");
    expect(BillingServices.createReceipt).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 0, forInvoices: ["5001"] })
    );
  });

  it("סכום 0 בלי יתרה מכסה אינו נשלח", async () => {
    await openDialog(0);
    await typeAmount("0");
    await clickButton("הפק קבלה");
    expect(BillingServices.createReceipt).not.toHaveBeenCalled();
  });
});
