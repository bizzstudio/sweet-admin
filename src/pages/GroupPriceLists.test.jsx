// בדיקות לעמוד המחירונים הקבוצתיים.
//
// מה שהן שומרות עליו:
//   1. קבוצה חדשה נשלחת עם השם, שורות הקובץ והלקוחות שסומנו.
//   2. בלי שם או בלי קובץ קבוצה חדשה לא נשלחת בכלל.
//   3. עריכה בלי קובץ חדש אינה שולחת שורות — אחרת שינוי של רשימת הלקוחות
//      היה דורס את המחירים.
//   4. לקוח ששייך לקבוצה אחרת מסומן, כי השמירה מעבירה אותו.

import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/toast", () => ({ notifyError: vi.fn(), notifySuccess: vi.fn() }));

vi.mock("@/services/GroupPriceListServices", () => ({
  default: {
    getAll: vi.fn(),
    getOne: vi.fn(),
    checkImport: vi.fn(),
    create: vi.fn(() => Promise.resolve({ message: "נשמר" })),
    update: vi.fn(() => Promise.resolve({ message: "עודכן" })),
    remove: vi.fn(() => Promise.resolve({ message: "נמחק" })),
  },
}));

// המוק שומר על החתימה האמיתית של השירות ({ searchText }): קריאה בלי ארגומנט
// קורסת בו בדיוק כמו בשירות עצמו, ולא עוברת בשקט
vi.mock("@/services/CustomerServices", () => ({
  default: { getAllCustomers: vi.fn(({ searchText = "" }) => Promise.resolve(searchText)) },
}));

// הפענוח עצמו נבדק ב-customerPriceListExcel.test.js
vi.mock("@/utils/customerPriceListExcel", async () => {
  const actual = await vi.importActual("@/utils/customerPriceListExcel");
  return { ...actual, parseCustomerPriceListFile: vi.fn() };
});

import CustomerServices from "@/services/CustomerServices";
import GroupPriceListServices from "@/services/GroupPriceListServices";
import { parseCustomerPriceListFile } from "@/utils/customerPriceListExcel";
import { notifyError } from "@/utils/toast";
import GroupPriceLists from "@/pages/GroupPriceLists";

const CUSTOMERS = [
  { _id: "c1", name: "גן", lastName: "רימון", erp: { customerNumber: "101" } },
  { _id: "c2", name: "גן", lastName: "תמר", erp: { customerNumber: "102" } },
  { _id: "c3", name: "מכולת", lastName: "השכונה" },
];

const GROUP = {
  _id: "g1",
  name: "גני ילדים",
  itemsCount: 12,
  customers: ["c1"],
  customersCount: 1,
  fileName: "גנים.xlsx",
};

const PARSED = {
  fileName: "חדש.xlsx",
  headerRowNumber: 1,
  hasNameColumn: true,
  rows: [
    { rowNumber: 2, sku: "85", name: "אובלטים", price: 12 },
    { rowNumber: 3, sku: "500", name: "שקדים", price: 20 },
  ],
  invalidRows: [],
  duplicateSkus: [],
  stats: { total: 2, minPrice: 12, maxPrice: 20, skipped: 0, skippedReasons: [] },
};

let container;
let root;

const screen = () => container;
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

const open = async (groups = []) => {
  GroupPriceListServices.getAll.mockResolvedValue(groups);
  act(() => {
    root.render(<GroupPriceLists />);
  });
  await flush();
};

const button = (text) =>
  [...screen().querySelectorAll("button")].find((el) => el.textContent.includes(text));

const click = async (el) => {
  await act(async () => { el.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
  await flush();
};

const typeName = (value) => {
  const input = screen().querySelector('input[type="text"]');
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const selectFile = async () => {
  const input = screen().querySelector('input[type="file"]');
  Object.defineProperty(input, "files", {
    value: [new File(["x"], "חדש.xlsx")],
    configurable: true,
  });
  await act(async () => { input.dispatchEvent(new Event("change", { bubbles: true })); });
  await flush();
};

const customerCheckbox = (label) =>
  [...screen().querySelectorAll("label")]
    .find((el) => el.textContent.includes(label) && el.querySelector('input[type="checkbox"]'))
    .querySelector("input");

beforeEach(() => {
  vi.clearAllMocks();
  parseCustomerPriceListFile.mockResolvedValue(PARSED);
  CustomerServices.getAllCustomers.mockImplementation(({ searchText = "" }) =>
    Promise.resolve(searchText ? [] : CUSTOMERS)
  );
  GroupPriceListServices.getOne.mockResolvedValue({
    ...GROUP,
    filtered: 1,
    returned: 1,
    items: [{ sku: "85", price: 12, name: "אובלטים", inCatalog: true, catalogTitle: "אובלטים", catalogPrice: 8.9 }],
  });
  GroupPriceListServices.checkImport.mockResolvedValue({
    matched: 2, unknown: 0, nameMismatchCount: 0, nameMismatches: [],
  });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("GroupPriceLists", () => {
  it("קבוצה חדשה נשלחת עם השם, השורות והלקוחות שסומנו", async () => {
    await open([]);
    await click(button("מחירון קבוצתי חדש"));
    typeName("  מוסדות ");
    await selectFile();
    await click(customerCheckbox("רימון"));
    await click(customerCheckbox("השכונה"));
    await click(button("שמירת המחירון הקבוצתי"));

    expect(GroupPriceListServices.create).toHaveBeenCalledTimes(1);
    const body = GroupPriceListServices.create.mock.calls[0][0];
    expect(body.name).toBe("מוסדות");
    expect(body.fileName).toBe("חדש.xlsx");
    expect(body.customers).toEqual(["c1", "c3"]);
    expect(body.rows.map((row) => [row.sku, row.price])).toEqual([["85", 12], ["500", 20]]);
  });

  it("בלי שם או בלי קובץ — קבוצה חדשה אינה נשלחת", async () => {
    await open([]);
    await click(button("מחירון קבוצתי חדש"));
    await click(button("שמירת המחירון הקבוצתי"));
    typeName("מוסדות");
    await click(button("שמירת המחירון הקבוצתי"));

    expect(GroupPriceListServices.create).not.toHaveBeenCalled();
    expect(notifyError).toHaveBeenCalledTimes(2);
  });

  it("עריכה בלי קובץ חדש אינה שולחת שורות", async () => {
    await open([GROUP]);
    await click(screen().querySelector('button[aria-label="עריכת המחירון הקבוצתי גני ילדים"]'));
    await click(customerCheckbox("תמר"));
    await click(button("שמירת המחירון הקבוצתי"));

    expect(GroupPriceListServices.update).toHaveBeenCalledTimes(1);
    const [id, body] = GroupPriceListServices.update.mock.calls[0];
    expect(id).toBe("g1");
    expect(body).toEqual({ name: "גני ילדים", customers: ["c1", "c2"] });
  });

  it("לקוח ששייך לקבוצה אחרת מסומן, והמסך מזהיר שהשמירה תעביר אותו", async () => {
    await open([GROUP]);
    await click(button("מחירון קבוצתי חדש"));
    expect(screen().textContent).toContain('כרגע בקבוצה "גני ילדים"');
    expect(screen().textContent).not.toContain("השמירה תעביר אותם");

    await click(customerCheckbox("רימון"));
    expect(screen().textContent).toContain("השמירה תעביר אותם");
  });

  it("פתיחת מחירון קיים מציגה את המחירים שבו", async () => {
    await open([GROUP]);
    await click(button("גני ילדים"));

    expect(GroupPriceListServices.getOne).toHaveBeenCalledWith("g1", { search: "", limit: 100 });
    expect(screen().textContent).toContain("אובלטים");
    expect(screen().textContent).toContain("מחיר בקבוצה");
  });

  it("מחיקה עוברת דרך אישור", async () => {
    await open([GROUP]);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const del = () => screen().querySelector('button[aria-label="מחיקת המחירון הקבוצתי גני ילדים"]');
    await click(del());
    expect(GroupPriceListServices.remove).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    await click(del());
    expect(GroupPriceListServices.remove).toHaveBeenCalledWith("g1");
    confirm.mockRestore();
  });
});
