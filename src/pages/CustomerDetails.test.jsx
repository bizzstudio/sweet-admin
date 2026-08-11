// בדיקות למסך "צפייה בלקוח" אחרי שהעריכה עברה לתוך העמוד עצמו.
//
// מה שהן שומרות עליו: לחיצה על "עריכת לקוח" לא פותחת מגירה או חלון - היא
// הופכת את השדות שבעמוד לשדות קלט מלאים בערכי הלקוח, והשמירה שולחת את מה
// שהוקלד בלי לאבד את שאר הכתובת (עיר) שהטופס לא עורך.

import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { MemoryRouter, Route } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/toast", () => ({
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

import { notifyError } from "@/utils/toast";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: "he" } }),
}));

vi.mock("@/services/CustomerServices", () => ({
  default: {
    getCustomerDetails: vi.fn(),
    updateCustomer: vi.fn(),
  },
}));

// כרטיס המחירון שולף את המחירון של הלקוח בכל טעינה. בלי המוק הזה הבדיקה
// הייתה יוצאת לרשת, כלומר תוצאה שאינה דטרמיניסטית
vi.mock("@/services/CustomerPriceListServices", () => ({
  default: {
    getCustomerPriceList: vi.fn(() =>
      Promise.resolve({ exists: false, itemsCount: 0, items: [] })
    ),
    checkImport: vi.fn(),
    importPriceList: vi.fn(),
    deletePriceList: vi.fn(),
  },
}));

// בורר היישובים האמיתי מושך את רשימת הלמ"ס מהרשת; כאן מספיק לדעת שהוא קיבל
// את העיר של הלקוח ושהיא נשמרת גם כשלא נגעו בו
vi.mock("@/components/select/City", () => ({
  default: ({ value }) => (
    <input readOnly data-city="1" value={value?.city_name_he || ""} />
  ),
}));

import { SidebarContext } from "@/context/SidebarContext";
import CustomerServices from "@/services/CustomerServices";
import CustomerDetails from "@/pages/CustomerDetails";

const CUSTOMER = {
  _id: "c1",
  name: "אווינסד",
  lastName: "",
  email: "anat@evinced.com",
  phone: "0547205887",
  isCashier: false,
  inBlackList: false,
  isRegistered: true,
  shippingRewardIssued: false,
  // הסיסמה נשמרת גם כטקסט גלוי, כדי שאפשר יהיה לראות אותה בכרטיס ולהיכנס
  // איתה לחנות בשם הלקוח
  plainPassword: "Benny2026",
  hasPassword: true,
  welcomeGift: { isUsed: false, sku: "GIFT-1" },
  erp: {
    customerNumber: "1001",
    idNumber: "123456789",
    customerType: "עסקי",
    contactPerson: "ענת",
    landline: "036667777",
    agent: "דני",
    active: true,
    points: 310.611,
    discountPercent: 0,
    priceLevel: 0,
    paymentTerms: 0,
    cumulativePurchase: 1200,
    credit: 0,
    openingBalance: 0,
    birthDate: "1990-05-04T00:00:00.000Z",
    openDate: "2020-01-15T00:00:00.000Z",
    lastPurchaseAt: "2026-07-01T00:00:00.000Z",
    notes: "לקוח ותיק",
    rawCity: "תל אביב",
    syncedAt: "2026-08-01T00:00:00.000Z",
  },
  address: {
    street: "הנציב",
    houseNumber: "32",
    apartmentNumber: "",
    floor: "",
    entryCode: "",
    postalCode: "",
    // העיר לא נערכת בטופס וחייבת לשרוד את השמירה
    city: { city_name_he: "תל אביב", city_code: 5000 },
  },
};

// ערכי הקונטקסט שבהם useAsync ו-useCustomerSubmit נוגעים
const contextValue = {
  isUpdate: false,
  setIsUpdate: vi.fn(),
  isDrawerOpen: false,
  closeDrawer: vi.fn(),
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
        <MemoryRouter initialEntries={["/customer/c1"]}>
          <Route path="/customer/:id">
            <CustomerDetails />
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
};

// איתור שדה קלט לפי התווית שמעליו
const fieldByLabel = (label) => {
  const wrapper = [...container.querySelectorAll("div")].find(
    (div) => div.firstChild?.textContent?.trim() === label
  );
  return wrapper?.querySelector("input, textarea, select") || null;
};

const typeInto = async (input, value) => {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  ).set;
  await act(async () => {
    setter.call(input, value);
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
};

const selectOption = async (select, value) => {
  await act(async () => {
    select.value = value;
    select.dispatchEvent(new window.Event("change", { bubbles: true }));
  });
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  CustomerServices.getCustomerDetails.mockResolvedValue(CUSTOMER);
  CustomerServices.updateCustomer.mockResolvedValue({ message: "נשמר" });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.useRealTimers();
});

describe("צפייה בלקוח — עריכה בתוך העמוד", () => {
  it("מציג את הפרטים לקריאה בלי שדות קלט לפני לחיצה על עריכה", async () => {
    await loadPage();

    expect(container.textContent).toContain("אווינסד");
    expect(container.querySelectorAll("input").length).toBe(0);
  });

  it("לחיצה על עריכה הופכת את השדות שבעמוד לשדות קלט מלאים בערכי הלקוח", async () => {
    await loadPage();
    await clickButton("עריכת לקוח");

    expect(fieldByLabel("שם פרטי")?.value).toBe("אווינסד");
    expect(fieldByLabel("אימייל")?.value).toBe("anat@evinced.com");
    expect(fieldByLabel("טלפון")?.value).toBe("0547205887");
    expect(fieldByLabel("רחוב")?.value).toBe("הנציב");
    expect(fieldByLabel("מספר בית")?.value).toBe("32");

    // גם פרטי ההנהח"ש, המספרים והדגלים נערכים באותו עמוד
    expect(fieldByLabel("מספר לקוח בהנהח״ש")?.value).toBe("1001");
    expect(fieldByLabel("מספר זהות / ח.פ.")?.value).toBe("123456789");
    expect(fieldByLabel("איש קשר")?.value).toBe("ענת");
    expect(fieldByLabel("תאריך לידה")?.value).toBe("1990-05-04");
    expect(fieldByLabel("נקודות")?.value).toBe("310.611");
    expect(fieldByLabel("קופאי")?.value).toBe("no");
    expect(fieldByLabel("רשום לאתר")?.value).toBe("yes");
    expect(fieldByLabel("הערות")?.value).toBe("לקוח ותיק");

    // העיר נבחרת מרשימת היישובים, ולא כשדה טקסט חופשי
    expect(container.querySelector("[data-city]")?.value).toBe("תל אביב");

    // לא נטענו פרטי הלקוח פעם שנייה בשביל הטופס
    expect(CustomerServices.getCustomerDetails).toHaveBeenCalledTimes(1);
  });

  it("שמירה שולחת את הערכים שהוקלדו ומשאירה את העיר על כנה", async () => {
    await loadPage();
    await clickButton("עריכת לקוח");

    await typeInto(fieldByLabel("רחוב"), "הנציב הראשון");
    await typeInto(fieldByLabel("קומה"), "3");
    await typeInto(fieldByLabel("איש קשר"), "יעל");
    await typeInto(fieldByLabel("% הנחה"), "5");
    await selectOption(fieldByLabel("קופאי"), "yes");
    await clickButton("שמירה");

    expect(CustomerServices.updateCustomer).toHaveBeenCalledTimes(1);
    const [sentId, sentData] = CustomerServices.updateCustomer.mock.calls[0];
    expect(sentId).toBe("c1");
    expect(sentData.name).toBe("אווינסד");
    expect(sentData.address.street).toBe("הנציב הראשון");
    expect(sentData.address.floor).toBe("3");
    expect(sentData.address.city).toEqual(CUSTOMER.address.city);
    expect(sentData.isCashier).toBe(true);
    expect(sentData.erp.contactPerson).toBe("יעל");
    expect(sentData.erp.discountPercent).toBe(5);
    expect(sentData.erp.customerNumber).toBe("1001");
    expect(sentData.erp.active).toBe(true);
    // תאריך ריק נשלח כ-null ולא כמחרוזת ריקה, שהשרת אינו יכול להמיר
    expect(sentData.erp.birthDate).toBe("1990-05-04");

    // אחרי שמירה מוצלחת העמוד חוזר למצב קריאה
    await flush();
    expect(container.querySelectorAll("input").length).toBe(0);
  });

  it("ללקוח חנות (בלי נתוני הנהח\"ש) לא נשלח erp ריק שיסמן אותו כלקוח מהיבוא", async () => {
    const storeCustomer = { ...CUSTOMER, erp: undefined };
    CustomerServices.getCustomerDetails.mockResolvedValue(storeCustomer);

    await loadPage();
    await clickButton("עריכת לקוח");

    expect(fieldByLabel("מספר לקוח בהנהח״ש")).toBeNull();

    await typeInto(fieldByLabel("רחוב"), "רחוב אחר");
    await clickButton("שמירה");

    const [, sentData] = CustomerServices.updateCustomer.mock.calls[0];
    expect(sentData.erp).toBeUndefined();
    expect(sentData.address.street).toBe("רחוב אחר");
  });

  it("כפתור פנימי בלי type=button לא שומר את הלקוח בטעות", async () => {
    await loadPage();
    await clickButton("עריכת לקוח");

    // מדמה רכיב פנימי בתוך טופס העמוד שנשכח בלי type="button" - כפתור כזה
    // נחשב לכפתור שליחה, ובלי ההגנה הוא היה מפעיל שמירה
    const form = container.querySelector("form");
    const stray = document.createElement("button");
    form.appendChild(stray);

    await act(async () => {
      stray.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(CustomerServices.updateCustomer).not.toHaveBeenCalled();

    // וכפתור השמירה עצמו ממשיך לעבוד
    await clickButton("שמירה");
    expect(CustomerServices.updateCustomer).toHaveBeenCalledTimes(1);
  });

  it("רענון נתוני העמוד באמצע עריכה אינו דורס את מה שהוקלד", async () => {
    await loadPage();
    await clickButton("עריכת לקוח");

    await typeInto(fieldByLabel("רחוב"), "רחוב שהוקלד");

    // רענון ברקע: אותו לקוח חוזר מהשרת כאובייקט חדש (כמו אחרי פעולה אחרת
    // במסך שמפעילה setIsUpdate)
    CustomerServices.getCustomerDetails.mockResolvedValue({ ...CUSTOMER });
    await act(async () => {
      root.render(
        <SidebarContext.Provider value={{ ...contextValue, isUpdate: true }}>
          <MemoryRouter initialEntries={["/customer/c1"]}>
            <Route path="/customer/:id">
              <CustomerDetails />
            </Route>
          </MemoryRouter>
        </SidebarContext.Provider>
      );
    });
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    await flush();

    expect(fieldByLabel("רחוב")?.value).toBe("רחוב שהוקלד");
  });

  it("כניסה חוזרת לעריכה מיד אחרי שמירה מציגה את הערכים ששמורים בשרת", async () => {
    await loadPage();
    await clickButton("עריכת לקוח");
    await typeInto(fieldByLabel("רחוב"), "רחוב חדש");
    await clickButton("שמירה");

    // נתוני העמוד מתרעננים בהשהיה של שנייה; השרת כבר מחזיק את הערך החדש
    CustomerServices.getCustomerDetails.mockResolvedValue({
      ...CUSTOMER,
      address: { ...CUSTOMER.address, street: "רחוב חדש" },
    });

    // המשתמש נכנס שוב לעריכה לפני שהרענון הספיק לחזור
    await clickButton("עריכת לקוח");
    await flush();

    expect(fieldByLabel("רחוב")?.value).toBe("רחוב חדש");

    // וגם כאן, הרענון שמגיע אחר כך לא דורס את ההקלדה שבאמצע
    await typeInto(fieldByLabel("קומה"), "9");
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    await flush();

    expect(fieldByLabel("קומה")?.value).toBe("9");
  });

  it("שמירה שנייה מיד אחרי הראשונה נשמרת, ולא מציגה 'פרטי הלקוח לא נטענו'", async () => {
    await loadPage();
    await clickButton("עריכת לקוח");
    await typeInto(fieldByLabel("רחוב"), "רחוב חדש");
    await clickButton("שמירה");

    expect(CustomerServices.updateCustomer).toHaveBeenCalledTimes(1);

    // הבקשה שמרעננת את הטופס נתקעת; בזמן הזה הטופס מלא על המסך והמשתמש
    // נכנס שוב לעריכה ולוחץ שמירה
    let release;
    CustomerServices.getCustomerDetails.mockImplementation(
      () => new Promise((resolve) => (release = () => resolve(CUSTOMER)))
    );

    await clickButton("עריכת לקוח");

    // הכפתור חסום כל עוד הערכים בדרך, ולכן אי אפשר לשמור ערכים חלקיים
    const saveButton = [...container.querySelectorAll("button")].find(
      (b) => b.textContent.trim() === "שמירה"
    );
    expect(saveButton.disabled).toBe(true);
    expect(container.textContent).toContain("מרענן את פרטי הלקוח");

    await clickButton("שמירה");

    // ובעיקר: אין הודעת "פרטי הלקוח לא נטענו" בזמן שהטופס מלא על המסך
    expect(notifyError).not.toHaveBeenCalled();
    expect(CustomerServices.updateCustomer).toHaveBeenCalledTimes(1);

    await act(async () => {
      release();
    });
    await flush();

    await clickButton("שמירה");
    expect(CustomerServices.updateCustomer).toHaveBeenCalledTimes(2);
    expect(notifyError).not.toHaveBeenCalled();
  });

  it("כפתור השמירה אינו אותו אלמנט DOM של כפתור העריכה", async () => {
    // אם React ממחזר את אותו צומת ורק מחליף לו type ל-submit, הדפדפן מבצע
    // את פעולת ברירת המחדל של הקליק *אחרי* העדכון - כלומר עצם הלחיצה על
    // "עריכת לקוח" שולחת את הטופס ושומרת מיד
    await loadPage();

    const editButton = [...container.querySelectorAll("button")].find(
      (b) => b.textContent.trim() === "עריכת לקוח"
    );

    await clickButton("עריכת לקוח");

    const saveButton = [...container.querySelectorAll("button")].find(
      (b) => b.textContent.trim() === "שמירה"
    );

    expect(saveButton).not.toBe(editButton);
    expect(editButton.isConnected).toBe(false);
  });

  it("שליחת הטופס לפני שהערכים נכנסו אליו אינה מוחקת את פרטי הלקוח", async () => {
    await loadPage();

    // מדמה שליחה שקרתה לפני שהטופס מולא (למשל שליחה לא מכוונת ברגע
    // המעבר למצב עריכה). ללא רשת הביטחון היו נשלחים שדות ריקים שמוחקים
    // כתובת, דגלים ונתוני הנהח"ש
    const form = container.querySelector("form");
    await act(async () => {
      form.dispatchEvent(
        new window.Event("submit", { bubbles: true, cancelable: true })
      );
    });
    await flush();

    expect(CustomerServices.updateCustomer).not.toHaveBeenCalled();
  });

  it("הסיסמה מוסתרת בקריאה ונחשפת בלחיצה על העין", async () => {
    await loadPage();

    // מוסתרת כברירת מחדל, כדי שלא תישאר גלויה על המסך
    expect(container.textContent).not.toContain("Benny2026");
    expect(container.textContent).toContain("•".repeat(9));

    const reveal = container.querySelector('button[title="הצגת הסיסמה"]');
    await act(async () => {
      reveal.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(container.textContent).toContain("Benny2026");
  });

  it("שדה הסיסמה נטען עם הסיסמה השמורה, ושמירה בלי לגעת בו אינה שולחת אותה", async () => {
    await loadPage();
    await clickButton("עריכת לקוח");

    expect(fieldByLabel("סיסמה לכניסה לחנות")?.value).toBe("Benny2026");

    await typeInto(fieldByLabel("רחוב"), "רחוב אחר");
    await clickButton("שמירה");

    // השרת מצפין מחדש כל ערך שמגיע, ומחרוזת ריקה מבטלת את הסיסמה - ולכן
    // שמירה שלא נגעה בשדה אינה שולחת אותו בכלל
    const [, sentData] = CustomerServices.updateCustomer.mock.calls[0];
    expect(sentData).not.toHaveProperty("password");
  });

  it("סיסמה שהוקלדה נשלחת לשרת", async () => {
    await loadPage();
    await clickButton("עריכת לקוח");

    await typeInto(fieldByLabel("סיסמה לכניסה לחנות"), "Sweet1234");
    await clickButton("שמירה");

    const [, sentData] = CustomerServices.updateCustomer.mock.calls[0];
    expect(sentData.password).toBe("Sweet1234");
  });

  it("כפתור יצירת סיסמה ממלא את השדה ושולח את מה שנוצר", async () => {
    await loadPage();
    await clickButton("עריכת לקוח");

    const generate = container.querySelector(
      'button[title="יצירת סיסמה אקראית"]'
    );
    await act(async () => {
      generate.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    });
    await flush();

    const generated = fieldByLabel("סיסמה לכניסה לחנות")?.value;
    expect(generated).toMatch(/^[A-Za-z2-9]{8}$/);
    // הסיסמה שנוצרה מוצגת מיד, כדי שאפשר יהיה למסור אותה ללקוח
    expect(fieldByLabel("סיסמה לכניסה לחנות")?.type).toBe("text");

    await clickButton("שמירה");
    const [, sentData] = CustomerServices.updateCustomer.mock.calls[0];
    expect(sentData.password).toBe(generated);
  });

  it("סיסמה קצרה מדי נחסמת ואינה נשלחת", async () => {
    await loadPage();
    await clickButton("עריכת לקוח");

    await typeInto(fieldByLabel("סיסמה לכניסה לחנות"), "123");
    await clickButton("שמירה");

    expect(CustomerServices.updateCustomer).not.toHaveBeenCalled();
    expect(container.textContent).toContain("לפחות 6 תווים");
  });

  it("ללקוח שקבע סיסמה בעצמו מוצג שהיא אינה ניתנת לצפייה", async () => {
    CustomerServices.getCustomerDetails.mockResolvedValue({
      ...CUSTOMER,
      plainPassword: undefined,
      hasPassword: true,
    });

    await loadPage();

    expect(container.textContent).toContain("אינה ניתנת לצפייה");

    // והשמירה לא מוחקת לו אותה: השדה מוצג ריק, ולכן הוא אינו נשלח
    await clickButton("עריכת לקוח");
    expect(fieldByLabel("סיסמה לכניסה לחנות")?.value).toBe("");
    await clickButton("שמירה");

    const [, sentData] = CustomerServices.updateCustomer.mock.calls[0];
    expect(sentData).not.toHaveProperty("password");
  });

  it("ביטול מחזיר לקריאה ומבטל את מה שהוקלד", async () => {
    await loadPage();
    await clickButton("עריכת לקוח");

    await typeInto(fieldByLabel("רחוב"), "רחוב שלא נשמר");
    await clickButton("ביטול");

    expect(container.querySelectorAll("input").length).toBe(0);
    expect(CustomerServices.updateCustomer).not.toHaveBeenCalled();

    await clickButton("עריכת לקוח");
    expect(fieldByLabel("רחוב")?.value).toBe("הנציב");
  });
});
