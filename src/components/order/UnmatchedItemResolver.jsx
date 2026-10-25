// src/components/order/UnmatchedItemResolver.jsx
//
// "לאיזה מוצר הלקוח התכוון" — הכרעה אנושית שנשמרת.
//
// ── למה המסך הזה קיים ──
//
// לקוח כותב "קולה זירו", ובקטלוג יש ארבעה מוצרים כאלה. מנוע ההתאמה לא יכול
// להכריע ביניהם. כאן הבחירה **נשמרת**: פעם אחת אדם קובע, ומאותו רגע השורה
// נקראת אוטומטית אצל הלקוח הזה.
//
// ── כל שורה היא שאלה אחת ──
//
// מי שעובד על המסך אינו טכנולוגי, ולכן כל שורה מנוסחת כשאלה עם תשובה ברורה:
// "הלקוח כתב X — האם הכוונה ל-Y?" ולצידה "כן, זה המוצר". ברוב השורות ההצעה
// של הקליטה נכונה (נמדד 14/10/26), כך שרוב העבודה היא לחיצה אחת לשורה.
// החיפוש בכל הקטלוג נפתח רק כשעונים "לא" (או כשאין הצעה בכלל), ו"זו לא
// שורת מוצר" לשורה שהיא שאלה, כותרת או שם של עובד — גם היא נשמרת.
//
// הסיבה הטכנית לכשל אינה מוצגת: היא ארוכה ואינה עוזרת לבחור. היא נשארת
// ב-title של השם, למי שרוצה לדעת.

import React, { useEffect, useRef, useState } from "react";
import { FiCheck, FiSearch, FiSlash, FiX } from "react-icons/fi";

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

// ── בטלפון: הרשימה בתוך הדף, והתיבה עולה לראש המסך ──
//
// המקלדת מכסה את חצי המסך התחתון, ורשימה צפה שנפתחת מתחת לתיבה נשארת
// מתחתיה. בטלפון הרשימה נפתחת בתוך הדף (ולכן מאריכה אותו), והתיבה נגללת
// לראש המסך — כך שהרשימה כולה נשארת מעל המקלדת.
const isPhone = () => typeof window !== "undefined" && window.innerWidth < 640;

// המקלדת נפתחת אחרי הפתיחה ומקטינה את המסך, ולכן גוללים שוב בכל שינוי גודל
// בשנייה וחצי הראשונות — זה הזמן שלוקח לה להיפתח.
const scrollSearchUp = () => {
  if (!isPhone()) return;
  const box = document.activeElement?.closest?.("[data-item-search]");
  if (!box) return;
  const scroll = () => box.scrollIntoView({ block: "start" });
  const target = window.visualViewport || window;
  target.addEventListener("resize", scroll);
  setTimeout(() => target.removeEventListener("resize", scroll), 1500);
  // אחרי שהרשימה רונדרה, אחרת אין עדיין מקום לגלול
  setTimeout(scroll, 50);
};

const UnmatchedItemResolver = ({ orderId, items = [], onProgress }) => {
  const [saving, setSaving] = useState(null);
  // index → { title } או { ignored: true }
  const [resolved, setResolved] = useState({});
  // index → המוצרים שמוצגים ראשונים בבורר; נטען בפתיחה הראשונה של הבורר
  const [preferred, setPreferred] = useState({});
  // השורה שבה פתוח החיפוש ("לא, מוצר אחר"). אחת בכל רגע.
  const [searching, setSearching] = useState(null);
  // ההעדפות וההכרעות נשמרות לפי מספר שורה, ותשובה שמגיעה אחרי מעבר להזמנה
  // אחרת הייתה נוחתת על השורה באותו מספר בהזמנה החדשה
  const shownOrderId = useRef(orderId);
  shownOrderId.current = orderId;

  // הזמנה אחרת — מצב חדש. React Router משאיר את הקומפוננט חי בין הזמנות.
  useEffect(() => {
    setResolved({});
    setPreferred({});
    setSearching(null);
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
      await IncomingOrderServices.resolveItem(orderId, { rawName, scope: "customer", ...body });
      if (shownOrderId.current === forOrder) {
        setResolved((prev) => ({ ...prev, [index]: result }));
        setSearching((current) => (current === index ? null : current));
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
    <ol className="flex flex-col gap-3 max-w-3xl">
      {items.map((item, index) => {
        const rawName = item.rawName;
        const done = resolved[index];
        const busy = saving !== null;
        const suggestions = suggestionsOf(item);
        // בלי הצעה אין על מה לשאול "האם" — החיפוש פתוח מההתחלה
        const showSearch = searching === index || !suggestions.length;

        return (
          <li
            key={index}
            className={`rounded-2xl border bg-white dark:bg-gray-800 p-4 sm:p-5 ${
              done ? "border-emerald-200 dark:border-emerald-800" : "border-gray-200 dark:border-gray-700 shadow-sm"
            }`}
          >
            {/* מה הלקוח כתב */}
            <div className="flex items-start gap-3">
              <span
                className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                  done
                    ? "bg-emerald-500 text-white"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-200"
                }`}
              >
                {done ? <FiCheck className="w-4 h-4" /> : index + 1}
              </span>
              <div className="min-w-0 flex-grow">
                <div className="text-sm text-gray-500 dark:text-gray-400">הלקוח כתב</div>
                <div
                  className="text-lg font-semibold text-gray-900 dark:text-gray-100 break-words"
                  title={item.failReason || undefined}
                >
                  {rawName}
                  <span className="mr-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                    · כמות {item.quantity ?? 1}
                    {item.unit ? ` ${item.unit}` : ""}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 sm:mr-10">
              {done ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 px-4 py-3">
                  <span className="text-emerald-800 dark:text-emerald-200">
                    {done.ignored ? (
                      "סומן שזו לא שורת מוצר"
                    ) : (
                      <>
                        נבחר: <span className="font-semibold">{done.title}</span>
                      </>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => reopen(index)}
                    className="text-sm text-gray-600 underline hover:text-gray-900 dark:text-gray-300"
                  >
                    לשנות
                  </button>
                </div>
              ) : showSearch ? (
                <div data-item-search className="scroll-mt-3">
                  <div className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-200">
                    חפשו את המוצר הנכון:
                  </div>
                  <ProductPicker
                    value=""
                    onChange={(sku, product) => sku && pick(index, rawName, product)}
                    onMenuOpen={() => {
                      loadPreferred(index, rawName);
                      scrollSearchUp();
                    }}
                    inlineMenu={isPhone()}
                    preferred={preferred[index]}
                    preferredLabel="מתאימים לשורה"
                    placeholder="הקלידו שם מוצר, ברקוד או מק״ט..."
                    disabled={busy}
                    // נפתח מלחיצה על "לא, מוצר אחר" — ממשיכים ישר להקלדה
                    autoFocus={searching === index}
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    {suggestions.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSearching(null)}
                        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300"
                      >
                        <FiX className="w-4 h-4" />
                        חזרה להצעה
                      </button>
                    )}
                    <IgnoreButton onClick={() => ignore(index, rawName)} disabled={busy} />
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                    {suggestions.length > 1 ? "לאיזה מוצר הכוונה?" : "האם הכוונה למוצר הזה?"}
                  </div>
                  <div className="flex flex-col gap-2">
                    {suggestions.map((product) => (
                      <div
                        key={product.productId || product.sku}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/40 px-4 py-3"
                      >
                        <span className="text-base font-medium text-gray-900 dark:text-gray-100">
                          {product.title}
                        </span>
                        <button
                          type="button"
                          onClick={() => pick(index, rawName, product)}
                          disabled={busy}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-50"
                        >
                          <FiCheck className="w-4 h-4" />
                          {saving === index ? "שומר..." : suggestions.length > 1 ? "זה המוצר" : "כן, זה המוצר"}
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSearching(index)}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                    >
                      <FiSearch className="w-4 h-4" />
                      לא, לבחור מוצר אחר
                    </button>
                    <IgnoreButton onClick={() => ignore(index, rawName)} disabled={busy} />
                  </div>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
};

const IgnoreButton = ({ onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title="למשל שאלה, כותרת או שם — השורה תעבור להערת ההזמנה"
    className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 disabled:opacity-50 dark:text-gray-400 dark:hover:text-gray-200"
  >
    <FiSlash className="w-4 h-4" />
    זו לא שורת מוצר
  </button>
);

export default UnmatchedItemResolver;
