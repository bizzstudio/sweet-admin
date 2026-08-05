// בדיקות למסך פרטי המוצר אחרי שהעריכה עברה לתוך העמוד עצמו.
//
// מה שהן שומרות עליו: לחיצה על "עריכת מוצר" לא פותחת מגירה - היא הופכת את
// שדות המוצר שבעמוד לשדות קלט מלאים בערכיו, השמירה שולחת את מה שהוקלד
// (כולל שדות ההנהח"ש), וביטול מחזיר לקריאה בלי לשמור.

import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { MemoryRouter, Route } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/toast", () => ({
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: "he" } }),
}));

// הרכיבים הכבדים של הטופס נבדקים במקום אחר; כאן מעניין רק שהשדות עצמם
// הפכו לניתנים לעריכה בעמוד
vi.mock("@/components/category/ParentCategory", () => ({ default: () => null }));
vi.mock("@/components/image-uploader/Uploader", () => ({ default: () => null }));
vi.mock("@pathofdev/react-tag-input", () => ({ default: () => null }));

vi.mock("@/hooks/useUtilsFunction", () => ({
  default: () => ({
    currency: "₪",
    showingTranslateValue: (value) => value?.he || "",
    getNumber: (value) => Number(value || 0),
    getNumberTwo: (value) => Number(value || 0).toFixed(2),
  }),
}));

vi.mock("@/services/ProductServices", () => ({
  default: {
    getProductDetails: vi.fn(),
    getProductById: vi.fn(),
    updateProduct: vi.fn(),
    addProduct: vi.fn(),
  },
}));

vi.mock("@/services/AttributeServices", () => ({
  default: { getShowingAttributes: vi.fn() },
}));

import { SidebarContext } from "@/context/SidebarContext";
import AttributeServices from "@/services/AttributeServices";
import ProductServices from "@/services/ProductServices";
import ProductDetails from "@/pages/ProductDetails";

const PRODUCT = {
  _id: "p1",
  sku: "1234",
  slug: "candy",
  barcode: "7",
  title: { he: "סוכריה" },
  description: { he: "תיאור המוצר" },
  prices: { price: 68, originalPrice: 70, storePrice: 65, discount: 2, offers: [] },
  stock: 12,
  purchaseLimit: null,
  weight: "0.5",
  tag: JSON.stringify(["מתוק"]),
  image: ["candy.png"],
  status: "show",
  isVatFree: true,
  isStoreProduct: false,
  isCartpprod: "",
  isCombination: false,
  variants: [],
  categories: [{ _id: "cat1", name: { he: "ממתקים" } }],
  category: { _id: "cat1", name: { he: "ממתקים" } },
  erp: {
    barcode: "111",
    barcode2: "",
    externalSku: "EXT-1",
    supplierSku: "SUP-1",
    supplierName: "ספק ראשי",
    supplierNumber: 4,
    unit: 'יח"',
    groupCode: 2,
    departmentCode: 3,
    cost: 12.75,
    currency: "ISL",
    notes: "הערת ספק",
  },
  createdAt: "2026-01-01T10:00:00.000Z",
  updatedAt: "2026-02-01T10:00:00.000Z",
};

// עותק טרי בכל קריאה: הטופס משנה שדות על התשובה (שמות קטגוריות),
// ומופע משותף היה מזהם את נתוני העמוד
const fresh = () => JSON.parse(JSON.stringify(PRODUCT));

const contextValue = {
  isUpdate: false,
  setIsUpdate: vi.fn(),
  isDrawerOpen: false,
  closeDrawer: vi.fn(),
  lang: "he",
  currentPage: 1,
  limitData: 20,
  resultsPerPage: 20,
};

let container;
let root;

const render = async () => {
  await act(async () => {
    root.render(
      <SidebarContext.Provider value={contextValue}>
        <MemoryRouter initialEntries={["/product/p1"]}>
          <Route path="/product/:id">
            <ProductDetails />
          </Route>
        </MemoryRouter>
      </SidebarContext.Provider>
    );
  });
};

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

// useAsync משהה את הבקשה בשנייה אחת (debounce)
const loadPage = async () => {
  await render();
  await act(async () => {
    vi.advanceTimersByTime(1000);
  });
  await flush();
  await flush();
};

const clickButton = async (text) => {
  const button = [...container.querySelectorAll("button")].find(
    (b) => b.textContent.trim() === text
  );
  if (!button) throw new Error(`לא נמצא כפתור "${text}"`);
  await act(async () => {
    button.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  });
  await flush();
  await flush();
};

const fieldByLabel = (label) => {
  const wrapper = [...container.querySelectorAll("div")].find(
    (div) => div.firstChild?.textContent?.trim() === label
  );
  return wrapper?.querySelector("input, textarea, select") || null;
};

const typeInto = async (input, value) => {
  const proto =
    input.tagName === "TEXTAREA"
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
  await act(async () => {
    setter.call(input, value);
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  ProductServices.getProductDetails.mockImplementation(async () => fresh());
  ProductServices.getProductById.mockImplementation(async () => fresh());
  ProductServices.updateProduct.mockResolvedValue({ message: "נשמר" });
  AttributeServices.getShowingAttributes.mockResolvedValue([]);
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.useRealTimers();
});

describe("פרטי מוצר — עריכה בתוך העמוד", () => {
  it("מציג את פרטי המוצר לקריאה בלי שדות קלט לפני לחיצה על עריכה", async () => {
    await loadPage();

    expect(container.textContent).toContain("סוכריה");
    expect(container.textContent).toContain("ספק ראשי");
    expect(container.querySelectorAll("input, textarea").length).toBe(0);
  });

  it("לחיצה על עריכה הופכת את שדות המוצר שבעמוד לשדות קלט מלאים בערכיו", async () => {
    await loadPage();
    await clickButton("EditProduct");

    expect(fieldByLabel("ProductTitleName")?.value).toBe("סוכריה");
    expect(fieldByLabel("ProductDescription")?.value).toBe("תיאור המוצר");
    expect(fieldByLabel('מק"ט')?.value).toBe("1234");
    expect(fieldByLabel("מחיר לצרכן")?.value).toBe("68");
    expect(fieldByLabel("מחיר מקורי")?.value).toBe("70");
    expect(fieldByLabel("מלאי")?.value).toBe("12");
    // גם שדות ההנהח"ש נערכים באותו עמוד
    expect(fieldByLabel("שם הספק")?.value).toBe("ספק ראשי");
    expect(fieldByLabel("עלות")?.value).toBe("12.75");
  });

  it("שמירה שולחת את הערכים שהוקלדו, כולל שדות ההנהח\"ש", async () => {
    await loadPage();
    await clickButton("EditProduct");

    await typeInto(fieldByLabel("מחיר לצרכן"), "59");
    await typeInto(fieldByLabel("מלאי"), "25");
    await typeInto(fieldByLabel("שם הספק"), "ספק חדש");
    await clickButton("שמירה");

    expect(ProductServices.updateProduct).toHaveBeenCalledTimes(1);
    const [sentId, sentData] = ProductServices.updateProduct.mock.calls[0];
    expect(sentId).toBe("p1");
    expect(sentData.title).toEqual({ he: "סוכריה" });
    expect(sentData.prices.price).toBe(59);
    expect(sentData.prices.originalPrice).toBe("70.00");
    expect(sentData.stock).toBe("25");
    expect(sentData.category).toBe("cat1");
    expect(sentData.erp.supplierName).toBe("ספק חדש");
    // שדה שלא נגעו בו נשלח כמו שהגיע, בלי להתאפס
    expect(sentData.erp.cost).toBe(12.75);

    // אחרי שמירה מוצלחת העמוד חוזר למצב קריאה
    expect(container.querySelectorAll("input, textarea").length).toBe(0);
  });

  it("כשהטופס התמלא במוצר אחר - שמירה נחסמת ולא כותבת על המוצר הלא נכון", async () => {
    // תשובה שאיחרה של מוצר קודם (מעבר מהיר בין שני מוצרים) ממלאת את הטופס
    // במוצר אחר מזה שבכתובת. בלי הגנה השמירה הייתה מעדכנת את המוצר האחר
    ProductServices.getProductById.mockImplementation(async () => ({
      ...fresh(),
      _id: "p-other",
    }));

    await loadPage();
    await clickButton("EditProduct");
    await clickButton("שמירה");

    expect(ProductServices.updateProduct).not.toHaveBeenCalled();
    expect(ProductServices.addProduct).not.toHaveBeenCalled();
  });

  it("כשטעינת המוצר לטופס נכשלה - שמירה לא יוצרת מוצר כפול", async () => {
    // הבקשה של העמוד מצליחה (ולכן יש כפתור עריכה), אבל הבקשה שממלאת את
    // הטופס נכשלת. השמירה חייבת לא ליפול למסלול "הוספת מוצר"
    ProductServices.getProductById.mockRejectedValue(new Error("network"));

    await loadPage();
    await clickButton("EditProduct");
    await clickButton("שמירה");

    expect(ProductServices.addProduct).not.toHaveBeenCalled();
    expect(ProductServices.updateProduct).not.toHaveBeenCalled();
  });

  it("למוצר בלי נתוני הנהח\"ש לא נשלח erp ריק שיסמן אותו כמוצר מהיבוא", async () => {
    ProductServices.getProductDetails.mockImplementation(async () => {
      const product = fresh();
      delete product.erp;
      return product;
    });
    ProductServices.getProductById.mockImplementation(async () => {
      const product = fresh();
      delete product.erp;
      return product;
    });

    await loadPage();
    expect(container.textContent).toContain("אין מק\"ט ספק ועלות");

    await clickButton("EditProduct");
    await typeInto(fieldByLabel("מלאי"), "7");
    await clickButton("שמירה");

    const [, sentData] = ProductServices.updateProduct.mock.calls[0];
    expect(sentData.erp).toBeUndefined();
    expect(sentData.stock).toBe("7");
  });

  it("כפתור פנימי בלי type=button לא שומר את המוצר בטעות", async () => {
    await loadPage();
    await clickButton("EditProduct");

    const form = container.querySelector("form");
    const stray = document.createElement("button");
    form.appendChild(stray);

    await act(async () => {
      stray.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(ProductServices.updateProduct).not.toHaveBeenCalled();
    expect(ProductServices.addProduct).not.toHaveBeenCalled();
  });

  it("כפתור השמירה אינו אותו אלמנט DOM של כפתור העריכה", async () => {
    // מיחזור של אותו צומת היה הופך את הלחיצה על "ערוך מוצר" לשליחת הטופס
    await loadPage();

    const editButton = [...container.querySelectorAll("button")].find(
      (b) => b.textContent.trim() === "EditProduct"
    );

    await clickButton("EditProduct");

    const saveButton = [...container.querySelectorAll("button")].find(
      (b) => b.textContent.trim() === "שמירה"
    );

    expect(saveButton).not.toBe(editButton);
    expect(editButton.isConnected).toBe(false);
  });

  it("שליחת הטופס לפני שהערכים נכנסו אליו אינה שומרת", async () => {
    await loadPage();

    const form = container.querySelector("form");
    await act(async () => {
      form.dispatchEvent(
        new window.Event("submit", { bubbles: true, cancelable: true })
      );
    });
    await flush();

    expect(ProductServices.updateProduct).not.toHaveBeenCalled();
    expect(ProductServices.addProduct).not.toHaveBeenCalled();
  });

  it("מזהה הכתובת (slug) מנורמל בהקלדה, כמו בטופס המקורי", async () => {
    await loadPage();
    await clickButton("EditProduct");

    await typeInto(fieldByLabel("מזהה כתובת (slug)"), "Sweet Candy (Big)");
    await clickButton("שמירה");

    const [, sentData] = ProductServices.updateProduct.mock.calls[0];
    expect(sentData.slug).toBe("sweet-candy-big");
  });

  it("ביטול מחזיר לקריאה בלי לשמור", async () => {
    await loadPage();
    await clickButton("EditProduct");

    await typeInto(fieldByLabel("מחיר לצרכן"), "1");
    await clickButton("ביטול");

    expect(ProductServices.updateProduct).not.toHaveBeenCalled();
    expect(container.querySelectorAll("input, textarea").length).toBe(0);
    expect(container.textContent).toContain("סוכריה");
  });
});
