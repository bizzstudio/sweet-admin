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
  default: { getQuotes: vi.fn() },
}));

// הבורר האמיתי טוען את כל הלקוחות מהשרת. כאן מספיק לראות איזה ערך קיבל
vi.mock("@/components/billing/CustomerPicker", () => ({
  default: ({ value }) => <span data-testid="customer-picker">{value || "(ריק)"}</span>,
}));
vi.mock("@/components/billing/ProductPicker", () => ({ default: () => null }));
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
