// בדיקות לבאנר של הזמנה עם שורות שלא זוהו.
//
// מה שהן שומרות עליו:
// 1. ההודעה המקורית של הלקוח סגורה, ונפתחת בלחיצה.
// 2. "סיום — עדכון ההזמנה" נעול עד שכל השורות אושרו, ואז בונה את ההזמנה מחדש.
// 3. "לאשר בלי השורות האלה" נשאר זמין כל הזמן.

import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/IncomingOrderServices", () => ({
  default: { approveErrorOrder: vi.fn(), retryFromOrder: vi.fn() },
}));
vi.mock("@/services/BillingServices", () => ({
  default: { getDeliveryNoteByOrder: vi.fn(() => Promise.resolve({})) },
}));
vi.mock("@/utils/toast", () => ({ notifyError: vi.fn(), notifySuccess: vi.fn() }));
// השורות עצמן נבדקות ב-UnmatchedItemResolver.test; כאן רק ההתקדמות שהן מדווחות
vi.mock("@/components/order/UnmatchedItemResolver", () => ({
  default: ({ onProgress }) => (
    <button type="button" onClick={() => onProgress(2, 2)}>
      אשר הכל
    </button>
  ),
}));

import IncomingOrderServices from "@/services/IncomingOrderServices";
import IngestionErrorBanner from "@/components/order/IngestionErrorBanner";

const ORDER = {
  _id: "o1",
  source: "email",
  cart: [{ title: "חלב" }],
  ingestionError: {
    code: "items_unmatched",
    message: "x",
    rawText: "בוקר טוב\n40 חלב רגיל",
    unmatchedItems: [{ rawName: "סוכר" }, { rawName: "עוגיות" }],
  },
};

let container;
let root;

const button = (text) => [...container.querySelectorAll("button")].find((b) => b.textContent.includes(text));
const click = async (el) => {
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

beforeEach(async () => {
  vi.clearAllMocks();
  IncomingOrderServices.retryFromOrder.mockResolvedValue({ message: "נבנתה", newOrderId: "o2" });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <MemoryRouter>
        <IngestionErrorBanner order={ORDER} />
      </MemoryRouter>
    );
  });
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe("IngestionErrorBanner — שורות שלא זוהו", () => {
  it("ההודעה של הלקוח סגורה עד שלוחצים", async () => {
    expect(container.textContent).not.toContain("40 חלב רגיל");
    await click(button("הצגת ההודעה המקורית"));
    expect(container.textContent).toContain("40 חלב רגיל");
  });

  it('"סיום" נעול עד שכל השורות אושרו, ואז בונה את ההזמנה מחדש', async () => {
    expect(container.textContent).toContain("2 מוצרים בהזמנה צריכים את האישור שלך");
    expect(button("סיום").disabled).toBe(true);
    expect(container.textContent).toContain("נשארו 2 שורות לאשר");

    await click(button("אשר הכל"));
    expect(button("סיום").disabled).toBe(false);
    expect(container.textContent).toContain("2 מתוך 2");

    await click(button("סיום"));
    expect(IncomingOrderServices.retryFromOrder).toHaveBeenCalledWith("o1");
  });

  it('"לאשר בלי השורות האלה" זמין גם לפני שהשורות אושרו', async () => {
    IncomingOrderServices.approveErrorOrder.mockResolvedValue({ message: "אושרה" });
    await click(button("לאשר את ההזמנה בלי השורות האלה"));
    expect(IncomingOrderServices.approveErrorOrder).toHaveBeenCalledWith("o1");
  });
});
