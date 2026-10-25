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

import React, { useEffect, useRef, useState } from "react";
import { useHistory } from "react-router-dom";
import { Button } from "@windmill/react-ui";
import { FiCheck, FiChevronDown, FiFileText, FiMail, FiRefreshCw } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";

import { notifyError, notifySuccess } from "@/utils/toast";
import IncomingOrderServices from "@/services/IncomingOrderServices";
import BillingServices from "@/services/BillingServices";
import PrintNoteOffer from "@/components/billing/PrintNoteOffer";
import UnmatchedItemResolver from "@/components/order/UnmatchedItemResolver";

const ERROR_HINTS = {
  llm_failed: "שירות הניתוח לא הגיב. אפשר פשוט להריץ שוב.",
  no_items: "לא זוהו פריטים בהודעה. יש להשלים אותם ידנית.",
  low_confidence: "הקריאה לא הייתה ודאית. בדוק את הפריטים מול הטקסט המקורי.",
  customer_unresolved: "לא ניתן היה לזהות את הלקוח.",
  address_unresolved:
    "כתובת המשלוח לא זוהתה, או שהעיר אינה מוגדרת ביעדי החלוקה. יש להשלים כתובת.",
  below_minimum: "ההזמנה מתחת למינימום ההזמנה ליעד.",
  out_of_stock: "אין מלאי מספיק לאחד הפריטים.",
  order_create_failed: "תקלה טכנית ביצירת ההזמנה.",
};

// התעודה נוצרת ב-hook של ההזמנה, אחרי שתשובת האישור כבר חזרה — ולכן היא
// אינה חלק מהתשובה, וצריך לשאול עליה. כמה ניסיונות קצרים ולא המתנה ארוכה:
// הזמנה שכולה סחורה נשקלת לא מקבלת תעודה אוטומטית בכלל.
const findOrderNote = async (orderId) => {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await BillingServices.getDeliveryNoteByOrder(orderId).catch(() => null);
    // תעודה מבוטלת אינה מה שיוצא עם הסחורה — לא מציעים להדפיס אותה
    if (res?.note) return res.note.billing?.status === "cancelled" ? null : res.note;
    await new Promise((resolve) => setTimeout(resolve, 700));
  }
  return null;
};

const IngestionErrorBanner = ({ order, onChanged }) => {
  const history = useHistory();
  const [busy, setBusy] = useState("");
  // התעודה שנוצרה מהאישור — מציעים להדפיס אותה בלי לפתוח אותה קודם
  const [printOffer, setPrintOffer] = useState(null);
  // כמה מהשורות שלא זוהו כבר הוכרעו — קובע מה הכפתור הראשי
  const [doneCount, setDoneCount] = useState(0);
  // ההודעה המקורית של הלקוח נפתחת רק בלחיצה
  const [showMessage, setShowMessage] = useState(false);
  // ההזמנה שמוצגת כרגע. החיפוש אחרי התעודה נמשך כמה שניות, ובזמן הזה אפשר
  // לעבור להזמנה אחרת — שלא תקבל הצעה להדפיס תעודה שאינה שלה
  const shownOrderId = useRef(order?._id);
  shownOrderId.current = order?._id;

  const err = order?.ingestionError;
  if (!err?.code) return null;

  const resolved = Boolean(err.resolvedAt);
  const source = order.source === "whatsapp" ? "ווצאפ" : "מייל";
  const unmatched = err.unmatchedItems || [];

  // ב-items_unmatched הודעת הכשל היא בדיוק רשימת השמות שלמטה — אין טעם
  // להציג אותה פעמיים. בכל קוד אחר (מינימום, כתובת, מלאי) ההודעה היא הסיבה
  // האמיתית לכשל והפריטים רק מתלווים אליה, ולכן שם היא נשארת.
  const detail = err.code === "items_unmatched" && unmatched.length ? "" : err.message;

  const handleApprove = async () => {
    setBusy("approve");
    try {
      const res = await IncomingOrderServices.approveErrorOrder(order._id);
      notifySuccess(res.message);
      if (onChanged) onChanged();
      // בלי await: האישור כבר הצליח, והכפתור לא צריך להמתין לתעודה
      const approvedId = order._id;
      findOrderNote(approvedId).then((note) => {
        if (shownOrderId.current === approvedId) setPrintOffer(note);
      });
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
    setPrintOffer(null);
    setDoneCount(0);
    setShowMessage(false);
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

  // הכותרת היא המשפט היחיד שצריך לקרוא: מה קרה ומה עושים
  const total = unmatched.length;
  const done = Math.min(doneCount, total);
  const left = total - done;
  const allPicked = total > 0 && left === 0;
  const title = resolved
    ? `הזמנה מ${source} — אושרה`
    : total
    ? total === 1
      ? "מוצר אחד בהזמנה צריך את האישור שלך"
      : `${total} מוצרים בהזמנה צריכים את האישור שלך`
    : `הזמנה מ${source} לא נקלטה במלואה`;
  const subtitle = resolved
    ? ""
    : total && !detail
    ? `ההזמנה הגיעה מ${source}, והמערכת לא הייתה בטוחה לאיזה מוצר הלקוח התכוון. ` +
      "אשרו או בחרו מוצר לכל שורה — ובפעם הבאה המערכת תזהה לבד."
    : [detail, ERROR_HINTS[err.code]].filter(Boolean).join(" ");

  return (
    <>
    <PrintNoteOffer note={printOffer} onClose={() => setPrintOffer(null)} />
    <div
      className={`mb-4 rounded-2xl border ${
        resolved
          ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
          : "border-amber-200 bg-amber-50/70 dark:border-amber-800 dark:bg-amber-900/20"
      }`}
    >
      <div className="p-4 sm:p-6">
        {/* כותרת */}
        <div className="flex items-start gap-3">
          <span
            className={`flex-shrink-0 rounded-full p-2.5 ${
              resolved
                ? "bg-green-100 text-green-700 dark:bg-green-800/50 dark:text-green-300"
                : "bg-amber-100 text-amber-700 dark:bg-amber-800/50 dark:text-amber-300"
            }`}
          >
            {order.source === "whatsapp" ? (
              <FaWhatsapp className="w-5 h-5" />
            ) : resolved ? (
              <FiCheck className="w-5 h-5" />
            ) : (
              <FiMail className="w-5 h-5" />
            )}
          </span>
          <div className="min-w-0 flex-grow">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{title}</h3>
            {resolved ? (
              <div className="text-sm text-green-700 dark:text-green-400">
                {err.resolvedBy ? `ע"י ${err.resolvedBy}, ` : ""}
                {new Date(err.resolvedAt).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" })}
              </div>
            ) : (
              subtitle && (
                <p className="mt-1 text-base text-gray-600 dark:text-gray-300">{subtitle}</p>
              )
            )}

            {/* התקדמות — כמה נשאר, במבט אחד */}
            {!resolved && total > 0 && (
              <div className="mt-3 flex items-center gap-3">
                <div className="h-2 flex-grow max-w-xs rounded-full bg-amber-100 dark:bg-gray-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${(done / total) * 100}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                  {done} מתוך {total}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* בלי טעינה מחדש אחרי כל בחירה: שמירת אליאס אינה משנה את ההזמנה,
            ורענון היה מאפס את השורות שכבר הוכרעו. ראה UnmatchedItemResolver. */}
        {!resolved && total > 0 && (
          <div className="mt-5">
            <UnmatchedItemResolver
              orderId={order._id}
              items={unmatched}
              onProgress={(count) => setDoneCount(count)}
            />
          </div>
        )}

        {/* ההודעה של הלקוח — סגורה עד שמבקשים, כדי שהמסך יישאר נקי */}
        {!resolved && err.rawText && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowMessage((open) => !open)}
              aria-expanded={showMessage}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300"
            >
              <FiFileText className="w-4 h-4" />
              {showMessage ? "הסתרת ההודעה של הלקוח" : "הצגת ההודעה המקורית של הלקוח"}
              <FiChevronDown className={`w-4 h-4 transition-transform ${showMessage ? "rotate-180" : ""}`} />
            </button>
            {showMessage && (
              <div className="mt-2 p-4 text-sm leading-relaxed whitespace-pre-wrap break-words bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl max-h-96 overflow-y-auto text-gray-700 dark:text-gray-200">
                {err.rawText.trim()}
              </div>
            )}
          </div>
        )}

        {/* פעולות */}
        {!resolved && (
          <div className="mt-5 pt-4 border-t border-amber-200/70 dark:border-gray-700 flex flex-wrap items-center gap-3">
            {total > 0 ? (
              <>
                <Button
                  onClick={handleRetry}
                  disabled={Boolean(busy) || !allPicked}
                  className="flex items-center gap-2"
                  title={allPicked ? undefined : "יש לאשר קודם את כל השורות"}
                >
                  <FiCheck className="w-4 h-4" />
                  {busy === "retry" ? "מעדכן את ההזמנה..." : "סיום — עדכון ההזמנה"}
                </Button>
                {!allPicked && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {left === 1 ? "נשארה שורה אחת לאשר" : `נשארו ${left} שורות לאשר`}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={Boolean(busy)}
                  className="mr-auto text-sm text-gray-500 underline hover:text-gray-800 disabled:opacity-50 dark:text-gray-400"
                >
                  {busy === "approve" ? "מאשר..." : "לאשר את ההזמנה בלי השורות האלה"}
                </button>
              </>
            ) : (
              <>
                <Button onClick={handleApprove} disabled={Boolean(busy)} className="flex items-center gap-2">
                  <FiCheck className="w-4 h-4" />
                  {busy === "approve" ? "מאשר..." : "אשר הזמנה והורד מלאי"}
                </Button>
                <Button
                  layout="link"
                  onClick={handleRetry}
                  disabled={Boolean(busy)}
                  className="flex items-center gap-2"
                  title="מוחק את ההזמנה הזו ובונה אותה מחדש מההודעה"
                >
                  <FiRefreshCw className={`w-4 h-4 ${busy === "retry" ? "animate-spin" : ""}`} />
                  {busy === "retry" ? "מריץ..." : "קרא שוב מההודעה"}
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default IngestionErrorBanner;
