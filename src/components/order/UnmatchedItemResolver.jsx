// src/components/order/UnmatchedItemResolver.jsx
//
// "לאיזה מוצר הלקוח התכוון" — הכרעה אנושית שנשמרת.
//
// ── למה המסך הזה קיים ──
//
// לקוח כותב "קולה זירו", ובקטלוג יש ארבעה מוצרים כאלה. מנוע ההתאמה לא יכול
// להכריע ביניהם — ובצדק, כי אין בטקסט שום דבר שמכריע. עד היום העובד היה
// מוסיף את המוצר ידנית לעגלה, אותו לקוח היה כותב "קולה זירו" למחרת, והשורה
// הייתה נכשלת שוב. אותה שורה, אותה שגיאה, כל יום.
//
// כאן הבחירה **נשמרת**: פעם אחת אדם קובע, ומאותו רגע השורה נקראת אוטומטית.
// זה ההבדל בין מערכת שנשארת באותו מקום לבין מערכת שמשתפרת מעצמה.
//
// ההכרעה נשמרת כברירת מחדל **ללקוח הזה בלבד**, כי "קולה זירו" אצל לקוח אחד
// הוא מארז פחיות ואצל אחר בקבוק ליטר וחצי. "לכל הלקוחות" הוא סימון מפורש.

import React, { useState } from "react";
import { Button } from "@windmill/react-ui";
import { FiCheck, FiChevronDown, FiSearch } from "react-icons/fi";

import { notifyError, notifySuccess } from "@/utils/toast";
import IncomingOrderServices from "@/services/IncomingOrderServices";

const UnmatchedItemResolver = ({ orderId, items = [], onResolved }) => {
  // איזו שורה פתוחה כרגע. אחת בכל רגע — רשימת מועמדים לכל שורה בו-זמנית
  // הופכת את הבאנר לקיר טקסט, וזה בדיוק מה שמונע מהעובד לקרוא אותו.
  const [openIndex, setOpenIndex] = useState(null);
  const [candidates, setCandidates] = useState({});
  const [loading, setLoading] = useState(null);
  const [saving, setSaving] = useState(null);
  const [resolved, setResolved] = useState({});
  const [applyToAll, setApplyToAll] = useState(false);

  if (!items.length) return null;

  const openItem = async (index, rawName) => {
    if (openIndex === index) {
      setOpenIndex(null);
      return;
    }
    setOpenIndex(index);

    // ── "לכל הלקוחות" מתאפס בכל שורה ──
    //
    // הסימון הוא מצב אחד המשותף לכל השורות, ובלי האיפוס הוא נדבק: עובד שסימן
    // אותו בשורה אחת היה שומר את השורה הבאה כהכרעה גורפת בלי לשים לב — כלומר
    // מכניס לכל הלקוחות מוצר שהוכרע עבור לקוח אחד. זו בדיוק הטעות שברירת
    // המחדל "ללקוח הזה" נועדה למנוע.
    setApplyToAll(false);

    // נטען פעם אחת לכל שורה — פתיחה וסגירה חוזרת לא תריץ חיפוש שוב
    if (candidates[index]) return;

    setLoading(index);
    try {
      const res = await IncomingOrderServices.getItemCandidates(orderId, rawName);
      setCandidates((prev) => ({ ...prev, [index]: res }));
    } catch (e) {
      notifyError(e?.response?.data?.message || e.message);
      setOpenIndex(null);
    } finally {
      setLoading(null);
    }
  };

  const choose = async (index, rawName, product) => {
    setSaving(`${index}:${product._id}`);
    try {
      const res = await IncomingOrderServices.resolveItem(orderId, {
        rawName,
        productId: product._id,
        scope: applyToAll ? "global" : "customer",
      });
      notifySuccess(res.message);
      setResolved((prev) => ({ ...prev, [index]: product.title }));
      setOpenIndex(null);
      if (onResolved) onResolved();
    } catch (e) {
      notifyError(e?.response?.data?.message || e.message);
    } finally {
      setSaving(null);
    }
  };

  const anyResolved = Object.keys(resolved).length > 0;

  return (
    <div className="mt-3">
      <div className="text-xs font-semibold text-gray-500 mb-1">
        שורות שלא זוהו — בחר את המוצר, והמערכת תזכור לפעם הבאה
      </div>

      <div className="rounded-lg bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
        {items.map((item, index) => {
          const rawName = item.rawName;
          const done = resolved[index];
          const data = candidates[index];

          return (
            <div key={index} className="p-2.5">
              <div className="flex items-start gap-2 flex-wrap">
                <div className="flex-grow min-w-0">
                  <div className="text-sm text-gray-800 dark:text-gray-200">
                    {item.quantity ? (
                      <span className="font-semibold">
                        {item.quantity}
                        {item.unit ? ` ${item.unit}` : "×"}{" "}
                      </span>
                    ) : null}
                    «{rawName}»
                  </div>
                  {item.failReason && !done && (
                    <div className="text-xs text-gray-500 mt-0.5">{item.failReason}</div>
                  )}
                  {done && (
                    <div className="text-xs text-green-700 dark:text-green-400 mt-0.5 flex items-center gap-1">
                      <FiCheck className="w-3.5 h-3.5" />
                      נשמר: {done}
                    </div>
                  )}
                </div>

                {!done && (
                  <Button
                    size="small"
                    layout="outline"
                    onClick={() => openItem(index, rawName)}
                    disabled={loading === index}
                    className="flex items-center gap-1 flex-shrink-0"
                  >
                    {loading === index ? (
                      "מחפש..."
                    ) : (
                      <>
                        <FiSearch className="w-3.5 h-3.5" />
                        בחר מוצר
                        <FiChevronDown
                          className={`w-3.5 h-3.5 transition-transform ${
                            openIndex === index ? "rotate-180" : ""
                          }`}
                        />
                      </>
                    )}
                  </Button>
                )}
              </div>

              {openIndex === index && data && (
                <div className="mt-2 pr-2 border-r-2 border-gray-200 dark:border-gray-600">
                  {data.currentAlias && (
                    <div className="text-xs text-amber-700 dark:text-amber-400 mb-1.5">
                      כבר נשמרה הכרעה לשם הזה: "{data.currentAlias.title}"
                      {data.currentAlias.scope === "global" ? " (לכל הלקוחות)" : ""}. בחירה
                      חדשה תחליף אותה.
                    </div>
                  )}

                  {!data.candidates?.length ? (
                    <div className="text-xs text-gray-500 py-1">
                      אין מועמדים בקטלוג לשם הזה. צריך להוסיף את המוצר לקטלוג קודם.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {data.candidates.map((product) => (
                        <button
                          key={product._id}
                          type="button"
                          onClick={() => choose(index, rawName, product)}
                          disabled={Boolean(saving)}
                          className="text-right px-2 py-1.5 rounded hover:bg-emerald-50 dark:hover:bg-emerald-900/30 disabled:opacity-50 flex items-center gap-2 flex-wrap"
                        >
                          <span className="text-sm text-gray-800 dark:text-gray-200">
                            {product.title}
                          </span>
                          {product.sku && (
                            <span className="text-xs text-gray-400">{product.sku}</span>
                          )}
                          {/* מלאי ומצב פרסום נדרשים כאן ולא במסך אחר: בחירת מוצר
                              שאזל או שמוסתר תיכשל שוב בהרצה החוזרת, והעובד היה
                              מגלה זאת רק אז */}
                          {product.stock !== null && product.stock <= 0 && (
                            <span className="text-xs text-red-600">אזל</span>
                          )}
                          {product.hidden && (
                            <span className="text-xs text-amber-600">מוסתר</span>
                          )}
                          {saving === `${index}:${product._id}` && (
                            <span className="text-xs text-gray-500">שומר...</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  <label className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                    <input
                      type="checkbox"
                      checked={applyToAll}
                      onChange={(e) => setApplyToAll(e.target.checked)}
                    />
                    לשמור לכל הלקוחות ולא רק ללקוח הזה
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {anyResolved && (
        <div className="mt-1.5 text-xs text-emerald-700 dark:text-emerald-400">
          ההכרעות נשמרו. לחץ "נסה לקרוא שוב" כדי לבנות את ההזמנה מחדש איתן.
        </div>
      )}
    </div>
  );
};

export default UnmatchedItemResolver;
