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
import { FiCheck, FiMail, FiRefreshCw } from "react-icons/fi";
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
  const [progress, setProgress] = useState({ done: 0, total: 0 });
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
  // ריקנות ההזמנה נקראת מההזמנה עצמה ולא מנוסח ההודעה. cart שאינו מערך
  // (הזמנה שלא נטענה במלואה) אינו ראיה לריקנות — אז מנסחים בזהירות.
  const cartIsEmpty = Array.isArray(order.cart) && order.cart.length === 0;

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
    setProgress({ done: 0, total: 0 });
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
  const allPicked = unmatched.length > 0 && progress.done >= unmatched.length;
  const title = resolved
    ? `הזמנה מ${source} — אושרה`
    : unmatched.length
    ? `הזמנה מ${source}: ${
        unmatched.length === 1 ? "שורה אחת לא זוהתה" : `${unmatched.length} שורות לא זוהו`
      }`
    : `הזמנה מ${source} לא נקלטה במלואה`;
  const subtitle = resolved
    ? ""
    : unmatched.length && !detail
    ? cartIsEmpty
      ? "ההזמנה ריקה. בחרו מוצר לכל שורה ובנו אותה מחדש — הבחירה נשמרת לפעם הבאה."
      : "שאר ההזמנה נקלטה. בחרו מוצר לכל שורה — הבחירה נשמרת לפעם הבאה."
    : [detail, ERROR_HINTS[err.code]].filter(Boolean).join(" ");

  return (
    <>
    <PrintNoteOffer note={printOffer} onClose={() => setPrintOffer(null)} />
    <div
      className={`mb-4 rounded-xl border ${
        resolved
          ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20"
          : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20"
      }`}
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span
            className={`flex-shrink-0 rounded-full p-2 ${
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
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h3>
            {resolved ? (
              <div className="text-sm text-green-700 dark:text-green-400">
                {err.resolvedBy ? `ע"י ${err.resolvedBy}, ` : ""}
                {new Date(err.resolvedAt).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" })}
              </div>
            ) : (
              subtitle && <p className="text-sm text-gray-600 dark:text-gray-300">{subtitle}</p>
            )}
          </div>
        </div>

        {/* השורות לבחירה, ולצידן מה שהלקוח כתב — כדי להשוות בלי לגלול */}
        {!resolved && (unmatched.length > 0 || err.rawText) && (
          <div
            className={`mt-4 grid gap-4 ${
              unmatched.length > 0 && err.rawText ? "lg:grid-cols-5" : ""
            }`}
          >
            {/* בלי טעינה מחדש אחרי כל בחירה: שמירת אליאס אינה משנה את ההזמנה,
                ורענון היה מאפס את השורות שכבר הוכרעו. ראה UnmatchedItemResolver. */}
            {unmatched.length > 0 && (
              <div className="lg:col-span-3 min-w-0">
                <UnmatchedItemResolver
                  orderId={order._id}
                  items={unmatched}
                  onProgress={(done, total) => setProgress({ done, total })}
                />
              </div>
            )}
            {err.rawText && (
              <div className="lg:col-span-2 min-w-0">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                  מה הלקוח כתב
                </div>
                <div className="p-3 text-sm leading-relaxed whitespace-pre-wrap break-words bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl max-h-80 overflow-y-auto text-gray-700 dark:text-gray-200">
                  {err.rawText.trim()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* פעולות. כשכל השורות נבחרו, הצעד הבא הוא לבנות מחדש עם הבחירות */}
        {!resolved && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {allPicked && (
              <Button onClick={handleRetry} disabled={Boolean(busy)} className="flex items-center gap-2">
                <FiRefreshCw className={`w-4 h-4 ${busy === "retry" ? "animate-spin" : ""}`} />
                {busy === "retry" ? "בונה..." : "בנה את ההזמנה עם הבחירות"}
              </Button>
            )}
            <Button
              layout={allPicked ? "outline" : "primary"}
              onClick={handleApprove}
              disabled={Boolean(busy)}
              className="flex items-center gap-2"
            >
              <FiCheck className="w-4 h-4" />
              {busy === "approve"
                ? "מאשר..."
                : unmatched.length
                ? "אשר הזמנה בלי השורות החסרות"
                : "אשר הזמנה והורד מלאי"}
            </Button>
            {!allPicked && (
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
            )}
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default IngestionErrorBanner;
