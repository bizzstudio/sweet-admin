// בדיקות למסך "דוח רכישות לקוחות".
//
// מה שהן שומרות עליו:
// 1. הדוח נטען בבקשה אחת עם טווח החודש הנוכחי, ולא על כל ההיסטוריה.
// 2. הסינון נשלח לשרת רק בלחיצה על "הצגת הדוח" — שינוי בשדה לבדו אינו
//    מייצר בקשה, אחרת כל הקלדה בתאריך שולחת שאילתה כבדה.
// 3. פירוט התעודות של לקוח נפתח מהנתונים שכבר הגיעו, בלי בקשה נוספת.
// 4. תשובה שאינה במבנה הצפוי (שרת בגרסה קודמת) מוצגת כשגיאה ולא כדוח ריק,
//    שנראה בדיוק כמו "לא נמצאו תעודות".

import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/BillingServices", () => ({
  default: { getCustomerPurchaseReport: vi.fn() },
}));

vi.mock("@/services/CustomerServices", () => ({
  default: { getAllCustomers: vi.fn(() => Promise.resolve([])) },
}));

vi.mock("@/utils/toast", () => ({
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

import BillingServices from "@/services/BillingServices";
import CustomerServices from "@/services/CustomerServices";
import PurchaseReports from "@/pages/PurchaseReports";
import { notifyError } from "@/utils/toast";

const REPORT = {
  source: "orders",
  from: "2026-08-01",
  to: "2026-08-31",
  customers: [
    {
      customerId: "c1",
      name: "טבולה קום",
      customerNumber: "553",
      notesCount: 2,
      itemsCount: 3,
      total: 150,
      flaggedCount: 1,
      notes: [
        {
          _id: "n2",
          number: 102,
          kind: "order",
          issuedAt: "2026-08-20T09:00:00.000Z",
          total: 50,
          itemCount: 1,
          orderNumber: null,
          manualReference: null,
          status: null,
          statusLabel: "נמסרה",
          icountDocNum: null,
          flagged: false,
        },
        {
          _id: "n1",
          number: 101,
          kind: "order",
          issuedAt: "2026-08-05T09:00:00.000Z",
          total: 100,
          itemCount: 2,
          orderNumber: 5001,
          manualReference: null,
          status: null,
          statusLabel: "שגיאה בקריאה",
          icountDocNum: null,
          flagged: true,
        },
      ],
    },
    {
      customerId: "c2",
      name: "מכולת הדר",
      customerNumber: null,
      notesCount: 1,
      itemsCount: 1,
      total: 20,
      flaggedCount: 0,
      notes: [
        {
          _id: "n3",
          number: 103,
          kind: "order",
          issuedAt: "2026-08-21T09:00:00.000Z",
          total: 20,
          itemCount: 1,
          orderNumber: 5002,
          manualReference: null,
          status: null,
          statusLabel: "נמסרה",
          icountDocNum: null,
          flagged: false,
        },
      ],
    },
  ],
  products: [
    {
      key: "111",
      name: "עוגיות",
      barcode: "111",
      sku: null,
      categoryName: "כיבוד",
      quantity: 3,
      total: 80,
      customersCount: 2,
      notesCount: 2,
    },
  ],
  totals: { customers: 2, notes: 3, total: 170 },
  flagged: 0,
  flaggedLabel: "שגיאה בקריאה",
  truncated: false,
  limit: 5000,
};

let container;
let root;

const render = async () => {
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={["/reports/purchases"]}>
        <PurchaseReports />
      </MemoryRouter>
    );
  });
  await act(async () => {
    await Promise.resolve();
  });
};

const buttonByText = (text) =>
  [...container.querySelectorAll("button")].find((b) =>
    b.textContent.trim().includes(text)
  );

const click = async (element) => {
  await act(async () => {
    element.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  });
};

const dateInputs = () =>
  [...container.querySelectorAll('input[type="date"]')];

const setSelect = async (select, value) => {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLSelectElement.prototype,
    "value"
  ).set;
  await act(async () => {
    setter.call(select, value);
    select.dispatchEvent(new window.Event("change", { bubbles: true }));
  });
};

const setInput = async (input, value) => {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  ).set;
  await act(async () => {
    setter.call(input, value);
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
};

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  vi.clearAllMocks();
  CustomerServices.getAllCustomers.mockResolvedValue([]);
  BillingServices.getCustomerPurchaseReport.mockResolvedValue(REPORT);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe("PurchaseReports", () => {
  it("טוען את הדוח בבקשה אחת, עם טווח ולא על כל ההיסטוריה", async () => {
    await render();

    expect(BillingServices.getCustomerPurchaseReport).toHaveBeenCalledTimes(1);
    const sent = BillingServices.getCustomerPurchaseReport.mock.calls[0][0];
    expect(sent.from).toMatch(/^\d{4}-\d{2}-01$/);
    expect(sent.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(sent.source).toBe("orders");
    expect(sent.customer).toBe("");
    expect(sent.kind).toBe("");

    expect(container.textContent).toContain("טבולה קום");
    expect(container.textContent).toContain("553");
    // הסכומים מוצגים בפורמט כספי
    expect(container.textContent).toContain("150.00");
    expect(container.textContent).toContain("170.00");
  });

  it("שינוי בשדה אינו שולח בקשה עד הלחיצה על הצגת הדוח", async () => {
    await render();
    await setInput(dateInputs()[0], "2026-01-01");

    expect(BillingServices.getCustomerPurchaseReport).toHaveBeenCalledTimes(1);

    await click(buttonByText("הצגת הדוח"));

    expect(BillingServices.getCustomerPurchaseReport).toHaveBeenCalledTimes(2);
    expect(
      BillingServices.getCustomerPurchaseReport.mock.calls[1][0].from
    ).toBe("2026-01-01");
  });

  it("פירוט המסמכים של לקוח נפתח בלי בקשה נוספת", async () => {
    await render();

    expect(container.querySelector('a[href="/order/n2"]')).toBeNull();

    await click(buttonByText("הזמנות"));

    expect(container.textContent).toContain("102");
    expect(container.textContent).toContain("נמסרה");
    // קישור להזמנה עצמה, שבה נמצא פירוט השורות
    expect(container.querySelector('a[href="/order/n2"]')).not.toBeNull();
    expect(BillingServices.getCustomerPurchaseReport).toHaveBeenCalledTimes(1);
  });

  it("מעבר למקור התעודות שולח source=notes ומקשר לתעודה", async () => {
    await render();

    const sourceSelect = [...container.querySelectorAll("select")].find((s) =>
      s.textContent.includes("תעודות משלוח")
    );
    await setSelect(sourceSelect, "notes");
    BillingServices.getCustomerPurchaseReport.mockResolvedValue({
      ...REPORT,
      source: "notes",
      customers: [
        {
          ...REPORT.customers[0],
          notes: [
            {
              ...REPORT.customers[0].notes[0],
              kind: "manual",
              statusLabel: null,
              status: "billed",
              manualReference: "פנקס-8",
              flagged: false,
            },
          ],
        },
      ],
    });
    await click(buttonByText("הצגת הדוח"));

    expect(
      BillingServices.getCustomerPurchaseReport.mock.calls[1][0].source
    ).toBe("notes");

    await click(buttonByText("תעודות"));
    expect(container.querySelector('a[href="/delivery-note/n2"]')).not.toBeNull();
    expect(container.textContent).toContain("ידנית (משקל)");
    expect(container.textContent).toContain("פנקס-8");
    expect(container.textContent).toContain("חויבה");
  });

  it("מסמכים שנקלטו חלקית מסומנים ונספרים", async () => {
    BillingServices.getCustomerPurchaseReport.mockResolvedValue({
      ...REPORT,
      flagged: 1,
    });

    await render();

    expect(container.textContent).toContain("שגיאה בקריאה");
    expect(container.textContent).toContain("הקליטה");
  });

  it("\"מה קנה\" מסנן ללקוח ועובר לחתך המוצרים, בלי לשנות את הטווח", async () => {
    await render();
    await click(buttonByText("מה קנה"));

    expect(BillingServices.getCustomerPurchaseReport).toHaveBeenCalledTimes(2);
    const first = BillingServices.getCustomerPurchaseReport.mock.calls[0][0];
    const second = BillingServices.getCustomerPurchaseReport.mock.calls[1][0];
    expect(second.customer).toBe("c1");
    expect(second.from).toBe(first.from);
    expect(second.to).toBe(first.to);
    // החתך שמוצג הוא המוצרים, כי זו השאלה שנשאלה
    expect(container.textContent).toContain("עוגיות");
  });

  it("מעבר לחתך המוצרים מציג מה נקנה", async () => {
    await render();
    await click(buttonByText("מה נקנה"));

    expect(container.textContent).toContain("עוגיות");
    expect(container.textContent).toContain("כיבוד");
    expect(container.textContent).toContain("80.00");
  });

  it("תשובה ריקה מציגה מצב ריק ולא מסך שבור", async () => {
    BillingServices.getCustomerPurchaseReport.mockResolvedValue({
      customers: [],
      products: [],
      totals: { customers: 0, notes: 0, total: 0 },
    });

    await render();

    expect(container.textContent).toContain("לא נמצאו תעודות");
  });

  it("תשובה במבנה לא צפוי מוצגת כשגיאה ולא כדוח ריק", async () => {
    BillingServices.getCustomerPurchaseReport.mockResolvedValue("<!doctype html>");

    await render();

    expect(notifyError).toHaveBeenCalledTimes(1);
    expect(String(notifyError.mock.calls[0][0])).toContain("גרסה קודמת");
  });

  it("שגיאת שרת מוצגת בהודעה שאומרת מה לעשות", async () => {
    BillingServices.getCustomerPurchaseReport.mockRejectedValue({
      isAxiosError: true,
      response: { status: 404 },
    });

    await render();

    expect(notifyError).toHaveBeenCalledTimes(1);
    expect(String(notifyError.mock.calls[0][0])).toContain("לפרוס");
  });

  it("ייצוא לאקסל מייצר קובץ עם שלושת החתכים, בלי לזלוג זיכרון", async () => {
    // jsdom אינו מממש הורדות; מה שנבדק הוא שהמסלול רץ עד הסוף ומייצר Blob.
    // ה-stderr "Not implemented: navigation" שנרשם כאן הוא jsdom שמגיב
    // ללחיצה על העוגן — לא כשל בבדיקה
    const createObjectURL = vi.fn(() => "blob:report");
    const revokeObjectURL = vi.fn();
    const originalCreate = window.URL.createObjectURL;
    const originalRevoke = window.URL.revokeObjectURL;
    window.URL.createObjectURL = createObjectURL;
    window.URL.revokeObjectURL = revokeObjectURL;

    try {
      await render();
      await click(buttonByText("ייצוא לאקסל"));

      expect(createObjectURL).toHaveBeenCalledTimes(1);
      expect(createObjectURL.mock.calls[0][0].size).toBeGreaterThan(0);
      // ה-URL משוחרר, אחרת כל ייצוא משאיר קובץ בזיכרון הלשונית
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:report");
      // העוגן הזמני אינו נשאר בעמוד
      expect(document.querySelector('a[download]')).toBeNull();
    } finally {
      window.URL.createObjectURL = originalCreate;
      window.URL.revokeObjectURL = originalRevoke;
    }
  });

  it("כפתור הייצוא מנוטרל כשאין מה לייצא", async () => {
    BillingServices.getCustomerPurchaseReport.mockResolvedValue({
      customers: [],
      products: [],
      totals: { customers: 0, notes: 0, total: 0 },
    });

    await render();

    expect(buttonByText("ייצוא לאקסל").disabled).toBe(true);
  });

  it("דוח שנחתך בתקרה אומר זאת במפורש", async () => {
    BillingServices.getCustomerPurchaseReport.mockResolvedValue({
      ...REPORT,
      truncated: true,
    });

    await render();

    expect(container.textContent).toContain("הדוח נחתך");
  });
});
