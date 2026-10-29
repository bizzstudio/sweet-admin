// src/components/billing/quotePriceList.js
//
// כתיבת מחירי הצעה למחירון הלקוח. משותף לרשימת ההצעות ולעמוד ההצעה, כדי
// שהפקת תעודה מכל אחד מהם תשמור את אותם מחירים.

import BillingServices from "@/services/BillingServices";
import CustomerPriceListServices from "@/services/CustomerPriceListServices";
import { notifyError, notifySuccess } from "@/utils/toast";
import { isPriceListSource } from "@/components/billing/ExpectedPrice";

// השרת מכריע לכל מוצר אם זה המחירון הקבוצתי או הפרטי (applyToGroup).
// כישלון כאן אינו מבטל את המסמך שכבר נשמר — רק אומר במפורש שהמחירון לא
// עודכן
//
// במנות: הצעה מגיעה עד 500 שורות, והשרת מקבל עד 200 מחירים בבקשה
// (MAX_UPSERT_ITEMS). מאז שגם מחירי קטלוג נכתבים, הצעה גדולה עוברת את זה
const UPSERT_CHUNK = 200;

export const savePricesToPriceList = async (customer, items, done) => {
  if (!items.length || !customer) return;
  try {
    let res;
    for (let i = 0; i < items.length; i += UPSERT_CHUNK) {
      res = await CustomerPriceListServices.upsertItems(customer, {
        items: items.slice(i, i + UPSERT_CHUNK),
        applyToGroup: true,
      });
    }
    notifySuccess(items.length > UPSERT_CHUNK ? `${items.length} מחירים נשמרו במחירון` : res.message);
  } catch (err) {
    notifyError(`${done}, אבל המחיר לא נשמר במחירון: ${err?.response?.data?.message || err.message}`);
  }
};

/**
 * בהפקת תעודה מהצעה: מחיר מההצעה של מוצר שעדיין אינו במחירון נכתב אליו,
 * כדי שהמוצר יופיע אצל הלקוח בתעודה הבאה. זה מכסה הצעות שנשמרו לפני
 * שההצעה התחילה לכתוב למחירון — ומאז 29/10/2026 גם מחיר קטלוג שהתקבל
 * בהצעה כמו שהוא, לא רק מחיר שהוקלד.
 *
 * מוצר שכבר יש לו מחיר במחירון אינו נדרס: ייתכן שהמחיר שם שונה ביד אחרי
 * ההצעה, והצעה ישנה לא אמורה להחזיר אותו לאחור בשקט.
 */
export const saveQuotePricesOnConvert = async (quote) => {
  const customer = String(quote.customer?._id || quote.customer || "");
  const offList = (quote.items || []).filter(
    (i) => !isPriceListSource(i.priceSource) && Number(i.unitPrice) > 0
  );
  if (!customer || !offList.length) return;
  try {
    const current = await BillingServices.priceItems({
      customer,
      items: offList.map((i) => ({ sku: String(i.sku), quantity: 1 })),
    });
    const inList = new Set(
      (current?.items || []).filter((i) => isPriceListSource(i.source)).map((i) => String(i.sku))
    );
    // אותו מוצר בשתי שורות נכתב פעם אחת — השורה האחרונה קובעת
    const bySku = new Map(
      offList
        .filter((i) => !inList.has(String(i.sku)))
        .map((i) => [String(i.sku), Number(i.unitPrice)])
    );
    const items = [...bySku].map(([sku, price]) => ({ sku, price }));
    await savePricesToPriceList(customer, items, "התעודה הופקה");
  } catch (err) {
    notifyError(`התעודה הופקה, אבל המחיר לא נשמר במחירון: ${err?.response?.data?.message || err.message}`);
  }
};
