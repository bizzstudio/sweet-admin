// בדיקות לעורך פריטי ההזמנה.
//
// מה שהן שומרות עליו:
// 1. השמירה שולחת את *כל* השורות שנשארו — זה הממשק שבו הסרת פריט מיוצגת
//    בהיעדרו, ושורה שנשמטה בטעות מהמטען הייתה מוחקת פריט מההזמנה.
// 2. שורות שמנוע המבצעים יצר מוצגות אך אינן נשלחות: הן מחושבות מחדש בשרת.
// 3. שתי שורות של אותו מוצר מאוחדות לשורה אחת — השרת חוסם כפילות, ובלי
//    האיחוד המסך היה נתקע על הזמנה שנקלטה עם אותו פריט פעמיים.
// 4. חותמת updatedAt נשלחת לנעילה אופטימית, ותשובת NOTE_LOCKED מציגה אישור
//    מפורש במקום להיכשל בשקט.

import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/OrderServices", () => ({
  default: { updateOrderItems: vi.fn() },
}));
vi.mock("@/services/BillingServices", () => ({
  default: { priceItems: vi.fn() },
}));
vi.mock("@/utils/toast", () => ({
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));
// בורר המוצרים מושך את הקטלוג מהשרת; לבדיקות האלה הוא אינו רלוונטי
vi.mock("@/components/billing/ProductPicker", () => ({
  default: () => React.createElement("div", { "data-testid": "product-picker" }),
}));

import OrderServices from "@/services/OrderServices";
import { notifyError } from "@/utils/toast";
import OrderItemsEditor from "@/components/order/OrderItemsEditor";

const ORDER = {
  _id: "o1",
  user: "c1",
  updatedAt: "2026-08-18T09:00:00.000Z",
  shippingCost: 0,
  discount: 0,
  offerDiscount: 0,
  cart: [
    {
      _id: "p1",
      sku: "111",
      title: { he: "תמרים" },
      quantity: 2,
      price: 10,
      prices: { price: 10 },
    },
    {
      _id: "p2",
      sku: "222",
      title: { he: "אגוזים" },
      quantity: 1,
      price: 30,
      prices: { price: 30 },
    },
    // אותו מוצר בשתי שורות — נקלט כך כשהלקוח כתב אותו פעמיים
    {
      _id: "p1",
      sku: "111",
      title: { he: "תמרים" },
      quantity: 3,
      price: 10,
      prices: { price: 10 },
    },
    // שורת מנוע — מוצגת ואינה נערכת
    {
      _id: "p9",
      sku: "999",
      title: { he: "מתנה" },
      quantity: 1,
      isRewardProduct: true,
      rewardPrice: 0,
    },
  ],
};

let container;
let root;

const render = (props = {}) => {
  act(() => {
    root.render(
      React.createElement(OrderItemsEditor, {
        orderId: "o1",
        order: ORDER,
        onSaved: () => {},
        onCancel: () => {},
        ...props,
      })
    );
  });
};

const byText = (selector, text) =>
  [...container.querySelectorAll(selector)].find((el) => el.textContent.includes(text));

const click = async (el) => {
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  vi.clearAllMocks();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("OrderItemsEditor", () => {
  it("מאחד שתי שורות של אותו מוצר ומסביר שעשה זאת", () => {
    render();

    // תמרים (2+3) ואגוזים — שתי שורות ניתנות לעריכה
    const quantities = [...container.querySelectorAll('input[type="number"]')];
    // שני שדות כמות + דמי משלוח + הנחה
    expect(quantities).toHaveLength(4);
    expect(quantities[0].value).toBe("5");
    expect(container.textContent).toContain("שורות כפולות");
  });

  it("מציג שורת מבצע בלי אפשרות לערוך אותה", () => {
    render();
    expect(container.textContent).toContain("מתנת מבצע");
    // אין כפתור הסרה לשורת המנוע
    expect(container.querySelector('[aria-label="הסרת מתנה"]')).toBeNull();
  });

  it("שולח את כל השורות שנשארו, בלי שורת המנוע ועם חותמת הזמן", async () => {
    OrderServices.updateOrderItems.mockResolvedValue({ note: null });
    render();

    await click(container.querySelector('[aria-label="הסרת אגוזים"]'));
    await click(byText("button", "שמירת השינויים"));

    expect(OrderServices.updateOrderItems).toHaveBeenCalledTimes(1);
    const [id, body] = OrderServices.updateOrderItems.mock.calls[0];
    expect(id).toBe("o1");
    expect(body.items).toEqual([{ _id: "p1", sku: "111", quantity: 5 }]);
    expect(body.expectedUpdatedAt).toBe(ORDER.updatedAt);
    expect(body.allowLockedNote).toBe(false);
  });

  it("תעודה נעולה מציגה אישור מפורש, והאישור שולח allowLockedNote", async () => {
    OrderServices.updateOrderItems.mockRejectedValueOnce({
      response: { data: { code: "NOTE_LOCKED", message: "תעודה 1001 כבר חויבה" } },
    });
    render();

    await click(byText("button", "שמירת השינויים"));
    expect(container.textContent).toContain("תעודה 1001 כבר חויבה");

    OrderServices.updateOrderItems.mockResolvedValueOnce({ note: null });
    await click(byText("button", "לעדכן את ההזמנה בכל זאת"));

    const [, body] = OrderServices.updateOrderItems.mock.calls[1];
    expect(body.allowLockedNote).toBe(true);
  });

  it("כמות לא תקינה נעצרת במסך ואינה נשלחת", async () => {
    render();
    const qty = container.querySelector('input[type="number"]');

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      ).set;
      setter.call(qty, "0");
      qty.dispatchEvent(new Event("input", { bubbles: true }));
    });

    await click(byText("button", "שמירת השינויים"));

    expect(OrderServices.updateOrderItems).not.toHaveBeenCalled();
    expect(notifyError).toHaveBeenCalled();
  });
});
