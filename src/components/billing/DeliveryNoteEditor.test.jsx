// בדיקות לשמירת מחיר ששונה בעריכת תעודת משלוח גם במחירון הלקוח.
//
// מה שהן שומרות עליו:
// 1. מחיר ששונה נשלח למחירון תמיד, בלי בחירה — ושמירה של תיקון כמות
//    אינה נוגעת בו.
// 2. המחירון מתעדכן רק אחרי שהתעודה נשמרה, וכישלון שלו נאמר במפורש.
// 3. מוצר שמתומחר מהמחירון הקבוצתי נשלח עם applyToGroup, והשורה מזהירה
//    שהמחיר ישתנה לכל הקבוצה.

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
// בורר הלקוח האמיתי טוען את כל הלקוחות מהשרת; כאן כפתור שבוחר את c2
vi.mock("@/components/billing/CustomerPicker", () => ({
  default: ({ value, onChange }) =>
    React.createElement(
      "button",
      { type: "button", "data-customer": value, onClick: () => onChange("c2") },
      "החלפת לקוח"
    ),
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
    await type(quantityInputs()[0], "3");
    await click(saveButton());

    expect(BillingServices.updateDeliveryNote).toHaveBeenCalledTimes(1);
    expect(CustomerPriceListServices.upsertItems).not.toHaveBeenCalled();
  });

  it("רק השורה שהמחיר שלה שונה נשלחת למחירון, אחרי השמירה", async () => {
    await render();
    await type(priceInputs()[0], "12.5");
    // אין בחירה בין קבוע לחד-פעמי
    expect(checkboxes()).toHaveLength(0);
    await click(saveButton());

    expect(BillingServices.updateDeliveryNote).toHaveBeenCalledTimes(1);
    expect(CustomerPriceListServices.upsertItems).toHaveBeenCalledWith("c1", {
      items: [{ sku: "111", price: 12.5 }],
      applyToGroup: true,
    });
  });

  it("מחיר שהוחזר לערך המקורי אינו נחשב שינוי", async () => {
    await render();
    await type(priceInputs()[0], "12.5");
    await type(priceInputs()[0], "10");

    await click(saveButton());
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

  it("מוצר שהוחלף בשורה אינו יורש את המחיר של קודמו", async () => {
    await render();
    await click(container.querySelectorAll("[data-picker]")[0]);
    expect(priceInputs()[0].value).toBe("");

    await click(saveButton());
    // שדה ריק: השרת מתמחר את המוצר החדש מהמחירון
    expect(BillingServices.updateDeliveryNote.mock.calls[0][1].items[0]).toEqual({
      sku: "999",
      quantity: 2,
      unitPrice: undefined,
    });
    expect(CustomerPriceListServices.upsertItems).not.toHaveBeenCalled();
  });

  it("מוצר מהמחירון הקבוצתי נשלח עם הדגל, והשורה אומרת שהקבוצתי ישתנה", async () => {
    BillingServices.priceItems.mockResolvedValue({
      items: [{ sku: "111", unitPrice: 9, source: "groupPriceList" }],
    });
    await render();
    expect(BillingServices.priceItems).toHaveBeenCalledWith({
      customer: "c1",
      items: [
        { sku: "111", quantity: 1 },
        { sku: "222", quantity: 1 },
      ],
    });
    expect(container.textContent).not.toContain("ישתנה במחירון הקבוצתי");
    await type(priceInputs()[0], "12.5");
    expect(container.textContent).toContain("ישתנה במחירון הקבוצתי");

    await click(saveButton());
    expect(CustomerPriceListServices.upsertItems).toHaveBeenCalledWith("c1", {
      items: [{ sku: "111", price: 12.5 }],
      applyToGroup: true,
    });
  });

  it("מחיר שתוקן בחזרה למחיר המחירון הקבוצתי אינו נשלח", async () => {
    BillingServices.priceItems.mockResolvedValue({
      items: [{ sku: "111", unitPrice: 9, source: "groupPriceList" }],
    });
    await render();
    await type(priceInputs()[0], "9");
    expect(container.textContent).not.toContain("ישתנה במחירון הקבוצתי");

    await click(saveButton());
    expect(CustomerPriceListServices.upsertItems).not.toHaveBeenCalled();
  });
});

describe("DeliveryNoteEditor — החלפת לקוח", () => {
  const customerButton = () => container.querySelector("[data-customer]");

  it("בלי החלפה — customerId אינו נשלח כלל", async () => {
    await render();
    await click(saveButton());
    expect(BillingServices.updateDeliveryNote.mock.calls[0][1]).not.toHaveProperty("customerId");
  });

  it("לקוח שהוחלף נשלח, המחירים נשארים, והמחירון שמתעדכן הוא של החדש", async () => {
    await render();
    await click(customerButton());
    expect(container.textContent).toContain("התעודה תעבור ללקוח שנבחר");

    await type(priceInputs()[1], "9");
    await click(saveButton());

    const [, payload] = BillingServices.updateDeliveryNote.mock.calls[0];
    expect(payload.customerId).toBe("c2");
    expect(payload.items.map((i) => i.unitPrice)).toEqual([10, 9]);
    expect(CustomerPriceListServices.upsertItems).toHaveBeenCalledWith("c2", {
      items: [{ sku: "222", price: 9 }],
      applyToGroup: true,
    });
  });

  it("מחירי המחירון נטענים מחדש עבור הלקוח החדש", async () => {
    await render();
    await click(customerButton());
    expect(BillingServices.priceItems).toHaveBeenLastCalledWith(
      expect.objectContaining({ customer: "c2" })
    );
  });
});
