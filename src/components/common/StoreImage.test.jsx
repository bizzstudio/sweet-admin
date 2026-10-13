// תמונת מוצר / אייקון קטגוריה בפאנל.
//
// מה שהבדיקות שומרות עליו:
// 1. נתיב ריק ונתיב ‎/product-images/ מציגים את הסוכריה (כמו בחנות).
// 2. נתיב יחסי אחר נטען מהחנות ולא מהדומיין של הפאנל — שם הוא שבור.
// 3. URL מלא עובר כמו שהוא.
// 4. תמונה שנכשלה בטעינה מוחלפת בסוכריה, ותמונה חדשה מקבלת ניסיון חדש.

import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("VITE_APP_STORE_DOMAIN", "https://shop.test/sweet-store/");

const { default: StoreImage, StoreAvatar, DEFAULT_IMAGE, resolveStoreImage } =
  await import("@/components/common/StoreImage");

describe("resolveStoreImage", () => {
  it("מחזיר את הסוכריה כשאין תמונה", () => {
    for (const empty of ["", "   ", null, undefined, 5, {}]) {
      expect(resolveStoreImage(empty)).toBe(DEFAULT_IMAGE);
    }
  });

  it("מחליף את ה-placeholder שנוצר בסקריפט בסוכריה", () => {
    expect(resolveStoreImage("/product-images/1234.webp")).toBe(DEFAULT_IMAGE);
    expect(resolveStoreImage("product-images/1234.webp")).toBe(DEFAULT_IMAGE);
  });

  it("טוען נתיב יחסי מהחנות", () => {
    expect(resolveStoreImage("/category-icons/food.svg")).toBe(
      "https://shop.test/sweet-store/category-icons/food.svg"
    );
    expect(resolveStoreImage("category-icons/food.svg")).toBe(
      "https://shop.test/sweet-store/category-icons/food.svg"
    );
  });

  it("אינו מכפיל את תת-הנתיב של החנות", () => {
    expect(resolveStoreImage("/sweet-store/category-icons/food.svg")).toBe(
      "https://shop.test/sweet-store/category-icons/food.svg"
    );
  });

  it("משאיר URL מלא כמו שהוא", () => {
    for (const url of [
      "https://res.cloudinary.com/x/image/upload/a.png",
      "//cdn.test/a.png",
      "data:image/png;base64,AAAA",
      "blob:https://admin.test/1",
    ]) {
      expect(resolveStoreImage(url)).toBe(url);
    }
  });
});

describe("StoreImage", () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const img = () => container.querySelector("img");
  const fail = () =>
    act(() => {
      img().dispatchEvent(new Event("error"));
    });

  it("מחליף תמונה שבורה בסוכריה", () => {
    act(() => root.render(<StoreImage src="https://dead.test/a.png" />));
    expect(img().getAttribute("src")).toBe("https://dead.test/a.png");

    fail();
    expect(img().getAttribute("src")).toBe(DEFAULT_IMAGE);
  });

  it("נותן ניסיון חדש כשהתמונה מתחלפת", () => {
    act(() => root.render(<StoreImage src="https://dead.test/a.png" />));
    fail();

    act(() => root.render(<StoreImage src="https://live.test/b.png" />));
    expect(img().getAttribute("src")).toBe("https://live.test/b.png");
  });

  it("StoreAvatar מעביר את הנפילה ל-<img> הפנימי", () => {
    act(() => root.render(<StoreAvatar src="/product-images/1.webp" className="p-1" />));
    expect(img().getAttribute("src")).toBe(DEFAULT_IMAGE);
    expect(container.firstChild.className).toContain("p-1");
  });
});
