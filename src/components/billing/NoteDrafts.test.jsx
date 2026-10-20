// בדיקות לטיוטות של תעודה ידנית / חשבונית חדשה (utils/noteDrafts).
//
// מה שהן שומרות עליו:
// 1. טופס עצמאי נשמר כטיוטה תוך כדי הקלדה, ונפתח ממנה בדיוק כמו שהיה.
// 2. "השהה" משאיר את הטיוטה; "ביטול" שואל ומוחק; הפקה מוחקת.
// 3. טופס של הזמנה אינו נשמר כטיוטה.
// 4. רשימת הטיוטות מציגה את מה שהושהה, בלי הטיוטה שפתוחה בטופס.

import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/BillingServices", () => ({
  default: {
    getPendingManualItems: vi.fn(),
    priceItems: vi.fn(),
    createManualDeliveryNote: vi.fn(),
  },
}));
vi.mock("@/services/CustomerPriceListServices", () => ({
  default: { upsertItems: vi.fn(), getCustomerPriceListSkus: vi.fn() },
}));
vi.mock("@/services/CustomerHistoryServices", () => ({
  default: { getCustomerHistory: vi.fn() },
}));
vi.mock("@/utils/toast", () => ({ notifyError: vi.fn(), notifySuccess: vi.fn() }));
vi.mock("@/components/billing/ProductPicker", () => ({
  default: ({ onChange }) =>
    React.createElement("button", { type: "button", "data-picker": true, onClick: () => onChange("999") }),
}));
vi.mock("@/components/billing/CustomerPicker", () => ({
  default: ({ value }) => React.createElement("div", { "data-customer": value }),
  useCustomers: vi.fn(() => ({ customers: [{ _id: "c1", name: "מכולת", lastName: "השכונה" }] })),
  customerNameOf: (c) => [c?.name, c?.lastName].filter(Boolean).join(" "),
}));
vi.mock("@/components/billing/BarcodeInput", () => ({ default: () => React.createElement("div") }));

import BillingServices from "@/services/BillingServices";
import ManualDeliveryNoteForm from "@/components/billing/ManualDeliveryNoteForm";
import NoteDraftsBar from "@/components/billing/NoteDraftsBar";
import { useCustomers } from "@/components/billing/CustomerPicker";
import { loadDraft, saveDraft } from "@/utils/noteDrafts";

let container;
let root;

const mount = async (element) => {
  await act(async () => root.render(element));
};

const form = (props) =>
  React.createElement(ManualDeliveryNoteForm, {
    draftId: "d1",
    onCreated: () => {},
    onCancel: vi.fn(),
    onPause: vi.fn(),
    ...props,
  });

const button = (text) => [...container.querySelectorAll("button")].find((b) => b.textContent.trim() === text);

const click = async (el) => {
  await act(async () => {
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const type = async (input, value) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  await act(async () => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const quantity = () => container.querySelector('input[placeholder="משקל בפועל"]');

beforeEach(() => {
  window.localStorage.clear();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  vi.clearAllMocks();
  BillingServices.priceItems.mockResolvedValue({ items: [] });
  BillingServices.createManualDeliveryNote.mockResolvedValue({ message: "ok", note: { customer: "c1" } });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("טיוטות — הטופס", () => {
  it("נשמר תוך כדי הקלדה ונפתח מהטיוטה כמו שהיה", async () => {
    await mount(form());
    expect(loadDraft("d1")).toBeNull();

    await click(container.querySelector("[data-picker]"));
    await type(quantity(), "3.4");

    const saved = loadDraft("d1");
    expect(saved.kind).toBe("note");
    expect(saved.rows[0]).toMatchObject({ sku: "999", quantity: "3.4" });

    act(() => root.unmount());
    root = createRoot(container);
    await mount(form());
    expect(quantity().value).toBe("3.4");
  });

  it("'השהה' סוגר ומשאיר את הטיוטה", async () => {
    const onPause = vi.fn();
    await mount(form({ onPause }));
    await click(container.querySelector("[data-picker]"));

    await click(button("השהה"));
    expect(onPause).toHaveBeenCalled();
    expect(loadDraft("d1")).not.toBeNull();
  });

  it("'ביטול' שואל, ורק באישור מוחק את הטיוטה", async () => {
    const onCancel = vi.fn();
    await mount(form({ onCancel }));
    await click(container.querySelector("[data-picker]"));

    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await click(button("ביטול"));
    expect(onCancel).not.toHaveBeenCalled();
    expect(loadDraft("d1")).not.toBeNull();

    confirm.mockReturnValue(true);
    await click(button("ביטול"));
    expect(onCancel).toHaveBeenCalled();
    expect(loadDraft("d1")).toBeNull();
    confirm.mockRestore();
  });

  it("הפקה מוחקת את הטיוטה, ושולחת את המפתח שנשמר בה", async () => {
    saveDraft({
      id: "d1",
      kind: "note",
      customerId: "c1",
      rows: [{ sku: "999", quantity: "2", ordered: null, name: "", unitPrice: "" }],
      idempotencyKey: "key-from-draft",
    });
    await mount(form());

    await click(button("הפק תעודת משלוח"));
    expect(BillingServices.createManualDeliveryNote).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "c1", idempotencyKey: "key-from-draft" })
    );
    expect(loadDraft("d1")).toBeNull();
  });

  it("טופס של הזמנה אינו נשמר כטיוטה", async () => {
    BillingServices.getPendingManualItems.mockResolvedValue({
      order: { user: "c1" },
      items: [{ sku: "111", quantity: 2, name: "עגבניות" }],
    });
    await mount(form({ orderId: "o1", customerId: "c1" }));
    await type(quantity(), "5");

    expect(loadDraft("d1")).toBeNull();
    expect(button("השהה")).toBeUndefined();
  });
});

describe("טיוטות — הרשימה", () => {
  it("בלי טיוטות אינה מציגה דבר ואינה טוענת את רשימת הלקוחות", async () => {
    await mount(React.createElement(NoteDraftsBar, { kind: "note", onResume: () => {} }));
    expect(container.innerHTML).toBe("");
    expect(useCustomers).not.toHaveBeenCalled();
  });

  it("מציגה טיוטות מהסוג שלה בלבד, בלי זו שפתוחה, ו'המשך' מחזיר את המזהה", async () => {
    const row = { sku: "999", quantity: "1" };
    saveDraft({ id: "a", kind: "note", customerId: "c1", rows: [row, row] });
    saveDraft({ id: "b", kind: "note", customerId: "", rows: [row] });
    saveDraft({ id: "c", kind: "invoice", customerId: "c1", rows: [row] });

    const onResume = vi.fn();
    await mount(React.createElement(NoteDraftsBar, { kind: "note", activeId: "b", onResume }));

    expect(container.textContent).toContain("מכולת השכונה");
    expect(container.textContent).toContain("2 שורות");
    expect(container.querySelectorAll("li")).toHaveLength(1);

    await click(button("המשך"));
    expect(onResume).toHaveBeenCalledWith("a");
  });

  it("מחיקה מהרשימה שואלת ומעלימה את הטיוטה", async () => {
    saveDraft({ id: "a", kind: "invoice", customerId: "c1", rows: [{ sku: "1" }] });
    await mount(React.createElement(NoteDraftsBar, { kind: "invoice", onResume: () => {} }));

    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    await click(container.querySelector('button[aria-label="מחיקת הטיוטה"]'));
    confirm.mockRestore();

    expect(loadDraft("a")).toBeNull();
    expect(container.querySelector("li")).toBeNull();
  });
});
