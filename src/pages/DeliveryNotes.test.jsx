// בדיקות למסך "תעודות משלוח" — החיפוש לפי לקוח.
//
// מה שהן שומרות עליו:
// 1. הקלדה לא שולחת בקשה על כל אות — רק אחרי הפסקה קצרה, ובלי רווחים
//    מיותרים.
// 2. חיפוש חדש מחזיר לעמוד הראשון. אחרת נשארים בעמוד 3 של תוצאה שיש בה
//    עמוד אחד, ורואים מסך ריק.
// 3. תשובה איטית של חיפוש קודם לא דורסת את התשובה של החיפוש הנוכחי.
// 4. "נקה סינון" מנקה גם את החיפוש.
// 5. מעבר עמוד נשאר בעמוד שנבחר (הטבלה נעלמת בזמן טעינה, ורכיב העימוד
//    של Windmill נבנה מחדש — הבדיקה מוודאת שזה לא מחזיר לעמוד 1).

import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/BillingServices", () => ({
  default: {
    getDeliveryNotes: vi.fn(),
    getIcountMode: vi.fn(() => Promise.resolve({ mode: "live" })),
  },
}));

vi.mock("@/utils/toast", () => ({
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

// הטופס הידני אינו חלק ממה שנבדק כאן, והוא מושך שירותים נוספים
vi.mock("@/components/billing/ManualDeliveryNoteForm", () => ({
  default: () => null,
}));

import BillingServices from "@/services/BillingServices";
import DeliveryNotes from "@/pages/DeliveryNotes";

const noteOf = (number, name) => ({
  _id: `n${number}`,
  number,
  kind: "auto",
  issuedAt: "2026-10-01T00:00:00.000Z",
  customerSnapshot: { name },
  items: [],
  total: 100,
  billing: { status: "open" },
});

const pageOf = (name, total = 1) => ({ notes: [noteOf(1001, name)], total });

let container;
let root;

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

const render = async (entry = "/delivery-notes") => {
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[entry]}>
        <DeliveryNotes />
      </MemoryRouter>
    );
  });
  await flush();
};

const searchInput = () =>
  [...container.querySelectorAll("input")].find((i) =>
    i.getAttribute("placeholder")?.includes("שם לקוח")
  );

const type = async (value) => {
  // React מאזין ל-input ולא ל-change, והסטר הילידי נדרש כדי שהערך
  // שנכתב לא ידרס על ידי ה-value המבוקר
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  ).set;
  await act(async () => {
    setter.call(searchInput(), value);
    searchInput().dispatchEvent(new window.Event("input", { bubbles: true }));
  });
};

const wait = async (ms) => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
  await flush();
};

const lastCall = () => BillingServices.getDeliveryNotes.mock.calls.at(-1)[0];
const callCount = () => BillingServices.getDeliveryNotes.mock.calls.length;

beforeEach(() => {
  vi.useFakeTimers();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  vi.clearAllMocks();
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.useRealTimers();
});

describe("DeliveryNotes — חיפוש לפי לקוח", () => {
  it("טעינה ראשונה יוצאת בלי חיפוש", async () => {
    BillingServices.getDeliveryNotes.mockResolvedValue(pageOf("מכולת הדר"));

    await render();

    expect(callCount()).toBe(1);
    expect(lastCall()).toMatchObject({ page: 1, search: "", customer: "" });
    expect(container.textContent).toContain("מכולת הדר");
  });

  it("הקלדה שולחת בקשה אחת, אחרי הפסקה, ובלי רווחים מיותרים", async () => {
    BillingServices.getDeliveryNotes.mockResolvedValue(pageOf("מכולת הדר"));
    await render();

    await type("ה");
    await type("הד");
    await type("  הדר ");
    await wait(300);
    // עדיין בתוך ההשהיה — שום בקשה נוספת
    expect(callCount()).toBe(1);

    await wait(100);
    expect(callCount()).toBe(2);
    expect(lastCall()).toMatchObject({ search: "הדר", page: 1 });
  });

  it("רווחים בלבד אינם חיפוש ואינם שולחים בקשה", async () => {
    BillingServices.getDeliveryNotes.mockResolvedValue(pageOf("מכולת הדר"));
    await render();

    await type("   ");
    await wait(1000);

    expect(callCount()).toBe(1);
  });

  it("חיפוש חדש מחזיר לעמוד הראשון", async () => {
    BillingServices.getDeliveryNotes.mockResolvedValue(pageOf("מכולת הדר", 80));
    await render();

    const next = [...container.querySelectorAll("button")].find(
      (b) => b.getAttribute("aria-label") === "Next"
    );
    await act(async () => next.click());
    await flush();
    expect(lastCall().page).toBe(2);

    await type("הדר");
    await wait(400);

    expect(lastCall()).toMatchObject({ search: "הדר", page: 1 });
  });

  it("מעבר עמוד נשאר בעמוד שנבחר ואינו חוזר לעמוד 1", async () => {
    BillingServices.getDeliveryNotes.mockResolvedValue(pageOf("מכולת הדר", 80));
    await render();

    const next = [...container.querySelectorAll("button")].find(
      (b) => b.getAttribute("aria-label") === "Next"
    );
    await act(async () => next.click());
    await flush();
    await wait(1000);

    expect(lastCall().page).toBe(2);
  });

  it("בזמן טעינה השורות הקיימות נשארות, מעומעמות ולא לחיצות", async () => {
    BillingServices.getDeliveryNotes.mockResolvedValueOnce(pageOf("מכולת הדר"));
    await render();

    let resolvePending;
    BillingServices.getDeliveryNotes.mockImplementationOnce(
      () => new Promise((resolve) => (resolvePending = resolve))
    );
    await type("כהן");
    await wait(400);

    const busy = container.querySelector('[aria-busy="true"]');
    expect(busy).not.toBeNull();
    expect(busy.className).toContain("pointer-events-none");
    expect(container.querySelectorAll("tbody tr").length).toBe(1);

    await act(async () => resolvePending(pageOf("משה כהן")));
    await flush();

    expect(container.querySelector('[aria-busy="true"]')).toBeNull();
    expect(container.textContent).toContain("משה כהן");
  });

  it("תשובה איטית של חיפוש קודם לא דורסת את החיפוש הנוכחי", async () => {
    BillingServices.getDeliveryNotes.mockResolvedValueOnce(pageOf("כולם"));
    await render();

    let resolveSlow;
    BillingServices.getDeliveryNotes.mockImplementationOnce(
      () => new Promise((resolve) => (resolveSlow = resolve))
    );
    BillingServices.getDeliveryNotes.mockResolvedValueOnce(pageOf("משה כהן"));

    await type("הדר");
    await wait(400); // הבקשה האיטית יצאה ועדיין תלויה
    await type("כהן");
    await wait(400); // הבקשה המהירה יצאה וחזרה

    expect(container.textContent).toContain("משה כהן");

    await act(async () => resolveSlow(pageOf("מכולת הדר")));
    await flush();

    expect(container.textContent).toContain("משה כהן");
    expect(container.textContent).not.toContain("מכולת הדר");
    expect(container.querySelectorAll("tbody tr").length).toBe(1);
  });

  it("\"נקה סינון\" מנקה את החיפוש וטוען את הרשימה המלאה", async () => {
    BillingServices.getDeliveryNotes.mockResolvedValue(pageOf("מכולת הדר"));
    await render();

    await type("הדר");
    await wait(400);
    expect(lastCall().search).toBe("הדר");

    const clear = [...container.querySelectorAll("button")].find((b) =>
      b.textContent.includes("נקה סינון")
    );
    await act(async () => clear.click());
    await flush();
    await wait(1000);

    expect(searchInput().value).toBe("");
    expect(lastCall().search).toBe("");
    // ניקוי אחד = בקשה אחת, לא שתיים
    expect(callCount()).toBe(3);
  });

  it("החיפוש מצטרף לסינון הלקוח שמגיע מהכתובת ואינו מחליף אותו", async () => {
    BillingServices.getDeliveryNotes.mockResolvedValue(pageOf("מכולת הדר"));
    await render("/delivery-notes?customer=c1");

    await type("הדר");
    await wait(400);

    expect(lastCall()).toMatchObject({ search: "הדר", customer: "c1" });
  });

  it("אין תוצאות — מצב ריק, ושדה החיפוש נשאר זמין לתיקון", async () => {
    BillingServices.getDeliveryNotes.mockResolvedValueOnce(pageOf("מכולת הדר"));
    BillingServices.getDeliveryNotes.mockResolvedValue({ notes: [], total: 0 });
    await render();

    await type("אין כזה");
    await wait(400);

    expect(container.textContent).toContain("לא נמצאו תעודות משלוח");
    expect(searchInput().value).toBe("אין כזה");
  });
});
