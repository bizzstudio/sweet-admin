// src/components/order/UnmatchedItemResolver.jsx
//
// "לאיזה מוצר הלקוח התכוון" — הכרעה אנושית שנשמרת.
//
// ── למה המסך הזה קיים ──
//
// לקוח כותב "קולה זירו", ובקטלוג יש ארבעה מוצרים כאלה. מנוע ההתאמה לא יכול
// להכריע ביניהם. כאן הבחירה **נשמרת**: פעם אחת אדם קובע, ומאותו רגע השורה
// נקראת אוטומטית אצל הלקוח הזה — ובלחיצה נוספת ("לשמור גם לכל הלקוחות") אצל כולם.
//
// ── כל שורה היא שאלה אחת ──
//
// מי שעובד על המסך אינו טכנולוגי, ולכן כל שורה מנוסחת כשאלה עם תשובה ברורה:
// "הלקוח כתב X — האם הכוונה ל-Y?" ולצידה "כן, זה המוצר". ברוב השורות ההצעה
// של הקליטה נכונה (נמדד 14/10/26), כך שרוב העבודה היא לחיצה אחת לשורה.
// החיפוש בכל הקטלוג נפתח רק ב"לבחור מוצר" (או כשאין הצעה בכלל), ו"זו לא
// שורת מוצר" לשורה שהיא שאלה, כותרת או שם של עובד — גם היא נשמרת.
//
// הסיבה הטכנית לכשל אינה מוצגת: היא ארוכה ואינה עוזרת לבחור. היא נשארת
// ב-title של השם, למי שרוצה לדעת.
//
// ── שורה אחת, כמה מוצרים ──
//
// "חד פעמי סכו"ם וצלחות" אינו מוצר אחד אלא מזלגות, סכינים, כפות וצלחות בשני
// גדלים. "כמה מוצרים לשורה הזו" פותח רשימה (AliasProductsEditor), וכל המוצרים
// נשמרים כהכרעה אחת: מהפעם הבאה השורה נפרשת אליהם לבד. לשורה שכבר נשמרה כך
// הרשימה נפתחת על המוצרים השמורים, ולא מדף ריק.

import React, { useEffect, useRef, useState } from "react";
import { FiCheck, FiLayers, FiSearch, FiSlash, FiUsers, FiX } from "react-icons/fi";

import { notifyError } from "@/utils/toast";
import IncomingOrderServices from "@/services/IncomingOrderServices";
import ProductPicker from "@/components/billing/ProductPicker";
import AliasProductsEditor, {
  describeRows,
  toAliasProducts,
  toEditorRows,
} from "@/components/order/AliasProductsEditor";

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
  // השורה שבה פתוח החיפוש ("לבחור מוצר"). אחת בכל רגע.
  const [searching, setSearching] = useState(null);
  // שורות שהבחירה בהן הורחבה לכל הלקוחות. נשמר גם אחרי "לשנות": בחירה חדשה
  // בשורה כזו חייבת להחליף גם את ההכרעה הגורפת, אחרת היא נשארת על הישנה.
  const [globalRows, setGlobalRows] = useState({});
  // index → רשימת המוצרים במצב "כמה מוצרים". קיום המפתח = המצב פתוח בשורה.
  const [multiRows, setMultiRows] = useState({});
  // index → המוצרים של הכרעה שכבר נשמרה לשורה (כשיש יותר מאחד) — נטען יחד
  // עם ההעדפות, כדי לפתוח את "כמה מוצרים" על מה שכבר נשמר
  const [savedMulti, setSavedMulti] = useState({});
  // ההעדפות וההכרעות נשמרות לפי מספר שורה, ותשובה שמגיעה אחרי מעבר להזמנה
  // אחרת הייתה נוחתת על השורה באותו מספר בהזמנה החדשה
  const shownOrderId = useRef(orderId);
  shownOrderId.current = orderId;

  // הזמנה אחרת — מצב חדש. React Router משאיר את הקומפוננט חי בין הזמנות.
  useEffect(() => {
    setResolved({});
    setPreferred({});
    setSearching(null);
    setGlobalRows({});
    setMultiRows({});
    setSavedMulti({});
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
          const saved = res?.currentAlias?.products || [];
          if (saved.length > 1) {
            setSavedMulti((prev) => ({ ...prev, [index]: saved }));
            // הרשימה כבר פתוחה וריקה — ממלאים אותה במה שנשמר. רשימה שהעובד
            // כבר התחיל למלא אינה נדרסת.
            const quantity = items[index]?.quantity ?? 1;
            setMultiRows((prev) =>
              prev[index] && !prev[index].length
                ? { ...prev, [index]: toEditorRows(saved, quantity) }
                : prev
            );
          }
        }
      })
      // ההעדפה היא תוספת — בלעדיה הבורר עדיין מחפש בכל הקטלוג
      .catch(() => {});
  };

  // ── ללקוח הזה, ובלחיצה נוספת לכל הלקוחות ──
  //
  // ברירת המחדל היא הלקוח הזה, כי "קולה זירו" אצל לקוח אחד הוא מארז ואצל
  // אחר בקבוק. ההרחבה לכל הלקוחות היא כפתור נפרד בשורה שכבר נבחרה — ולא
  // סימון כללי מראש, שנדבק בלי לשים לב לשורות הבאות.
  const save = async (index, rawName, body, result, global = Boolean(globalRows[index])) => {
    setSaving(index);
    const forOrder = orderId;
    try {
      // הכרעה של הלקוח גוברת בשרת על הכרעה גורפת. לכן גם שמירה לכולם מעדכנת
      // קודם את זו של הלקוח — אחרת אחרי "לשנות" הוא היה נשאר על הבחירה הישנה.
      await IncomingOrderServices.resolveItem(orderId, { rawName, scope: "customer", ...body });
      if (global) {
        await IncomingOrderServices.resolveItem(orderId, { rawName, scope: "global", ...body });
      }
      if (shownOrderId.current === forOrder) {
        setResolved((prev) => ({ ...prev, [index]: { ...result, body } }));
        setSearching((current) => (current === index ? null : current));
        closeMulti(index);
        if (global) setGlobalRows((prev) => ({ ...prev, [index]: true }));
      }
      return true;
    } catch (e) {
      notifyError(e?.response?.data?.message || e.message);
      return false;
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
  const saveForAll = (index, rawName) => {
    const done = resolved[index];
    if (done) save(index, rawName, done.body, done, true);
  };
  // ── "כמה מוצרים לשורה הזו" ──
  const openMulti = (index, rawName) => {
    const quantity = items[index]?.quantity ?? 1;
    setMultiRows((prev) => ({
      ...prev,
      [index]: savedMulti[index] ? toEditorRows(savedMulti[index], quantity) : [],
    }));
    setSearching((current) => (current === index ? null : current));
    loadPreferred(index, rawName);
  };
  const closeMulti = (index) =>
    setMultiRows((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  const saveMulti = async (index, rawName) => {
    const rows = multiRows[index] || [];
    if (!rows.length) return;
    const quantity = items[index]?.quantity ?? 1;
    const ok = await save(
      index,
      rawName,
      { products: toAliasProducts(rows, quantity) },
      { title: describeRows(rows), count: rows.length }
    );
    // "לשנות" ואחריו "כמה מוצרים" נפתח על מה שנשמר עכשיו, לא על דף ריק
    if (ok) setSavedMulti((prev) => ({ ...prev, [index]: rows }));
  };

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
        const multi = multiRows[index];

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
              {/* שורה שכבר הורחבה לכולם ונפתחה מחדש: הבחירה הבאה תחול על כולם,
                  ואומרים את זה לפני שבוחרים ולא אחרי */}
              {!done && globalRows[index] && (
                <div className="mb-3 flex items-center gap-1.5 text-sm text-amber-800 dark:text-amber-300">
                  <FiUsers className="w-4 h-4 flex-shrink-0" />
                  הבחירה בשורה הזו שמורה לכל הלקוחות — בחירה חדשה תחליף אותה אצל כולם
                </div>
              )}
              {done ? (
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/30 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-emerald-800 dark:text-emerald-200">
                      {done.ignored ? (
                        "סומן שזו לא שורת מוצר"
                      ) : done.count > 1 ? (
                        <>
                          {`נבחרו ${done.count} מוצרים: `}
                          <span className="font-semibold">{done.title}</span>
                        </>
                      ) : (
                        <>
                          נבחר: <span className="font-semibold">{done.title}</span>
                        </>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => reopen(index)}
                      disabled={busy}
                      className="text-sm text-gray-600 underline hover:text-gray-900 disabled:opacity-50 dark:text-gray-300"
                    >
                      לשנות
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
                    {globalRows[index] ? (
                      <span className="text-emerald-700 dark:text-emerald-300">
                        ✓ נשמר לכל הלקוחות
                      </span>
                    ) : (
                      <>
                        <span className="text-gray-600 dark:text-gray-300">נשמר ללקוח הזה</span>
                        <button
                          type="button"
                          onClick={() => saveForAll(index, rawName)}
                          disabled={busy}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1 text-emerald-800 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-700 dark:bg-gray-800 dark:text-emerald-200"
                        >
                          <FiUsers className="w-4 h-4" />
                          {saving === index ? "שומר..." : "לשמור גם לכל הלקוחות"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : multi ? (
                <div data-item-search className="scroll-mt-3">
                  <div className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                    המוצרים לשורה הזו:
                  </div>
                  <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                    כל מוצר ייכנס להזמנה כשורה נפרדת, ומהפעם הבאה השורה תיפרש אליהם לבד.
                    כמות שנשארת כמו בשורה תתעדכן לפי מה שהלקוח יכתוב.
                  </p>
                  <AliasProductsEditor
                    rows={multi}
                    onChange={(rows) => setMultiRows((prev) => ({ ...prev, [index]: rows }))}
                    lineQuantity={item.quantity ?? 1}
                    disabled={busy}
                    preferred={preferred[index]}
                    preferredLabel="מתאימים לשורה"
                    onMenuOpen={scrollSearchUp}
                    inlineMenu={isPhone()}
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => saveMulti(index, rawName)}
                      disabled={busy || !multi.length}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-50"
                    >
                      <FiCheck className="w-4 h-4" />
                      {saving === index
                        ? "שומר..."
                        : multi.length > 1
                          ? `שמירת ${multi.length} המוצרים`
                          : "שמירה"}
                    </button>
                    <button
                      type="button"
                      onClick={() => closeMulti(index)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300"
                    >
                      <FiX className="w-4 h-4" />
                      ביטול
                    </button>
                  </div>
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
                    // נפתח מלחיצה על "לבחור מוצר" — ממשיכים ישר להקלדה
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
                    <MultiButton onClick={() => openMulti(index, rawName)} disabled={busy} />
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
                      לבחור מוצר
                    </button>
                    <MultiButton onClick={() => openMulti(index, rawName)} disabled={busy} />
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

const MultiButton = ({ onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={'למשל "סכו״ם וצלחות" — כמה מוצרים, כל אחד בשורה משלו'}
    className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 dark:text-gray-300 dark:hover:text-gray-100"
  >
    <FiLayers className="w-4 h-4" />
    כמה מוצרים לשורה הזו
  </button>
);

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
