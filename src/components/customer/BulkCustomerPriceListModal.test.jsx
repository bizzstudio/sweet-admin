// בדיקות למסך היבוא המרוכז של המחירונים.
//
// מה שהן שומרות עליו: זהו המסך היחיד בפאנל שמשנה מחירים למאות לקוחות בלחיצה
// אחת. שני דברים חייבים להישמר בו, ושניהם נשברים בשקט:
//   1. **בלי בדיקה מוצלחת אין יבוא.** הבדיקה היא מה שמגלה קובץ שהעמודות בו
//      הוזזו — קובץ כזה נראה תקין לגמרי ומתמחר כל מוצר במחיר של מוצר אחר.
//   2. **אצווה שנכשלה אינה מפילה את השאר**, והדוח חייב לספור את מה שבאמת קרה.

import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/toast", () => ({
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

vi.mock("@/services/CustomerPriceListServices", () => ({
  default: {
    checkBulkImport: vi.fn(),
    importBulk: vi.fn(),
  },
}));

// הפענוח עצמו נבדק ב-bulkCustomerPriceListExcel.test.js; כאן מעניין רק מה
// המסך עושה עם התוצאה
vi.mock("@/utils/bulkCustomerPriceListExcel", async () => {
  const actual = await vi.importActual("@/utils/bulkCustomerPriceListExcel");
  return { ...actual, parseBulkPriceListFile: vi.fn() };
});

import CustomerPriceListServices from "@/services/CustomerPriceListServices";
import { parseBulkPriceListFile } from "@/utils/bulkCustomerPriceListExcel";
import { notifyError, notifySuccess } from "@/utils/toast";
import BulkCustomerPriceListModal from "@/components/customer/BulkCustomerPriceListModal";

let container;
let root;

const parsedFile = (customerCount = 2) => ({
  fileName: "מחירונים.csv",
  headerRowNumber: 4,
  hasNameColumn: true,
  customers: Array.from({ length: customerCount }, (_, i) => ({
    customerNumber: String(i + 1),
    customerName: `לקוח ${i + 1}`,
    rows: [{ rowNumber: i + 5, sku: "500", name: "שקדים", price: 20 }],
  })),
  invalidRows: [],
  stats: {
    customers: customerCount,
    totalRows: customerCount,
    uniqueSkus: 1,
    duplicateSkus: 0,
    minPrice: 20,
    maxPrice: 20,
    skipped: 0,
    skippedReasons: [],
  },
});

const checkResult = (overrides = {}) => ({
  customersInFile: 2,
  matched: 2,
  unknown: 0,
  unknownNumbers: [],
  overwrites: 0,
  overwriteSamples: [],
  matchedSamples: [],
  skus: 1,
  skusInCatalog: 1,
  unknownSkuCount: 0,
  unknownSkuSamples: [],
  nameMismatchCount: 0,
  nameMismatches: [],
  hiddenProductCount: 0,
  ...overrides,
});

const render = (props = {}) => {
  act(() => {
    root.render(
      <BulkCustomerPriceListModal
        isOpen
        onClose={() => {}}
        onImported={() => {}}
        {...props}
      />
    );
  });
};

// ‏Modal של windmill מרנדר ב-portal אל document.body ולא בתוך container,
// ולכן החיפוש נעשה במסמך כולו
const screen = () => document.body;

// בחירת קובץ: הפרסר ממילא מוקק, ולכן מספיק אובייקט קובץ כלשהו
const selectFile = async () => {
  const input = screen().querySelector('input[type="file"]');
  Object.defineProperty(input, "files", {
    value: [new File(["x"], "מחירונים.csv")],
    configurable: true,
  });
  await act(async () => {
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const importButton = () =>
  [...screen().querySelectorAll("button")].find((button) =>
    button.textContent.includes("שמירת מחירונים")
  );

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  vi.clearAllMocks();
  parseBulkPriceListFile.mockResolvedValue(parsedFile());
  CustomerPriceListServices.checkBulkImport.mockResolvedValue(checkResult());
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("BulkCustomerPriceListModal", () => {
  it("שולח לבדיקה מק\"טים ייחודיים עם שם, ומאפשר יבוא רק אחריה", async () => {
    render();
    expect(importButton()?.disabled).toBe(true);

    await selectFile();

    expect(CustomerPriceListServices.checkBulkImport).toHaveBeenCalledWith({
      customerNumbers: ["1", "2"],
      // מק"ט אחד בלבד — הוא חוזר אצל שני הלקוחות
      products: [{ sku: "500", name: "שקדים" }],
    });
    expect(importButton()?.disabled).toBe(false);
    expect(screen().textContent).toContain("לקוחות שיקבלו מחירון");
  });

  it("חוסם יבוא כשהבדיקה נכשלה, ומאפשר ניסיון חוזר בלי לבחור קובץ מחדש", async () => {
    CustomerPriceListServices.checkBulkImport.mockRejectedValueOnce(
      new Error("נפילת רשת")
    );
    render();
    await selectFile();

    // הקובץ פוענח — הסיכום מוצג — אבל היבוא חסום
    expect(screen().textContent).toContain("לקוחות בקובץ");
    expect(screen().textContent).toContain("היבוא חסום");
    expect(importButton()?.disabled).toBe(true);

    const retry = [...screen().querySelectorAll("button")].find(
      (button) => button.textContent.trim() === "נסה שוב"
    );
    expect(retry).toBeTruthy();

    CustomerPriceListServices.checkBulkImport.mockResolvedValueOnce(checkResult());
    await act(async () => {
      retry.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(importButton()?.disabled).toBe(false);
  });

  it("מציג אי-התאמת שמות — הסימן לקובץ שהעמודות בו הוזזו", async () => {
    CustomerPriceListServices.checkBulkImport.mockResolvedValue(
      checkResult({
        nameMismatchCount: 1,
        nameMismatches: [
          { sku: "500", fileName: "שקדים", catalogTitle: "בטריות" },
        ],
      })
    );
    render();
    await selectFile();

    expect(screen().textContent).toContain("שמות שאינם תואמים לקטלוג");
    expect(screen().textContent).toContain("העמודות בקובץ לא הוזזו");
    expect(screen().textContent).toContain("בטריות");
  });

  it("אצווה שנכשלה אינה מפילה את השאר, וכל לקוח בה מדווח ככישלון", async () => {
    // שתי אצוות: הראשונה נופלת, השנייה מצליחה
    parseBulkPriceListFile.mockResolvedValue(parsedFile(2));
    CustomerPriceListServices.checkBulkImport.mockResolvedValue(
      checkResult({ matched: 2 })
    );
    CustomerPriceListServices.importBulk
      .mockRejectedValueOnce(new Error("האצווה נפלה"))
      .mockResolvedValue({
        customersImported: 2,
        rowsImported: 2,
        created: 2,
        updated: 0,
        notInCatalog: 0,
        failures: [],
      });

    render();
    await selectFile();

    await act(async () => {
      importButton().dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    // אצווה אחת בלבד נשלחת כאן (2 לקוחות < התקרה), ולכן היא זו שנפלה
    expect(CustomerPriceListServices.importBulk).toHaveBeenCalledTimes(1);
    expect(screen().textContent).toContain("לקוחות שנכשלו");
    expect(screen().textContent).toContain("האצווה נפלה");
    expect(notifyError).toHaveBeenCalled();
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it("מסמן שספירת הקטלוג חלקית כשהשרת החזיר null", async () => {
    // הספירה רצה אחרי הכתיבה בשרת; כשלון שלה אינו כשלון של היבוא, והצגת 0
    // הייתה נראית כמו "כל המק\"טים נמצאו"
    CustomerPriceListServices.importBulk.mockResolvedValue({
      customersImported: 2,
      rowsImported: 2,
      created: 2,
      updated: 0,
      notInCatalog: null,
      failures: [],
    });

    render();
    await selectFile();
    await act(async () => {
      importButton().dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(screen().textContent).toContain("הספירה חלקית");
    expect(notifySuccess).toHaveBeenCalled();
  });
});
