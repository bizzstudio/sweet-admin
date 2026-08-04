// בדיקות רגרסיה למסך "קליטת הזמנות".
//
// הבאג שהן שומרות עליו: רכיב ה-Pagination של Windmill מחזיק את העמוד הפעיל
// בסטייט פנימי ומדווח אותו ב-onChange גם ברגע ההרכבה. כל עוד שלד הטעינה החליף
// את הטבלה בכל טעינה, מעבר לעמוד 2 פירק את הרכיב, ההרכבה מחדש דיווחה "עמוד 1",
// והמשתמש נבעט חזרה — כלומר עימוד שבור לחלוטין.

import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/toast", () => ({
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

vi.mock("@/services/IncomingOrderServices", () => ({
  default: {
    getAllIncomingOrders: vi.fn(),
    retryIncomingOrder: vi.fn(),
    ignoreIncomingOrder: vi.fn(),
    approveSender: vi.fn(),
    scanEmailNow: vi.fn(),
  },
}));

import IncomingOrderServices from "@/services/IncomingOrderServices";
import IncomingOrders from "@/pages/IncomingOrders";

const TOTAL = 161;

// שורה מינימלית שמכסה את כל מה שהרינדור נוגע בו
const makeRow = (page, i) => ({
  _id: `p${page}-r${i}`,
  status: "failed",
  channel: "whatsapp",
  errorCode: "no_items",
  receivedAt: "2026-08-04T08:00:00.000Z",
  sender: { name: `שולח ${page}-${i}`, phone: `05200000${i}` },
  matchedItems: [],
  parsed: { skippedRows: [] },
});

const makeResponse = (page, count = 20) => ({
  incomingOrders: Array.from({ length: count }, (_, i) => makeRow(page, i)),
  totalDoc: TOTAL,
  countByStatus: { failed: TOTAL },
  stuckCount: 0,
  collectWindowMinutes: 0,
});

let container;
let root;

const render = async () => {
  await act(async () => {
    root.render(
      <MemoryRouter>
        <IncomingOrders />
      </MemoryRouter>
    );
  });
};

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

// לחיצה על כפתור לפי הטקסט המדויק שלו
const clickButton = async (text) => {
  const button = [...container.querySelectorAll("button")].find(
    (b) => b.textContent.trim() === text
  );
  if (!button) throw new Error(`לא נמצא כפתור "${text}"`);
  await act(async () => {
    button.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  });
  await flush();
};

const pagesRequested = () =>
  IncomingOrderServices.getAllIncomingOrders.mock.calls.map(([args]) => args.page);

beforeEach(() => {
  vi.clearAllMocks();
  IncomingOrderServices.getAllIncomingOrders.mockImplementation(async ({ page }) =>
    makeResponse(page)
  );
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe("IncomingOrders — עימוד", () => {
  it("מעבר לעמוד 2 נשאר בעמוד 2 ואינו נבעט חזרה לעמוד 1", async () => {
    await render();
    await flush();

    expect(pagesRequested()).toEqual([1]);

    await clickButton("2");

    // הבקשה השנייה היא לעמוד 2, ואין אחריה בקשה שמחזירה לעמוד 1
    expect(pagesRequested()).toEqual([1, 2]);
    // השורות שעל המסך הן של עמוד 2
    expect(container.textContent).toContain("שולח 2-0");
    expect(container.textContent).not.toContain("שולח 1-0");
  });

  it("מעבר לעמוד 3 ואז 4 שומר על הרצף", async () => {
    await render();
    await flush();

    await clickButton("3");
    await clickButton("4");

    expect(pagesRequested()).toEqual([1, 3, 4]);
    expect(container.textContent).toContain("שולח 4-0");
  });

  it("רכיב העימוד נשאר על המסך בזמן טעינת העמוד הבא", async () => {
    // טעינה שנתקעת, כדי לבדוק את מצב הביניים ולא רק את התוצאה
    let release;
    IncomingOrderServices.getAllIncomingOrders.mockImplementationOnce(async ({ page }) =>
      makeResponse(page)
    );
    await render();
    await flush();

    IncomingOrderServices.getAllIncomingOrders.mockImplementationOnce(
      ({ page }) => new Promise((resolve) => (release = () => resolve(makeResponse(page))))
    );

    await clickButton("2");
    // בזמן הטעינה הטבלה עדיין מורכבת (מעומעמת) — ואיתה רכיב העימוד
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(container.textContent).toContain("Showing");

    await act(async () => {
      release();
    });
    await flush();

    expect(container.querySelector('[aria-busy="true"]')).toBeNull();
    expect(pagesRequested()).toEqual([1, 2]);
  });

  it("עמוד שהתרוקן מחזיר את המשתמש לעמוד 1 ולא משאיר מסך ריק ללא עימוד", async () => {
    IncomingOrderServices.getAllIncomingOrders.mockImplementation(async ({ page }) =>
      page === 2 ? { ...makeResponse(page, 0), totalDoc: 20 } : makeResponse(page)
    );

    await render();
    await flush();

    await clickButton("2");
    await flush();

    expect(pagesRequested()).toEqual([1, 2, 1]);
    expect(container.textContent).toContain("שולח 1-0");
  });
});

describe("IncomingOrders — סינון", () => {
  it("החלפת לשונית מאפסת לעמוד 1 ואינה מציגה את שורות הלשונית הקודמת", async () => {
    await render();
    await flush();

    await clickButton("3");
    expect(pagesRequested()).toEqual([1, 3]);

    // טעינה תלויה, כדי לבדוק מה מוצג בזמן החלפת הסינון
    let release;
    IncomingOrderServices.getAllIncomingOrders.mockImplementationOnce(
      ({ page }) => new Promise((resolve) => (release = () => resolve(makeResponse(page))))
    );

    const tab = [...container.querySelectorAll("button")].find((b) =>
      b.textContent.trim().startsWith("הכול")
    );
    await act(async () => {
      tab.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    });

    // אסור להציג שורות של הלשונית הקודמת בזמן המעבר — במסך מיון תקלות זה מטעה
    expect(container.textContent).not.toContain("שולח 3-0");

    await act(async () => {
      release();
    });
    await flush();

    const calls = IncomingOrderServices.getAllIncomingOrders.mock.calls;
    const last = calls[calls.length - 1][0];
    expect(last.status).toBe("all");
    expect(last.page).toBe(1);
    // אין בקשה מיותרת אחרי ההחלפה
    expect(pagesRequested()).toEqual([1, 3, 1]);
  });

  it("חיפוש מאפס לעמוד 1", async () => {
    await render();
    await flush();

    await clickButton("2");

    const input = container.querySelector("input");
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      ).set;
      setter.call(input, "0524925665");
      input.dispatchEvent(new window.Event("input", { bubbles: true }));
    });
    await clickButton("חיפוש");

    const calls = IncomingOrderServices.getAllIncomingOrders.mock.calls;
    const last = calls[calls.length - 1][0];
    expect(last.search).toBe("0524925665");
    expect(last.page).toBe(1);
  });
});
