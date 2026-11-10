// בדיקות לחלון "קניות אחרונות".
//
// מה שהן שומרות עליו:
//   1. התקופה שנבחרה היא זו שנשלחת לשרת, ותשובה של תקופה קודמת שמגיעה
//      באיחור אינה דורסת את החדשה.
//   2. "הוסף" רק למוצר שבקטלוג ושעוד אינו בטופס — גם כשהמק"ט כתוב אחרת
//      ("0100" מול "100"). שורה כפולה הייתה נחסמת רק בהפקה.
//   3. כל קנייה מוצגת עם התאריך והמקור שלה.

import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/CustomerHistoryServices", () => ({
  default: { getRecentPurchases: vi.fn() },
}));
vi.mock("@/components/billing/CustomerPicker", () => ({
  useCustomers: () => ({ customers: [{ _id: "c1", name: "מכולת", lastName: "השכונה" }] }),
  customerNameOf: (c) => [c?.name, c?.lastName].filter(Boolean).join(" "),
}));

import CustomerHistoryServices from "@/services/CustomerHistoryServices";
import RecentPurchasesModal from "@/components/customer/RecentPurchasesModal";

let container;
let root;

const response = (overrides = {}) => ({
  months: 3,
  since: "2026-08-10T00:00:00.000Z",
  notesCount: 2,
  archiveCount: 1,
  truncated: false,
  products: [
    {
      key: "p:1",
      sku: "100",
      name: "תפוח",
      inCatalog: true,
      count: 2,
      totalQty: 3.5,
      lastDay: "2026-10-20",
      lastQty: 2.5,
      lastPrice: 7,
      purchases: [
        { day: "2026-10-20", source: "note", doc: "תעודה 5", quantity: 2.5, unitPrice: 7 },
        { day: "2026-08-15", source: "archive", doc: "חשבונית 77", quantity: 1, unitPrice: 5 },
      ],
    },
    {
      key: "p:2",
      sku: "200",
      name: "בננה",
      inCatalog: true,
      count: 1,
      totalQty: 6,
      lastDay: "2026-09-01",
      lastQty: 6,
      lastPrice: 4,
      purchases: [{ day: "2026-09-01", source: "note", doc: "תעודה 4", quantity: 6, unitPrice: 4 }],
    },
    {
      key: "s:888",
      sku: "888",
      name: "פריט ישן",
      inCatalog: false,
      count: 1,
      totalQty: 4,
      lastDay: "2026-08-15",
      lastQty: 4,
      lastPrice: null,
      purchases: [{ day: "2026-08-15", source: "archive", doc: "חשבונית 77", quantity: 4, unitPrice: null }],
    },
  ],
  ...overrides,
});

// ‏Modal של windmill מרנדר ב-portal אל document.body
const screen = () => document.body;
const buttons = () => [...screen().querySelectorAll("button")];
const buttonWith = (text) => buttons().find((b) => b.textContent.trim() === text);
const rowOf = (name) => [...screen().querySelectorAll("tbody tr")].find((tr) => tr.textContent.includes(name));

const render = async (props = {}) => {
  await act(async () => {
    root.render(
      <RecentPurchasesModal isOpen onClose={() => {}} customerId="c1" onAdd={() => {}} {...props} />
    );
  });
};

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
  CustomerHistoryServices.getRecentPurchases.mockResolvedValue(response());
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("RecentPurchasesModal", () => {
  it("נטען לשלושה חודשים, עם שם הלקוח ותמצית המקורות", async () => {
    await render();
    expect(CustomerHistoryServices.getRecentPurchases).toHaveBeenCalledWith("c1", 3);
    expect(screen().textContent).toContain("קניות אחרונות — מכולת השכונה");
    expect(screen().textContent).toContain("3 מוצרים · 2 תעודות במערכת · 1 מסמכי ארכיון · מאז 10/08/2026");
    expect(rowOf("תפוח").textContent).toContain("20/10/2026");
  });

  it("בחירת תקופה טוענת אותה, ותשובה מאוחרת של התקופה הקודמת אינה דורסת", async () => {
    let resolveOld;
    CustomerHistoryServices.getRecentPurchases
      .mockReturnValueOnce(new Promise((r) => (resolveOld = r)))
      .mockResolvedValueOnce(response({ months: 6, products: [] }));

    await render();
    await click(buttonWith("חצי שנה"));
    expect(CustomerHistoryServices.getRecentPurchases).toHaveBeenLastCalledWith("c1", 6);
    expect(screen().textContent).toContain("אין קניות בתקופה הזו.");

    await act(async () => resolveOld(response()));
    expect(screen().textContent).toContain("אין קניות בתקופה הזו.");
    expect(rowOf("תפוח")).toBeUndefined();
  });

  it("הוסף שולח את המוצר; מוצר שבטופס או שאינו בקטלוג אינו ניתן להוספה", async () => {
    const onAdd = vi.fn();
    await render({ onAdd, formSkus: ["0100", ""] });

    expect(rowOf("תפוח").textContent).toContain("כבר בטופס");
    expect(rowOf("פריט ישן").textContent).toContain("אינו בקטלוג");
    expect(buttons().filter((b) => b.textContent.includes("הוסף"))).toHaveLength(1);

    const addButton = [...rowOf("בננה").querySelectorAll("button")].find((b) => b.textContent.includes("הוסף"));
    await click(addButton);
    expect(onAdd).toHaveBeenCalledWith({ sku: "200", name: "בננה" });
  });

  it("לחיצה על מוצר פותחת את כל הקניות שלו עם התאריך והמקור", async () => {
    await render();
    const toggle = rowOf("תפוח").querySelector("button[aria-expanded]");
    await click(toggle);

    const text = screen().textContent;
    expect(text).toContain("תעודה 5");
    expect(text).toContain("ארכיון · חשבונית 77");
    expect(text).toContain("15/08/2026");
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
  });

  it("חיפוש מסנן לפי שם או מק\"ט", async () => {
    await render();
    const input = screen().querySelector('input[placeholder^="חיפוש"]');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    await act(async () => {
      setter.call(input, "200");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(rowOf("בננה")).toBeDefined();
    expect(rowOf("תפוח")).toBeUndefined();
  });

  it("שגיאה מוצגת עם נסה שוב, שטוען מחדש", async () => {
    CustomerHistoryServices.getRecentPurchases.mockRejectedValueOnce({
      response: { data: { message: "מזהה לקוח לא תקין" } },
    });
    await render();
    expect(screen().textContent).toContain("מזהה לקוח לא תקין");

    await click(buttonWith("נסה שוב"));
    expect(CustomerHistoryServices.getRecentPurchases).toHaveBeenCalledTimes(2);
    expect(rowOf("תפוח")).toBeDefined();
  });

  it("מחיר חסר מוצג כחסר ולא כ-0", async () => {
    await render();
    expect(rowOf("פריט ישן").textContent).not.toContain("0.00");
  });
});
