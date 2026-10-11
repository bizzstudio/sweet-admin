// בדיקות להצעת ההדפסה שמופיעה אחרי "אשר הזמנה".
//
// מה שהן שומרות עליו:
// 1. אחרי אישור מוצעת הדפסה של התעודה שנוצרה, ולחיצה אחת מובילה למסך
//    התעודה עם ?print=1 — שם חלון ההדפסה נפתח לבד.
// 2. בלי אישור אין הצעה: השאלה על התעודה לא נשאלת בכלל.
// 3. תעודה מבוטלת אינה מוצעת להדפסה.
// 4. אישור שנכשל אינו מציע דבר.

import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { MemoryRouter, Route } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/IncomingOrderServices", () => ({
  default: { approveErrorOrder: vi.fn(), retryFromOrder: vi.fn() },
}));
vi.mock("@/services/BillingServices", () => ({
  default: { getDeliveryNoteByOrder: vi.fn() },
}));
vi.mock("@/utils/toast", () => ({
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));
// פותר השורות שלא זוהו גורר את שירותי הקטלוג, ואין לו קשר להדפסה
vi.mock("@/components/order/UnmatchedItemResolver", () => ({
  default: () => null,
}));

import IncomingOrderServices from "@/services/IncomingOrderServices";
import BillingServices from "@/services/BillingServices";
import IngestionErrorBanner from "@/components/order/IngestionErrorBanner";

const ORDER = {
  _id: "o1",
  invoice: 10050,
  source: "email",
  cart: [{ title: "חלב" }],
  ingestionError: { code: "low_confidence", message: "הקריאה לא הייתה ודאית" },
};

let container;
let root;
let location;

const render = async () => {
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={["/order/o1"]}>
        <IngestionErrorBanner order={ORDER} />
        <Route
          render={(props) => {
            location = props.location;
            return null;
          }}
        />
      </MemoryRouter>
    );
  });
};

const button = (text) =>
  [...container.querySelectorAll("button")].find((b) => b.textContent.includes(text));

const click = async (el) => {
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  // האישור, ואחריו השאלה על התעודה — שתי תשובות אסינכרוניות בשרשרת
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  IncomingOrderServices.approveErrorOrder.mockResolvedValue({ message: "אושרה" });
  BillingServices.getDeliveryNoteByOrder.mockResolvedValue({
    note: { _id: "n9", number: 1042, billing: { status: "open" } },
  });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe("IngestionErrorBanner — הצעת הדפסה אחרי אישור", () => {
  it("לפני האישור אין הצעה ואין שאלה על התעודה", async () => {
    await render();
    expect(container.textContent).not.toContain("להדפיס אותה עכשיו");
    expect(BillingServices.getDeliveryNoteByOrder).not.toHaveBeenCalled();
  });

  it("אחרי האישור מוצעת הדפסה, ולחיצה מובילה לתעודה עם ?print=1", async () => {
    await render();
    await click(button("אשר הזמנה"));

    expect(BillingServices.getDeliveryNoteByOrder).toHaveBeenCalledWith("o1");
    expect(container.textContent).toContain("תעודת משלוח 1042 הופקה");

    await click(button("הדפסה"));
    expect(location.pathname).toBe("/delivery-note/n9");
    expect(location.search).toBe("?print=1");
  });

  it("\"לא עכשיו\" סוגר את ההצעה", async () => {
    await render();
    await click(button("אשר הזמנה"));
    await click(button("לא עכשיו"));
    expect(container.textContent).not.toContain("להדפיס אותה עכשיו");
  });

  it("תעודה מבוטלת אינה מוצעת להדפסה", async () => {
    BillingServices.getDeliveryNoteByOrder.mockResolvedValue({
      note: { _id: "n9", number: 1042, billing: { status: "cancelled" } },
    });
    await render();
    await click(button("אשר הזמנה"));
    expect(container.textContent).not.toContain("להדפיס אותה עכשיו");
  });

  it("אישור שנכשל אינו מציע הדפסה", async () => {
    IncomingOrderServices.approveErrorOrder.mockRejectedValue(new Error("409"));
    await render();
    await click(button("אשר הזמנה"));
    expect(BillingServices.getDeliveryNoteByOrder).not.toHaveBeenCalled();
    expect(container.textContent).not.toContain("להדפיס אותה עכשיו");
  });
});
