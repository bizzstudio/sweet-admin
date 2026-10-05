// בדיקות לסינון בורר המוצרים לפי המוצרים שהלקוח מכיר (היסטוריה ומחירון).
//
// הכלל חייב להיות זהה ל-priceForProduct בשרת: מוצר שמתומחר מהמחירון ואינו
// מופיע בבורר הוא מוצר שאי אפשר להכניס לתעודה בלי לפתוח את כל הקטלוג.

import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/ProductServices", () => ({
  default: {
    getProductsLite: vi.fn(() =>
      Promise.resolve({
        products: [
          { sku: "0123", barcode: "", name: "עגבניות", price: 5 },
          { sku: "200", barcode: "", name: "מלפפונים", price: 4 },
          { sku: "300", barcode: "", name: "גזר", price: 3 },
        ],
      })
    ),
  },
}));

import ProductPicker, { inSkuSet } from "@/components/billing/ProductPicker";

describe("inSkuSet", () => {
  const skus = new Set(["123", "AB-9"]);

  it("מתאים מק\"ט זהה", () => {
    expect(inSkuSet(skus, { sku: "AB-9" })).toBe(true);
    expect(inSkuSet(skus, { sku: 123 })).toBe(true);
  });

  it("מתאים מק\"ט מספרי עם אפסים מובילים", () => {
    expect(inSkuSet(skus, { sku: "0123" })).toBe(true);
  });

  it("לא מתאים מוצר שאינו במחירון, או מוצר בלי מק\"ט", () => {
    expect(inSkuSet(skus, { sku: "124" })).toBe(false);
    expect(inSkuSet(skus, { sku: "" })).toBe(false);
    expect(inSkuSet(skus, {})).toBe(false);
  });
});

describe("ProductPicker — onlySkus", () => {
  let container;
  let root;

  const render = async (props) => {
    await act(async () => {
      root.render(React.createElement(ProductPicker, { onChange: () => {}, ...props }));
    });
  };

  // פתיחת הרשימה, וקריאת האפשרויות מתוכה (היא מרונדרת ב-portal על ה-body)
  const openMenu = async () => {
    const input = container.querySelector("input");
    await act(async () => {
      input.focus();
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    });
    return document.body.textContent;
  };

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("בלי סינון מוצג כל הקטלוג", async () => {
    await render({ value: "" });
    const text = await openMenu();

    expect(text).toContain("עגבניות");
    expect(text).toContain("מלפפונים");
    expect(text).toContain("גזר");
  });

  it("עם סינון מוצגים רק המוצרים שבקבוצה", async () => {
    await render({ value: "", onlySkus: new Set(["123", "300"]) });
    const text = await openMenu();

    expect(text).toContain("עגבניות");
    expect(text).toContain("גזר");
    expect(text).not.toContain("מלפפונים");
  });

  it("מוצר שכבר נבחר מוצג גם אם אינו בקבוצה", async () => {
    await render({ value: "200", onlySkus: new Set(["300"]) });

    expect(container.textContent).toContain("מלפפונים");
  });

  it("קבוצה שאף מוצר שלה אינו בקטלוג אומרת זאת במפורש", async () => {
    await render({ value: "", onlySkus: new Set(["999"]) });
    const text = await openMenu();

    expect(text).toContain("אין למוצרי הלקוח התאמה בקטלוג");
  });
});
