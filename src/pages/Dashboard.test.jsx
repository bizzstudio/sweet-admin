// בדיקות ללוח הבקרה (מסך הניווט).
//
// מה שהן שומרות עליו:
// 1. כל פריט פעיל בתפריט הצדדי מקבל כפתור עם הנתיב הנכון. אם מישהו
//    יוסיף מסך לתפריט, הבדיקה תיפול עד שיתווסף לו גם כפתור.
// 2. לכל כפתור יש הסבר בפועל בעץ ה-DOM. ההסבר נחשף במעבר עכבר, אבל אם
//    הוא לא קיים בכלל — הדרישה המרכזית של המסך לא מתקיימת, ובדיקה
//    ויזואלית לא הייתה תופסת את זה.
// 3. קישור חיצוני (החנות) נשאר <a> עם הכתובת המלאה. אם מישהו יהפוך אותו
//    ל-Link של הראוטר, react-router יצמיד לו basename והכתובת תישבר.
// 4. "לוח בקרה" עצמו אינו מופיע ככפתור בתוך לוח הבקרה.

import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import Dashboard from "@/pages/Dashboard";
import sidebar from "@/routes/sidebar";
import OUTSIDE_LINKS from "@/routes/outsideLinks";

let container;
let root;

const render = async () => {
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Dashboard />
      </MemoryRouter>
    );
  });
};

// שיטוח התפריט לעלים בלבד (פריט בודד או פריט בתוך תת-תפריט).
const sidebarLeaves = sidebar.flatMap((route) =>
  route.routes ? route.routes : [route]
);

// אותם נתיבים שהמסך מסתיר (HIDDEN_FROM_HOME ב-Dashboard.jsx): המסך הזה
// עצמו, ונתוני המכירות שהוסרו לבקשת הלקוחה
const HIDDEN_FROM_HOME = new Set(["/dashboard", "/dashboard-stats"]);

const internalPaths = sidebarLeaves
  .filter((route) => route.path && !HIDDEN_FROM_HOME.has(route.path))
  .map((route) => route.path);

const outsideKeys = sidebarLeaves
  .filter((route) => route.outside && OUTSIDE_LINKS[route.outside])
  .map((route) => route.outside);

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("Dashboard", () => {
  it("מציג כפתור לכל פריט פנימי בתפריט הצדדי", async () => {
    await render();

    expect(internalPaths.length).toBeGreaterThan(0);
    internalPaths.forEach((path) => {
      expect(container.querySelectorAll(`a[href="${path}"]`)).toHaveLength(1);
    });
  });

  // הלקוחה ביקשה שהמסך הראשי לא יזכיר מכירות בכלל — לא סכומים ולא כפתור
  // שמוביל אליהם. המסך עצמו נשאר וזמין מהתפריט הצדדי.
  it("אינו מציג כפתור לנתוני המכירות", async () => {
    await render();

    expect(container.querySelector('a[href="/dashboard-stats"]')).toBeNull();
  });

  it("אינו מציג כפתור ללוח הבקרה עצמו", async () => {
    await render();

    expect(container.querySelector('a[href="/dashboard"]')).toBeNull();
  });

  it("לכל כפתור יש הסבר בעץ ה-DOM ולא רק במעבר עכבר", async () => {
    await render();

    const tiles = [...container.querySelectorAll("a")];
    expect(tiles.length).toBe(internalPaths.length + outsideKeys.length);

    tiles.forEach((tile) => {
      // הכותרת + ההסבר, ולא כותרת לבדה.
      const paragraphs = [...tile.querySelectorAll("p")];
      expect(paragraphs.length).toBe(1);
      expect(paragraphs[0].textContent.trim().length).toBeGreaterThan(20);
    });
  });

  it("קישור החנות נשאר קישור חיצוני מלא ולא נתיב של הראוטר", async () => {
    await render();

    outsideKeys.forEach((key) => {
      const link = container.querySelector(
        `a[href="${OUTSIDE_LINKS[key]}"]`
      );
      expect(link).toBeTruthy();
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toBe("noreferrer");
    });
  });
});
