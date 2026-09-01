// חיפוש הלקוחות ב-useFilter.
//
// מה שהבדיקות שומרות עליו:
// 1. אפשר להעלות לקוח לפי מספר הלקוח בהנהח"ש, ולא רק לפי שם.
// 2. ההתאמה למספר היא מדויקת: "553" אינו מביא את 1553 או 5530.
// 3. התאמה מדויקת למספר גוברת על התאמה חלקית בטלפון — אחרת מספר לקוח בן
//    3 ספרות, שנבלע כרצף בתוך מספרי טלפון, היה חוזר עם עוד לקוחות.
// 4. החיפוש הקיים לפי שם/מייל/טלפון לא נשבר.

import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// useFilter מושך את הגדרות החנות (אזור זמן) דרך ההוק הזה, שנשען על ה-store
vi.mock("@/hooks/useUtilsFunction", () => ({
  default: () => ({ globalSetting: {}, showingTranslateValue: (v) => v }),
}));

import { SidebarContext } from "@/context/SidebarContext";
import useFilter from "@/hooks/useFilter";

const CUSTOMERS = [
  {
    _id: "c1",
    name: "טבולה קום",
    email: "amit@taboola.com",
    // הטלפון מכיל את הרצף 553, שהוא מספר הלקוח של לקוח אחר
    phone: "0505531234",
    erp: { customerNumber: "1553" },
  },
  {
    _id: "c2",
    name: "מכולת הדר",
    email: "hadar@example.com",
    phone: "039622655",
    erp: { customerNumber: "553" },
  },
  {
    _id: "c3",
    name: "לקוח בלי הנהח״ש",
    email: "store@example.com",
    phone: "0521112233",
  },
  {
    _id: "c4",
    name: "אפסים מובילים",
    email: "zero@example.com",
    phone: "0533334444",
    erp: { customerNumber: "0077" },
  },
];

let container;
let root;
let api;

const Probe = ({ data }) => {
  api = useFilter(data);
  return null;
};

const contextValue = {
  lang: "he",
  setIsUpdate: () => {},
  setLoading: () => {},
};

const render = async (data = CUSTOMERS) => {
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={["/customers"]}>
        <SidebarContext.Provider value={contextValue}>
          <Probe data={data} />
        </SidebarContext.Provider>
      </MemoryRouter>
    );
  });
};

const search = async (term) => {
  await act(async () => {
    api.setSearchUser(term);
  });
};

const names = () => api.serviceData.map((c) => c.name);

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe("חיפוש לקוחות", () => {
  it("בלי חיפוש מוצגים כל הלקוחות", async () => {
    await render();
    expect(api.serviceData).toHaveLength(4);
  });

  it("מוצא לקוח לפי מספר הלקוח בהנהח״ש, וגובר על התאמה חלקית בטלפון", async () => {
    await render();
    // 553 הוא מספר הלקוח של "מכולת הדר", והרצף הזה מופיע גם בטלפון של
    // "טבולה קום" (0505531234) — ובכל זאת חוזר לקוח אחד בלבד
    await search("553");
    expect(names()).toEqual(["מכולת הדר"]);
  });

  it("מונח שאינו מספר לקוח של אף אחד נופל לחיפוש הרגיל", async () => {
    await render();
    // אין לקוח שמספרו 55, ולכן פועלות אותן חוקות כמו קודם: הרצף נמצא
    // בטלפון של שני הלקוחות
    await search("55");
    expect(names().sort()).toEqual(["טבולה קום", "מכולת הדר"].sort());
  });

  it("אפסים מובילים אינם משנים את התוצאה", async () => {
    await render();
    await search("77");
    expect(names()).toEqual(["אפסים מובילים"]);

    await search("0077");
    expect(names()).toEqual(["אפסים מובילים"]);
  });

  it("חיפוש לפי שם ממשיך לעבוד", async () => {
    await render();
    await search("מכולת");
    expect(names()).toEqual(["מכולת הדר"]);
  });

  it("חיפוש לפי מייל ממשיך לעבוד", async () => {
    await render();
    await search("amit@taboola.com");
    expect(names()).toEqual(["טבולה קום"]);
  });

  it("חיפוש לפי טלפון ממשיך לעבוד, גם בלי אפס מוביל", async () => {
    await render();
    await search("0521112233");
    expect(names()).toEqual(["לקוח בלי הנהח״ש"]);

    await search("521112233");
    expect(names()).toEqual(["לקוח בלי הנהח״ש"]);
  });

  it("לקוח בלי מספר הנהח״ש אינו נתפס בחיפוש מספר", async () => {
    await render();
    await search("999");
    expect(api.serviceData).toHaveLength(0);
  });
});
