// בדיקות להקלדה הרצופה בתעודת משלוח ידנית, מול בורר המוצר האמיתי.
//
// הבדיקות שב-ManualDeliveryNoteForm.test.jsx מחליפות את הבורר בדמה, ולכן
// אינן יודעות אם react-select מחזיר לעצמו את המיקוד אחרי בחירה. כאן הבורר
// אמיתי: מקלידים שם, Enter, משקל, Enter — בדיוק כמו ליד המקלדת.

import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/ProductServices", () => ({
  default: {
    getProductsLite: vi.fn(() =>
      Promise.resolve({
        products: [
          { sku: "111", barcode: "", name: "עגבניות", price: 5 },
          { sku: "222", barcode: "", name: "מלפפונים", price: 4 },
        ],
      })
    ),
  },
}));
vi.mock("@/services/BillingServices", () => ({
  default: {
    getPendingManualItems: vi.fn(),
    priceItems: vi.fn(() => Promise.resolve({ items: [] })),
    createManualDeliveryNote: vi.fn(() => Promise.resolve({ message: "ok", note: { customer: "c1" } })),
  },
}));
vi.mock("@/services/CustomerPriceListServices", () => ({
  default: { upsertItems: vi.fn(), getCustomerPriceListSkus: vi.fn(() => Promise.resolve({ skus: [] })) },
}));
vi.mock("@/services/CustomerHistoryServices", () => ({
  default: { getCustomerHistory: vi.fn(() => Promise.resolve({ items: [] })) },
}));
vi.mock("@/utils/toast", () => ({ notifyError: vi.fn(), notifySuccess: vi.fn() }));
vi.mock("@/components/billing/CustomerPicker", () => ({
  default: () => React.createElement("div"),
  useCustomers: () => ({ customers: [{ _id: "c1", name: "מכולת", lastName: "השכונה" }] }),
  customerNameOf: (c) => [c?.name, c?.lastName].filter(Boolean).join(" "),
}));
// חלון ההיסטוריה עצמו נבדק בנפרד; כאן נבדק רק מה שהטופס מעביר אליו
vi.mock("@/components/customer/CustomerHistoryModal", () => ({
  default: ({ isOpen, customerId, customerName, onChanged }) =>
    isOpen
      ? React.createElement(
          "button",
          { type: "button", "data-history": customerId, onClick: onChanged },
          customerName
        )
      : null,
}));
vi.mock("@/components/billing/BarcodeInput", () => ({
  default: () => React.createElement("div"),
}));

import BillingServices from "@/services/BillingServices";
import { notifyError } from "@/utils/toast";
import ManualDeliveryNoteForm from "@/components/billing/ManualDeliveryNoteForm";

let container;
let root;

// שדה החיפוש של הבורר הוא ה-input היחיד בשורה שאינו מספרי
const pickerInputs = () => [...container.querySelectorAll('input[role="combobox"]')];
const quantityInputs = () => [...container.querySelectorAll('input[placeholder="משקל בפועל"]')];
const priceInputs = () => [...container.querySelectorAll('input[placeholder="מחיר יח\'"]')];

const type = async (input, value) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  await act(async () => {
    input.focus();
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const press = async (el, key, init = {}) => {
  await act(async () => {
    el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init }));
  });
};

beforeEach(async () => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  vi.clearAllMocks();
  await act(async () => {
    root.render(React.createElement(ManualDeliveryNoteForm, { customerId: "c1", onCreated: () => {} }));
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("ManualDeliveryNoteForm — הקלדה רצופה מול הבורר האמיתי", () => {
  it("שם, Enter, משקל, Enter — שתי שורות בלי עכבר, והן אלה שנשלחות", async () => {
    await type(pickerInputs()[0], "עגב");
    await press(pickerInputs()[0], "Enter");
    expect(document.activeElement).toBe(quantityInputs()[0]);

    await type(quantityInputs()[0], "3.2");
    await press(quantityInputs()[0], "Enter");
    expect(pickerInputs()).toHaveLength(2);
    expect(document.activeElement).toBe(pickerInputs()[1]);

    await type(pickerInputs()[1], "מלפ");
    await press(pickerInputs()[1], "Enter");
    expect(document.activeElement).toBe(quantityInputs()[1]);

    await type(quantityInputs()[1], "1.5");
    await press(quantityInputs()[1], "Enter");
    expect(pickerInputs()).toHaveLength(3);

    const create = [...container.querySelectorAll("button")].find((b) =>
      b.textContent.includes("הפק תעודת משלוח")
    );
    await act(async () => {
      create.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    // השורה הריקה שנפתחה בסוף אינה נשלחת
    expect(BillingServices.createManualDeliveryNote.mock.calls[0][0].items).toEqual([
      { sku: "111", quantity: 3.2, unitPrice: undefined },
      { sku: "222", quantity: 1.5, unitPrice: undefined },
    ]);
  });

  it("בחירה בעכבר מעבירה גם היא לשדה המשקל", async () => {
    await type(pickerInputs()[0], "מלפ");
    const option = [...document.body.querySelectorAll('[role="option"]')].find((o) =>
      o.textContent.includes("מלפפונים")
    );
    await act(async () => {
      option.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
      option.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(document.activeElement).toBe(quantityInputs()[0]);
  });

  it("Enter בשדה המחיר מתנהג כמו Enter במשקל", async () => {
    await type(pickerInputs()[0], "עגב");
    await press(pickerInputs()[0], "Enter");
    await type(quantityInputs()[0], "2");
    await type(priceInputs()[0], "7.5");
    await press(priceInputs()[0], "Enter");

    expect(document.activeElement).toBe(pickerInputs()[1]);
  });

  it("Enter שנשאר לחוץ מבחירת המוצר אינו מדלג על שדה המשקל", async () => {
    await type(pickerInputs()[0], "עגב");
    await press(pickerInputs()[0], "Enter");
    await type(quantityInputs()[0], "2");
    await press(quantityInputs()[0], "Enter", { repeat: true });

    expect(pickerInputs()).toHaveLength(1);
    expect(document.activeElement).toBe(quantityInputs()[0]);
  });

  // הקשות עם חותמת זמן קבועה: המרווח בין התווים הוא מה שמבדיל סורק מאדם
  const keysAt = async (el, text, gapMs) => {
    await act(async () => {
      [...text, "Enter"].forEach((key, n) => {
        const ev = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
        Object.defineProperty(ev, "timeStamp", { value: 1000 + n * gapMs });
        el.dispatchEvent(ev);
      });
    });
  };

  it("ברקוד שנסרק לתוך שדה המשקל נמחק ואינו פותח שורה", async () => {
    await type(pickerInputs()[0], "עגב");
    await press(pickerInputs()[0], "Enter");
    await type(quantityInputs()[0], "1071");
    await keysAt(quantityInputs()[0], "1071", 8);

    expect(quantityInputs()[0].value).toBe("");
    expect(pickerInputs()).toHaveLength(1);
    expect(notifyError).toHaveBeenCalledTimes(1);
  });

  it("אותן ספרות בקצב של אדם הן משקל רגיל", async () => {
    await type(pickerInputs()[0], "עגב");
    await press(pickerInputs()[0], "Enter");
    await type(quantityInputs()[0], "1071");
    await keysAt(quantityInputs()[0], "1071", 120);

    expect(quantityInputs()[0].value).toBe("1071");
    expect(pickerInputs()).toHaveLength(2);
    expect(notifyError).not.toHaveBeenCalled();
  });

  it("ניקוי המוצר אינו מקפיץ לשדה המשקל", async () => {
    await type(pickerInputs()[0], "עגב");
    await press(pickerInputs()[0], "Enter");
    await act(async () => pickerInputs()[0].focus());
    // Backspace על שדה חיפוש ריק מנקה את הבחירה ב-react-select
    await press(pickerInputs()[0], "Backspace");

    expect(document.activeElement).toBe(pickerInputs()[0]);
  });
});
