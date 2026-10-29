// בדיקות לחשבונית הזיכוי המרוכזת.
//
// מה שהן שומרות עליו:
// 1. בקשה אחת לכל לקוח, עם התעודות שהוצגו לו בלבד.
// 2. לקוח שנכשל לא עוצר את האחרים, ומי שהופק יוצא מהריצה הבאה.
// 3. בלי אישור מפורש לא מופק דבר, ולקוח שהוסר מהבחירה לא נשלח.

import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/toast", () => ({ notifyError: vi.fn(), notifySuccess: vi.fn() }));
vi.mock("@/services/BillingServices", () => ({
  default: { getConsolidatedCredit: vi.fn(), issueConsolidatedCredit: vi.fn() },
}));

import BillingServices from "@/services/BillingServices";
import ConsolidatedCreditPanel from "./ConsolidatedCreditPanel";

const PREVIEW = {
  notesCount: 3,
  total: 300,
  customers: [
    { customerId: "c1", name: "אלף", notes: [{ _id: "n1", number: 9001 }, { _id: "n2", number: 9002 }], total: 200 },
    { customerId: "c2", name: "בית", notes: [{ _id: "n3", number: 9003 }], total: 100 },
  ],
};

let container;
let root;

const render = async (props = {}) => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(<ConsolidatedCreditPanel onClose={() => {}} {...props} />);
  });
};

const button = (text) => [...container.querySelectorAll("button")].find((b) => b.textContent.includes(text));
const click = (el) =>
  act(async () => {
    el.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  });

beforeEach(() => {
  vi.clearAllMocks();
  BillingServices.getConsolidatedCredit.mockResolvedValue(PREVIEW);
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe("ConsolidatedCreditPanel", () => {
  it("issues one request per customer and keeps going after a failure", async () => {
    BillingServices.issueConsolidatedCredit
      .mockRejectedValueOnce({ response: { data: { message: "חשבונית 2100 קטנה מדי" } } })
      .mockResolvedValueOnce({ creditDocNum: "7001", emailedTo: "b@x.co" });
    const onIssued = vi.fn();
    await render({ onIssued });

    await click(button("הפק 2 חשבוניות זיכוי"));

    expect(BillingServices.issueConsolidatedCredit).toHaveBeenNthCalledWith(1, "c1", ["n1", "n2"]);
    expect(BillingServices.issueConsolidatedCredit).toHaveBeenNthCalledWith(2, "c2", ["n3"]);
    expect(onIssued).toHaveBeenCalled();
    expect(container.textContent).toContain("חשבונית 2100 קטנה מדי");
    expect(container.textContent).toContain("חשבונית זיכוי 7001");
    // ריצה חוזרת תנסה רק את מי שנכשל
    expect(button("הפק 1 חשבוניות זיכוי")).toBeTruthy();
  });

  it("issues nothing without confirmation, and skips an unchecked customer", async () => {
    await render();
    await click(container.querySelector('input[aria-label="בחירת בית"]'));

    window.confirm.mockReturnValueOnce(false);
    await click(button("הפק 1 חשבוניות זיכוי"));
    expect(BillingServices.issueConsolidatedCredit).not.toHaveBeenCalled();

    BillingServices.issueConsolidatedCredit.mockResolvedValue({ creditDocNum: "7002" });
    await click(button("הפק 1 חשבוניות זיכוי"));
    expect(BillingServices.issueConsolidatedCredit).toHaveBeenCalledTimes(1);
    expect(BillingServices.issueConsolidatedCredit).toHaveBeenCalledWith("c1", ["n1", "n2"]);
  });
});
