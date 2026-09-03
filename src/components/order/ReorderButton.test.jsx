// בדיקות לכפתור "הזמנה חוזרת".
//
// מה שהן שומרות עליו:
// 1. אין יצירת הזמנה בלחיצה אחת — הפעולה יוצרת הזמנה אמיתית (מלאי, תעודת
//    משלוח, חשבונית), ולכן היא חייבת לעבור דרך אישור מפורש.
// 2. אין שליחה כפולה: לחיצה שנייה בזמן שהבקשה באוויר לא יוצרת הזמנה שנייה.
// 3. דיווח של השרת (שורות שלא הועתקו, מחירים שהשתנו, מלאי חסר) נשאר על
//    המסך עד סגירה יזומה. ב-toast הוא היה נעלם אחרי שלוש שניות — כלומר
//    בדיוק המידע שמחייב פעולה היה זה שנעלם.
// 4. הטבלה מתרעננת (setIsUpdate) גם כשהמודל נשאר פתוח עם הדיווח.
// 5. כישלון מציג את הודעת השרת ולא סוגר את המודל.

import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/OrderServices", () => ({
  default: { duplicateOrder: vi.fn() },
}));
vi.mock("@/utils/toast", () => ({
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: "he" } }),
}));
// ‏react-tooltip נטען כאן רק בשביל האייקון, ובסביבת jsdom הוא רועש
vi.mock("@/components/tooltip/Tooltip", () => ({
  default: ({ title }) => React.createElement("span", null, title),
}));

import OrderServices from "@/services/OrderServices";
import { notifyError, notifySuccess } from "@/utils/toast";
import { SidebarContext } from "@/context/SidebarContext";
import ReorderButton from "@/components/order/ReorderButton";

const ORDER = {
  _id: "o1",
  invoice: 1234,
  user_info: { name: "דנה", lastName: "כהן" },
};

let container;
let root;
let setIsUpdate;

const render = () => {
  act(() => {
    root.render(
      React.createElement(
        SidebarContext.Provider,
        { value: { setIsUpdate } },
        React.createElement(ReorderButton, { order: ORDER })
      )
    );
  });
};

const click = (el) => {
  act(() => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const byText = (text) =>
  [...container.querySelectorAll("button")].find((b) => b.textContent.includes(text));

const openConfirm = () => {
  render();
  click(container.querySelector("button[aria-label]"));
};

beforeEach(() => {
  vi.clearAllMocks();
  setIsUpdate = vi.fn();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.innerHTML = "";
});

// המודל של Windmill מוגש ב-portal אל body, ולא לתוך ה-container
const inBody = (text) => document.body.textContent.includes(text);
const bodyButton = (text) =>
  [...document.body.querySelectorAll("button")].find((b) => b.textContent.includes(text));

describe("ReorderButton", () => {
  it("לחיצה על הכפתור אינה יוצרת הזמנה — רק פותחת אישור", () => {
    openConfirm();
    expect(OrderServices.duplicateOrder).not.toHaveBeenCalled();
    expect(inBody("ReorderModalH2")).toBe(true);
  });

  it("אישור יוצר הזמנה, מרענן את הטבלה וסוגר כשאין מה לדווח", async () => {
    OrderServices.duplicateOrder.mockResolvedValue({
      message: "נוצרה הזמנה חוזרת מספר 5001",
      invoice: 5001,
      dropped: [],
      priceChanges: [],
      stockWarnings: [],
    });

    openConfirm();
    await act(async () => {
      bodyButton("ReorderConfirmBtn").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(OrderServices.duplicateOrder).toHaveBeenCalledWith("o1");
    expect(notifySuccess).toHaveBeenCalledWith("נוצרה הזמנה חוזרת מספר 5001");
    expect(setIsUpdate).toHaveBeenCalledWith(true);
    expect(inBody("ReorderModalH2")).toBe(false);
  });

  it("לחיצה כפולה על האישור אינה יוצרת שתי הזמנות", async () => {
    let resolveCall;
    OrderServices.duplicateOrder.mockReturnValue(
      new Promise((resolve) => {
        resolveCall = resolve;
      })
    );

    openConfirm();
    act(() => {
      bodyButton("ReorderConfirmBtn").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    // בזמן שהבקשה באוויר, כפתור האישור מוחלף בכפתור מושבת
    expect(bodyButton("ReorderConfirmBtn")).toBeUndefined();
    expect(bodyButton("Processing")?.disabled).toBe(true);

    await act(async () => {
      resolveCall({ invoice: 5001, dropped: [], priceChanges: [], stockWarnings: [] });
    });

    expect(OrderServices.duplicateOrder).toHaveBeenCalledTimes(1);
  });

  it("דיווח מהשרת נשאר על המסך עד סגירה יזומה", async () => {
    OrderServices.duplicateOrder.mockResolvedValue({
      message: "נוצרה",
      invoice: 5001,
      dropped: [{ name: "תמרים", reason: "המוצר אינו קיים עוד בקטלוג" }],
      priceChanges: [{ name: "אגוזים", copiedPrice: 20, currentPrice: 25 }],
      stockWarnings: [{ name: "חלווה", requested: 5, inStock: 1 }],
    });

    openConfirm();
    await act(async () => {
      bodyButton("ReorderConfirmBtn").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(setIsUpdate).toHaveBeenCalledWith(true);
    expect(inBody("תמרים")).toBe(true);
    expect(inBody("המוצר אינו קיים עוד בקטלוג")).toBe(true);
    expect(inBody("אגוזים")).toBe(true);
    expect(inBody("ReorderStockShort")).toBe(true);
    // האישור כבר לא מוצג — הפעולה בוצעה
    expect(bodyButton("ReorderConfirmBtn")).toBeUndefined();

    await act(async () => {
      bodyButton("Close").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(inBody("תמרים")).toBe(false);
  });

  it("כישלון מציג את הודעת השרת ומשאיר את המודל פתוח", async () => {
    OrderServices.duplicateOrder.mockRejectedValue({
      response: { data: { message: "אף מוצר מההזמנה המקורית אינו זמין" } },
    });

    openConfirm();
    await act(async () => {
      bodyButton("ReorderConfirmBtn").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(notifyError).toHaveBeenCalledWith("אף מוצר מההזמנה המקורית אינו זמין");
    expect(setIsUpdate).not.toHaveBeenCalled();
    // אפשר לנסות שוב
    expect(bodyButton("ReorderConfirmBtn")).toBeDefined();
  });
});
