// בדיקות לבורר הלקוח במסך סגירת החודש.
//
// מה שהן שומרות עליו:
// 1. הקלדת חלק משם הלקוח או ממספרו מצמצמת את הרשימה אליו, גם בכמה מילים
//    ובכל סדר, ובלי להתאים למספר התעודות או לסכום שבתווית.
// 2. בחירה מהרשימה היא הלקוח שהתצוגה המקדימה נשלחת עליו.

import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/BillingServices", () => ({
  default: {
    getIcountMode: vi.fn(() => Promise.resolve({ demo: false })),
    getOpenCustomers: vi.fn(),
    previewMonth: vi.fn(() => Promise.resolve({ results: [], failures: [] })),
    closeMonth: vi.fn(),
  },
}));

vi.mock("@/utils/toast", () => ({
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

import BillingServices from "@/services/BillingServices";
import MonthlyBilling from "@/pages/MonthlyBilling";

const CUSTOMERS = [
  { id: "c1", name: "טבולה קום", customerNumber: "553", noteCount: 4, netTotal: 1200 },
  { id: "c2", name: "מאפיית השכונה", customerNumber: "210", noteCount: 2, netTotal: 300 },
  { id: "c3", name: "קפה ברחוב", customerNumber: "", noteCount: 1, netTotal: 80 },
];

const flush = () => act(() => new Promise((r) => setTimeout(r, 0)));

const optionTexts = () =>
  [...document.querySelectorAll('[id^="react-select-"][id*="-option-"]')].map(
    (el) => el.textContent
  );

// react-select מגיב לאירועי input אמיתיים, ולא להשמה ישירה של value
const typeInto = (input, text) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  setter.call(input, text);
  input.dispatchEvent(new Event("input", { bubbles: true }));
};

describe("MonthlyBilling — בורר לקוח", () => {
  let container;
  let root;

  beforeEach(async () => {
    BillingServices.getOpenCustomers.mockResolvedValue({ customers: CUSTOMERS });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(
        <MemoryRouter>
          <MonthlyBilling />
        </MemoryRouter>
      );
    });
    await flush();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });

  const input = () => document.getElementById("billing-customer");

  it("הקלדת שם או מספר לקוח מצמצמת את הרשימה", async () => {
    await act(async () => {
      input().focus();
      typeInto(input(), "מאפי");
    });
    expect(optionTexts()).toHaveLength(1);
    expect(optionTexts()[0]).toContain("מאפיית השכונה");

    await act(async () => typeInto(input(), "553"));
    expect(optionTexts()).toHaveLength(1);
    expect(optionTexts()[0]).toContain("טבולה קום");

    // כמה מילים, בכל סדר
    await act(async () => typeInto(input(), "קום 553"));
    expect(optionTexts()).toHaveLength(1);
    expect(optionTexts()[0]).toContain("טבולה קום");
  });

  it("מספר התעודות והסכום שבתווית אינם נכנסים לחיפוש", async () => {
    await act(async () => {
      input().focus();
      // 4 מופיע רק בתווית "4 תעודות" של טבולה קום
      typeInto(input(), "4");
    });
    expect(optionTexts()).toHaveLength(0);
  });

  it("לקוח בלי שם ומספר שאינו מחרוזת מוצגים בלי לקרוס", async () => {
    act(() => root.unmount());
    BillingServices.getOpenCustomers.mockResolvedValue({
      customers: [{ id: "c9", name: "", customerNumber: 777, noteCount: 1, netTotal: 10 }],
    });
    root = createRoot(container);
    await act(async () => {
      root.render(
        <MemoryRouter>
          <MonthlyBilling />
        </MemoryRouter>
      );
    });
    await flush();

    await act(async () => {
      input().focus();
      typeInto(input(), "777");
    });
    expect(optionTexts()).toEqual([expect.stringContaining("777 — ללא שם")]);
  });

  it("הלקוח שנבחר מהחיפוש הוא זה שהתצוגה המקדימה נשלחת עליו", async () => {
    await act(async () => {
      input().focus();
      typeInto(input(), "קפה");
    });
    const option = document.querySelector('[id^="react-select-"][id*="-option-"]');
    await act(async () => {
      option.click();
    });

    const previewButton = [...container.querySelectorAll("button")].find((b) =>
      b.textContent.includes("תצוגה מקדימה")
    );
    await act(async () => previewButton.click());

    expect(BillingServices.previewMonth).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "c3" })
    );
  });
});
