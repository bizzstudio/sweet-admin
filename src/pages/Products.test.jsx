// בדיקות לסינון ברשימת המוצרים.
//
// מה שהן שומרות עליו: חיפוש שנשאר ב-SidebarContext מעמוד אחר לא מסנן כאן,
// החיפוש רץ תוך כדי הקלדה וחוזר לעמוד 1, ו"איפוס" מנקה גם את החיפוש
// ששמור בקונטקסט (לא רק את התיבה) ואת שני הבוררים.

import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: "he" } }),
}));

vi.mock("@/hooks/useToggleDrawer", () => ({
  default: () => ({
    title: "",
    allId: [],
    serviceId: "",
    setServiceId: vi.fn(),
    handleDeleteMany: vi.fn(),
    handleModalOpen: vi.fn(),
  }),
}));

vi.mock("@/hooks/useUtilsFunction", () => ({
  default: () => ({ showingTranslateValue: (value) => value?.he || "" }),
}));

vi.mock("@/components/common/UploadManyTwo", () => ({ default: () => null }));
vi.mock("@/components/drawer/MainDrawer", () => ({ default: () => null }));
vi.mock("@/components/drawer/ProductDrawer", () => ({ default: () => null }));
vi.mock("@/components/drawer/BulkActionDrawer", () => ({ default: () => null }));
vi.mock("@/components/modal/DeleteModal", () => ({ default: () => null }));
vi.mock("@/components/product/ImportExcelModal", () => ({ default: () => null }));
vi.mock("@/components/product/ProductTable", () => ({ default: () => null }));

vi.mock("@/services/ProductServices", () => ({
  default: { getAllProducts: vi.fn() },
}));

vi.mock("@/services/CategoryServices", () => ({
  default: {
    getAllCategories: vi.fn(async () => [
      { _id: "cat1", name: { he: "מזון" } },
    ]),
  },
}));

import { SidebarContext } from "@/context/SidebarContext";
import ProductServices from "@/services/ProductServices";
import Products from "@/pages/Products";

// הקונטקסט האמיתי מאמת טוקן ומושך סטטוסים בעלייה; כאן מספיק ה-state
// שהעמוד וה-useAsync קוראים, עם ערכים התחלתיים כמו אחרי ביקור בעמוד אחר
const TestSidebar = ({ initial, children }) => {
  const [searchText, setSearchText] = useState(initial.searchText);
  const [category, setCategory] = useState(initial.category);
  const [sortedField, setSortedField] = useState(initial.sortedField);
  const [currentPage, setCurrentPage] = useState(initial.currentPage);
  const [isUpdate, setIsUpdate] = useState(false);

  return (
    <SidebarContext.Provider
      value={{
        toggleDrawer: vi.fn(),
        lang: "he",
        isUpdate,
        setIsUpdate,
        currentPage,
        setCurrentPage,
        handleChangePage: setCurrentPage,
        searchText,
        setSearchText,
        category,
        setCategory,
        sortedField,
        setSortedField,
        limitData: 20,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};

let container;
let root;

const lastQuery = () => ProductServices.getAllProducts.mock.calls.at(-1)[0];

// בצעדים: השהיית ההקלדה משנה state, ורק אחרי הרינדור נוצר טיימר הבקשה
const flush = async (ms) => {
  for (let passed = 0; passed < ms; passed += 100) {
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
  }
};

const render = async (initial) => {
  await act(async () => {
    root.render(
      <TestSidebar initial={initial}>
        <Products />
      </TestSidebar>
    );
  });
  await flush(1500);
};

const type = async (input, value) => {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  ).set;
  await act(async () => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
};

const select = async (el, value) => {
  await act(async () => {
    el.value = value;
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

describe("Products filters", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    ProductServices.getAllProducts.mockReset();
    ProductServices.getAllProducts.mockResolvedValue({
      products: [{ _id: "p1" }],
      totalDoc: 1,
    });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  it("ignores a search left in the shared context by another page", async () => {
    await render({
      searchText: "חיפוש ישן",
      category: "cat1",
      sortedField: "high",
      currentPage: 4,
    });

    expect(lastQuery()).toEqual({
      page: 1,
      limit: 20,
      category: null,
      title: null,
      price: "",
    });
    expect(container.querySelector('input[name="search"]').value).toBe("");
  });

  it("searches while typing and goes back to page 1", async () => {
    await render({ searchText: null, category: null, sortedField: "", currentPage: 1 });

    const input = container.querySelector('input[name="search"]');
    await type(input, "  חלב סויה ");
    await flush(1000);

    expect(lastQuery()).toMatchObject({ title: "חלב סויה", page: 1 });
  });

  it("keeps the category when searching", async () => {
    await render({ searchText: null, category: null, sortedField: "", currentPage: 1 });

    const [categorySelect] = container.querySelectorAll("select");
    await select(categorySelect, "cat1");
    await type(container.querySelector('input[name="search"]'), "סויה");
    await flush(1000);

    expect(lastQuery()).toMatchObject({ title: "סויה", category: "cat1" });
  });

  it("reset clears the search, both selects and the stored filter", async () => {
    await render({ searchText: null, category: null, sortedField: "", currentPage: 1 });

    const input = container.querySelector('input[name="search"]');
    const [categorySelect, sortSelect] = container.querySelectorAll("select");
    await select(categorySelect, "cat1");
    await select(sortSelect, "high");
    await type(input, "סויה");
    await flush(1000);
    expect(lastQuery()).toMatchObject({ title: "סויה", category: "cat1", price: "high" });

    const resetButton = [...container.querySelectorAll("button")].find(
      (b) => b.textContent === "Reset"
    );
    await act(async () => resetButton.click());
    await flush(1000);

    expect(lastQuery()).toEqual({
      page: 1,
      limit: 20,
      category: null,
      title: null,
      price: "",
    });
    expect(input.value).toBe("");
    expect(categorySelect.value).toBe("");
    expect(sortSelect.value).toBe("");
  });

  it("reset cancels a search still waiting for the typing pause", async () => {
    await render({ searchText: null, category: null, sortedField: "", currentPage: 1 });

    await type(container.querySelector('input[name="search"]'), "סויה");
    const resetButton = [...container.querySelectorAll("button")].find(
      (b) => b.textContent === "Reset"
    );
    await act(async () => resetButton.click());
    await flush(1500);

    expect(lastQuery().title).toBeNull();
  });
});
