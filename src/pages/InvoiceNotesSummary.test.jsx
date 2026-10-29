// בדיקות לדף "פירוט תעודות משלוח לחשבונית".
//
// מה שהן שומרות עליו:
// 1. "שמירה כאקסל" מייצר גיליון עם אותן שורות כמו הדף המודפס, מימין לשמאל.
// 2. הסכומים בגיליון הם מספרים, כדי שאפשר יהיה לחשב עליהם באקסל.
// 3. כשיש משלוח, שורת הפירוט מסבירה את ההפרש כמו בדף.

import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { MemoryRouter, Route, Switch } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/BillingServices", () => ({
  default: { getInvoiceNotes: vi.fn() },
}));

vi.mock("@/utils/toast", () => ({
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

vi.mock("@/hooks/useUtilsFunction", () => ({
  default: () => ({
    globalSetting: { company_name: "המתוקים של בני", vat_number: "515" },
  }),
}));

// write נעטף כדי לתפוס את החוברת שנבנתה; ההורדה עצמה לא קיימת ב-jsdom
vi.mock("xlsx", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, write: vi.fn(actual.write) };
});

import * as XLSX from "xlsx";
import BillingServices from "@/services/BillingServices";
import InvoiceNotesSummary from "@/pages/InvoiceNotesSummary";

const DATA = {
  docNum: "5001",
  billedAt: "2026-10-31T10:00:00Z",
  customerSnapshot: { name: "טבולה קום", customerNumber: "553" },
  notes: [
    { _id: "n1", number: 101, notes: "כיבוד קומה 23", issuedAt: "2026-10-01T08:00:00Z", total: 1234.5 },
    { _id: "n2", number: 102, notes: "", issuedAt: "2026-10-02T09:30:00Z", netTotal: 200 },
  ],
  totals: { net: 1484.5, itemsTotal: 1434.5, shipping: 50, discount: 0 },
};

let container;
let root;

const render = async () => {
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={["/invoice-summary/5001"]}>
        <Switch>
          <Route path="/invoice-summary/:docNum" component={InvoiceNotesSummary} />
        </Switch>
      </MemoryRouter>
    );
  });
  await act(async () => {
    await Promise.resolve();
  });
};

const buttonByText = (text) =>
  [...container.querySelectorAll("button")].find((b) => b.textContent.trim().includes(text));

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  vi.clearAllMocks();
  BillingServices.getInvoiceNotes.mockResolvedValue(DATA);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe("InvoiceNotesSummary", () => {
  it("שמירה כאקסל מייצרת את טבלת התעודות עם סכומים כמספרים", async () => {
    const createObjectURL = vi.fn(() => "blob:notes");
    const revokeObjectURL = vi.fn();
    const originalCreate = window.URL.createObjectURL;
    const originalRevoke = window.URL.revokeObjectURL;
    window.URL.createObjectURL = createObjectURL;
    window.URL.revokeObjectURL = revokeObjectURL;

    try {
      await render();
      await act(async () => {
        buttonByText("שמירה כאקסל").dispatchEvent(
          new window.MouseEvent("click", { bubbles: true })
        );
      });

      expect(XLSX.write).toHaveBeenCalledTimes(1);
      const book = XLSX.write.mock.calls[0][0];
      expect(book.Workbook.Views[0].RTL).toBe(true);

      const rows = XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], {
        header: 1,
        blankrows: false,
      });
      expect(rows[0]).toEqual(["המתוקים של בני"]);
      expect(rows[1]).toEqual(["עוסק מורשה: 515"]);
      expect(rows[2][0]).toContain("פירוט תעודות משלוח לחשבונית 5001");
      expect(rows[3]).toEqual(["מספר תעודה", "הערה", "תאריך", "סכום ללא מעמ"]);
      expect(rows[4]).toEqual([101, "כיבוד קומה 23", expect.any(String), 1234.5]);
      // הערה ריקה נשארת תא ריק, וסכום שבא רק כ-netTotal נלקח ממנו
      expect(rows[5][0]).toBe(102);
      expect(rows[5][3]).toBe(200);
      expect(rows.slice(6).map((r) => [r[0], r[3]])).toEqual([
        ["מוצרים", 1434.5],
        ["משלוח", 50],
        ["סך ללא מעמ", 1484.5],
      ]);

      expect(createObjectURL).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:notes");
      expect(document.querySelector("a[download]")).toBeNull();
    } finally {
      window.URL.createObjectURL = originalCreate;
      window.URL.revokeObjectURL = originalRevoke;
    }
  });
});
