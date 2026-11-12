// בדיקות לשיוך מוצרים לקטגוריה באצווה.
//
// מה שהן שומרות עליו: השרת מקבל עד 1,000 מזהים בבקשה, ו"סמן הכל" על
// קטגוריה גדולה (1,397 מוצרים ב-12/11/2026) נדחה כולו. המסך שולח במנות,
// סופר את מה שהועבר בפועל, ובכשל באמצע מדווח כמה כבר עברו ומרענן.

import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/ProductServices", () => ({
  default: {
    getProductsForCategoryAssign: vi.fn(),
    bulkChangeCategory: vi.fn(),
  },
}));

vi.mock("@/services/CategoryServices", () => ({
  default: {
    getAllCategory: vi.fn(async () => [
      { _id: "food", name: { he: "מזון" } },
      { _id: "kibud", name: { he: "כיבוד" } },
    ]),
  },
}));

vi.mock("@/utils/toast", () => ({
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

import ProductServices from "@/services/ProductServices";
import { notifyError, notifySuccess } from "@/utils/toast";
import CategoryAssign from "@/pages/CategoryAssign";

const TOTAL = 1397;
const products = Array.from({ length: TOTAL }, (_, i) => ({
  _id: `p${i}`,
  name: `מוצר ${i}`,
  sku: String(i),
  category: "food",
}));

let container;
let root;

const button = (text) =>
  [...container.querySelectorAll("button")].find((b) =>
    b.textContent.includes(text)
  );

const click = async (el) => {
  await act(async () => {
    el.click();
  });
};

const pickTarget = async () => {
  const target = container.querySelectorAll("select")[1];
  await act(async () => {
    target.value = "kibud";
    target.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const render = async () => {
  await act(async () => {
    root.render(<CategoryAssign />);
  });
};

const selectAllAndMove = async () => {
  await click(button(`סמן את כל ${TOTAL}`));
  await pickTarget();
  await click(button(`העבר ${TOTAL} מוצרים`));
};

describe("CategoryAssign bulk move", () => {
  beforeEach(() => {
    ProductServices.getProductsForCategoryAssign.mockReset();
    ProductServices.getProductsForCategoryAssign.mockResolvedValue({ products });
    ProductServices.bulkChangeCategory.mockReset();
    notifyError.mockReset();
    notifySuccess.mockReset();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it("sends more than 1,000 products in batches under the server limit", async () => {
    ProductServices.bulkChangeCategory.mockImplementation(async ({ ids }) => ({
      modified: ids.length,
    }));
    await render();
    await selectAllAndMove();

    const calls = ProductServices.bulkChangeCategory.mock.calls.map(([b]) => b);
    expect(calls.map((b) => b.ids.length)).toEqual([500, 500, 397]);
    expect(calls.every((b) => b.category === "kibud")).toBe(true);
    // כל מוצר נשלח פעם אחת בדיוק
    expect(new Set(calls.flatMap((b) => b.ids)).size).toBe(TOTAL);
    expect(notifySuccess).toHaveBeenCalledWith(
      `${TOTAL} מוצרים הועברו לקטגוריית "כיבוד"`
    );
    expect(notifyError).not.toHaveBeenCalled();
    // רענון אחרי ההעברה
    expect(ProductServices.getProductsForCategoryAssign).toHaveBeenCalledTimes(2);
  });

  it("reports how many moved when a later batch fails, and reloads", async () => {
    ProductServices.bulkChangeCategory
      .mockResolvedValueOnce({ modified: 500 })
      .mockRejectedValueOnce({ response: { data: { message: "שגיאת שרת" } } });
    await render();
    await selectAllAndMove();

    expect(ProductServices.bulkChangeCategory).toHaveBeenCalledTimes(2);
    expect(notifyError).toHaveBeenCalledWith("500 מוצרים הועברו, ואז נעצר: שגיאת שרת");
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(ProductServices.getProductsForCategoryAssign).toHaveBeenCalledTimes(2);
  });

  it("keeps the selection and skips the reload when the first batch fails", async () => {
    ProductServices.bulkChangeCategory.mockRejectedValueOnce(new Error("רשת"));
    await render();
    await selectAllAndMove();

    expect(notifyError).toHaveBeenCalledWith("רשת");
    expect(ProductServices.getProductsForCategoryAssign).toHaveBeenCalledTimes(1);
    expect(button(`העבר ${TOTAL} מוצרים`)).toBeTruthy();
  });
});
