// src/hooks/useCustomerKnownSkus.js
//
// המק"טים שהלקוח מכיר: מה שקנה בעבר (היסטוריית הרכישות מההנהח"ש) יחד עם מה
// שבמחירון שלו. משמש לסינון בורר המוצרים במסמך שמופק לו.
//
// ── למה שני המקורות ──
//
// המחירון לבדו אינו מספיק: רוב הלקוחות בלי מחירון, והבורר היה מציג להם את כל
// הקטלוג (05/10/2026). ההיסטוריה לבדה אינה מספיקה: היא ייצוא חד-פעמי, ומוצר
// שנמכר ללקוח אחריה מגיע רק דרך "לשמור במחירון הלקוח".
//
// מחזיר null — כלומר "בלי סינון, כל הקטלוג" — בכל מצב שבו אין במה לסנן:
// עוד לא נבחר לקוח, ללקוח אין היסטוריה ואין מחירון, או ששתי הבקשות נכשלו.
// סינון הוא נוחות ולא חסימה: כשל כאן לא אמור להשאיר את הטופס בלי מוצרים לבחור.

import { useEffect, useState } from "react";

import CustomerHistoryServices from "@/services/CustomerHistoryServices";
import CustomerPriceListServices from "@/services/CustomerPriceListServices";

// התקרה של השרת (MAX_VIEW_LIMIT). לקוח כבד מחזיק מאות מק"טים, לא אלפים
const HISTORY_LIMIT = 1000;

// המק"ט כפי שנשמר, ולצידו צורתו המספרית: בהיסטוריה הוא נשמר כטקסט מהקובץ
// ("0077"), ובקטלוג אותו מוצר יכול להיות "77". inSkuSet בבורר מנרמל רק את
// הצד של הקטלוג, ולכן הצד הזה מנורמל כאן
const addSku = (set, value) => {
  const sku = String(value ?? "").trim();
  if (!sku) return;
  set.add(sku);
  if (/^\d+$/.test(sku) && Number.isSafeInteger(Number(sku))) set.add(String(Number(sku)));
};

const useCustomerKnownSkus = (customerId) => {
  // נשמר יחד עם הלקוח שעבורו נשאל, כדי שהחלפת לקוח לא תסנן לרגע לפי
  // המוצרים של הלקוח הקודם
  const [state, setState] = useState({ customer: "", skus: null });

  useEffect(() => {
    if (!customerId) return;
    let cancelled = false;

    // allSettled: מקור אחד שנכשל לא מבטל את הסינון לפי השני
    Promise.allSettled([
      CustomerHistoryServices.getCustomerHistory(customerId, { limit: HISTORY_LIMIT }),
      CustomerPriceListServices.getCustomerPriceListSkus(customerId),
    ]).then(([history, priceList]) => {
      if (cancelled) return;

      // היסטוריה ארוכה מהתקרה חוזרת חתוכה. סינון לפי רשימה חלקית היה מסתיר
      // מוצרים שהלקוח כן קנה, בלי שום סימן לכך — עדיף אז לא לסנן בכלל
      const data = history.status === "fulfilled" ? history.value : null;
      if (Number(data?.filtered) > Number(data?.returned)) {
        setState({ customer: customerId, skus: null });
        return;
      }

      const skus = new Set();
      for (const item of data?.items || []) addSku(skus, item?.sku);
      if (priceList.status === "fulfilled" && Array.isArray(priceList.value?.skus)) {
        for (const sku of priceList.value.skus) addSku(skus, sku);
      }

      setState({ customer: customerId, skus: skus.size ? skus : null });
    });

    return () => {
      cancelled = true;
    };
  }, [customerId]);

  return customerId && state.customer === customerId ? state.skus : null;
};

export default useCustomerKnownSkus;
