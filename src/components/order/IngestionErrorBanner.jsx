// src/components/order/IngestionErrorBanner.jsx
//
// מוצג בראש מסך ההזמנה כשההזמנה נקלטה אוטומטית מהמייל/ווצאפ ולא נקראה במלואה.
//
// זו נקודת הטיפול של העובד: מה נכשל, מה הלקוח כתב במקור, ושתי דרכים לסגור —
//   "נסה שוב"     — אחרי שתוקנה הסיבה (למשל המוצר החסר נוסף לקטלוג).
//                    מוחק את הזמנת השגיאה ויוצר הזמנה נקייה במקומה.
//   "אשר הזמנה"   — כשההזמנה נכונה כמו שהיא. מעביר ל"בטיפול" *ומוריד מלאי*.
//
// חשוב: אישור חייב לעבור מכאן ולא משינוי סטטוס ידני, כי שינוי סטטוס במערכת
// אינו מוריד מלאי (המלאי יורד רק ב-WebHook של Cardcom).

import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { Button } from "@windmill/react-ui";
import { FiAlertTriangle, FiCheck, FiMail, FiRefreshCw } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";

import { notifyError, notifySuccess } from "@/utils/toast";
import IncomingOrderServices from "@/services/IncomingOrderServices";
import UnmatchedItemResolver from "@/components/order/UnmatchedItemResolver";

const ERROR_HINTS = {
  llm_failed: "שירות הניתוח לא הגיב. אפשר פשוט להריץ שוב.",
  no_items: "לא זוהו פריטים בהודעה. יש להשלים אותם ידנית.",
  items_unmatched:
    "יש פריט שלא נכנס להזמנה. תקן בקטלוג ולחץ 'נסה שוב', או אשר את ההזמנה כמו שהיא.",
  low_confidence: "הקריאה לא הייתה ודאית. בדוק את הפריטים מול הטקסט המקורי.",
  customer_unresolved: "לא ניתן היה לזהות את הלקוח.",
  address_unresolved:
    "כתובת המשלוח לא זוהתה, או שהעיר אינה מוגדרת ביעדי החלוקה. יש להשלים כתובת.",
  below_minimum: "ההזמנה מתחת למינימום ההזמנה ליעד.",
  out_of_stock: "אין מלאי מספיק לאחד הפריטים.",
  order_create_failed: "תקלה טכנית ביצירת ההזמנה.",
};

const IngestionErrorBanner = ({ order, onChanged }) => {
  const history = useHistory();
  const [busy, setBusy] = useState("");

  const err = order?.ingestionError;
  if (!err?.code) return null;

  const resolved = Boolean(err.resolvedAt);
  const source = order.source === "whatsapp" ? "ווצאפ" : "מייל";
  const unmatched = err.unmatchedItems || [];

  // ב-items_unmatched הודעת הכשל היא בדיוק רשימת השמות שלמטה — אין טעם
  // להציג אותה פעמיים. בכל קוד אחר (מינימום, כתובת, מלאי) ההודעה היא הסיבה
  // האמיתית לכשל והפריטים רק מתלווים אליה, ולכן שם היא נשארת.
  const detail = err.code === "items_unmatched" && unmatched.length ? "" : err.message;
  // ריקנות ההזמנה נקראת מההזמנה עצמה ולא מנוסח ההודעה. cart שאינו מערך
  // (הזמנה שלא נטענה במלואה) אינו ראיה לריקנות — אז מנסחים בזהירות.
  const cartIsEmpty = Array.isArray(order.cart) && order.cart.length === 0;

  const handleApprove = async () => {
    setBusy("approve");
    try {
      const res = await IncomingOrderServices.approveErrorOrder(order._id);
      notifySuccess(res.message);
      if (onChanged) onChanged();
    } catch (e) {
      notifyError(e?.response?.data?.message || e.message);
    } finally {
      setBusy("");
    }
  };

  // ── איפוס מצב העבודה כשעוברים להזמנה אחרת ──
  //
  // ‏"נסה לקרוא שוב" מנווט ל-`/order/<מזהה חדש>`, ו-React Router מרנדר את
  // **אותו** קומפוננט עם פרמטר אחר במקום לפרק אותו. בלי האיפוס הזה ה-state
  // עובר איתו: הכפתור בהזמנה החדשה ממשיך להציג "מריץ..." לנצח, למרות
  // שההרצה הסתיימה בהצלחה ונוצרה הזמנה.
  useEffect(() => {
    setBusy("");
  }, [order?._id]);

  const handleRetry = async () => {
    setBusy("retry");
    try {
      const res = await IncomingOrderServices.retryFromOrder(order._id);
      notifySuccess(res.message);
      // ההזמנה הנוכחית נמחקה בהרצה החוזרת — אין למה לחזור אליה
      if (res.newOrderId) {
        history.push(`/order/${res.newOrderId}`);
      } else {
        history.push("/incoming-orders");
      }
    } catch (e) {
      notifyError(e?.response?.data?.message || e.message);
    } finally {
      // ‏finally ולא רק ב-catch: במסלול ההצלחה הניווט אינו מפרק את הקומפוננט
      // (ראה למעלה), ולכן בלי האיפוס כאן הכפתור נתקע במצב "מריץ...".
      setBusy("");
    }
  };

  return (
    <div
      className={`mb-4 rounded-xl overflow-hidden border-2 ${
        resolved
          ? "border-green-300 bg-green-50 dark:bg-green-900/20"
          : "border-red-400 bg-red-50 dark:bg-red-900/20"
      }`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {resolved ? (
            <FiCheck className="w-5 h-5 mt-0.5 text-green-600 flex-shrink-0" />
          ) : (
            <FiAlertTriangle className="w-5 h-5 mt-0.5 text-red-600 flex-shrink-0" />
          )}

          <div className="flex-grow min-w-0">
            {/* כותרת — מה קרה, ומאיפה, בשורה אחת */}
            <h3
              className={`text-base font-bold flex flex-wrap items-center gap-x-1.5 gap-y-1 ${
                resolved ? "text-green-800 dark:text-green-300" : "text-red-800 dark:text-red-300"
              }`}
            >
              {order.source === "whatsapp" ? (
                <FaWhatsapp className="w-4 h-4 text-green-600" />
              ) : (
                <FiMail className="w-4 h-4 text-blue-600" />
              )}
              {resolved
                ? `הזמנה מ${source} — אושרה`
                : `נקראה אוטומטית מ${source} ולא הובנה במלואה`}
              {resolved && (
                <span className="text-xs font-normal text-green-700 dark:text-green-400">
                  {err.resolvedBy ? `ע"י ${err.resolvedBy}, ` : ""}
                  {new Date(err.resolvedAt).toLocaleString("he-IL", {
                    timeZone: "Asia/Jerusalem",
                  })}
                </span>
              )}
            </h3>

            {/* שורת התקלה — סיבת הכשל, והפריטים שנפלו באותה שורה */}
            {(detail || unmatched.length > 0) && (
              <div className="mt-1.5 text-sm text-gray-800 dark:text-gray-200">
                {detail}
                {unmatched.length > 0 && (
                  <span className="text-red-700 dark:text-red-400">
                    {detail ? " · " : ""}
                    <span className="font-semibold">
                      {cartIsEmpty
                        ? "לא זוהו — ההזמנה ריקה:"
                        : "לא נכנסו להזמנה (הסכום חלקי):"}
                    </span>{" "}
                    {unmatched.map((item, i) => (
                      <span key={i} title={item.failReason || undefined}>
                        {i > 0 && ", "}
                        {item.quantity ? (
                          <span className="font-semibold">
                            {item.quantity}
                            {item.unit ? ` ${item.unit}` : "×"}{" "}
                          </span>
                        ) : null}
                        «{item.rawName}»
                      </span>
                    ))}
                  </span>
                )}
              </div>
            )}

            {ERROR_HINTS[err.code] && !resolved && (
              <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                {ERROR_HINTS[err.code]}
              </div>
            )}

            {/* ── מכאן ההזמנה גם *מלמדת* את המערכת ──
                לא רק "מה נכשל" אלא "מה המוצר הנכון", והתשובה נשמרת. בלי זה
                אותה שורה של אותו לקוח נכשלת שוב מחר. ראה UnmatchedItemResolver. */}
            {/* בלי onResolved בכוונה: שמירת אליאס אינה משנה את ההזמנה, וטעינה
                מחדש של המסך אחרי כל בחירה הייתה מאפסת את סימוני "נשמר" ואת
                השורות שכבר הוכרעו — כלומר העובד היה מאבד את מקומו באמצע. */}
            {!resolved && unmatched.length > 0 && (
              <UnmatchedItemResolver orderId={order._id} items={unmatched} />
            )}

            {/* ההודעה המקורית של הלקוח — תמיד פתוחה, זה מה שהעובד באמת קורא */}
            {err.rawText && (
              <div className="mt-3">
                <div className="text-xs font-semibold text-gray-500 mb-1">
                  ההודעה המקורית
                </div>
                <pre className="p-3 text-sm whitespace-pre-wrap bg-white dark:bg-gray-800 rounded-lg max-h-64 overflow-y-auto text-gray-800 dark:text-gray-200">
                  {err.rawText}
                </pre>
              </div>
            )}

            {/* פעולות */}
            {!resolved && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  onClick={handleApprove}
                  disabled={Boolean(busy)}
                  className="flex items-center gap-2"
                >
                  <FiCheck className="w-4 h-4" />
                  {busy === "approve" ? "מאשר..." : "אשר הזמנה והורד מלאי"}
                </Button>

                <Button
                  layout="outline"
                  onClick={handleRetry}
                  disabled={Boolean(busy)}
                  className="flex items-center gap-2"
                >
                  <FiRefreshCw
                    className={`w-4 h-4 ${busy === "retry" ? "animate-spin" : ""}`}
                  />
                  {busy === "retry" ? "מריץ..." : "נסה לקרוא שוב"}
                </Button>

                <span className="text-xs text-gray-500 dark:text-gray-400">
                  "נסה לקרוא שוב" מוחק ובונה את ההזמנה מחדש מההודעה.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IngestionErrorBanner;
