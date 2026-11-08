// src/utils/priceListComparison.js
// הכללים של מסך "השוואת מחירונים": איזה מחיר נבחר לכל מוצר כשבונים מחירון
// קבוצתי מהמחירונים הפרטיים של כמה סניפים.
//
// סדר הבחירה לכל מוצר:
//   1. המקור שנבחר במסך (סניף מסוים, או המחירון הקבוצתי הנוכחי) — אם יש בו
//      מחיר למוצר.
//   2. המחיר שכבר במחירון הקבוצתי, אם עורכים קבוצה קיימת.
//   3. המחיר שרוב הסניפים משלמים; בתיקו — הגבוה מביניהם.
// כך כל מוצר שיש לאחד הסניפים מקבל מחיר, ושינוי מחיר שלו בתעודה יעבור לכל
// הקבוצה (רק מוצר שבמחירון הקבוצתי עובר לכולם).

export const SOURCE_MAJORITY = "majority";
export const SOURCE_GROUP = "group";

/** המחיר שרוב הסניפים משלמים; בתיקו — הגבוה. null כשאין מחירים */
export const majorityPrice = (prices) => {
  const counts = new Map();
  Object.values(prices || {}).forEach((price) => {
    if (price > 0) counts.set(price, (counts.get(price) || 0) + 1);
  });
  let best = null;
  let bestCount = 0;
  counts.forEach((count, price) => {
    if (count > bestCount || (count === bestCount && price > best)) {
      best = price;
      bestCount = count;
    }
  });
  return best;
};

/** האם יש למוצר יותר ממחיר אחד בין הסניפים (או מול הקבוצה) */
export const hasDifferentPrices = (item) => {
  const set = new Set(Object.values(item.prices || {}).filter((p) => p > 0));
  if (item.groupPrice > 0) set.add(item.groupPrice);
  return set.size > 1;
};

/** המחיר שנבחר למוצר לפי המקור, עם הנפילות שבראש הקובץ */
export const defaultPrice = (item, source) => {
  if (source === SOURCE_GROUP) {
    if (item.groupPrice > 0) return item.groupPrice;
  } else if (source && source !== SOURCE_MAJORITY) {
    const own = item.prices?.[source];
    if (own > 0) return own;
  }
  if (item.groupPrice > 0) return item.groupPrice;
  return majorityPrice(item.prices);
};

/** מפת מק"ט → מחיר שנבחר, לכל המוצרים */
export const defaultChoices = (items, source) => {
  const choices = {};
  (items || []).forEach((item) => {
    const price = defaultPrice(item, source);
    if (price > 0) choices[item.sku] = price;
  });
  return choices;
};

/**
 * החלק המשותף לתחילת כל השמות ("מפעלי בית עמנואל - "), כדי שכותרות העמודות
 * יציגו רק את שם הסניף. נחתך על גבול מילה, ולא נחתך כשנשאר שם ריק.
 */
export const commonNamePrefix = (names) => {
  const list = (names || []).filter(Boolean);
  if (list.length < 2) return "";
  let prefix = list[0];
  list.slice(1).forEach((name) => {
    let i = 0;
    while (i < prefix.length && i < name.length && prefix[i] === name[i]) i += 1;
    prefix = prefix.slice(0, i);
  });
  const cut = prefix.lastIndexOf(" ");
  prefix = cut >= 0 ? prefix.slice(0, cut + 1) : "";
  return list.some((name) => !name.slice(prefix.length).replace(/[\s\-–()]/g, ""))
    ? ""
    : prefix;
};

export const shortName = (name, prefix) =>
  (prefix ? name.slice(prefix.length) : name).replace(/^[\s\-–]+/, "").trim() || name;

/**
 * השורות לשמירה כמחירון קבוצתי — באותה צורה כמו קובץ אקסל שפוענח, כדי
 * שהשמירה תעבור באותו מסלול בדיוק (בדיקה מול הקטלוג ואז יצירה/עדכון).
 */
export const toPriceListRows = (items, choices) => {
  const rows = [];
  (items || []).forEach((item) => {
    const price = Number(choices?.[item.sku]);
    if (!(price > 0)) return;
    rows.push({ rowNumber: rows.length + 2, sku: item.sku, name: item.name || "", price });
  });
  const prices = rows.map((row) => row.price);
  return {
    fileName: "השוואת מחירונים",
    hasNameColumn: true,
    rows,
    invalidRows: [],
    duplicateSkus: [],
    stats: {
      total: rows.length,
      minPrice: prices.length ? Math.min(...prices) : null,
      maxPrice: prices.length ? Math.max(...prices) : null,
      skipped: 0,
      skippedReasons: [],
    },
  };
};
