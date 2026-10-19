// src/components/billing/ExpectedPrice.jsx
//
// המחיר שיחול על שורה במסמך ללקוח הנבחר, מוצג מתחת לשדה המחיר עוד לפני
// "חשב מחירים". משותף לתעודת המשלוח/החשבונית ולהצעת המחיר.
//
// שדה מחיר ריק פירושו "המחיר מהמחירון", אבל שדה ריק נראה בדיוק כמו "אין
// מחיר שמור": מי ששמרה מחיר במחירון הלקוח ופתחה תעודה נוספת לאותו
// לקוח ראתה שדה ריק והקלידה הכל מחדש (05/10/2026). לכן המחיר שיחול מוצג
// מתחת לשדה ברגע שנבחר מוצר. השדה עצמו נשאר ריק בכוונה — מחיר שמולא
// אוטומטית היה נשלח כמחיר ידני ומציע לשמור למחירון את מה שכבר נמצא בו.
//
// בהצעת המחיר המחיר הוצג רק אחרי "חשב מחירים", והלקוחה שאלה (19/10/2026)
// למה ההצעה לא לוקחת את המחיר של הלקוח — הוא נלקח, רק לא נראה.

import React, { useEffect, useMemo, useState } from "react";

import BillingServices from "@/services/BillingServices";

const SOURCE_LABELS = {
  groupPriceList: { text: "מחירון קבוצתי", cls: "text-green-600" },
  customerPriceList: { text: "מחירון הלקוח", cls: "text-green-600" },
  catalog: { text: "מחיר קטלוג", cls: "text-yellow-600" },
  missing: { text: "אין מחיר!", cls: "text-red-600 font-semibold" },
};

// הנוסח הקצר של מקור המחיר, לרמז שמתחת לשדה המחיר
const EXPECTED_SOURCE_TEXT = {
  groupPriceList: "מחירון קבוצתי",
  customerPriceList: "מחירון הלקוח",
  catalog: "קטלוג",
};

// מחיר שסוכם עם הלקוח (פרטי או קבוצתי), להבדיל ממחיר קטלוג
export const isPriceListSource = (source) =>
  source === "customerPriceList" || source === "groupPriceList";

const shekel = (n) =>
  Number(n || 0).toLocaleString("he-IL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// מק"ט הוא טקסט חופשי מהקטלוג, ולכן הבדיקה היא על שדות האובייקט עצמו:
// "sku in obj" היה מוצא גם שמות כמו "constructor" שכל אובייקט נושא
const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

/**
 * המחיר הצפוי לכל מק"ט שבשורות, ללקוח הנבחר. מחזיר:
 *   expectedFor(sku)          — { unitPrice, source } או null כשעוד לא ידוע
 *   remember(customer, bySku) — עדכון מחירים שנשמרו עכשיו במחירון, בלי בקשה
 *
 * הבקשה נשלחת רק למק"טים שעוד לא תומחרו, והתוצאה נשמרת יחד עם הלקוח
 * שעבורו נשאלה, כדי שהחלפת לקוח לא תציג לרגע את המחירים של הלקוח הקודם.
 */
export const useExpectedPrices = (customerId, rows) => {
  const [expected, setExpected] = useState({ customer: "", bySku: {} });

  const skuKey = useMemo(
    () => [...new Set(rows.map((r) => r.sku?.trim()).filter(Boolean))].sort().join("\n"),
    [rows]
  );

  useEffect(() => {
    if (!customerId || !skuKey) return;
    const known = expected.customer === customerId ? expected.bySku : {};
    const missing = skuKey.split("\n").filter((sku) => !hasOwn(known, sku));
    if (!missing.length) return;

    let cancelled = false;
    // הכמות אינה משנה את מחיר היחידה; 1 רק כדי שהבקשה תהיה תקינה
    BillingServices.priceItems({
      customer: customerId,
      items: missing.map((sku) => ({ sku, quantity: 1 })),
    })
      .then((res) => {
        if (cancelled) return;
        const found = {};
        for (const item of res?.items || []) {
          found[String(item.sku)] = { unitPrice: item.unitPrice, source: item.source };
        }
        setExpected((prev) => ({
          customer: customerId,
          bySku: { ...(prev.customer === customerId ? prev.bySku : {}), ...found },
        }));
      })
      // זו תצוגת עזר בלבד: כשל כאן לא חוסם דבר, והשרת מתמחר בהפקה ממילא
      .catch(() => {});

    return () => {
      cancelled = true;
    };
    // expected נקרא רק כדי לדלג על מה שכבר ידוע, ואסור שיפעיל את הבקשה מחדש
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, skuKey]);

  const expectedFor = (sku) => {
    const key = sku?.trim();
    return key && expected.customer === customerId && hasOwn(expected.bySku, key)
      ? expected.bySku[key]
      : null;
  };

  const remember = (customer, bySku) =>
    setExpected((prev) =>
      prev.customer === customer ? { ...prev, bySku: { ...prev.bySku, ...bySku } } : prev
    );

  return { expectedFor, remember };
};

/**
 * שדה ריק — המחיר שייכנס למסמך ומאיפה הוא מגיע. מחיר שהוקלד — רק תזכורת
 * למה שכתוב במחירון הלקוח, כדי שיהיה ברור שהמחיר הידני מחליף אותו.
 *
 * savesTyped — המסמך שומר מחיר שהוקלד במחירון (תעודה/חשבונית). בהצעת מחיר
 * מחיר ידני נשאר בהצעה בלבד, ואסור להבטיח שהוא יישמר.
 */
const ExpectedPrice = ({ known, typed, savesTyped = true }) => {
  if (!known) return null;

  // שורה אחת, בלי שבירה: העמודה צרה (רוחב שדה המחיר), ורמז שנשבר לשתי
  // שורות היה מגביה רק חלק מהשורות בטופס
  const base = "mt-1 whitespace-nowrap text-xs leading-tight";

  // מחיר שהוקלד נשמר במחירון עם ההפקה, בלי כפתור. הלקוחה שאלה (19/10/2026)
  // איפה שומרים אותו, ולכן זה נאמר ליד השדה עצמו ולא רק בהערה שבתחתית
  if (typed !== undefined && typed !== null && typed !== "") {
    if (!(Number(typed) > 0)) return null;
    if (!isPriceListSource(known.source)) {
      return savesTyped ? <p className={`${base} text-green-600`}>יישמר במחירון</p> : null;
    }
    return Number(typed) !== known.unitPrice ? (
      <p className={`${base} text-gray-500`}>
        במחירון: {shekel(known.unitPrice)} ₪{savesTyped ? " · יתעדכן" : ""}
      </p>
    ) : null;
  }

  const label = SOURCE_LABELS[known.source] || SOURCE_LABELS.catalog;
  return (
    <p className={`${base} ${label.cls}`}>
      {known.source === "missing"
        ? label.text
        : `${shekel(known.unitPrice)} ₪ · ${EXPECTED_SOURCE_TEXT[known.source] || EXPECTED_SOURCE_TEXT.catalog}`}
    </p>
  );
};

export default ExpectedPrice;
