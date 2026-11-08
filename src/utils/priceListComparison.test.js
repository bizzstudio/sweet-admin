// הכללים לבחירת מחיר במסך "השוואת מחירונים"
import { describe, expect, it } from "vitest";
import {
  SOURCE_GROUP,
  SOURCE_MAJORITY,
  commonNamePrefix,
  defaultChoices,
  defaultPrice,
  hasDifferentPrices,
  majorityPrice,
  shortName,
  toPriceListRows,
} from "@/utils/priceListComparison";

describe("majorityPrice", () => {
  it("המחיר שרוב הסניפים משלמים; בתיקו — הגבוה", () => {
    expect(majorityPrice({ a: 5, b: 5, c: 6 })).toBe(5);
    expect(majorityPrice({ a: 5, b: 6 })).toBe(6);
    expect(majorityPrice({ a: 0 })).toBe(null);
  });
});

describe("defaultPrice", () => {
  const item = { sku: "1", prices: { a: 5, b: 5, c: 7 }, groupPrice: 6 };
  it("לפי סניף, ובלי מחיר אצלו — הקבוצה ואז הרוב", () => {
    expect(defaultPrice(item, "c")).toBe(7);
    expect(defaultPrice(item, "x")).toBe(6);
    expect(defaultPrice({ ...item, groupPrice: undefined }, "x")).toBe(5);
  });
  it("לפי הקבוצה ולפי הרוב", () => {
    expect(defaultPrice(item, SOURCE_GROUP)).toBe(6);
    expect(defaultPrice({ ...item, groupPrice: undefined }, SOURCE_GROUP)).toBe(5);
    expect(defaultPrice({ ...item, groupPrice: undefined }, SOURCE_MAJORITY)).toBe(5);
  });
  it("כל מוצר מקבל מחיר", () => {
    const items = [item, { sku: "2", prices: { b: 3 } }];
    expect(defaultChoices(items, "c")).toEqual({ 1: 7, 2: 3 });
  });
});

describe("hasDifferentPrices", () => {
  it("כולל פער מול הקבוצה", () => {
    expect(hasDifferentPrices({ prices: { a: 5, b: 5 } })).toBe(false);
    expect(hasDifferentPrices({ prices: { a: 5, b: 5 }, groupPrice: 6 })).toBe(true);
  });
});

describe("שמות עמודות", () => {
  it("מסיר את שם החברה המשותף", () => {
    const names = ["מפעלי בית עמנואל - מועדון אור", "מפעלי בית עמנואל מועדון תמר"];
    const prefix = commonNamePrefix(names);
    expect(prefix).toBe("מפעלי בית עמנואל ");
    expect(shortName(names[0], prefix)).toBe("מועדון אור");
  });
  it("לא משאיר שם ריק", () => {
    expect(commonNamePrefix(["כלנית", "כלנית לוד"])).toBe("");
  });
});

describe("toPriceListRows", () => {
  it("רק מוצרים עם מחיר חיובי, בצורת קובץ שפוענח", () => {
    const res = toPriceListRows(
      [{ sku: "1", name: "א" }, { sku: "2", name: "ב" }, { sku: "3", name: "ג" }],
      { 1: 5, 2: "", 3: "7.5" },
    );
    expect(res.rows).toEqual([
      { rowNumber: 2, sku: "1", name: "א", price: 5 },
      { rowNumber: 3, sku: "3", name: "ג", price: 7.5 },
    ]);
    expect(res.stats).toMatchObject({ total: 2, minPrice: 5, maxPrice: 7.5, skipped: 0 });
  });
});
