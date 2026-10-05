// בדיקות למסך הצעות המחיר, כשנכנסים אליו מהכפתור "הצעת מחיר חדשה ללקוח"
// שבכרטיס הלקוח (/quotes?customer=<id>&new=1).
//
// מה שהן שומרות עליו:
// 1. הבונה נפתח מיד, והלקוח מהכתובת כבר בחור בו.
// 2. new=1 נמחק מהכתובת אחרי השימוש, וסינון הלקוח נשאר.
// 3. כניסה רגילה למסך אינה פותחת את הבונה.

import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { createMemoryHistory } from "history";
import { Route, Router } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/BillingServices", () => ({
  default: { getQuotes: vi.fn(), priceItems: vi.fn(), createQuote: vi.fn() },
}));

// הבורר האמיתי טוען את כל הלקוחות מהשרת. כאן מספיק לראות איזה ערך קיבל
vi.mock("@/components/billing/CustomerPicker", () => ({
  default: ({ value }) => <span data-testid="customer-picker">{value || "(ריק)"}</span>,
}));
vi.mock("@/components/billing/ProductPicker", () => ({
  default: ({ value, onChange }) => (
    <input data-testid="sku" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));
vi.mock("@/components/billing/BarcodeInput", () => ({ default: () => null }));

import BillingServices from "@/services/BillingServices";
import Quotes from "@/pages/Quotes";

let container;
let root;
let history;

const render = async (url) => {
  history = createMemoryHistory({ initialEntries: [url] });
  await act(async () => {
    root.render(
      <Router history={history}>
        <Route path="/quotes">
          <Quotes />
        </Route>
      </Router>
    );
  });
  await act(async () => {
    await Promise.resolve();
  });
};

const picker = () => container.querySelector("[data-testid='customer-picker']");

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  vi.clearAllMocks();
  BillingServices.getQuotes.mockResolvedValue({ quotes: [], total: 0 });
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe("Quotes — הצעה חדשה מכרטיס הלקוח", () => {
  it("פותח את הבונה עם הלקוח מהכתובת ומסיר את new=1", async () => {
    await render("/quotes?customer=c1&new=1");

    expect(picker()?.textContent).toBe("c1");
    expect(history.location.search).toBe("?customer=c1");
    // הרשימה שמתחת לבונה מסוננת לאותו לקוח
    expect(BillingServices.getQuotes).toHaveBeenLastCalledWith(
      expect.objectContaining({ customer: "c1" })
    );
  });

  it("כניסה רגילה אינה פותחת את הבונה", async () => {
    await render("/quotes?customer=c1");

    expect(picker()).toBeNull();
    expect(history.location.search).toBe("?customer=c1");
  });

  it("הצעה חדשה ברשימה מסוננת בוחרת מראש את הלקוח", async () => {
    await render("/quotes?customer=c1");

    const button = [...container.querySelectorAll("button")].find((b) =>
      b.textContent.includes("הצעה חדשה")
    );
    await act(async () => {
      button.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    });

    expect(picker()?.textContent).toBe("c1");
  });
});

// מחיר ידני בהצעה (בקשת הלקוחה, 05/10/26): אפשר לשנות מחיר אחרי "חשב
// מחירים", ומה שמופק הוא מה שעל המסך.
describe("Quotes — מחיר ידני", () => {
  const type = async (input, value) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    await act(async () => {
      setter.call(input, value);
      input.dispatchEvent(new window.Event("input", { bubbles: true }));
    });
  };
  const findButton = (text) =>
    [...container.querySelectorAll("button")].find((b) => b.textContent.includes(text));
  const click = async (text) => {
    await act(async () => {
      findButton(text).dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    });
    await act(async () => {
      await Promise.resolve();
    });
  };
  const pricedRow = (over = {}) => ({
    sku: "A1",
    name: "מוצר",
    quantity: 2,
    unitPrice: 10,
    lineTotal: 20,
    source: "catalog",
    unknownProduct: false,
    ...over,
  });
  const skuInputs = () => [...container.querySelectorAll("[data-testid='sku']")];
  const priceInputs = () => [...container.querySelectorAll("table input[type='number']")];

  const open = async (items) => {
    BillingServices.priceItems.mockResolvedValue({
      items,
      quality: { total: items.length, catalog: 0, hasMissing: false },
    });
    BillingServices.createQuote.mockResolvedValue({ message: "ok" });
    await render("/quotes?customer=c1&new=1");
  };

  it("מחיר שהוקלד אחרי התמחור נשלח בהפקה, ואין שדה תוקף", async () => {
    await open([pricedRow()]);
    await type(skuInputs()[0], "A1");
    await click("חשב מחירים");

    expect(container.textContent).not.toContain("תוקף (ימים)");
    expect(priceInputs()[0].value).toBe("10");

    await type(priceInputs()[0], "7.5");
    // הטבלה נשארת פתוחה, והסכום מתעדכן לפי המחיר שהוקלד
    expect(container.textContent).toContain("15.00");
    expect(container.textContent).toContain("ידני");

    await click("הפק הצעת מחיר");
    const body = BillingServices.createQuote.mock.calls[0][0];
    expect(body.items).toEqual([{ sku: "A1", quantity: 1, unitPrice: 7.5 }]);
    expect(body).not.toHaveProperty("validDays");
  });

  it("בלי מחיר ידני השורה נשלחת בלי unitPrice — המחירון קובע", async () => {
    await open([pricedRow()]);
    await type(skuInputs()[0], "A1");
    await click("חשב מחירים");

    // שדה שרוקן חוזר למחירון ואינו נשלח כמחיר 0
    await type(priceInputs()[0], "3");
    await type(priceInputs()[0], "");
    expect(priceInputs()[0].value).toBe("");
    expect(container.textContent).toContain("20.00");

    await click("הפק הצעת מחיר");
    expect(BillingServices.createQuote.mock.calls[0][0].items).toEqual([
      { sku: "A1", quantity: 1 },
    ]);
  });

  it("אותו מוצר בשתי שורות — מחיר ידני חל רק על השורה שבה הוקלד", async () => {
    await open([pricedRow(), pricedRow()]);
    await type(skuInputs()[0], "A1");
    await click("שורה");
    await type(skuInputs()[1], "A1");
    await click("חשב מחירים");

    await type(priceInputs()[1], "6");
    expect(priceInputs()[0].value).toBe("10");

    await click("הפק הצעת מחיר");
    expect(BillingServices.createQuote.mock.calls[0][0].items).toEqual([
      { sku: "A1", quantity: 1 },
      { sku: "A1", quantity: 1, unitPrice: 6 },
    ]);
  });

  it("מוצר בלי מחיר חוסם הפקה עד שמקלידים לו מחיר", async () => {
    await open([pricedRow({ unitPrice: 0, lineTotal: 0, source: "missing" })]);
    await type(skuInputs()[0], "A1");
    await click("חשב מחירים");
    expect(findButton("הפק הצעת מחיר").disabled).toBe(true);

    await type(priceInputs()[0], "4");
    expect(findButton("הפק הצעת מחיר").disabled).toBe(false);

    // שלילי אינו מחיר — נחסם ולא נופל בשקט למחיר המחירון
    await type(priceInputs()[0], "-4");
    expect(findButton("הפק הצעת מחיר").disabled).toBe(true);
  });

  it("מוצר שאינו בקטלוג נחסם גם עם מחיר ידני", async () => {
    await open([pricedRow({ unitPrice: 0, lineTotal: 0, source: "missing", unknownProduct: true })]);
    await type(skuInputs()[0], "A1");
    await click("חשב מחירים");
    await type(priceInputs()[0], "4");

    expect(findButton("הפק הצעת מחיר").disabled).toBe(true);
  });
});
