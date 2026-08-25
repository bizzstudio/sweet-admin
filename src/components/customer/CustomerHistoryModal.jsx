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
  FiClock,
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
import { formatDateTime, formatFileDate } from "@/utils/displayFormat";
import { notifyError, notifySuccess } from "@/utils/toast";

// תקרה לפירוט על המסך, כדי שקובץ פגום לא ירנדר אלפי שורות
const MAX_LIST = 50;

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
      const data = await CustomerHistoryServices.getCustomerHistory(customerId, {
        limit: MAX_LIST,
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
    loadExisting();
  }, [isOpen, customerId, loadExisting, resetFile]);

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
        ...(force ? { force: true } : {}),
      });

      setReport(res);
      setMismatch(null);
      notifySuccess(res?.message || "ההיסטוריה נשמרה");
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
