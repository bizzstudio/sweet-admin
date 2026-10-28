// "איך הלקוח קורא למוצרים" בכרטיס הלקוח (בקשת מנהלת המשרד, 28/10/2026):
// לחזור להכרעה שנשמרה ממסך ההזמנה ולהוסיף לה מוצר.
//
// מה שנשמר כאן:
// 1. ההכרעות מוצגות עם המוצרים והכמות ("כמו בשורה" כשאין כמות קבועה).
// 2. עריכה מוסיפה מוצר ושולחת את כל הרשימה; מוצר קיים נשלח לפי המזהה שלו.
// 3. מחיקה עוברת דרך אישור, ונשלחת רק אחריו.

import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/toast", () => ({ notifyError: vi.fn(), notifySuccess: vi.fn() }));

vi.mock("@/services/ProductAliasServices", () => ({
  default: {
    getCustomerAliases: vi.fn(),
    updateAlias: vi.fn(),
    deleteAlias: vi.fn(() => Promise.resolve({ message: "נמחק" })),
  },
}));

// הבורר האמיתי טוען את כל הקטלוג; כאן מספיק כפתור שבוחר מוצר אחד
vi.mock("@/components/billing/ProductPicker", () => ({
  default: ({ onChange }) => (
    <button type="button" onClick={() => onChange("33", { sku: "33", name: "כפות חד פעמי" })}>
      בורר
    </button>
  ),
}));

import ProductAliasServices from "@/services/ProductAliasServices";
import CustomerAliasesPanel from "@/components/customer/CustomerAliasesPanel";

const ALIAS = {
  _id: "a1",
  sourceName: 'חד פעמי סכו"ם וצלחות',
  ignore: false,
  hits: 4,
  products: [
    { productId: "p1", sku: "11", title: "מזלגות חד פעמי", quantity: null },
    { productId: "p2", sku: "22", title: "צלחות גדולות", quantity: 2 },
  ],
};

let container;
let root;

const render = async () => {
  await act(async () => {
    root.render(<CustomerAliasesPanel customerId="c1" />);
  });
  await act(async () => {
    await Promise.resolve();
  });
};
const button = (text) =>
  [...container.querySelectorAll("button")].find((b) => b.textContent.includes(text));
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
  ProductAliasServices.getCustomerAliases.mockResolvedValue({ aliases: [ALIAS] });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("CustomerAliasesPanel", () => {
  it("מציג את ההכרעה עם המוצרים והכמויות", async () => {
    await render();
    expect(ProductAliasServices.getCustomerAliases).toHaveBeenCalledWith("c1");
    expect(container.textContent).toContain('חד פעמי סכו"ם וצלחות');
    expect(container.textContent).toContain("מזלגות חד פעמי");
    expect(container.textContent).toContain("כמו בשורה");
    expect(container.textContent).toContain("× 2");
    expect(container.textContent).toContain("שימשה 4 פעמים");
  });

  it("עריכה: הוספת מוצר שולחת את כל הרשימה", async () => {
    ProductAliasServices.updateAlias.mockResolvedValue({
      message: "נשמר",
      alias: {
        ...ALIAS,
        products: [...ALIAS.products, { productId: "p3", sku: "33", title: "כפות חד פעמי", quantity: null }],
      },
    });
    await render();
    await click(button("עריכה"));
    await click(button("בורר"));
    await click(button("שמירה"));
    expect(ProductAliasServices.updateAlias).toHaveBeenCalledWith("a1", [
      { productId: "p1", quantity: null },
      { productId: "p2", quantity: 2 },
      { sku: "33", quantity: null },
    ]);
    expect(container.textContent).toContain("כפות חד פעמי");
    expect(button("שמירה")).toBeUndefined();
  });

  it("מחיקה רק אחרי אישור", async () => {
    await render();
    const trash = () =>
      [...container.querySelectorAll("button")].find((b) =>
        (b.getAttribute("aria-label") || "").startsWith("מחיקת ההכרעה")
      );
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false);
    await click(trash());
    expect(ProductAliasServices.deleteAlias).not.toHaveBeenCalled();
    confirm.mockReturnValueOnce(true);
    await click(trash());
    expect(ProductAliasServices.deleteAlias).toHaveBeenCalledWith("a1");
    expect(container.textContent).not.toContain('חד פעמי סכו"ם וצלחות');
    confirm.mockRestore();
  });
});
