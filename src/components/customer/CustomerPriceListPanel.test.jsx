// עריכת המחירון ישירות מכרטיס הלקוח, בלי אקסל (בקשת הלקוחה, 04/10/2026).
//
// מה שנשמר כאן:
// 1. בלי לחיצה אין שדות קלט — הכרטיס יושב בעמוד שבודק את זה במצב צפייה.
// 2. שינוי מחיר שולח את המק"ט כפי שנשמר, ואת השם שהגיע מהקובץ (אחרת מוצר
//    שאינו בקטלוג מאבד את שמו).
// 3. מחיר ריק/אפס לא נשלח בכלל.
// 4. הסרה עוברת דרך אישור, ונשלחת רק אחריו.
// 5. הוספת מוצר חדש — גם ללקוח שאין לו מחירון.

import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/toast", () => ({ notifyError: vi.fn(), notifySuccess: vi.fn() }));

vi.mock("@/services/CustomerPriceListServices", () => ({
  default: {
    getCustomerPriceList: vi.fn(),
    upsertItems: vi.fn(() => Promise.resolve({ message: "נשמר" })),
    removeItems: vi.fn(() => Promise.resolve({ message: "הוסר" })),
  },
}));

// מודאל היבוא אינו מה שנבדק כאן
vi.mock("@/components/customer/CustomerPriceListModal", () => ({ default: () => null }));

// בורר המוצרים טוען את כל הקטלוג. כאן מספיק שדה שמחזיר מק"ט
vi.mock("@/components/billing/ProductPicker", () => ({
  default: ({ value, onChange }) => (
    <select data-testid="picker" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">—</option>
      <option value="555">מוצר חדש</option>
    </select>
  ),
}));

import CustomerPriceListServices from "@/services/CustomerPriceListServices";
import { notifyError } from "@/utils/toast";
import CustomerPriceListPanel from "@/components/customer/CustomerPriceListPanel";

const LIST = {
  exists: true,
  itemsCount: 2,
  matchedInCatalog: 1,
  filtered: 2,
  returned: 2,
  fileName: "prices.xlsx",
  items: [
    { sku: "0123", price: 12, name: "אובלטים", inCatalog: true, catalogTitle: "אובלטים", catalogPrice: 8.9, catalogStatus: "show" },
    { sku: "999", price: 4, name: "מוצר מהקובץ", inCatalog: false, catalogTitle: "", catalogPrice: null, catalogStatus: null },
  ],
};

let container;
let root;

const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

const render = async () => {
  await act(async () => {
    root.render(<CustomerPriceListPanel customerId="c1" customerName="בדיקה" />);
  });
  await flush();
};

// לפי aria-label בהשוואה ישירה — התווית מכילה גרשיים (מק"ט), ובורר CSS נשבר עליהם
const byLabel = (tag, label) =>
  [...container.querySelectorAll(tag)].find((el) => el.getAttribute("aria-label") === label);
const buttonByLabel = (label) => byLabel("button", label);
const buttonByText = (text) =>
  [...container.querySelectorAll("button")].find((b) => b.textContent.includes(text));

const typeInto = async (input, value) => {
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
  await flush();
};

beforeEach(() => {
  vi.clearAllMocks();
  CustomerPriceListServices.getCustomerPriceList.mockResolvedValue(LIST);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

describe("עריכת מחירון מהמסך", () => {
  it("בלי לחיצה אין שדות מחיר — רק חיפוש", async () => {
    await render();
    const inputs = [...container.querySelectorAll("input")];
    expect(inputs.every((i) => i.type === "search")).toBe(true);
  });

  it("לקוח בלי מחירון: אין שדות קלט בכלל, אבל יש כפתור הוספה", async () => {
    CustomerPriceListServices.getCustomerPriceList.mockResolvedValue({ exists: false, items: [] });
    await render();
    expect(container.querySelectorAll("input").length).toBe(0);
    expect(buttonByText("הוספת מוצר למחירון")).toBeTruthy();
  });

  it("שינוי מחיר שולח את המק\"ט כפי שנשמר ואת השם מהקובץ", async () => {
    await render();
    await click(buttonByLabel('שינוי המחיר של מק"ט 999'));
    await typeInto(byLabel("input", 'מחיר חדש למק"ט 999'), "4.5");
    await click(buttonByLabel("שמירת המחיר"));

    expect(CustomerPriceListServices.upsertItems).toHaveBeenCalledWith("c1", {
      items: [{ sku: "999", price: 4.5, name: "מוצר מהקובץ" }],
    });
    // המחירון נטען מחדש אחרי השמירה
    expect(CustomerPriceListServices.getCustomerPriceList).toHaveBeenCalledTimes(2);
  });

  it("מק\"ט עם אפס מוביל נשלח כמו שהוא", async () => {
    await render();
    await click(buttonByLabel('שינוי המחיר של מק"ט 0123'));
    await typeInto(byLabel("input", 'מחיר חדש למק"ט 0123'), "13");
    await click(buttonByLabel("שמירת המחיר"));
    expect(CustomerPriceListServices.upsertItems.mock.calls[0][1].items[0].sku).toBe("0123");
  });

  it("מחיר אפס או ריק לא נשלח", async () => {
    await render();
    await click(buttonByLabel('שינוי המחיר של מק"ט 999'));
    const input = byLabel("input", 'מחיר חדש למק"ט 999');
    for (const bad of ["0", ""]) {
      await typeInto(input, bad);
      await click(buttonByLabel("שמירת המחיר"));
    }
    expect(CustomerPriceListServices.upsertItems).not.toHaveBeenCalled();
    expect(notifyError).toHaveBeenCalled();
  });

  it("הסרה נשלחת רק אחרי אישור", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    await render();

    await click(buttonByLabel('הסרת מק"ט 999 מהמחירון'));
    expect(CustomerPriceListServices.removeItems).not.toHaveBeenCalled();

    await click(buttonByLabel('הסרת מק"ט 999 מהמחירון'));
    expect(CustomerPriceListServices.removeItems).toHaveBeenCalledWith("c1", { skus: ["999"] });
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  it("הוספת מוצר חדש", async () => {
    await render();
    await click(buttonByText("הוספת מוצר למחירון"));

    const picker = container.querySelector('[data-testid="picker"]');
    await act(async () => {
      picker.value = "555";
      picker.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await typeInto(container.querySelector('input[aria-label="מחיר ללקוח"]'), "7");
    await click(buttonByText("שמירה"));

    expect(CustomerPriceListServices.upsertItems).toHaveBeenCalledWith("c1", {
      items: [{ sku: "555", price: 7 }],
    });
    // הטופס נסגר אחרי שמירה מוצלחת
    expect(container.querySelector('[data-testid="picker"]')).toBeNull();
  });

  it("הוספה בלי מוצר נחסמת", async () => {
    await render();
    await click(buttonByText("הוספת מוצר למחירון"));
    await typeInto(container.querySelector('input[aria-label="מחיר ללקוח"]'), "7");
    await click(buttonByText("שמירה"));
    expect(CustomerPriceListServices.upsertItems).not.toHaveBeenCalled();
  });
});
