// בדיקות לשמירת מחיר ששונה בעריכת תעודת משלוח גם במחירון הלקוח.
//
// מה שהן שומרות עליו:
// 1. רק מחיר ששונה נשלח למחירון — שמירה של תיקון כמות אינה נוגעת בו.
// 2. המחירון מתעדכן רק אחרי שהתעודה נשמרה, וכישלון שלו נאמר במפורש.
// 3. מוצר שמתומחר מהמחירון הקבוצתי אינו נכתב למחירון הפרטי.

import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/BillingServices", () => ({
  default: { updateDeliveryNote: vi.fn(), priceItems: vi.fn() },
}));
vi.mock("@/services/CustomerPriceListServices", () => ({
  default: { upsertItems: vi.fn(), getCustomerPriceListSkus: vi.fn() },
}));
vi.mock("@/services/CustomerHistoryServices", () => ({
  default: { getCustomerHistory: vi.fn() },
}));
vi.mock("@/utils/toast", () => ({
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));
vi.mock("@/components/billing/ProductPicker", () => ({
  default: ({ onChange }) =>
    React.createElement("button", {
      type: "button",
      "data-picker": true,
      onClick: () => onChange("999"),
    }),
}));
vi.mock("@/components/billing/BarcodeInput", () => ({
  default: () => React.createElement("div"),
}));

import BillingServices from "@/services/BillingServices";
import CustomerHistoryServices from "@/services/CustomerHistoryServices";
import CustomerPriceListServices from "@/services/CustomerPriceListServices";
import { notifyError } from "@/utils/toast";
import DeliveryNoteEditor from "@/components/billing/DeliveryNoteEditor";

let container;
let root;

const note = {
  _id: "n1",
  number: 1001,
  customer: { _id: "c1" },
  items: [
    { sku: "111", name: "עגבניות", quantity: 2, unitPrice: 10 },
    { sku: "222", name: "מלפפונים", quantity: 1, unitPrice: 8 },
  ],
};

const render = async () => {
  await act(async () => {
    root.render(React.createElement(DeliveryNoteEditor, { note, onSaved: () => {} }));
  });
};

const priceInputs = () => [...container.querySelectorAll('input[placeholder="מחיר יח\'"]')];
const quantityInputs = () => [...container.querySelectorAll('input[placeholder="כמות"]')];
// "כל הקטלוג" אינו מוצג כאן (ללקוח אין היסטוריה), ולכן כל תיבה היא של שורה
const checkboxes = () => [...container.querySelectorAll('input[type="checkbox"]')];

const type = async (input, value) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  await act(async () => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const click = async (el) => {
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const saveButton = () =>
  [...container.querySelectorAll("button")].find((b) => b.textContent.includes("שמירה והדפסה"));

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  vi.clearAllMocks();

  BillingServices.priceItems.mockResolvedValue({ items: [] });
  BillingServices.updateDeliveryNote.mockResolvedValue({ message: "עודכנה", note });
  CustomerPriceListServices.upsertItems.mockResolvedValue({ message: "נשמר" });
  CustomerPriceListServices.getCustomerPriceListSkus.mockResolvedValue({ skus: [] });
  CustomerHistoryServices.getCustomerHistory.mockResolvedValue({ items: [] });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("DeliveryNoteEditor — מחיר ששונה נשמר במחירון הלקוח", () => {
  it("שמירה בלי שינוי מחיר אינה נוגעת במחירון", async () => {
    await render();
    expect(checkboxes()).toHaveLength(0);

    await type(quantityInputs()[0], "3");
    await click(saveButton());

    expect(BillingServices.updateDeliveryNote).toHaveBeenCalledTimes(1);
    expect(CustomerPriceListServices.upsertItems).not.toHaveBeenCalled();
  });

  it("רק השורה שהמחיר שלה שונה נשלחת למחירון, אחרי השמירה", async () => {
    await render();
    await type(priceInputs()[0], "12.5");
    expect(checkboxes()).toHaveLength(1);
    expect(checkboxes()[0].checked).toBe(true);
    await click(saveButton());

    expect(BillingServices.updateDeliveryNote).toHaveBeenCalledTimes(1);
    expect(CustomerPriceListServices.upsertItems).toHaveBeenCalledWith("c1", {
      items: [{ sku: "111", price: 12.5 }],
    });
  });

  it("מחיר שהוחזר לערך המקורי אינו נחשב שינוי", async () => {
    await render();
    await type(priceInputs()[0], "12.5");
    await type(priceInputs()[0], "10");
    expect(checkboxes()).toHaveLength(0);

    await click(saveButton());
    expect(CustomerPriceListServices.upsertItems).not.toHaveBeenCalled();
  });

  it("הסרת הסימון משאירה את התיקון בתעודה בלבד", async () => {
    await render();
    await type(priceInputs()[0], "12.5");
    await click(checkboxes()[0]);
    await click(saveButton());

    expect(BillingServices.updateDeliveryNote.mock.calls[0][1].items[0].unitPrice).toBe(12.5);
    expect(CustomerPriceListServices.upsertItems).not.toHaveBeenCalled();
  });

  it("לא שומר במחירון כשעדכון התעודה נכשל", async () => {
    BillingServices.updateDeliveryNote.mockRejectedValue(new Error("התעודה חויבה"));
    await render();
    await type(priceInputs()[0], "12.5");
    await click(saveButton());

    expect(CustomerPriceListServices.upsertItems).not.toHaveBeenCalled();
  });

  it("אומר במפורש כשהמחיר לא נשמר במחירון", async () => {
    CustomerPriceListServices.upsertItems.mockRejectedValue(new Error("אין הרשאה"));
    await render();
    await type(priceInputs()[0], "12.5");
    await click(saveButton());

    expect(notifyError).toHaveBeenCalledWith(expect.stringContaining("המחיר לא נשמר במחירון"));
  });

  it("מוצר שהוחלף בשורה אינו מקבל למחירון את המחיר של קודמו", async () => {
    await render();
    await click(container.querySelectorAll("[data-picker]")[0]);

    // המחיר 10 נשאר בשורה, אבל הוא הוקלד למוצר 111
    expect(checkboxes()).toHaveLength(1);
    expect(checkboxes()[0].checked).toBe(false);

    await click(saveButton());
    expect(BillingServices.updateDeliveryNote.mock.calls[0][1].items[0].sku).toBe("999");
    expect(CustomerPriceListServices.upsertItems).not.toHaveBeenCalled();
  });

  it("מוצר מהמחירון הקבוצתי אינו נכתב למחירון הפרטי", async () => {
    BillingServices.priceItems.mockResolvedValue({
      items: [{ sku: "111", unitPrice: 9, source: "groupPriceList" }],
    });
    await render();
    // נשאל כבר בפתיחה, כדי שהתשובה תהיה כאן לפני השמירה
    expect(BillingServices.priceItems).toHaveBeenCalledWith({
      customer: "c1",
      items: [
        { sku: "111", quantity: 1 },
        { sku: "222", quantity: 1 },
      ],
    });
    await type(priceInputs()[0], "12.5");
    expect(checkboxes()).toHaveLength(0);
    expect(container.textContent).toContain("במחירון הקבוצתי");

    await click(saveButton());
    expect(CustomerPriceListServices.upsertItems).not.toHaveBeenCalled();
  });
});
