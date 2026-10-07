// בדיקות לשמירת מחיר ידני במחירון הלקוח מתוך תעודת משלוח ידנית.
//
// מה שהן שומרות עליו:
// 1. האפשרות מופיעה רק כשהוקלד מחיר — בלי מחיר אין מה לשמור.
// 2. רק שורות שסומנו נשלחות למחירון, ורק אחרי שהתעודה הופקה.
// 3. כישלון בשמירת המחירון נאמר במפורש ואינו נבלע.

import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/BillingServices", () => ({
  default: {
    getPendingManualItems: vi.fn(),
    priceItems: vi.fn(),
    createManualDeliveryNote: vi.fn(),
  },
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
// הבוררים מושכים נתונים מהשרת; לבדיקות האלה הם אינם רלוונטיים. בורר המוצר
// רק מתעד את הסינון שקיבל, לבדיקות של "רק מוצרי המחירון"
const pickerScopes = vi.hoisted(() => []);
vi.mock("@/components/billing/ProductPicker", () => ({
  default: ({ onlySkus }) => {
    pickerScopes.push(onlySkus);
    return React.createElement("div");
  },
}));
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
import CustomerHistoryServices from "@/services/CustomerHistoryServices";
import CustomerPriceListServices from "@/services/CustomerPriceListServices";
import { notifyError } from "@/utils/toast";
import ManualDeliveryNoteForm from "@/components/billing/ManualDeliveryNoteForm";

let container;
let root;

const render = async () => {
  await act(async () => {
    root.render(
      React.createElement(ManualDeliveryNoteForm, {
        orderId: "o1",
        customerId: "c1",
        onCreated: () => {},
      })
    );
  });
};

const priceInputs = () => [...container.querySelectorAll('input[placeholder="מחיר יח\'"]')];

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

const createButton = () =>
  [...container.querySelectorAll("button")].find((b) => b.textContent.includes("הפק תעודת משלוח"));

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  vi.clearAllMocks();

  BillingServices.getPendingManualItems.mockResolvedValue({
    order: { user: "c1" },
    items: [
      { sku: "111", quantity: 2, name: "עגבניות" },
      { sku: "222", quantity: 1, name: "מלפפונים" },
    ],
  });
  // הטופס שואל על המחירים השמורים ברגע שיש שורות; ברירת המחדל כאן היא
  // "אין מה להציג", והבדיקות שעוסקות בתצוגה קובעות תשובה משלהן
  BillingServices.priceItems.mockResolvedValue({ items: [] });
  // ברירת המחדל: ללקוח אין מחירון ואין היסטוריה, והבורר מציג את כל הקטלוג
  CustomerPriceListServices.getCustomerPriceListSkus.mockResolvedValue({ skus: [] });
  CustomerHistoryServices.getCustomerHistory.mockResolvedValue({ items: [] });
  pickerScopes.length = 0;
  BillingServices.createManualDeliveryNote.mockResolvedValue({
    message: "התעודה הופקה",
    note: { customer: "c1" },
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("ManualDeliveryNoteForm — שמירת מחיר במחירון", () => {
  it("מציג את האפשרות רק לשורה שהוקלד בה מחיר", async () => {
    await render();
    expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);

    await type(priceInputs()[0], "12.5");
    expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(1);
  });

  it("שולח למחירון רק שורות שסומנו, אחרי ההפקה", async () => {
    CustomerPriceListServices.upsertItems.mockResolvedValue({ message: "נשמר" });
    await render();

    await type(priceInputs()[0], "12.5");
    await type(priceInputs()[1], "8");
    // מסמנים רק את השורה הראשונה
    await click(container.querySelectorAll('input[type="checkbox"]')[0]);
    await click(createButton());

    expect(BillingServices.createManualDeliveryNote).toHaveBeenCalledTimes(1);
    expect(CustomerPriceListServices.upsertItems).toHaveBeenCalledWith("c1", {
      items: [{ sku: "111", price: 12.5 }],
    });
  });

  it("לא נוגע במחירון כשלא סומן דבר", async () => {
    await render();
    await type(priceInputs()[0], "12.5");
    await click(createButton());

    expect(BillingServices.createManualDeliveryNote).toHaveBeenCalledTimes(1);
    expect(CustomerPriceListServices.upsertItems).not.toHaveBeenCalled();
  });

  it("לא שומר במחירון כשההפקה נכשלה", async () => {
    BillingServices.createManualDeliveryNote.mockRejectedValue(new Error("נכשל"));
    await render();
    await type(priceInputs()[0], "12.5");
    await click(container.querySelector('input[type="checkbox"]'));
    await click(createButton());

    expect(CustomerPriceListServices.upsertItems).not.toHaveBeenCalled();
  });

  it("אומר במפורש כשהמחיר לא נשמר במחירון", async () => {
    CustomerPriceListServices.upsertItems.mockRejectedValue({
      response: { data: { message: "אין לך הרשאה לשנות מחירונים של לקוחות." } },
    });
    await render();
    await type(priceInputs()[0], "12.5");
    await click(container.querySelector('input[type="checkbox"]'));
    await click(createButton());

    expect(notifyError).toHaveBeenCalledWith(expect.stringContaining("המחיר לא נשמר במחירון"));
  });

  it("מחיר שנמחק והוקלד מחדש אינו נשמר עם הסימון הישן", async () => {
    await render();
    await type(priceInputs()[0], "12.5");
    await click(container.querySelector('input[type="checkbox"]'));

    await type(priceInputs()[0], "");
    await type(priceInputs()[0], "9");
    expect(container.querySelector('input[type="checkbox"]').checked).toBe(false);

    await click(createButton());
    expect(CustomerPriceListServices.upsertItems).not.toHaveBeenCalled();
  });
});

// המחיר השמור חייב להיראות בשורה בלי ללחוץ "חשב מחירים": שדה ריק נראה כמו
// "לא נשמר", וזה מה שגרם להקלדה כפולה של אותם מחירים (05/10/2026).
describe("ManualDeliveryNoteForm — הצגת המחיר השמור", () => {
  beforeEach(() => {
    BillingServices.priceItems.mockResolvedValue({
      items: [
        { sku: "111", unitPrice: 35, source: "customerPriceList" },
        { sku: "222", unitPrice: 8.9, source: "catalog" },
      ],
    });
  });

  it("מציג את מחיר המחירון ואת מחיר הקטלוג מתחת לשדה, והשדה נשאר ריק", async () => {
    await render();

    expect(BillingServices.priceItems).toHaveBeenCalledWith({
      customer: "c1",
      items: [
        { sku: "111", quantity: 1 },
        { sku: "222", quantity: 1 },
      ],
    });
    expect(container.textContent).toContain("35.00 ₪ · מחירון הלקוח");
    expect(container.textContent).toContain("8.90 ₪ · קטלוג");
    expect(priceInputs().map((input) => input.value)).toEqual(["", ""]);
    // מחיר שמגיע מהמחירון אינו מחיר ידני, ולכן אין מה להציע לשמור
    expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
  });

  it("שדה ריק נשלח בלי מחיר, כדי שהשרת יתמחר מהמחירון", async () => {
    await render();
    await click(createButton());

    expect(BillingServices.createManualDeliveryNote.mock.calls[0][0].items).toEqual([
      { sku: "111", quantity: 2, unitPrice: undefined },
      { sku: "222", quantity: 1, unitPrice: undefined },
    ]);
  });

  it("כשמקלידים מחיר אחר מוצג מה כתוב במחירון, ולא נשאלת שאלה נוספת לשרת", async () => {
    await render();
    await type(priceInputs()[0], "40");

    expect(container.textContent).toContain("במחירון: 35.00 ₪");
    expect(container.textContent).not.toContain("35.00 ₪ · מחירון הלקוח");
    expect(BillingServices.priceItems).toHaveBeenCalledTimes(1);
  });

  it("כשל בשאלת המחירים אינו מפריע לטופס ואינו מוצג כשגיאה", async () => {
    BillingServices.priceItems.mockRejectedValue(new Error("network"));
    await render();

    expect(container.textContent).not.toContain("₪ ·");
    expect(notifyError).not.toHaveBeenCalled();
    await click(createButton());
    expect(BillingServices.createManualDeliveryNote).toHaveBeenCalledTimes(1);
  });

  it("מוצר בלי מחיר מסומן, ולא מוצג כמחיר 0", async () => {
    BillingServices.priceItems.mockResolvedValue({
      items: [{ sku: "111", unitPrice: 0, source: "missing" }],
    });
    await render();

    expect(container.textContent).toContain("אין מחיר!");
    expect(container.textContent).not.toContain("0.00 ₪");
  });
});

describe("ManualDeliveryNoteForm — רק מוצרים שהלקוח מכיר", () => {
  const catalogToggle = () =>
    [...container.querySelectorAll("label")]
      .find((l) => l.textContent.includes("כל הקטלוג"))
      ?.querySelector("input");
  const lastScope = () => pickerScopes[pickerScopes.length - 1];

  it("הבורר מקבל את מק\"טי המחירון של הלקוח שנבחר", async () => {
    CustomerPriceListServices.getCustomerPriceListSkus.mockResolvedValue({ skus: ["111", "333"] });
    await render();

    expect(CustomerPriceListServices.getCustomerPriceListSkus).toHaveBeenCalledWith("c1");
    expect([...lastScope()]).toEqual(["111", "333"]);
  });

  it("הבורר מקבל גם את מה שהלקוח קנה בעבר, בלי מחירון", async () => {
    CustomerHistoryServices.getCustomerHistory.mockResolvedValue({
      items: [{ sku: "555" }, { sku: "0077" }],
    });
    await render();

    expect(CustomerHistoryServices.getCustomerHistory).toHaveBeenCalledWith("c1", { limit: 1000 });
    // "0077" נכנס גם בצורתו המספרית: בקטלוג אותו מוצר יכול להיות "77"
    expect([...lastScope()]).toEqual(["555", "0077", "77"]);
  });

  it("היסטוריה ומחירון מתאחדים, וכשל באחד אינו מבטל את השני", async () => {
    CustomerHistoryServices.getCustomerHistory.mockResolvedValue({ items: [{ sku: "555" }] });
    CustomerPriceListServices.getCustomerPriceListSkus.mockResolvedValue({ skus: ["111"] });
    await render();
    expect([...lastScope()]).toEqual(["555", "111"]);

    CustomerHistoryServices.getCustomerHistory.mockRejectedValue(new Error("network"));
    act(() => root.unmount());
    root = createRoot(container);
    await render();
    expect([...lastScope()]).toEqual(["111"]);
  });

  it("היסטוריה שחזרה חתוכה אינה מסננת — רשימה חלקית הייתה מסתירה מוצרים", async () => {
    CustomerHistoryServices.getCustomerHistory.mockResolvedValue({
      items: [{ sku: "555" }],
      returned: 1000,
      filtered: 1400,
    });
    CustomerPriceListServices.getCustomerPriceListSkus.mockResolvedValue({ skus: ["111"] });
    await render();

    expect(lastScope()).toBeNull();
  });

  it("\"כל הקטלוג\" מסיר את הסינון, וביטולו מחזיר אותו", async () => {
    CustomerPriceListServices.getCustomerPriceListSkus.mockResolvedValue({ skus: ["111"] });
    await render();

    await click(catalogToggle());
    expect(lastScope()).toBeNull();

    await click(catalogToggle());
    expect([...lastScope()]).toEqual(["111"]);
  });

  it("לקוח בלי מחירון ובלי היסטוריה רואה את כל הקטלוג, בלי מתג", async () => {
    await render();

    expect(lastScope()).toBeNull();
    expect(catalogToggle()).toBeUndefined();
  });

  it("כשל בטעינת המחירון משאיר את כל הקטלוג ואינו מוצג כשגיאה", async () => {
    CustomerHistoryServices.getCustomerHistory.mockRejectedValue(new Error("network"));
    CustomerPriceListServices.getCustomerPriceListSkus.mockRejectedValue(new Error("network"));
    await render();

    expect(lastScope()).toBeNull();
    expect(notifyError).not.toHaveBeenCalled();
  });
});

describe("ManualDeliveryNoteForm — חלון ההיסטוריה של הלקוח", () => {
  const historyButton = () =>
    [...container.querySelectorAll("button")].find((b) => b.textContent.includes("היסטוריית הלקוח"));

  it("הכפתור פותח את חלון ההיסטוריה של הלקוח שבתעודה", async () => {
    await render();
    expect(container.querySelector("[data-history]")).toBeNull();

    await click(historyButton());
    const modal = container.querySelector("[data-history]");
    expect(modal.getAttribute("data-history")).toBe("c1");
    expect(modal.textContent).toBe("מכולת השכונה");
  });

  it("בלי לקוח הכפתור כבוי", async () => {
    await act(async () => {
      root.render(React.createElement(ManualDeliveryNoteForm, { onCreated: () => {} }));
    });
    expect(historyButton().disabled).toBe(true);
  });

  it("היסטוריה שהשתנתה בחלון מרעננת את סינון בורר המוצרים", async () => {
    await render();
    const before = CustomerHistoryServices.getCustomerHistory.mock.calls.length;

    await click(historyButton());
    await click(container.querySelector("[data-history]"));
    expect(CustomerHistoryServices.getCustomerHistory.mock.calls.length).toBe(before + 1);
  });
});
