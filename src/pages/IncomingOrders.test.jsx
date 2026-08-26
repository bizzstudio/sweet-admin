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

vi.mock("@/services/OrderPlatformServices", () => ({
  default: {
    approvePlatform: vi.fn(),
    getMappingSuggestion: vi.fn(),
    mapCustomer: vi.fn(),
  },
}));

vi.mock("@/services/CustomerServices", () => ({
  default: {
    getAllCustomers: vi.fn(async () => []),
  },
}));

import IncomingOrderServices from "@/services/IncomingOrderServices";
import OrderPlatformServices from "@/services/OrderPlatformServices";
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

// ── הזמנה שהגיעה דרך פלטפורמה ──
//
// הבאג שהבדיקות האלה שומרות עליו: על הודעה מ-no-reply@ של פלטפורמה, הפעולה
// שהוצעה הייתה "לקוח חדש" — כלומר יצירת כרטיס לקוח בשם הפלטפורמה, שכל
// המסעדות שמזמינות דרכה היו מוצמדות אליו. הפעולה הנכונה היא אישור הפלטפורמה,
// פעם אחת, וההודעה חייבת להגיע ללשונית שבה זו הפעולה המוצעת.
describe("IncomingOrders — פלטפורמות הזמנות", () => {
  const platformRow = {
    _id: "plat-row-1",
    status: "platform_pending",
    channel: "email",
    receivedAt: "2026-08-24T06:14:00.000Z",
    sender: { name: "Zestt", email: "no-reply@zestt.io" },
    subject: "הזמנה חדשה מ ROOMS בסר פתח תקווה",
    platform: { ref: "platform-1", key: "zestt.io", name: "Zestt" },
    links: [{ url: "https://app.zester.co.il/#/orders/7667033", anchor: "לצפייה בהזמנה" }],
    matchedItems: [],
    parsed: { skippedRows: [] },
  };

  beforeEach(() => {
    IncomingOrderServices.getAllIncomingOrders.mockImplementation(async () => ({
      incomingOrders: [platformRow],
      totalDoc: 1,
      countByStatus: { platform_pending: 1 },
      stuckCount: 0,
      collectWindowMinutes: 0,
    }));
    OrderPlatformServices.approvePlatform.mockResolvedValue({
      message: "הפלטפורמה Zestt אושרה.",
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("הודעת פלטפורמה מציעה אישור פלטפורמה ולא יצירת לקוח מהשולח", async () => {
    await render();
    await flush();

    const labels = [...container.querySelectorAll("button")].map((b) => b.textContent.trim());
    expect(labels).toContain("אשר פלטפורמה");
    // "לקוח חדש" על no-reply@ של פלטפורמה = כרטיס אחד לכל המסעדות
    expect(labels).not.toContain("לקוח חדש");
  });

  it("האישור נשלח על הפלטפורמה ולא על ההודעה, והרשימה נטענת מחדש", async () => {
    await render();
    await flush();

    const callsBefore = IncomingOrderServices.getAllIncomingOrders.mock.calls.length;
    await clickButton("אשר פלטפורמה");

    expect(OrderPlatformServices.approvePlatform).toHaveBeenCalledWith("platform-1");
    expect(IncomingOrderServices.getAllIncomingOrders.mock.calls.length).toBe(callsBefore + 1);
  });

  it("יש לשונית לפלטפורמות חדשות", async () => {
    await render();
    await flush();

    const tabs = [...container.querySelectorAll("button")].map((b) => b.textContent.trim());
    expect(tabs.some((label) => label.startsWith("פלטפורמות חדשות"))).toBe(true);
  });
});

// ── מיפוי הלקוח נעשה על ההודעה עצמה ──
//
// הבאג שהבדיקות האלה שומרות עליו: המזהים של הלקוח ("מס' 77521-942") נמצאים
// בגוף ההודעה, וההפניה למסך אחר החזירה את מי שמטפל בה לחפש מספר בתוך המייל
// ולהקליד אותו ידנית — כלומר הזמנה לטעות הקלדה בשיוך לקוח.
describe("IncomingOrders — מיפוי לקוח של פלטפורמה", () => {
  const unmappedRow = {
    _id: "unmapped-1",
    status: "failed",
    channel: "email",
    errorCode: "platform_customer_unmapped",
    error: "ההזמנה נקראה, אבל לא ידוע לאיזה לקוח היא שייכת",
    receivedAt: "2026-08-24T06:14:00.000Z",
    sender: { name: "Zestt", email: "no-reply@zestt.io" },
    platform: { ref: "platform-1", key: "zestt.io", name: "Zestt" },
    linkFollow: { attempted: true, ok: true, chars: 223 },
    matchedItems: [],
    parsed: { skippedRows: [] },
  };

  beforeEach(() => {
    IncomingOrderServices.getAllIncomingOrders.mockImplementation(async () => ({
      incomingOrders: [unmappedRow],
      totalDoc: 1,
      countByStatus: { failed: 1 },
      stuckCount: 0,
      collectWindowMinutes: 0,
    }));
    OrderPlatformServices.getMappingSuggestion.mockResolvedValue({
      refs: ["77521-942", "633"],
      names: ["ROOMS בסר פתח תקווה"],
      suggestions: [{ _id: "cust-1", name: "ROOMS בסר", lastName: "", email: "rooms@x.co.il" }],
    });
    OrderPlatformServices.mapCustomer.mockResolvedValue({ message: "מופה" });
  });

  it("מציג את מה שנקרא מהדף, ולא רק את הודעת השגיאה", async () => {
    await render();
    await flush();
    expect(container.textContent).toContain("הדף נפתח ונקרא");
  });

  it("פתיחת המיפוי מביאה את המזהים מההודעה ומציעה לקוח", async () => {
    await render();
    await flush();

    await clickButton("מפה את הלקוח (פעם אחת) »");

    expect(OrderPlatformServices.getMappingSuggestion).toHaveBeenCalledWith("unmapped-1");
    expect(container.textContent).toContain("77521-942");
    expect(container.textContent).toContain("ROOMS בסר");
  });

  it("בחירת לקוח שומרת את המזהים על הפלטפורמה ומריצה את ההודעה מחדש", async () => {
    await render();
    await flush();
    await clickButton("מפה את הלקוח (פעם אחת) »");

    // ההצעה היא כפתור שהטקסט שלו כולל את שם הלקוח
    const button = [...container.querySelectorAll("button")].find((b) =>
      b.textContent.includes("rooms@x.co.il")
    );
    await act(async () => {
      button.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    });
    await flush();

    const [platformId, body] = OrderPlatformServices.mapCustomer.mock.calls[0];
    expect(platformId).toBe("platform-1");
    expect(body.customerId).toBe("cust-1");
    // המזהים המסומנים כברירת מחדל: כל המספרים + השם הראשון
    expect(body.keys).toEqual(["77521-942", "633", "ROOMS בסר פתח תקווה"]);
    // ההודעה עצמה נקראת מחדש מיד, ולא רק ההזמנה הבאה
    expect(body.incomingOrderId).toBe("unmapped-1");
  });
});

describe("IncomingOrders — פריט שהמנוע בחר עבורו מוצר", () => {
  // ‏autoPicked הוא הכרעה של המערכת ולא בקשה של הלקוח: השורה "עוגיות" מתאימה
  // לחמישה מוצרים כמעט זהים, המנוע בוחר אחד וההזמנה נכנסת רגיל. בלי סימון
  // במסך אין לעובד שום דרך לדעת שהמוצר שבהזמנה אינו מה שהלקוח כתב.
  const rowWithAutoPick = {
    _id: "auto-1",
    status: "order_created",
    channel: "email",
    invoice: 10066,
    order: "order-1",
    receivedAt: "2026-08-26T09:20:00.000Z",
    sender: { name: "מוסך דידי", email: "m-didi@zahav.net.il" },
    matchedItems: [
      {
        rawName: "עוגיות",
        quantity: 3,
        productTitle: "עוגיות אוראו",
        product: "p1",
        confidence: 0.53,
        autoPicked: true,
      },
      {
        rawName: "טסטר צוייס",
        quantity: 1,
        productTitle: "טסטר צוייס מנות אישיות בטעמים",
        product: "p2",
        confidence: 0.97,
      },
    ],
    parsed: { skippedRows: [] },
  };

  beforeEach(() => {
    IncomingOrderServices.getAllIncomingOrders.mockImplementation(async () => ({
      incomingOrders: [rowWithAutoPick],
      totalDoc: 1,
      countByStatus: { order_created: 1 },
      stuckCount: 0,
      collectWindowMinutes: 0,
    }));
  });

  it("מסמן את הפריט ומראה גם מה הלקוח כתב וגם מה נבחר", async () => {
    await render();
    await flush();

    expect(container.textContent).toContain("עוגיות אוראו");
    expect(container.textContent).toContain("נבחר אוטומטית מ«עוגיות»");
  });

  it("אינו מסמן פריט שהותאם רגיל", async () => {
    await render();
    await flush();

    expect(container.textContent).not.toContain("נבחר אוטומטית מ«טסטר צוייס»");
  });
});
