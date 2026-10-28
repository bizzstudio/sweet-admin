// בדיקות לשדה "מייל לשליחת חשבוניות" בפאנל החיוב.
//
// מה שהן שומרות עליו:
// 1. כתובת שגויה בשדה אינה חוסמת את שמירת כרטיס הלקוח (הפאנל יושב בתוך
//    הטופס שלו). עד 28/10/26 בדיקת הדפדפן חסמה בגללה גם תיקון טלפון.
// 2. דומיין עם פסיק או רווח מקבל הודעה בעברית ואינו נשמר ב-blur.
// 3. כתובת תקינה נשמרת ב-blur כמו קודם.

import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/CustomerServices", () => ({
  default: { updateCustomer: vi.fn() },
}));
vi.mock("@/services/BillingServices", () => ({
  default: {},
}));
vi.mock("@/utils/toast", () => ({
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

import CustomerServices from "@/services/CustomerServices";
import CustomerBillingPanel from "./CustomerBillingPanel";

let container;
let root;

const render = (billing, onSubmit = vi.fn((e) => e.preventDefault())) => {
  act(() => {
    root.render(
      <form onSubmit={onSubmit}>
        <CustomerBillingPanel customerId="c1" billing={billing} editing />
        <button type="submit">שמירה</button>
      </form>
    );
  });
  return onSubmit;
};

const emailInput = () => container.querySelector('input[inputmode="email"]');

// React מאזין ל-input event; שינוי value ישירות לא היה מגיע ל-onChange
const type = (input, value) => {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const blur = async (input) => {
  await act(async () => {
    input.focus();
    input.blur();
  });
};

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  CustomerServices.updateCustomer.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("מייל לשליחת חשבוניות", () => {
  it("כתובת שגויה אינה חוסמת את שמירת הטופס של הכרטיס", () => {
    const onSubmit = render({ invoiceEmail: "office@gmail.com," });

    expect(emailInput().type).toBe("text");
    expect(container.querySelector("form").checkValidity()).toBe(true);

    act(() => container.querySelector('button[type="submit"]').click());
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("דומיין עם פסיק מקבל הודעה ואינו נשמר", async () => {
    render({});
    type(emailInput(), "office@gmail.com,");
    expect(container.textContent).toContain("בחלק שאחרי ה-@");

    await blur(emailInput());
    expect(CustomerServices.updateCustomer).not.toHaveBeenCalled();
  });

  it("אין הודעה באמצע הקלדה, לפני שנכתב דומיין", () => {
    render({});
    type(emailInput(), "office@");
    expect(container.textContent).not.toContain("בחלק שאחרי ה-@");
  });

  it("כתובת תקינה נשמרת ב-blur", async () => {
    CustomerServices.updateCustomer.mockResolvedValue({
      billing: { invoiceEmail: "office@gmail.com" },
    });
    render({});
    type(emailInput(), " Office@Gmail.com ");
    expect(container.textContent).not.toContain("בחלק שאחרי ה-@");

    await blur(emailInput());
    expect(CustomerServices.updateCustomer).toHaveBeenCalledWith("c1", {
      billing: { invoiceEmail: "office@gmail.com" },
    });
  });
});
