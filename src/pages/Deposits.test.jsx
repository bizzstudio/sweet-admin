// בדיקות למסך שיוך המשקאות לפיקדון.
//
// מה שהן שומרות עליו: הצעה לפי שם אינה נשמרת עד שמסמנים אותה; מה שנשלח
// הוא מוצר הפיקדון והכמות ביחידה כפי שמוצגים בשורה; ומוצר שאינו הצעה
// מופיע רק בחיפוש בכל הקטלוג.

import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/ProductServices", () => ({
  default: { getDepositSetup: vi.fn(), saveDeposits: vi.fn() },
}));
vi.mock("@/utils/toast", () => ({ notifyError: vi.fn(), notifySuccess: vi.fn() }));

import ProductServices from "@/services/ProductServices";
import Deposits from "@/pages/Deposits";

const setup = {
  depositProducts: [
    { _id: "dc", sku: "900", title: "פיקדון פחיות", price: 0.25, kind: "cans" },
    { _id: "dl", sku: "901", title: "פיקדון ליטר וחצי", price: 0.25, kind: "large" },
  ],
  rows: [
    {
      _id: "cola",
      sku: "100",
      title: "קולה פחית 330",
      current: null,
      suggestion: { kind: "cans", depositProductId: "dc", perUnit: 1, reason: "פחית" },
    },
    {
      _id: "water6",
      sku: "101",
      title: "שישיית מים 1.5 ליטר",
      current: null,
      suggestion: { kind: "large", depositProductId: "dl", perUnit: 6, reason: "מארז 6" },
    },
    { _id: "juice", sku: "102", title: "מיץ תפוזים טבעי", current: null, suggestion: null },
  ],
};

let container;
let root;

const button = (text) =>
  [...container.querySelectorAll("button")].find((b) => b.textContent.includes(text));
const rowTitles = () =>
  [...container.querySelectorAll("tbody tr")].map((tr) => tr.children[1].textContent);

const change = async (el, value) => {
  await act(async () => {
    const proto = el.tagName === "SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
    el.dispatchEvent(new Event(el.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
  });
};

describe("Deposits page", () => {
  beforeEach(async () => {
    ProductServices.getDepositSetup.mockResolvedValue(setup);
    ProductServices.saveDeposits.mockReset();
    ProductServices.saveDeposits.mockResolvedValue({ message: "נשמרו" });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(<Deposits />);
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it("shows suggestions only, nothing selected until marked", async () => {
    expect(rowTitles()).toEqual(["קולה פחית 330", "שישיית מים 1.5 ליטר"]);
    expect(button("שמירת 0").disabled).toBe(true);
  });

  it("saves the selected rows with the suggested deposit and pack size", async () => {
    await act(async () => {
      container.querySelector('thead input[type="checkbox"]').click();
    });
    await act(async () => {
      button("שמירת 2").click();
    });
    expect(ProductServices.saveDeposits).toHaveBeenCalledWith([
      { productId: "cola", depositProductId: "dc", perUnit: 1 },
      { productId: "water6", depositProductId: "dl", perUnit: 6 },
    ]);
  });

  it("finds a product the name heuristic missed through catalog search", async () => {
    await change(container.querySelector("select"), "all");
    expect(rowTitles()).toEqual([]);
    await change(container.querySelector('input[placeholder="קולה, מים..."]'), "מיץ");
    expect(rowTitles()).toEqual(["מיץ תפוזים טבעי"]);

    // בחירת מוצר פיקדון מסמנת את השורה
    await change(container.querySelector("tbody select"), "dl");
    await act(async () => {
      button("שמירת 1").click();
    });
    expect(ProductServices.saveDeposits).toHaveBeenCalledWith([
      { productId: "juice", depositProductId: "dl", perUnit: 1 },
    ]);
  });
});
