// בדיקות למסך העלאת היסטוריית הרכישות.
//
// מה שהן שומרות עליו — שלושה דברים שנשברים בשקט:
//   1. **בלי בדיקה מוצלחת אין יבוא.** הבדיקה היא מה שמגלה שהקובץ שייך ללקוח
//      אחר, וקובץ כזה נראה תקין לחלוטין: כל המק"טים קיימים, כל השורות נקלטות,
//      והמערכת פשוט מתחילה לבחור מוצרים לפי מה שלקוח אחר קונה.
//   2. **מספר שנחתך אינו מספר מלא.** "12 שורות ייפתרו" נקרא כמדידה שלמה גם
//      כשנמדדו רק 60 מתוך 200, ולכן החיתוך חייב להיאמר.
//   3. **409 של לקוח לא תואם אינו תקלה** — הוא שאלה. הצגתו כשגיאה אדומה
//      הייתה מזמינה ניסיון חוזר במקום בדיקה של הקובץ.

import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/toast", () => ({
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

vi.mock("@/services/CustomerHistoryServices", () => ({
  default: {
    getCustomerHistory: vi.fn(),
    checkImport: vi.fn(),
    importHistory: vi.fn(),
    deleteHistory: vi.fn(),
  },
}));

// הפענוח עצמו נבדק ב-customerHistoryExcel.test.js; כאן מעניין רק מה המסך
// עושה עם התוצאה
vi.mock("@/utils/customerHistoryExcel", async () => {
  const actual = await vi.importActual("@/utils/customerHistoryExcel");
  return { ...actual, parseCustomerHistoryFile: vi.fn() };
});

import CustomerHistoryServices from "@/services/CustomerHistoryServices";
import { parseCustomerHistoryFile } from "@/utils/customerHistoryExcel";
import { notifyError, notifySuccess } from "@/utils/toast";
import CustomerHistoryModal from "@/components/customer/CustomerHistoryModal";

let container;
let root;

const parsedFile = () => ({
  fileName: "היסטוריית לקוח.csv",
  headerRowNumber: 4,
  customerNumbers: ["755"],
  rows: [
    { rowNumber: 5, sku: "83", name: "קפה טורקי", quantity: 15, price: 19.8 },
    { rowNumber: 6, sku: "39", name: "חלב טרי", quantity: 17, price: 6.21 },
  ],
  invalidRows: [],
  stats: {
    total: 2,
    distinctSkus: 2,
    withoutDate: 0,
    from: "2025-09-15T00:00:00.000Z",
    to: "2026-06-30T00:00:00.000Z",
    skipped: 0,
    skippedReasons: [],
  },
});

const checkResult = (overrides = {}) => ({
  customer: "c1",
  customerName: "רמלה אבטחה",
  customerNumber: "755",
  fileCustomerNumbers: ["755"],
  numberMatches: true,
  received: 2,
  products: 2,
  invalid: 0,
  invalidSamples: [],
  matched: 2,
  unknown: 0,
  unknownSkus: [],
  nameMismatchCount: 0,
  nameMismatches: [],
  hiddenProductCount: 0,
  hiddenProducts: [],
  spanFrom: "2025-09-15T00:00:00.000Z",
  spanTo: "2026-06-30T00:00:00.000Z",
  overwrites: null,
  impact: {
    ordersChecked: 3,
    linesTotal: 9,
    linesChecked: 9,
    truncated: false,
    resolved: 7,
    hinted: 1,
    samples: [
      {
        invoice: 10043,
        rawName: "פרכיות",
        tier: "decisive",
        productTitle: "פרכיות תירס",
        sku: "3003",
      },
    ],
  },
  ...overrides,
});

const render = (props = {}) => {
  act(() => {
    root.render(
      <CustomerHistoryModal
        isOpen
        onClose={() => {}}
        customerId="c1"
        customerName="רמלה אבטחה"
        {...props}
      />
    );
  });
};

// ‏Modal של windmill מרנדר ב-portal אל document.body ולא בתוך container
const screen = () => document.body;

const selectFile = async () => {
  const input = screen().querySelector('input[type="file"]');
  Object.defineProperty(input, "files", {
    value: [new File(["x"], "היסטוריית לקוח.csv")],
    configurable: true,
  });
  await act(async () => {
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const buttonWith = (label) =>
  [...screen().querySelectorAll("button")].find((button) =>
    button.textContent.includes(label)
  );

const click = async (button) => {
  await act(async () => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  vi.clearAllMocks();
  parseCustomerHistoryFile.mockResolvedValue(parsedFile());
  CustomerHistoryServices.getCustomerHistory.mockResolvedValue({
    exists: false,
    itemsCount: 0,
    items: [],
  });
  CustomerHistoryServices.checkImport.mockResolvedValue(checkResult());
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("CustomerHistoryModal", () => {
  it("אין יבוא לפני שהבדיקה חזרה", async () => {
    render();
    await act(async () => {});

    expect(buttonWith("שמור היסטוריה").disabled).toBe(true);

    await selectFile();
    expect(buttonWith("שמור היסטוריה").disabled).toBe(false);
  });

  it("מציג כמה שורות תקועות ייפתרו", async () => {
    render();
    await act(async () => {});
    await selectFile();

    const body = screen().textContent;
    expect(body).toContain("שורות תקועות עכשיו");
    expect(body).toContain("ייפתרו אוטומטית");
    // הדוגמה מראה מה בדיוק ייבחר, לא רק כמה
    expect(body).toContain("פרכיות תירס");
  });

  it("אומר במפורש כשהמדידה נחתכה", async () => {
    CustomerHistoryServices.checkImport.mockResolvedValue(
      checkResult({
        impact: {
          ordersChecked: 20,
          linesTotal: 200,
          linesChecked: 60,
          truncated: true,
          resolved: 40,
          hinted: 5,
          samples: [],
        },
      })
    );

    render();
    await act(async () => {});
    await selectFile();

    expect(screen().textContent).toContain("נמדדו 60 השורות האחרונות מתוך 200");
  });

  it("מזהיר כשמספר הלקוח בקובץ שונה מזה שבכרטיס", async () => {
    CustomerHistoryServices.checkImport.mockResolvedValue(
      checkResult({ numberMatches: false, fileCustomerNumbers: ["999"] })
    );

    render();
    await act(async () => {});
    await selectFile();

    expect(screen().textContent).toContain("מספר הלקוח בקובץ (999)");
  });

  it("חסימת לקוח לא תואם מוצגת כשאלה עם אפשרות להמשיך, ולא כתקלה", async () => {
    CustomerHistoryServices.importHistory.mockRejectedValueOnce({
      response: {
        data: {
          code: "customer_number_mismatch",
          message: "הקובץ שייך ללקוח 999 ובכרטיס רשום 755.",
        },
      },
    });

    render();
    await act(async () => {});
    await selectFile();
    await click(buttonWith("שמור היסטוריה"));

    // לא טוסט אדום — הודעה בגוף המסך, עם דרך להמשיך במודע
    expect(notifyError).not.toHaveBeenCalled();
    expect(screen().textContent).toContain("הקובץ שייך ללקוח 999");

    const override = buttonWith("העלה בכל זאת");
    expect(override).toBeTruthy();

    CustomerHistoryServices.importHistory.mockResolvedValueOnce({
      message: "ההיסטוריה נשמרה: 2 מוצרים",
      received: 2,
      imported: 2,
      matchedInCatalog: 2,
      notInCatalog: 0,
    });
    await click(override);

    expect(CustomerHistoryServices.importHistory).toHaveBeenLastCalledWith(
      "c1",
      expect.objectContaining({ force: true })
    );
    expect(notifySuccess).toHaveBeenCalled();
  });

  it("שולח את מספרי הלקוח שבקובץ גם בבדיקה", async () => {
    render();
    await act(async () => {});
    await selectFile();

    expect(CustomerHistoryServices.checkImport).toHaveBeenCalledWith(
      "c1",
      expect.objectContaining({ customerNumbers: ["755"] })
    );
  });
});
