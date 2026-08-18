// בדיקות למסך "מסמכי לקוח", שאליו נכנסים מכפתור בכרטיס הלקוח.
//
// מה שהן שומרות עליו:
// 1. המסמכים נמשכים בבקשה אחת בלבד - העמוד לא מושך גם את כרטיס הלקוח רק
//    כדי להציג שם.
// 2. לקוח שאינו קיים לא מוצג כלקוח בלי מסמכים. שני המצבים מחזירים רשימות
//    ריקות, ורק שדה customer מבדיל ביניהם.
// 3. כשל בטעינה מציג את הסיבה מהשרת ולא מסך ריק.
// 4. תשובה במבנה לא צפוי (שרת בגרסה קודמת) לא מפילה את העמוד למסך לבן.
// 5. הטאבים מציגים סוג מסמך אחד בכל רגע, והפתיחה היא על טאב שיש בו תוכן.
//
// שימו לב: textContent ב-jsdom כולל גם אלמנטים עם hidden, ולכן בדיקת
// טאבים חייבת להסתכל על ה-panel עצמו ולא על טקסט העמוד - אחרת הבדיקה
// "עוברת" גם כשכל הטאבים פתוחים יחד.

import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { createMemoryHistory } from "history";
import { MemoryRouter, Route, Router } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/BillingServices", () => ({
  default: { getCustomerDocuments: vi.fn() },
}));

import BillingServices from "@/services/BillingServices";
import CustomerDocumentsPage from "@/pages/CustomerDocumentsPage";

const DOCS = {
  customer: { _id: "c1", name: "אווינסד", lastName: "בע״מ" },
  deliveryNotes: {
    items: [
      {
        _id: "n1",
        number: 1001,
        issuedAt: "2026-08-01T00:00:00.000Z",
        total: 250,
        itemCount: 16,
        billing: { status: "open" },
      },
    ],
    total: 1,
    open: 1,
  },
  invoices: {
    items: [
      {
        docNum: "5001",
        billedAt: "2026-07-31T00:00:00.000Z",
        grossEstimate: 1180,
        isPaid: false,
        isOverdue: false,
        dueDate: "2026-08-31T00:00:00.000Z",
      },
    ],
    total: 1,
    unpaid: 1,
    overdue: 0,
    owed: 1180,
  },
  receipts: {
    items: [
      {
        docNum: "7001",
        docUrl: "https://icount/doc/7001",
        paidAt: "2026-08-05T00:00:00.000Z",
        grossEstimate: 590,
        invoices: [{ docNum: "4999", docUrl: null }],
        notes: [1000],
        hasCredit: false,
      },
    ],
    total: 1,
    paidEstimate: 590,
  },
  quotes: { items: [], total: 0, open: 0 },
};

// לקוח בלי שום תקבול — לבדיקות שבוחנות על איזה טאב המסך נפתח
const NO_RECEIPTS = { items: [], total: 0, paidEstimate: 0 };

let container;
let root;

const render = async () => {
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={["/customer-documents/c1"]}>
        <Route path="/customer-documents/:id">
          <CustomerDocumentsPage />
        </Route>
      </MemoryRouter>
    );
  });
  // העמוד לא עובר דרך useAsync ולכן אין debounce - מספיק לתת ל-promise
  // של הבקשה להסתיים
  await act(async () => {
    await Promise.resolve();
  });
};

// מזהה הטאב היחיד שגלוי כרגע. null אם אין אף לוח, "" אם יותר מאחד גלוי
const visiblePanel = () => {
  const shown = [...container.querySelectorAll("[role='tabpanel']")].filter(
    (p) => !p.hidden
  );
  if (shown.length === 0) return null;
  if (shown.length > 1) return "";
  return shown[0].id.replace("doc-panel-", "");
};

const tabButton = (title) =>
  [...container.querySelectorAll("[role='tab']")].find((b) =>
    b.textContent.startsWith(title)
  );

const clickTab = async (title) => {
  const button = tabButton(title);
  if (!button) throw new Error(`לא נמצא טאב "${title}"`);
  await act(async () => {
    button.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  });
};

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  vi.clearAllMocks();
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe("CustomerDocumentsPage", () => {
  it("מציג את שם הלקוח ואת המסמכים מבקשה אחת", async () => {
    BillingServices.getCustomerDocuments.mockResolvedValue(DOCS);

    await render();

    // בקשה אחת בלבד, ועם המזהה מהכתובת
    expect(BillingServices.getCustomerDocuments).toHaveBeenCalledTimes(1);
    expect(BillingServices.getCustomerDocuments).toHaveBeenCalledWith("c1");

    expect(container.textContent).toContain("אווינסד בע״מ");
    // סיכום החוב מוצג מעל הטאבים, בלי קשר לטאב הפעיל
    expect(container.textContent).toContain("1,180.00");
  });

  it("נפתח על טאב החשבוניות ומציג רק אותו", async () => {
    BillingServices.getCustomerDocuments.mockResolvedValue(DOCS);

    await render();

    expect(visiblePanel()).toBe("invoices");
    expect(tabButton("חשבוניות").getAttribute("aria-selected")).toBe("true");
    expect(tabButton("תעודות משלוח").getAttribute("aria-selected")).toBe("false");
    // המונה על הטאב מגיע מ-total ולא מאורך הרשימה
    expect(tabButton("הצעות מחיר").textContent).toContain("0");
  });

  it("מעבר טאב מחליף את המסמכים ואת הקישור למסך המלא", async () => {
    BillingServices.getCustomerDocuments.mockResolvedValue(DOCS);

    await render();

    const fullScreenHref = () =>
      [...container.querySelectorAll("a")]
        .find((a) => a.textContent.includes("פתיחה במסך מלא"))
        ?.getAttribute("href");

    expect(fullScreenHref()).toBe("/invoices?customer=c1");

    await clickTab("תעודות משלוח");

    expect(visiblePanel()).toBe("notes");
    expect(fullScreenHref()).toBe("/delivery-notes?customer=c1");
    // התוכן של תעודת המשלוח נמצא בלוח הגלוי, לא רק ב-DOM
    const panel = container.querySelector("#doc-panel-notes");
    expect(panel.textContent).toContain("1001");
    expect(panel.textContent).toContain("16 שורות");

    await clickTab("הצעות מחיר");

    expect(visiblePanel()).toBe("quotes");
    // טאב ריק אינו מציג קישור למסך מלא - אין לאן לפתוח
    expect(fullScreenHref()).toBeUndefined();
    expect(container.querySelector("#doc-panel-quotes").textContent).toContain(
      "טרם הופקו הצעות מחיר"
    );
  });

  it("טאב הקבלות מציג את התקבול ואת החשבונית שנסגרה", async () => {
    BillingServices.getCustomerDocuments.mockResolvedValue(DOCS);

    await render();
    await clickTab("קבלות");

    expect(visiblePanel()).toBe("receipts");
    const panel = container.querySelector("#doc-panel-receipts");
    expect(panel.textContent).toContain("7001");
    expect(panel.textContent).toContain("590.00");
    expect(panel.textContent).toContain("חשבונית 4999");

    const fullScreen = [...container.querySelectorAll("a")].find((a) =>
      a.textContent.includes("פתיחה במסך מלא")
    );
    expect(fullScreen.getAttribute("href")).toBe("/receipts?customer=c1");
  });

  it("שרת שאינו מחזיר קבלות עדיין מציג את שאר המסמכים", async () => {
    // הפאנל עשוי לרוץ מול שרת שטרם עודכן. טאב ריק מותר, מסך לבן לא
    const { receipts, ...withoutReceipts } = DOCS;
    BillingServices.getCustomerDocuments.mockResolvedValue(withoutReceipts);

    await render();

    expect(visiblePanel()).toBe("invoices");
    expect(tabButton("קבלות").textContent).toContain("0");

    await clickTab("קבלות");
    expect(container.querySelector("#doc-panel-receipts").textContent).toContain(
      "טרם נרשמו תשלומים"
    );
  });

  it("נפתח על הטאב הראשון שיש בו מסמכים", async () => {
    // לקוח בלי חשבוניות אבל עם תעודות: פתיחה על "חשבוניות" הייתה נראית
    // כאילו אין לו שום מסמך
    BillingServices.getCustomerDocuments.mockResolvedValue({
      ...DOCS,
      invoices: { items: [], total: 0, unpaid: 0, overdue: 0, owed: 0 },
      receipts: NO_RECEIPTS,
    });

    await render();

    expect(visiblePanel()).toBe("notes");
  });

  it("מעבר ללקוח אחר באותו מסלול לא משאיר את הטאב של הקודם", async () => {
    // react-router לא מפרק את העמוד כששדה ה-:id בלבד משתנה. היום מצב
    // הטעינה מחליף את הרכיב ב-Loading ובכך מאפס את הטאב, ו-key לפי הלקוח
    // מבטיח זאת גם אם יום אחד נשמור את המסמכים הקודמים על המסך בזמן
    // רענון. הבדיקה נועלת את ההתנהגות, לא את המימוש
    const history = createMemoryHistory({
      initialEntries: ["/customer-documents/c1"],
    });

    BillingServices.getCustomerDocuments.mockImplementation((customerId) =>
      Promise.resolve(
        customerId === "c1"
          ? DOCS
          : {
              ...DOCS,
              customer: { _id: "c2", name: "דנה", lastName: "" },
              invoices: { items: [], total: 0, unpaid: 0, overdue: 0, owed: 0 },
              receipts: NO_RECEIPTS,
            }
      )
    );

    await act(async () => {
      root.render(
        <Router history={history}>
          <Route path="/customer-documents/:id">
            <CustomerDocumentsPage />
          </Route>
        </Router>
      );
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(visiblePanel()).toBe("invoices");

    // מעבר ללקוח שאין לו חשבוניות בכלל
    await act(async () => {
      history.push("/customer-documents/c2");
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toContain("דנה");
    expect(visiblePanel()).toBe("notes");
  });

  it("חזרה לכרטיס הלקוח מקושרת למזהה שבכתובת", async () => {
    BillingServices.getCustomerDocuments.mockResolvedValue(DOCS);

    await render();

    const hrefs = [...container.querySelectorAll("a")].map((a) =>
      a.getAttribute("href")
    );
    expect(hrefs).toContain("/customer/c1");
  });

  it("מבדיל בין לקוח שאינו קיים לבין לקוח בלי מסמכים", async () => {
    BillingServices.getCustomerDocuments.mockResolvedValue({
      customer: null,
      deliveryNotes: { items: [], total: 0, open: 0 },
      invoices: { items: [], total: 0, unpaid: 0, overdue: 0, owed: 0 },
      quotes: { items: [], total: 0, open: 0 },
    });

    await render();

    expect(container.textContent).toContain("הלקוח לא נמצא");
    expect(container.textContent).not.toContain("טרם הופקו חשבוניות");
  });

  it("לקוח קיים בלי מסמכים מוצג כרשימות ריקות", async () => {
    BillingServices.getCustomerDocuments.mockResolvedValue({
      customer: { _id: "c1", name: "דנה", lastName: "" },
      deliveryNotes: { items: [], total: 0, open: 0 },
      invoices: { items: [], total: 0, unpaid: 0, overdue: 0, owed: 0 },
      quotes: { items: [], total: 0, open: 0 },
    });

    await render();

    expect(container.textContent).toContain("דנה");
    expect(container.textContent).toContain("טרם הופקו חשבוניות ללקוח זה");
    expect(container.textContent).not.toContain("הלקוח לא נמצא");
  });

  it("שרת שאינו מחזיר את שדה customer עדיין מציג את המסמכים", async () => {
    // אדמין חדש מול API שטרם עודכן: אין שם לכותרת, אבל המסמכים תקינים
    // ואסור להחליף אותם ב"הלקוח לא נמצא"
    const { customer, ...withoutCustomer } = DOCS;
    BillingServices.getCustomerDocuments.mockResolvedValue(withoutCustomer);

    await render();

    expect(container.textContent).not.toContain("הלקוח לא נמצא");
    expect(container.textContent).toContain("1001");
    expect(container.textContent).toContain("5001");
  });

  it("מציג את הודעת השגיאה מהשרת כשהטעינה נכשלת", async () => {
    BillingServices.getCustomerDocuments.mockRejectedValue({
      isAxiosError: true,
      response: { status: 400, data: { message: "מזהה לקוח לא תקין" } },
    });

    await render();

    expect(container.textContent).toContain("טעינת המסמכים נכשלה");
    expect(container.textContent).toContain("מזהה לקוח לא תקין");
  });

  it("תשובה במבנה לא צפוי אינה מפילה את העמוד", async () => {
    // שרת בגרסה קודמת מחזיר 200 עם גוף אחר לגמרי; בלי בדיקת מבנה
    // הרכיב היה קורא לשדה של undefined והמסך היה נשאר לבן
    BillingServices.getCustomerDocuments.mockResolvedValue({ message: "ok" });

    await render();

    expect(container.textContent).toContain("טעינת המסמכים נכשלה");
    expect(container.textContent).toContain("תשובה לא צפויה");
  });
});
