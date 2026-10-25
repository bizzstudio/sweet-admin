// src/components/order/UnmatchedItemResolver.jsx
//
// "לאיזה מוצר הלקוח התכוון" — הכרעה אנושית שנשמרת.
//
// ── למה המסך הזה קיים ──
//
// לקוח כותב "קולה זירו", ובקטלוג יש ארבעה מוצרים כאלה. מנוע ההתאמה לא יכול
// להכריע ביניהם. כאן הבחירה **נשמרת**: פעם אחת אדם קובע, ומאותו רגע השורה
// נקראת אוטומטית אצל הלקוח הזה ("לכל הלקוחות" הוא סימון מפורש).
//
// ── שורה אחת = שם + בורר ──
//
// בכל שורה: מה שהלקוח כתב, ולצידו בורר שמחפש **בכל הקטלוג** (אותו בורר של
// מסכי החיוב). כשפותחים אותו מוצגים קודם המוצרים שמתאימים לשורה — מה שהלקוח
// קונה ומה שדומה בשם — ומתחתם כל השאר. ההצעה של הקליטה, כשיש, היא כפתור
// בלחיצה אחת, כי ברוב השורות היא נכונה (נמדד 14/10/26). "לא מוצר" לשורה שהיא
// שאלה, כותרת או שם של עובד — גם היא נשמרת, כדי שלא תעצור שוב.
//
// הסיבה הטכנית לכשל אינה מוצגת בשורה: היא ארוכה ואינה עוזרת לבחור. היא
// נשארת ב-title של השם, למי שרוצה לדעת.

import React, { useEffect, useRef, useState } from "react";
import { FiCheck, FiSlash } from "react-icons/fi";

import { notifyError } from "@/utils/toast";
import IncomingOrderServices from "@/services/IncomingOrderServices";
import ProductPicker from "@/components/billing/ProductPicker";

// הזמנות שנקלטו לפני שהקליטה שמרה suggestions מחזיקות את ההצעות רק בתוך
// טקסט הסיבה: ‎...את "סוכר לבן בצנצנת 1 ק"ג" (1613) — צריך לאשר..., ובכמה
// מוצרים שקולים: ‎...לבחור אחד: "A" (1), "B" (2).
// הגרש הפותח הוא האחרון שלפניו רווח, כי בשם עצמו יש גרשיים (ק"ג).
// הזנב שאחרי " · " הוא היסטוריית הלקוח, לא הצעות — ולכן נחתך.
export const suggestionsFromReason = (text) => {
  const reason = String(text || "").split(" · ")[0];
  const out = [];
  let from = 0;
  for (const m of reason.matchAll(/" \(([^()\s]+)\)/g)) {
    const before = reason.slice(from, m.index);
    const open = before.lastIndexOf(' "');
    const title = open < 0 ? "" : before.slice(open + 2).trim();
    if (title) out.push({ sku: m[1], title });
    from = m.index + m[0].length;
  }
  return out;
};

const suggestionsOf = (item) =>
  item.suggestions?.length ? item.suggestions : suggestionsFromReason(item.failReason);

const monthsAgo = (date) => {
  if (!date) return "";
  const months = Math.floor((Date.now() - new Date(date).getTime()) / (30.44 * 24 * 3600 * 1000));
  return months <= 0 ? "החודש" : months === 1 ? "לפני חודש" : `לפני ${months} חודשים`;
};

// מה שמוצג ראשון בבורר: מה שהלקוח קונה, ואחריו מה שדומה בשם.
// מלאי ומצב פרסום מסומנים כאן: בחירת מוצר שאזל או שמוסתר תיכשל שוב
// בבנייה מחדש, והעובד היה מגלה זאת רק אז.
const toPreferred = (res) => {
  const seen = new Set();
  const out = [];
  const add = (p, bought) => {
    if (!p?.sku || seen.has(String(p.sku))) return;
    seen.add(String(p.sku));
    const flags = [
      p.stock !== null && p.stock !== undefined && p.stock <= 0 ? "אזל" : "",
      p.hidden ? "מוסתר" : "",
    ];
    out.push({ sku: String(p.sku), meta: [bought, ...flags].filter(Boolean).join(" · ") });
  };
  (res?.history || []).forEach((p) =>
    add(p, `קנה ${p.timesBought} פעמים${p.lastBoughtAt ? `, ${monthsAgo(p.lastBoughtAt)}` : ""}`)
  );
  (res?.candidates || []).forEach((p) => add(p, ""));
  return out;
};

const UnmatchedItemResolver = ({ orderId, items = [], onProgress }) => {
  const [saving, setSaving] = useState(null);
  // index → { title } או { ignored: true }
  const [resolved, setResolved] = useState({});
  // index → המוצרים שמוצגים ראשונים בבורר; נטען בפתיחה הראשונה של הבורר
  const [preferred, setPreferred] = useState({});
  const [applyToAll, setApplyToAll] = useState(false);
  // ההעדפות וההכרעות נשמרות לפי מספר שורה, ותשובה שמגיעה אחרי מעבר להזמנה
  // אחרת הייתה נוחתת על השורה באותו מספר בהזמנה החדשה
  const shownOrderId = useRef(orderId);
  shownOrderId.current = orderId;

  // הזמנה אחרת — מצב חדש. React Router משאיר את הקומפוננט חי בין הזמנות.
  useEffect(() => {
    setResolved({});
    setPreferred({});
    setApplyToAll(false);
  }, [orderId]);

  const doneCount = Object.keys(resolved).length;
  useEffect(() => {
    if (onProgress) onProgress(doneCount, items.length);
  }, [doneCount, items.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!items.length) return null;

  const loadPreferred = (index, rawName) => {
    if (preferred[index]) return;
    setPreferred((prev) => ({ ...prev, [index]: [] }));
    const forOrder = orderId;
    IncomingOrderServices.getItemCandidates(orderId, rawName)
      .then((res) => {
        if (shownOrderId.current === forOrder) {
          setPreferred((prev) => ({ ...prev, [index]: toPreferred(res) }));
        }
      })
      // ההעדפה היא תוספת — בלעדיה הבורר עדיין מחפש בכל הקטלוג
      .catch(() => {});
  };

  const save = async (index, rawName, body, result) => {
    setSaving(index);
    const forOrder = orderId;
    try {
      await IncomingOrderServices.resolveItem(orderId, {
        rawName,
        scope: applyToAll ? "global" : "customer",
        ...body,
      });
      if (shownOrderId.current === forOrder) {
        setResolved((prev) => ({ ...prev, [index]: result }));
      }
    } catch (e) {
      notifyError(e?.response?.data?.message || e.message);
    } finally {
      setSaving(null);
    }
  };

  // הצעה מהקליטה מגיעה עם productId; בחירה מהבורר או הצעה מטקסט הסיבה — עם מק"ט
  const pick = (index, rawName, product) =>
    save(
      index,
      rawName,
      product.productId ? { productId: product.productId } : { sku: product.sku },
      { title: product.title || product.name }
    );
  const ignore = (index, rawName) => save(index, rawName, { ignore: true }, { ignored: true });
  const reopen = (index) =>
    setResolved((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });

  return (
    <div>
      <ul className="divide-y divide-gray-100 dark:divide-gray-700 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        {items.map((item, index) => {
          const rawName = item.rawName;
          const done = resolved[index];
          const busy = saving !== null;

          return (
            <li key={index} className="p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex items-center gap-2 min-w-0 sm:w-2/5">
                <span
                  className={`flex-shrink-0 rounded-md px-2 py-0.5 text-sm font-bold ${
                    done
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-800/50 dark:text-emerald-200"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100"
                  }`}
                >
                  {item.quantity ?? 1}
                  {item.unit ? ` ${item.unit}` : "×"}
                </span>
                <span
                  className="text-base font-medium text-gray-900 dark:text-gray-100 break-words"
                  title={item.failReason || undefined}
                >
                  {rawName}
                </span>
              </div>

              <div className="flex-grow min-w-0">
                {done ? (
                  <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                    {done.ignored ? <FiSlash className="w-4 h-4" /> : <FiCheck className="w-4 h-4" />}
                    <span className="font-medium">{done.ignored ? "לא מוצר" : done.title}</span>
                    <button
                      type="button"
                      onClick={() => reopen(index)}
                      className="text-xs text-gray-500 underline hover:text-gray-700 dark:text-gray-400"
                    >
                      שינוי
                    </button>
                  </div>
                ) : (
                  <>
                    <ProductPicker
                      value=""
                      onChange={(sku, product) => sku && pick(index, rawName, product)}
                      onMenuOpen={() => loadPreferred(index, rawName)}
                      preferred={preferred[index]}
                      preferredLabel="מתאימים לשורה"
                      placeholder="חיפוש מוצר בקטלוג..."
                      disabled={busy}
                    />
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      {suggestionsOf(item).map((product) => (
                        <button
                          key={product.productId || product.sku}
                          type="button"
                          onClick={() => pick(index, rawName, product)}
                          disabled={busy}
                          className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-sm text-emerald-800 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-50 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200"
                        >
                          <FiCheck className="w-3.5 h-3.5" />
                          {product.title}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => ignore(index, rawName)}
                        disabled={busy}
                        title="שאלה, כותרת או שם — השורה תעבור להערת ההזמנה"
                        className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-700"
                      >
                        <FiSlash className="w-3.5 h-3.5" />
                        לא מוצר
                      </button>
                      {saving === index && <span className="text-xs text-gray-500">שומר...</span>}
                    </div>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <label className="mt-2 inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
        <input type="checkbox" checked={applyToAll} onChange={(e) => setApplyToAll(e.target.checked)} />
        לזכור את הבחירות לכל הלקוחות, לא רק ללקוח הזה
      </label>
    </div>
  );
};

export default UnmatchedItemResolver;
