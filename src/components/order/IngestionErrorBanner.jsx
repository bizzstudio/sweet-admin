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

import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import { Button } from "@windmill/react-ui";
import { FiAlertTriangle, FiCheck, FiMail, FiRefreshCw } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";

import { notifyError, notifySuccess } from "@/utils/toast";
import IncomingOrderServices from "@/services/IncomingOrderServices";

const ERROR_HINTS = {
  llm_failed: "שירות הניתוח לא הגיב. אפשר פשוט להריץ שוב.",
  no_items: "לא זוהו פריטים בהודעה. יש להשלים אותם ידנית.",
  items_unmatched:
    "מוצר שהלקוח ביקש לא נמצא בקטלוג. אם הוא קיים בשם אחר — הוסף אותו ולחץ 'נסה שוב'.",
  low_confidence: "הזיהוי לא היה בטוח מספיק. בדוק את הפריטים מול הטקסט המקורי.",
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
  const [showRaw, setShowRaw] = useState(false);

  const err = order?.ingestionError;
  if (!err?.code) return null;

  const resolved = Boolean(err.resolvedAt);
  const source = order.source === "whatsapp" ? "ווצאפ" : "מייל";

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
      <div className="p-5 lg:p-6">
        <div className="flex items-start gap-3">
          {resolved ? (
            <FiCheck className="w-6 h-6 mt-0.5 text-green-600 flex-shrink-0" />
          ) : (
            <FiAlertTriangle className="w-6 h-6 mt-0.5 text-red-600 flex-shrink-0" />
          )}

          <div className="flex-grow min-w-0">
            <h3
              className={`text-lg font-bold ${
                resolved ? "text-green-800 dark:text-green-300" : "text-red-800 dark:text-red-300"
              }`}
            >
              {resolved
                ? "הזמנה שנקלטה אוטומטית — אושרה"
                : "ההזמנה נקראה אוטומטית ולא הובנה במלואה"}
            </h3>

            <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              {order.source === "whatsapp" ? (
                <FaWhatsapp className="w-4 h-4 text-green-600" />
              ) : (
                <FiMail className="w-4 h-4 text-blue-600" />
              )}
              נקלטה מ{source}
              {resolved && (
                <span className="text-green-700 dark:text-green-400">
                  {" "}
                  · אושרה ע"י {err.resolvedBy} ב-
                  {new Date(err.resolvedAt).toLocaleString("he-IL", {
                    timeZone: "Asia/Jerusalem",
                  })}
                </span>
              )}
            </p>

            {/* מה נכשל */}
            <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
              <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                מה נכשל
              </div>
              <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {err.message}
              </div>
              {ERROR_HINTS[err.code] && (
                <div className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">
                  {ERROR_HINTS[err.code]}
                </div>
              )}
              {typeof err.confidence === "number" && err.confidence > 0 && (
                <div className="mt-1.5 text-xs text-gray-500">
                  ביטחון הזיהוי: {Math.round(err.confidence * 100)}%
                </div>
              )}
            </div>

            {/* פריטים שלא נכנסו להזמנה */}
            {err.unmatchedItems?.length > 0 && (
              <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                <div className="text-xs font-semibold text-red-600 uppercase mb-1.5">
                  פריטים שהלקוח ביקש ואינם בהזמנה
                </div>
                <ul className="space-y-1">
                  {err.unmatchedItems.map((item, i) => (
                    <li key={i} className="text-sm text-gray-800 dark:text-gray-200">
                      <span className="font-semibold">
                        {item.quantity}
                        {item.unit ? ` ${item.unit}` : "×"}
                      </span>{" "}
                      «{item.rawName}»
                      <span className="text-gray-500"> — {item.failReason}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 text-xs text-red-600 font-medium">
                  הסכום בהזמנה חלקי — הפריטים האלה אינם כלולים בו.
                </div>
              </div>
            )}

            {/* הטקסט המקורי של הלקוח */}
            {err.rawText && (
              <div className="mt-3">
                <button
                  onClick={() => setShowRaw(!showRaw)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {showRaw ? "הסתר" : "הצג"} את ההודעה המקורית של הלקוח
                </button>
                {showRaw && (
                  <pre className="mt-2 p-3 text-xs whitespace-pre-wrap bg-white dark:bg-gray-800 rounded-lg max-h-64 overflow-y-auto text-gray-800 dark:text-gray-200">
                    {err.rawText}
                  </pre>
                )}
              </div>
            )}

            {/* פעולות */}
            {!resolved && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
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

                <span className="text-xs text-gray-600 dark:text-gray-400">
                  "נסה לקרוא שוב" מוחק את ההזמנה הזו ויוצר אותה מחדש מההודעה המקורית.
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
