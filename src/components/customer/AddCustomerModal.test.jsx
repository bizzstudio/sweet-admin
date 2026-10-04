// בדיקות לחלון "הוספת לקוח".
//
// מה שהן שומרות עליו: אין שליחה לשרת בלי שם ובלי מספר לקוח (המספר הוא
// המפתח ב-iCount וביבוא האקסל), שליחה תקינה עוברת לכרטיס הלקוח החדש,
// ושגיאת שרת מוצגת כמו שהיא — בלי לסגור את החלון ולאבד את מה שהוקלד.

import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { MemoryRouter, Route } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/toast", () => ({
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

vi.mock("@/services/CustomerServices", () => ({
  default: { createCustomer: vi.fn() },
}));

import { notifyError, notifySuccess } from "@/utils/toast";
import CustomerServices from "@/services/CustomerServices";
import AddCustomerModal from "@/components/customer/AddCustomerModal";

let container;
let root;
let location;
let onClose;
let onCreated;

const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

const render = async () => {
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={["/customers"]}>
        <AddCustomerModal isOpen onClose={onClose} onCreated={onCreated} />
        <Route
          path="*"
          render={({ location: current }) => {
            location = current;
            return null;
          }}
        />
      </MemoryRouter>
    );
  });
  await flush();
};

// Modal של windmill מרנדר לתוך portal על document.body
const inputs = () => [...document.body.querySelectorAll("form input")];
const inputByLabel = (text) =>
  inputs().find((input) =>
    input.closest("label")?.textContent.includes(text)
  );

const type = async (labelText, value) => {
  const input = inputByLabel(labelText);
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  ).set;
  await act(async () => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const submit = async () => {
  const form = document.body.querySelector("form");
  await act(async () => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  await flush();
};

beforeEach(() => {
  vi.clearAllMocks();
  onClose = vi.fn();
  onCreated = vi.fn();
  location = null;
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.innerHTML = "";
});

describe("AddCustomerModal", () => {
  it("לא שולח בלי שם לקוח", async () => {
    await render();
    await type("מספר לקוח", "555");
    await submit();

    expect(CustomerServices.createCustomer).not.toHaveBeenCalled();
    expect(notifyError).toHaveBeenCalledWith("יש להזין שם לקוח");
  });

  it("לא שולח בלי מספר לקוח, גם כשיש מייל", async () => {
    await render();
    await type("שם הלקוח", "מאפיית כהן");
    await type("מייל ראשי", "office@cohen.co.il");
    await submit();

    expect(CustomerServices.createCustomer).not.toHaveBeenCalled();
    expect(notifyError).toHaveBeenCalledWith('יש להזין מספר לקוח (כמו בהנהח"ש)');
  });

  it("שולח את מה שהוקלד ועובר לכרטיס הלקוח החדש", async () => {
    CustomerServices.createCustomer.mockResolvedValue({
      _id: "abc123",
      message: "הלקוח נוסף בהצלחה",
    });
    await render();
    await type("שם הלקוח", "מאפיית כהן");
    await type("מספר לקוח", "555");
    await type("נייד", "050-1234567");
    await submit();

    expect(CustomerServices.createCustomer).toHaveBeenCalledTimes(1);
    expect(CustomerServices.createCustomer.mock.calls[0][0]).toMatchObject({
      name: "מאפיית כהן",
      customerNumber: "555",
      phone: "050-1234567",
    });
    expect(notifySuccess).toHaveBeenCalledWith("הלקוח נוסף בהצלחה");
    expect(onCreated).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
    expect(location.pathname).toBe("/customer/abc123");
  });

  it("שגיאת שרת מוצגת והחלון נשאר פתוח עם הנתונים", async () => {
    CustomerServices.createCustomer.mockRejectedValue({
      isAxiosError: true,
      response: { status: 409, data: { message: "מספר לקוח 555 כבר קיים במערכת." } },
    });
    await render();
    await type("שם הלקוח", "מאפיית כהן");
    await type("מספר לקוח", "555");
    await submit();

    expect(notifyError).toHaveBeenCalledWith("מספר לקוח 555 כבר קיים במערכת.");
    expect(onClose).not.toHaveBeenCalled();
    expect(location.pathname).toBe("/customers");
    expect(inputByLabel("מספר לקוח").value).toBe("555");
  });
});
