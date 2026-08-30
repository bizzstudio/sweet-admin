// src/components/customer/CustomerHistoryModal.jsx
// העלאת היסטוריית רכישות של לקוח מקובץ ההנהח"ש.
//
// הזרימה: הצגת ההיסטוריה הקיימת -> בחירת קובץ -> פענוח ובדיקה מול הקטלוג ->
// תצוגה מקדימה -> אישור -> דוח.
//
// שלושה דברים שהמסך חייב להעביר:
//   1. **מה זה עושה בפועל** — לא "רשימת מוצרים" אלא: מכאן והלאה, כשהלקוח
//      יכתוב שם מוצר שמתאים לכמה פריטים בקטלוג, המערכת תבחר את זה שהוא קונה.
//   2. **כמה זה עוזר** — הבדיקה מודדת כמה שורות שתקועות עכשיו הקובץ היה פותר.
//      בלי המספר הזה "108 שורות נקלטו" אינו אומר דבר.
//   3. **שהקובץ שייך ללקוח הזה** — מספר הלקוח בקובץ מול זה שבכרטיס. העלאה
//      של היסטוריית לקוח אחר על כרטיס זה אינה נראית כשגיאה בשום מסך.
//   4. **כמה הזמנות ארכיון ייווצרו** — אותו קובץ משחזר גם את המסמכים עצמם
//      כהזמנות בסטטוס "הזמנת ארכיון", כדי שההיסטוריה תיראה בכרטיס הלקוח.
//      אלה הזמנות אמיתיות במסד, ולכן המספר מוצג *לפני* האישור ולא אחריו.
import {
  Badge,
  Button,
  Modal,
  ModalBody,
  ModalFooter,
} from "@windmill/react-ui";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiChevronDown,
  FiChevronUp,
  FiClock,
  FiList,
  FiSearch,
  FiTrash2,
  FiUploadCloud,
  FiXCircle,
} from "react-icons/fi";

// Internal import
import spinnerLoadingImage from "@/assets/img/spinner.gif";
import CustomerHistoryServices from "@/services/CustomerHistoryServices";
import { describeApiError } from "@/utils/apiError";
import {
  parseCustomerHistoryFile,
  toServerRow,
} from "@/utils/customerHistoryExcel";
import {
  formatFileDate,
  formatDateTime,
  formatMoney,
  formatNumber,
} from "@/utils/displayFormat";
import { notifyError, notifySuccess } from "@/utils/toast";

// תקרה לפירוט על המסך, כדי שקובץ פגום לא ירנדר אלפי שורות
const MAX_LIST = 50;

// ── תקרת רשימת המוצרים השמורים ──
//
// ‏MAX_LIST אינו מתאים כאן: הכותרת מכריזה "132 מוצרים בהיסטוריה", ורשימה
// שנחתכה ב-50 בשקט הייתה סותרת אותה. השרת חוסם ב-1000 (MAX_VIEW_LIMIT),
// ומה שמעבר לכך נמצא דרך תיבת החיפוש. אם בכל זאת נחתך — נאמר במפורש.
const ITEMS_LIMIT = 1000;

// ── תקרת גוף הבקשה ──
//
// ‏express.json בשרת מוגבל ל-4MB, וההיסטוריה נשלחת בבקשה אחת (הדריסה חייבת
// להיות אטומית). חריגה הייתה מוחזרת כ-413 בלי גוף JSON, כלומר הודעה סתמית.
// הבדיקה נעשית כאן, לפני השליחה, כדי שתהיה הודעה שאומרת מה לעשות.
const MAX_PAYLOAD_BYTES = 3.5 * 1024 * 1024;

const assertPayloadFits = (rows) => {
  const bytes = new Blob([JSON.stringify({ rows })]).size;
  if (bytes <= MAX_PAYLOAD_BYTES) return;
  throw new Error(
    `הקובץ גדול מדי לשליחה בבקשה אחת (${(bytes / 1024 / 1024).toFixed(1)}MB מתוך ` +
      `${(MAX_PAYLOAD_BYTES / 1024 / 1024).toFixed(1)}MB). ` +
      "אפשר לייצא מההנהח\"ש טווח תאריכים קצר יותר.",
  );
};

const Row = ({ label, value, tone = "" }) => (
  <div className="flex items-center justify-between gap-3 py-1 text-sm">
    <span className="text-gray-500 dark:text-gray-400">{label}</span>
    <span className={`font-medium ${tone || "text-gray-700 dark:text-gray-200"}`}>
      {value}
    </span>
  </div>
);

// טווח התאריכים מגיע מהקובץ (שעון-קיר בלי אזור זמן), ולכן מוצג כפי שנכתב
// בו ולא מתורגם לאזור הזמן של הצופה — ראה formatFileDate
const span = (from, to) =>
  from && to ? `${formatFileDate(from)} — ${formatFileDate(to)}` : "—";

const CustomerHistoryModal = ({
  isOpen,
  onClose,
  customerId,
  customerName = "",
  onChanged,
}) => {
  const fileRef = useRef();

  const [existing, setExisting] = useState(null);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [check, setCheck] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [report, setReport] = useState(null);
  const [parseError, setParseError] = useState("");
  const [loadError, setLoadError] = useState("");
  // ── אזהרת לקוח לא תואם ──
  //
  // מוחזקת בנפרד מ-parseError כי היא **אינה כשל** אלא שאלה: הקובץ תקין,
  // והשאלה היא אם הוא של הלקוח הזה. היא מציגה כפתור "העלה בכל זאת", כי יש
  // מקרים אמיתיים (מיזוג כרטיסים, לקוח עם שני מספרים בהנהח"ש).
  const [mismatch, setMismatch] = useState(null);

  // ── יצירת הזמנות ארכיון ──
  //
  // דולק כברירת מחדל: זו הסיבה העיקרית להעלות קובץ היסטוריה — לראות את
  // ההזמנות בכרטיס הלקוח. הכיבוי קיים למי שרוצה רק את פרופיל ההתאמה, בלי
  // להוסיף מסמכים לרשימת ההזמנות.
  const [createOrders, setCreateOrders] = useState(true);

  // ── רשימת המוצרים השמורים ──
  //
  // נטענת רק בלחיצה ולא בפתיחת המודל: הפאנל העליון צריך ארבעה מספרים,
  // והרשימה היא מאות שורות שברוב הפתיחות איש לא מסתכל בהן.
  const [showItems, setShowItems] = useState(false);
  const [items, setItems] = useState(null);
  const [itemsMeta, setItemsMeta] = useState(null);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState("");
  const [itemSearch, setItemSearch] = useState("");

  // החיפוש רץ בשרת (הוא היחיד שמחזיק את כל השורות), ולכן הוא מושהה —
  // בלי זה כל הקלדה הייתה בקשה.
  // ── מונה בקשות, ולמה הוא נחוץ ──
  //
  // ההשהיה מקטינה את מספר הבקשות אבל אינה מסדרת אותן: שתי חיפושים עוקבים
  // יכולים לחזור בסדר הפוך, והתשובה **הישנה** תדרוס את החדשה. התוצאה היא
  // רשימה שאינה תואמת את מה שכתוב בתיבת החיפוש, בלי שום סימן לכך.
  const itemsRequestRef = useRef(0);

  const loadItems = useCallback(
    async (search) => {
      if (!customerId) return;
      const requestId = itemsRequestRef.current + 1;
      itemsRequestRef.current = requestId;

      setItemsLoading(true);
      setItemsError("");
      try {
        const data = await CustomerHistoryServices.getCustomerHistory(customerId, {
          search: search || undefined,
          limit: ITEMS_LIMIT,
        });
        if (itemsRequestRef.current !== requestId) return;
        setItems(data?.items || []);
        setItemsMeta({
          filtered: data?.filtered || 0,
          returned: data?.returned || 0,
        });
      } catch (err) {
        if (itemsRequestRef.current !== requestId) return;
        setItems(null);
        setItemsMeta(null);
        setItemsError(describeApiError(err, "טעינת רשימת המוצרים נכשלה"));
      } finally {
        // ‏loading מכובה רק ע"י הבקשה האחרונה, אחרת בקשה ישנה שחזרה מאוחר
        // הייתה מכבה את הספינר בזמן שהחדשה עוד רצה
        if (itemsRequestRef.current === requestId) setItemsLoading(false);
      }
    },
    [customerId]
  );

  // הרשימה נטענת מחדש אחרי יבוא או מחיקה, ולכן היא מאופסת ולא נשמרת:
  // הצגת השורות הישנות מתחת לדוח יבוא חדש הייתה קריאה כתוצאה שלו.
  const resetItems = useCallback(() => {
    // פוסל תשובות שעדיין בדרך — אחרת רשימה של לקוח קודם הייתה נוחתת כאן
    itemsRequestRef.current += 1;
    setShowItems(false);
    setItems(null);
    setItemsMeta(null);
    setItemsError("");
    setItemSearch("");
    // הבקשה שנפסלה זה עתה לא תכבה את הדגל בעצמה (היא יוצאת מוקדם), ובלי
    // האיפוס כאן פתיחה חוזרת הייתה מתחילה עם ספינר תקוע
    setItemsLoading(false);
  }, []);

  const resetFile = useCallback(() => {
    setParsed(null);
    setCheck(null);
    setReport(null);
    setParseError("");
    setMismatch(null);
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  // ההיסטוריה הקיימת נטענת בכל פתיחה: היא מה שהיבוא עומד לדרוס
  const loadExisting = useCallback(async () => {
    if (!customerId) return;
    setIsLoadingExisting(true);
    setLoadError("");
    // איפוס לפני השליפה, אחרת פתיחה של לקוח אחר מציגה לרגע את הקודם
    setExisting(null);
    try {
      // ‏limit: 1 — הפאנל הזה משתמש רק במטא (כמה מוצרים, טווח, מי העלה).
      // השורות עצמן נטענות בלחיצה על "הצג את רשימת המוצרים", כי הן מאות
      // שורות מועשרות בנתוני קטלוג שברוב הפתיחות איש לא מסתכל בהן.
      // ‏0 אינו מותר בשרת (הוא מתגלגל לברירת המחדל), ולכן 1.
      const data = await CustomerHistoryServices.getCustomerHistory(customerId, {
        limit: 1,
      });
      setExisting(data);
    } catch (err) {
      setExisting(null);
      setLoadError(describeApiError(err, "טעינת ההיסטוריה נכשלה"));
    } finally {
      setIsLoadingExisting(false);
    }
  }, [customerId]);

  useEffect(() => {
    if (!isOpen) return;
    resetFile();
    resetItems();
    loadExisting();
  }, [isOpen, customerId, loadExisting, resetFile, resetItems]);

  // השהיית החיפוש. רצה רק כשהרשימה פתוחה, אחרת פתיחת המודל הייתה מפעילה
  // בקשה שאיש לא ביקש.
  useEffect(() => {
    if (!showItems) return undefined;
    const timeout = setTimeout(() => loadItems(itemSearch), 300);
    return () => clearTimeout(timeout);
  }, [showItems, itemSearch, loadItems]);

  const handleClose = () => {
    if (isImporting || isDeleting) return;
    resetFile();
    onClose();
  };

  const handleSelectFile = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setParseError("");
    setMismatch(null);
    setParsed(null);
    setCheck(null);
    setReport(null);

    try {
      const result = await parseCustomerHistoryFile(file);
      if (result.rows.length === 0) {
        throw new Error("לא נמצאו שורות היסטוריה תקינות בקובץ");
      }

      const rows = result.rows.map(toServerRow);
      assertPayloadFits(rows);
      setParsed(result);

      const checkRes = await CustomerHistoryServices.checkImport(customerId, {
        rows,
        customerNumbers: result.customerNumbers,
      });
      setCheck(checkRes);
    } catch (err) {
      // גם שגיאת פענוח מקומית וגם כשל בבדיקה מול השרת מגיעות לכאן
      setParseError(describeApiError(err, "פענוח הקובץ נכשל"));
    } finally {
      setIsParsing(false);
    }
  };

  const sendImport = async (force) => {
    setIsImporting(true);
    try {
      const res = await CustomerHistoryServices.importHistory(customerId, {
        rows: parsed.rows.map(toServerRow),
        fileName: parsed.fileName,
        customerNumbers: parsed.customerNumbers,
        createOrders,
        ...(force ? { force: true } : {}),
      });

      setReport(res);
      setMismatch(null);
      notifySuccess(res?.message || "ההיסטוריה נשמרה");
      resetItems();
      await loadExisting();
      onChanged?.();
    } catch (err) {
      // ── 409 אינו כשל אלא עצירה מכוונת ──
      //
      // השרת חוסם יבוא שמספר הלקוח בו סותר את הכרטיס. הצגתו כטוסט אדום הייתה
      // מציגה אותו כתקלה, ומי שקורא היה מנסה שוב במקום לבדוק את הקובץ.
      const code = err?.response?.data?.code;
      if (code === "customer_number_mismatch") {
        setMismatch(err.response.data);
      } else {
        notifyError(describeApiError(err, "שמירת ההיסטוריה נכשלה"));
      }
    } finally {
      setIsImporting(false);
    }
  };

  const handleImport = () => {
    if (!parsed?.rows?.length) return;
    sendImport(false);
  };

  const handleDelete = async () => {
    if (!existing?.exists) return;
    setIsDeleting(true);
    try {
      const res = await CustomerHistoryServices.deleteHistory(customerId);
      notifySuccess(res?.message || "ההיסטוריה הוסרה");
      resetFile();
      resetItems();
      await loadExisting();
      onChanged?.();
    } catch (err) {
      notifyError(describeApiError(err, "הסרת ההיסטוריה נכשלה"));
    } finally {
      setIsDeleting(false);
    }
  };

  const stats = parsed?.stats;
  const impact = check?.impact;
  const archive = check?.archiveOrders;
  const archiveReport = report?.archiveOrders;
  const busy = isImporting || isDeleting;

  return (
    // Modal של windmill דורך על מחלקות הבסיס של התמה כשמעבירים className,
    // לכן הבסיס מ-myTheme.js משוכפל כאן עם max-w רחב יותר
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      className="w-full bg-white rounded-lg dark:bg-gray-800 sm:rounded-lg m-4 sm:max-w-4xl custom-modal"
    >
      <ModalBody className="text-sm text-gray-800 dark:text-gray-400 px-6 pt-6 pb-2 text-right max-h-[70vh] overflow-y-auto">
        <h2 className="text-xl font-medium mb-1 flex items-center gap-2 justify-end">
          {customerName ? `היסטוריית רכישות — ${customerName}` : "היסטוריית רכישות"}
          <FiClock className="text-customGreen" />
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {'קובץ "היסטוריה ללקוח" מההנהח"ש. מכאן והלאה, כשהלקוח יזמין מוצר ' +
            "שמתאים לכמה פריטים בקטלוג, המערכת תבחר את זה שהוא באמת קונה — " +
            "במקום להעביר את השורה לטיפול ידני."}
        </p>

        {/* ההיסטוריה הקיימת */}
        <div className="p-4 mb-4 rounded-md bg-gray-50 dark:bg-gray-700">
          <h3 className="font-medium mb-2 flex items-center gap-2 justify-end text-sm dark:text-gray-200">
            ההיסטוריה הנוכחית
            {/* כשל טעינה אינו "אין היסטוריה" — הצגתו כ"אין" הייתה מזמינה
                העלאה מחדש שאינה נחוצה */}
            {loadError ? (
              <Badge type="danger">
                <span className="font-bold">לא נטענה</span>
              </Badge>
            ) : existing?.exists ? (
              <Badge type="success">
                <span className="font-bold">קיימת</span>
              </Badge>
            ) : (
              <Badge type="neutral">
                <span className="font-bold">אין</span>
              </Badge>
            )}
          </h3>

          {isLoadingExisting ? (
            <div className="flex items-center justify-center gap-2 py-2 text-sm dark:text-gray-300">
              <img src={spinnerLoadingImage} alt="Loading" width={20} height={10} />
              טוען...
            </div>
          ) : loadError ? (
            <div className="flex items-start gap-2 text-sm text-red-600">
              <FiAlertTriangle className="mt-0.5 shrink-0" />
              <span>
                {loadError}
                <button
                  type="button"
                  onClick={loadExisting}
                  className="ml-2 underline focus:outline-none"
                >
                  נסה שוב
                </button>
              </span>
            </div>
          ) : existing?.exists ? (
            <>
              <Row label="מוצרים בהיסטוריה" value={existing.itemsCount} />
              <Row
                label="מהם נמצאו בקטלוג"
                value={existing.matchedInCatalog}
                tone={
                  existing.matchedInCatalog < existing.itemsCount
                    ? "text-orange-500"
                    : ""
                }
              />
              <Row label="טווח התאריכים" value={span(existing.spanFrom, existing.spanTo)} />
              <Row label="הקובץ שממנו יובא" value={existing.fileName || "—"} />
              <Row label="עודכן" value={formatDateTime(existing.importedAt)} />
              {existing.importedBy ? (
                <Row label="הועלה על ידי" value={existing.importedBy} />
              ) : null}

              {/* ── רשימת המוצרים ── */}
              <button
                type="button"
                onClick={() => setShowItems((open) => !open)}
                className="mt-3 flex w-full items-center justify-between rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-600"
              >
                <span className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  {showItems ? <FiChevronUp /> : <FiChevronDown />}
                </span>
                <span className="flex items-center gap-2 font-medium dark:text-gray-200">
                  {showItems
                    ? "הסתר את רשימת המוצרים"
                    : `הצג את רשימת המוצרים (${existing.itemsCount})`}
                  <FiList className="text-customGreen" />
                </span>
              </button>

              {showItems ? (
                <div className="mt-3">
                  {/* החיפוש רץ בשרת ולכן הוא מוצא גם מוצרים שמעבר לתקרת התצוגה */}
                  <div className="relative mb-2">
                    <FiSearch className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      placeholder='חיפוש לפי שם או מק"ט'
                      className="w-full rounded-md border border-gray-200 bg-white py-1.5 pr-9 pl-3 text-sm focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                    />
                  </div>

                  {itemsLoading ? (
                    <div className="flex items-center justify-center gap-2 py-4 text-sm dark:text-gray-300">
                      <img src={spinnerLoadingImage} alt="Loading" width={20} height={10} />
                      טוען...
                    </div>
                  ) : itemsError ? (
                    <div className="flex items-start gap-2 text-sm text-red-600">
                      <FiAlertTriangle className="mt-0.5 shrink-0" />
                      <span>
                        {itemsError}
                        <button
                          type="button"
                          onClick={() => loadItems(itemSearch)}
                          className="ml-2 underline focus:outline-none"
                        >
                          נסה שוב
                        </button>
                      </span>
                    </div>
                  ) : items?.length ? (
                    <>
                      <div className="max-h-72 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-600">
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                            <tr>
                              <th className="px-2 py-1.5 text-right font-medium">מק"ט</th>
                              <th className="px-2 py-1.5 text-right font-medium">שם בקובץ</th>
                              <th className="px-2 py-1.5 text-center font-medium">פעמים</th>
                              <th className="px-2 py-1.5 text-center font-medium">כמות</th>
                              <th className="px-2 py-1.5 text-center font-medium">מחיר אחרון</th>
                              <th className="px-2 py-1.5 text-center font-medium">נקנה לאחרונה</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item) => (
                              <tr
                                key={item.sku}
                                className="border-t border-gray-200 dark:border-gray-600"
                              >
                                <td className="px-2 py-1.5 text-right font-mono text-gray-500 dark:text-gray-400">
                                  {item.sku}
                                </td>
                                {/* ── שם הקובץ מול שם הקטלוג ──
                                    ההתאמה היא לפי מק"ט בלבד, ולכן פער בין
                                    השניים הוא הסימן היחיד לעמודה שהוזזה
                                    בקובץ. מק"ט שאינו בקטלוג מסומן בנפרד:
                                    הוא אינו יכול להכריע שורה בהזמנה. */}
                                <td className="px-2 py-1.5 text-right dark:text-gray-200">
                                  <div>{item.name || "—"}</div>
                                  {!item.inCatalog ? (
                                    <span className="text-orange-500">אינו בקטלוג</span>
                                  ) : item.catalogTitle && item.catalogTitle !== item.name ? (
                                    <span className="text-gray-400">
                                      {`בקטלוג: ${item.catalogTitle}`}
                                    </span>
                                  ) : null}
                                </td>
                                <td className="px-2 py-1.5 text-center dark:text-gray-300">
                                  {item.lines}
                                </td>
                                <td className="px-2 py-1.5 text-center dark:text-gray-300">
                                  {formatNumber(item.totalQty)}
                                </td>
                                <td className="px-2 py-1.5 text-center dark:text-gray-300">
                                  {formatMoney(item.lastPrice)}
                                </td>
                                {/* תאריך מהקובץ — מוצג כפי שנכתב בו, בלי
                                    תרגום לאזור הזמן של הצופה */}
                                <td className="px-2 py-1.5 text-center dark:text-gray-300">
                                  {formatFileDate(item.lastAt)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* ── חיתוך שקט הוא בדיוק מה שאסור ── */}
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {itemsMeta && itemsMeta.returned < itemsMeta.filtered
                          ? `מוצגים ${itemsMeta.returned} מתוך ${itemsMeta.filtered} — צמצם בעזרת החיפוש.`
                          : `${items.length} מוצרים.`}
                      </p>
                    </>
                  ) : (
                    <p className="py-3 text-sm text-gray-500 dark:text-gray-400">
                      {itemSearch
                        ? `לא נמצא מוצר שמתאים ל-"${itemSearch}".`
                        : "אין מוצרים בהיסטוריה."}
                    </p>
                  )}
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {"ללקוח אין היסטוריית רכישות שמורה — שורות עמומות בהזמנות שלו " +
                "ממשיכות להגיע לטיפול ידני."}
            </p>
          )}
        </div>

        {/* בחירת קובץ */}
        <div className="border border-dashed border-customGreen rounded-md p-4 mb-4">
          <label className="flex items-center justify-center gap-2 cursor-pointer text-sm dark:text-gray-300">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleSelectFile}
              disabled={isParsing || busy}
              className="hidden"
            />
            <FiUploadCloud className="text-lg text-customGreen" />
            {parsed?.fileName || "בחר קובץ אקסל (xlsx / xls / csv)"}
          </label>
          {parsed && !busy && (
            <button
              type="button"
              onClick={resetFile}
              className="mt-2 mx-auto flex items-center gap-1 text-xs text-red-500 focus:outline-none"
            >
              <FiXCircle /> הסר קובץ
            </button>
          )}
        </div>

        {isParsing && (
          <div className="flex items-center justify-center gap-2 py-4 text-sm dark:text-gray-300">
            <img src={spinnerLoadingImage} alt="Loading" width={20} height={10} />
            מפענח ובודק מול הקטלוג...
          </div>
        )}

        {parseError ? (
          <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 mb-4 text-sm text-red-600 dark:bg-gray-700">
            <FiAlertTriangle className="mt-0.5 shrink-0" />
            <span>{parseError}</span>
          </div>
        ) : null}

        {/* הקובץ שייך ללקוח אחר */}
        {mismatch ? (
          <div className="rounded-md bg-orange-50 p-3 mb-4 text-sm dark:bg-gray-700">
            <div className="flex items-start gap-2 text-orange-700 dark:text-orange-400">
              <FiAlertTriangle className="mt-0.5 shrink-0" />
              <span>{mismatch.message}</span>
            </div>
            <Button
              type="button"
              layout="outline"
              onClick={() => sendImport(true)}
              disabled={isImporting}
              className="mt-3 px-4 py-1.5 text-xs"
            >
              בדקתי — העלה בכל זאת
            </Button>
          </div>
        ) : null}

        {/* תצוגה מקדימה */}
        {check && !report ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="p-4 rounded-md bg-gray-50 dark:bg-gray-700">
              <h3 className="font-medium mb-2 text-sm dark:text-gray-200">מה יש בקובץ</h3>
              <Row label="שורות מסמך" value={check.received} />
              <Row label="מוצרים שונים" value={check.products} />
              <Row
                label="מהם בקטלוג"
                value={check.matched}
                tone={check.unknown ? "text-orange-500" : "text-green-600"}
              />
              {check.unknown ? (
                <Row
                  label='מק"טים שאינם בקטלוג'
                  value={check.unknown}
                  tone="text-orange-500"
                />
              ) : null}
              <Row label="טווח התאריכים" value={span(check.spanFrom, check.spanTo)} />
              {stats?.skipped ? (
                <Row label="שורות שדולגו" value={stats.skipped} tone="text-gray-500" />
              ) : null}
              {check.nameMismatchCount ? (
                <Row
                  label="שמות שאינם תואמים לקטלוג"
                  value={check.nameMismatchCount}
                  tone="text-orange-500"
                />
              ) : null}
            </div>

            <div className="p-4 rounded-md bg-gray-50 dark:bg-gray-700">
              <h3 className="font-medium mb-2 text-sm dark:text-gray-200">
                מה זה יפתור
              </h3>
              {/* ── המספר שבגללו המסך הזה קיים ── */}
              {impact === null || impact === undefined ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {"לא נמדד — עדיין לא נקלטו הזמנות שנכשלו אצל הלקוח הזה, " +
                    "או שהמדידה לא הסתיימה."}
                </p>
              ) : impact.linesTotal === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  אין כרגע שורות תקועות אצל הלקוח הזה. ההיסטוריה תשפיע על הזמנות
                  עתידיות.
                </p>
              ) : (
                <>
                  <Row
                    label="שורות תקועות עכשיו"
                    value={impact.linesTotal}
                  />
                  <Row
                    label="ייפתרו אוטומטית"
                    value={impact.resolved}
                    tone={impact.resolved ? "text-green-600" : "text-gray-500"}
                  />
                  {impact.hinted ? (
                    <Row
                      label="יקבלו רמז לעובד"
                      value={impact.hinted}
                      tone="text-blue-500"
                    />
                  ) : null}
                  {/* ‏truncated אינו קוסמטי: בלעדיו המספר נקרא כמדידה מלאה */}
                  {impact.truncated ? (
                    <p className="mt-2 text-xs text-orange-500">
                      {`נמדדו ${impact.linesChecked} השורות האחרונות מתוך ${impact.linesTotal} — ` +
                        "המספר בפועל יכול להיות גבוה יותר."}
                    </p>
                  ) : null}

                  {impact.samples?.length ? (
                    <div className="mt-3 max-h-40 overflow-y-auto text-xs">
                      {impact.samples.slice(0, MAX_LIST).map((sample, index) => (
                        <div
                          key={`${sample.invoice}-${sample.rawName}-${index}`}
                          className="border-t border-gray-200 py-1 dark:border-gray-600"
                        >
                          <span className="text-gray-500 dark:text-gray-400">
                            {`#${sample.invoice} · "${sample.rawName}" → `}
                          </span>
                          <span
                            className={
                              sample.tier === "decisive"
                                ? "font-medium text-green-600"
                                : "text-blue-500"
                            }
                          >
                            {sample.productTitle}
                            {sample.tier === "decisive" ? "" : " (רמז בלבד)"}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </>
              )}
            </div>

            {/* אזהרות — רק כשיש מה להגיד */}
            {check.numberMatches === false ? (
              <div className="sm:col-span-2 flex items-start gap-2 rounded-md bg-orange-50 p-3 text-sm text-orange-700 dark:bg-gray-700 dark:text-orange-400">
                <FiAlertTriangle className="mt-0.5 shrink-0" />
                <span>
                  {`מספר הלקוח בקובץ (${check.fileCustomerNumbers.join(", ")}) שונה ` +
                    `מזה שבכרטיס (${check.customerNumber}). ודא שזה הקובץ הנכון — ` +
                    "היסטוריה של לקוח אחר תגרום למערכת לבחור מוצרים שהלקוח הזה לא מזמין."}
                </span>
              </div>
            ) : null}

            {check.nameMismatches?.length ? (
              <div className="sm:col-span-2 p-3 rounded-md bg-orange-50 text-xs dark:bg-gray-700">
                <p className="mb-1 font-medium text-orange-700 dark:text-orange-400">
                  {'שמות שאינם תואמים לשם בקטלוג (ההתאמה היא לפי מק"ט, ' +
                    "ופער גדול כאן מרמז על עמודה שהוזזה):"}
                </p>
                <div className="max-h-32 overflow-y-auto">
                  {check.nameMismatches.slice(0, MAX_LIST).map((item) => (
                    <div key={item.sku} className="py-0.5 text-gray-600 dark:text-gray-300">
                      {`${item.sku}: "${item.fileName}" ≠ "${item.catalogTitle}"`}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* ── הזמנות הארכיון ── */}
            <div className="sm:col-span-2 p-4 rounded-md bg-gray-50 dark:bg-gray-700">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createOrders}
                  onChange={(e) => setCreateOrders(e.target.checked)}
                  disabled={busy}
                  className="mt-1 form-checkbox text-customGreen focus:outline-none"
                />
                <span className="text-sm dark:text-gray-200">
                  <span className="font-medium">צור גם הזמנות ארכיון</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    {'כל מסמך בקובץ (תעודת משלוח / חשבונית) הופך להזמנה בתאריך שלו, ' +
                      'בסטטוס "הזמנת ארכיון". ההזמנות מוצגות בכרטיס הלקוח, ואינן ' +
                      "מורידות מלאי, אינן נשלחות למלקטים ואינן נספרות בדוחות ההכנסות."}
                  </span>
                </span>
              </label>

              {archive ? (
                <div className="mt-3 border-t border-gray-200 pt-2 dark:border-gray-600">
                  <Row
                    label="הזמנות שייווצרו"
                    value={archive.willCreate}
                    tone={archive.willCreate ? "text-green-600" : "text-gray-500"}
                  />
                  {/* ── המספר שמונע כפילויות ── */}
                  {archive.willUpdate ? (
                    <Row
                      label="מסמכים שכבר יובאו ויתעדכנו"
                      value={archive.willUpdate}
                      tone="text-blue-500"
                    />
                  ) : null}
                  <Row label="טווח התאריכים" value={span(archive.from, archive.to)} />

                  {/* ── אותה סחורה פעמיים ──
                      ייצוא שמכיל גם את תעודת המשלוח וגם את החשבונית שהופקה
                      עליה מייצר שתי הזמנות לאותה סחורה. אי אפשר להסיק מהקובץ
                      אילו שתי שורות הן אותו משלוח, ולכן זו החלטה של אדם —
                      והמספר הזה הוא מה שמאפשר לו לקבל אותה. */}
                  {archive.byDocType?.length > 1 ? (
                    <div className="mt-2 rounded bg-orange-50 p-2 text-xs text-orange-700 dark:bg-gray-600 dark:text-orange-300">
                      <p className="font-medium">
                        {"הקובץ מכיל יותר מסוג מסמך אחד: " +
                          archive.byDocType
                            .map((item) => `${item.docType} (${item.orders})`)
                            .join(", ")}
                      </p>
                      <p className="mt-1">
                        {"אם חשבונית הופקה על תעודת משלוח שגם היא בקובץ, אותה " +
                          "סחורה תיווצר כשתי הזמנות. ייצא סוג מסמך אחד בלבד."}
                      </p>
                    </div>
                  ) : null}

                  {/* ── קיבוץ לפי יום ולא לפי מסמך ── */}
                  {archive.byDateOnly ? (
                    <p className="mt-2 text-xs text-orange-500">
                      {`ל-${archive.byDateOnly} מהן אין מספר מסמך בקובץ — כל שורות ` +
                        "אותו יום קובצו יחד. אם היו כמה תעודות באותו יום הן יופיעו " +
                        "כהזמנה אחת."}
                    </p>
                  ) : null}
                  {/* המונה כולל שני מקרים: שורה בלי תאריך ובלי מספר מסמך,
                      ומסמך שלאף שורה בו אין תאריך. הניסוח מכסה את שניהם. */}
                  {archive.skippedNoDate ? (
                    <p className="mt-2 text-xs text-orange-500">
                      {`${archive.skippedNoDate} שורות אין להן תאריך שאפשר לתארך לפיו — ` +
                        "אינן הופכות להזמנה (הן כן נכנסות לפרופיל הרכישות)."}
                    </p>
                  ) : null}
                  {archive.overLimit ? (
                    <p className="mt-2 text-xs text-orange-500">
                      {`הקובץ מכיל ${archive.totalInFile} מסמכים — ייווצרו ` +
                        `${archive.orders} המוקדמים בלבד, ו-${archive.overLimit} ` +
                        "לא ייווצרו. ייצא טווח תאריכים קצר יותר."}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            {check.overwrites ? (
              <div className="sm:col-span-2 flex items-start gap-2 rounded-md bg-blue-50 p-3 text-sm text-blue-700 dark:bg-gray-700 dark:text-blue-300">
                <FiAlertTriangle className="mt-0.5 shrink-0" />
                <span>
                  {`ללקוח כבר יש היסטוריה של ${check.overwrites.itemsCount} מוצרים ` +
                    `(מ-${formatDateTime(check.overwrites.importedAt)}). ` +
                    "היבוא דורס אותה במלואה."}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* דוח */}
        {report ? (
          <div className="p-4 rounded-md bg-green-50 dark:bg-gray-700">
            <h3 className="font-medium mb-2 flex items-center gap-2 justify-end text-sm text-green-700 dark:text-green-400">
              {report.message}
              <FiCheckCircle />
            </h3>
            <Row label="שורות בקובץ" value={report.received} />
            <Row label="מוצרים שנשמרו" value={report.imported} />
            <Row label="מהם בקטלוג" value={report.matchedInCatalog} />
            {report.notInCatalog ? (
              <Row
                label='מק"טים שאינם בקטלוג'
                value={report.notInCatalog}
                tone="text-orange-500"
              />
            ) : null}
            <Row label="טווח התאריכים" value={span(report.spanFrom, report.spanTo)} />

            {/* ── דוח הזמנות הארכיון ── */}
            {archiveReport?.error ? (
              <p className="mt-3 border-t border-green-200 pt-2 text-sm text-red-600 dark:border-gray-600">
                {`ההיסטוריה נשמרה, אבל יצירת הזמנות הארכיון נכשלה: ${archiveReport.error}`}
              </p>
            ) : archiveReport ? (
              <div className="mt-3 border-t border-green-200 pt-2 dark:border-gray-600">
                <Row label="הזמנות ארכיון שנוצרו" value={archiveReport.created} />
                {archiveReport.updated ? (
                  <Row label="הזמנות שעודכנו" value={archiveReport.updated} tone="text-blue-500" />
                ) : null}
                {/* כשל של מסמך בודד אינו עוצר את היבוא, ולכן הוא חייב להיראות
                    כאן — אחרת הוא נעלם לגמרי */}
                {archiveReport.failed ? (
                  <Row
                    label="מסמכים שנכשלו"
                    value={archiveReport.failed}
                    tone="text-red-600"
                  />
                ) : null}
                {archiveReport.empty ? (
                  <Row
                    label='מסמכים שאף מק"ט בהם אינו בקטלוג'
                    value={archiveReport.empty}
                    tone="text-orange-500"
                  />
                ) : null}
                {/* חיתוך שנשאר בשקט נקרא כמו "הכל נוצר" */}
                {archiveReport.overLimit ? (
                  <Row
                    label="מסמכים שלא נוצרו (מעל התקרה)"
                    value={archiveReport.overLimit}
                    tone="text-orange-500"
                  />
                ) : null}
                {archiveReport.failures?.length ? (
                  <div className="mt-2 max-h-32 overflow-y-auto text-xs text-red-600">
                    {archiveReport.failures.slice(0, MAX_LIST).map((item, index) => (
                      <div key={`${item.docNumber}-${index}`} className="py-0.5">
                        {`${item.docNumber || formatFileDate(item.date)}: ${item.message}`}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </ModalBody>

      <ModalFooter className="px-6 py-3 justify-between">
        <div>
          {existing?.exists && !report ? (
            <Button
              type="button"
              layout="outline"
              onClick={handleDelete}
              disabled={busy}
              className="px-4 py-2 text-sm text-red-600 border-red-300"
            >
              <FiTrash2 className="mr-1" />
              {isDeleting ? "מסיר..." : "הסרת ההיסטוריה"}
            </Button>
          ) : null}
        </div>

        <div className="flex gap-2">
          <Button layout="outline" onClick={handleClose} disabled={busy} className="px-4 py-2 text-sm">
            {report ? "סגור" : "ביטול"}
          </Button>
          {!report ? (
            <Button
              onClick={handleImport}
              disabled={!check || isParsing || busy || Boolean(mismatch)}
              className="px-4 py-2 text-sm"
            >
              {isImporting ? "שומר..." : "שמור היסטוריה"}
            </Button>
          ) : null}
        </div>
      </ModalFooter>
    </Modal>
  );
};

export default CustomerHistoryModal;
