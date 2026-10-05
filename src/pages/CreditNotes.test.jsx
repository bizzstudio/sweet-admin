// בדיקות למסך הזיכויים (חשבונית זיכוי / תעודת משלוח זיכוי).
//
// מה שהן שומרות עליו:
// 1. שני הכפתורים פותחים את אותו טופס, וההבדל היחיד הוא issueInvoice.
// 2. חשבונית זיכוי — מסמך מס — אינה מופקת בלי אישור מפורש.
// 3. הסכומים שעל המסך הם אלה שהשרת החזיר, ושינוי בטופס מבטל אותם.
// 4. טופס שאינו תקין אינו מגיע לשרת.
// 5. אותו מפתח ייחודיות נשלח בשליחה חוזרת של אותו טופס.
// 6. פעולות על תעודה מוצגות רק כשהיא פתוחה.

import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { createMemoryHistory } from "history";
import { Route, Router } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/toast", () => ({
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

vi.mock("@/services/BillingServices", () => ({
  default: {
    getCreditNotes: vi.fn(),
    getInvoices: vi.fn(),
    previewCreditNote: vi.fn(),
    createCreditNote: vi.fn(),
    issueCreditNoteInvoice: vi.fn(),
    cancelCreditNote: vi.fn(),
  },
}));

vi.mock("@/components/billing/CustomerPicker", () => ({
  default: ({ value, onChange }) => (
    <input data-testid="customer" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));
vi.mock("@/components/billing/ProductPicker", () => ({
  default: ({ value, onChange }) => (
    <input data-testid="sku" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));
vi.mock("@/components/billing/BarcodeInput", () => ({ default: () => null }));

import BillingServices from "@/services/BillingServices";
import { notifyError } from "@/utils/toast";
import CreditNotes from "@/pages/CreditNotes";

let container;
let root;
let history;

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

const render = async (url = "/credit-notes") => {
  history = createMemoryHistory({ initialEntries: [url] });
  await act(async () => {
    root.render(
      <Router history={history}>
        <Route path="/credit-notes">
          <CreditNotes />
        </Route>
      </Router>
    );
  });
  await flush();
};

const type = async (input, value) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  await act(async () => {
    setter.call(input, value);
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
};

const findButton = (text) =>
  [...container.querySelectorAll("button")].find((b) => b.textContent.trim() === text) ||
  [...container.querySelectorAll("button")].find((b) => b.textContent.includes(text));

const click = async (text) => {
  await act(async () => {
    findButton(text).dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  });
  await flush();
};

const byLabel = (label) => container.querySelector(`input[aria-label='${label}']`);
const byPlaceholder = (text) =>
  [...container.querySelectorAll("input")].find((i) => i.placeholder.includes(text));

const PREVIEW = {
  items: [
    { sku: "A1", barcode: "729", name: "עוגה", quantity: 2, unitPrice: 100, lineTotal: 200, source: "catalog" },
  ],
  subTotal: 200,
  discount: 20,
  customerDiscount: 20,
  discountPercent: 10,
  customerDiscountPercent: 10,
  total: 180,
  totals: { net: 200, discount: 20, beforeVat: 180, vat: 32.4, total: 212.4 },
};

/** טופס מלא עד לתצוגה המקדימה. */
const fillAndPreview = async (button) => {
  await click(button);
  await type(container.querySelector("[data-testid='customer']"), "c1");
  await flush();
  await type(container.querySelector("[data-testid='sku']"), "A1");
  await type(byLabel("כמות"), "2");
  await click("חשב סכומים");
};

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  vi.clearAllMocks();
  BillingServices.getCreditNotes.mockResolvedValue({ creditNotes: [], total: 0 });
  BillingServices.getInvoices.mockResolvedValue({ invoices: [] });
  BillingServices.previewCreditNote.mockResolvedValue(PREVIEW);
  BillingServices.createCreditNote.mockResolvedValue({ message: "ok", note: { _id: "n9" } });
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

describe("CreditNotes — הטופס", () => {
  it("סגור בכניסה, ונפתח בכל אחד משני הכפתורים עם הכותרת שלו", async () => {
    await render();
    expect(container.querySelector("[data-testid='customer']")).toBeNull();

    await click("חשבונית זיכוי");
    expect(container.textContent).toContain("חשבונית זיכוי חדשה");

    await click("תעודת משלוח זיכוי");
    expect(container.textContent).toContain("תעודת משלוח זיכוי חדשה");
  });

  it("התצוגה המקדימה שולחת את הטופס ומציגה את סכומי השרת", async () => {
    await render();
    await fillAndPreview("תעודת משלוח זיכוי");

    expect(BillingServices.previewCreditNote).toHaveBeenCalledWith({
      customer: "c1",
      items: [{ sku: "A1", quantity: 2 }],
      discount: 0,
      applyCustomerDiscount: true,
    });
    expect(container.textContent).toContain("212.40");
    expect(container.textContent).toContain("10%");
  });

  it("שינוי בשורה מבטל את התצוגה המקדימה ואת כפתור ההפקה", async () => {
    await render();
    await fillAndPreview("תעודת משלוח זיכוי");
    expect(findButton("הפק תעודת משלוח זיכוי")).toBeTruthy();

    await type(byLabel("כמות"), "3");
    expect(findButton("הפק תעודת משלוח זיכוי")).toBeUndefined();
  });

  it("בלי לקוח או עם שורה חופשית בלי מחיר — לא פונים לשרת", async () => {
    await render();
    await click("תעודת משלוח זיכוי");
    await click("חשב סכומים");
    expect(BillingServices.previewCreditNote).not.toHaveBeenCalled();

    await type(container.querySelector("[data-testid='customer']"), "c1");
    await click("שורה חופשית");
    await type(byPlaceholder("תיאור חופשי"), "הפרש מחיר");
    await click("חשב סכומים");

    expect(BillingServices.previewCreditNote).not.toHaveBeenCalled();
    expect(notifyError).toHaveBeenLastCalledWith("לשורה חופשית חובה להקליד מחיר");
  });

  it("שורה חופשית נשלחת עם שם ומחיר, ושורת מוצר ריקה אינה נשלחת", async () => {
    await render();
    await click("תעודת משלוח זיכוי");
    await type(container.querySelector("[data-testid='customer']"), "c1");
    await click("שורה חופשית");
    await type(byPlaceholder("תיאור חופשי"), "הפרש מחיר");
    await type(byPlaceholder("מחיר (חובה)"), "30");
    await click("חשב סכומים");

    expect(BillingServices.previewCreditNote).toHaveBeenCalledWith(
      expect.objectContaining({ items: [{ name: "הפרש מחיר", quantity: 1, unitPrice: 30 }] })
    );
  });

  it("תעודת משלוח זיכוי: סיבה היא חובה, ואז נשמרת בלי חשבונית ועוברים למסמך", async () => {
    await render();
    await fillAndPreview("תעודת משלוח זיכוי");

    await click("הפק תעודת משלוח זיכוי");
    expect(BillingServices.createCreditNote).not.toHaveBeenCalled();
    expect(notifyError).toHaveBeenLastCalledWith("חובה לציין סיבת זיכוי");

    await type(byPlaceholder("החזרת סחורה"), "סחורה פגומה");
    await click("הפק תעודת משלוח זיכוי");

    const body = BillingServices.createCreditNote.mock.calls[0][0];
    expect(body).toMatchObject({
      customer: "c1",
      items: [{ sku: "A1", quantity: 2 }],
      reason: "סחורה פגומה",
      issueInvoice: false,
    });
    expect(typeof body.idempotencyKey).toBe("string");
    expect(body.idempotencyKey.length).toBeGreaterThan(8);
    expect(history.location.pathname).toBe("/credit-note/n9");
  });

  it("חשבונית זיכוי: בלי אישור לא מופק דבר; עם אישור נשלח issueInvoice", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await render();
    await fillAndPreview("חשבונית זיכוי");
    await type(byPlaceholder("החזרת סחורה"), "הפרש מחיר");

    await click("הפק חשבונית זיכוי");
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm.mock.calls[0][0]).toContain("212.40");
    expect(BillingServices.createCreditNote).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    await click("הפק חשבונית זיכוי");
    expect(BillingServices.createCreditNote).toHaveBeenCalledWith(
      expect.objectContaining({ issueInvoice: true })
    );
  });

  it("כשל בשמירה משאיר את הטופס, ושליחה חוזרת נושאת אותו מפתח", async () => {
    BillingServices.createCreditNote.mockRejectedValueOnce(new Error("רשת"));
    await render();
    await fillAndPreview("תעודת משלוח זיכוי");
    await type(byPlaceholder("החזרת סחורה"), "x");

    await click("הפק תעודת משלוח זיכוי");
    expect(history.location.pathname).toBe("/credit-notes");

    await click("הפק תעודת משלוח זיכוי");
    const [first, second] = BillingServices.createCreditNote.mock.calls.map((c) => c[0]);
    expect(second.idempotencyKey).toBe(first.idempotencyKey);
    expect(history.location.pathname).toBe("/credit-note/n9");
  });

  it("תעודה שנשמרה כשהחשבונית נכשלה: מוצגת שגיאה ועוברים לתעודה", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    BillingServices.createCreditNote.mockResolvedValue({
      message: "תעודת זיכוי 9001 נשמרה, אך ההפקה נכשלה",
      invoiceError: "ההפקה נכשלה",
      note: { _id: "n9" },
    });
    await render();
    await fillAndPreview("חשבונית זיכוי");
    await type(byPlaceholder("החזרת סחורה"), "x");
    await click("הפק חשבונית זיכוי");

    expect(notifyError).toHaveBeenLastCalledWith("תעודת זיכוי 9001 נשמרה, אך ההפקה נכשלה");
    expect(history.location.pathname).toBe("/credit-note/n9");
  });

  it("החשבוניות של הלקוח נטענות לבחירה, והקישור נשלח", async () => {
    BillingServices.getInvoices.mockResolvedValue({
      invoices: [{ docNum: "300", billedAt: "2026-09-30T10:00:00Z", grossEstimate: 590 }],
    });
    await render();
    await fillAndPreview("תעודת משלוח זיכוי");

    expect(BillingServices.getInvoices).toHaveBeenCalledWith({ customer: "c1" });
    const select = [...container.querySelectorAll("select")].find((s) =>
      s.textContent.includes("ללא קישור לחשבונית")
    );
    await act(async () => {
      select.value = "300";
      select.dispatchEvent(new window.Event("change", { bubbles: true }));
    });
    await type(byPlaceholder("החזרת סחורה"), "x");
    await click("הפק תעודת משלוח זיכוי");

    expect(BillingServices.createCreditNote).toHaveBeenCalledWith(
      expect.objectContaining({ originalDocNum: "300" })
    );
  });
});

describe("CreditNotes — הרשימה", () => {
  const row = (over) => ({
    _id: "a",
    number: 9000,
    issuedAt: "2026-10-05T08:00:00Z",
    customerSnapshot: { name: "לקוח" },
    reason: "החזרה",
    totals: { total: 118 },
    billing: { status: "open" },
    ...over,
  });

  it("פעולות רק על תעודה פתוחה; תעודה שהופקה מציגה את מספר החשבונית", async () => {
    BillingServices.getCreditNotes.mockResolvedValue({
      total: 3,
      creditNotes: [
        row({}),
        row({ _id: "b", number: 9001, billing: { status: "billed", creditDocNum: "501" } }),
        row({ _id: "c", number: 9002, billing: { status: "cancelled" } }),
      ],
    });
    await render();

    const rows = [...container.querySelectorAll("tbody tr")];
    expect(rows).toHaveLength(3);
    expect(rows[0].textContent).toContain("חשבונית זיכוי");
    expect(rows[0].textContent).toContain("בטל");
    expect(rows[1].textContent).toContain("501");
    expect(rows[1].querySelectorAll("button")).toHaveLength(0);
    expect(rows[2].querySelectorAll("button")).toHaveLength(0);
  });

  it("הפקת חשבונית מהרשימה דורשת אישור, ומרעננת את הרשימה", async () => {
    BillingServices.getCreditNotes.mockResolvedValue({ total: 1, creditNotes: [row({})] });
    BillingServices.issueCreditNoteInvoice.mockResolvedValue({ message: "ok" });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await render();

    const issue = () =>
      [...container.querySelectorAll("tbody button")].find((b) =>
        b.textContent.includes("חשבונית זיכוי")
      );
    await act(async () => issue().dispatchEvent(new window.MouseEvent("click", { bubbles: true })));
    expect(BillingServices.issueCreditNoteInvoice).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    await act(async () => issue().dispatchEvent(new window.MouseEvent("click", { bubbles: true })));
    await flush();
    expect(BillingServices.issueCreditNoteInvoice).toHaveBeenCalledWith("a");
    expect(BillingServices.getCreditNotes).toHaveBeenCalledTimes(2);
  });

  it("סינון הלקוח מהכתובת עובר לשרת", async () => {
    await render("/credit-notes?customer=c7");
    expect(BillingServices.getCreditNotes).toHaveBeenLastCalledWith(
      expect.objectContaining({ customer: "c7" })
    );
  });
});
