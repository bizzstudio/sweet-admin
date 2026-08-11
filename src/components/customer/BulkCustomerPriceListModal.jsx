// src/components/customer/BulkCustomerPriceListModal.jsx
// העלאת קובץ מחירונים מרוכז — קובץ אחד שמעדכן את המחירון של **כל** הלקוחות.
//
// הזרימה: בחירת קובץ -> פענוח וקיבוץ לפי מספר לקוח -> בדיקה מול המערכת
// (מי נמצא, למי כבר יש מחירון) -> תצוגה מקדימה -> יבוא באצוות -> דוח מסכם.
//
// שלוש הדגשות שהמסך חייב להעביר:
//   1. ההתאמה ללקוח היא לפי **מספר לקוח**. מספר שאין לו לקוח במערכת מדולג —
//      והוא מוצג לפני היבוא, לא אחריו.
//   2. היבוא **דורס** את המחירון הקיים של כל לקוח שמופיע בקובץ.
//   3. לקוח שאינו בקובץ אינו נגע כלל — המחירון הקיים שלו נשאר.
import {
  Badge,
  Button,
  Modal,
  ModalBody,
  ModalFooter,
} from "@windmill/react-ui";
import React, { useCallback, useRef, useState } from "react";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiUploadCloud,
  FiUsers,
  FiXCircle,
} from "react-icons/fi";

// Internal import
import spinnerLoadingImage from "@/assets/img/spinner.gif";
import CustomerPriceListServices from "@/services/CustomerPriceListServices";
import { describeApiError } from "@/utils/apiError";
import {
  chunkCustomers,
  collectUniqueProducts,
  parseBulkPriceListFile,
  toServerCustomer,
} from "@/utils/bulkCustomerPriceListExcel";
import { formatMoney } from "@/utils/displayFormat";
import { notifyError, notifySuccess } from "@/utils/toast";

// תקרה לפירוט על המסך, כדי שקובץ עם מאות אי-התאמות לא ירנדר אלפי שורות
const MAX_LIST = 100;

// ── גבולות האצווה ──
//
// חייבים להתיישר עם השרת (MAX_BULK_CUSTOMERS ו-MAX_ROWS ב-
// customerPriceListController): אצווה חורגת הייתה נדחית ב-400 באמצע היבוא,
// אחרי שחלק מהלקוחות כבר נשמרו.
const MAX_CUSTOMERS_PER_BATCH = 200;
const MAX_ROWS_PER_BATCH = 20000;

// ‏express.json בשרת מוגבל ל-4MB. הפיצול לפי מספר שורות בלבד אינו מספיק —
// שמות מוצרים בעברית מנפחים את הגוף — ולכן אצווה שחורגת מהתקרה מפוצלת שוב
const MAX_PAYLOAD_BYTES = 3.5 * 1024 * 1024;

const payloadBytes = (customers, fileName) =>
  new Blob([JSON.stringify({ fileName, customers })]).size;

/**
 * מפצל אצווה שחורגת מגודל הגוף לשתיים, ושוב אם צריך.
 * לקוח בודד שגדול מהתקרה בעצמו נשלח כמו שהוא — הדריסה חייבת להיות אטומית,
 * ופיצול שלו היה משאיר אותו עם חצי מחירון. במקרה הזה השרת יחזיר שגיאה ברורה.
 */
const splitToPayloadLimit = (batch, fileName) => {
  if (batch.length <= 1 || payloadBytes(batch, fileName) <= MAX_PAYLOAD_BYTES) {
    return [batch];
  }
  const middle = Math.ceil(batch.length / 2);
  return [
    ...splitToPayloadLimit(batch.slice(0, middle), fileName),
    ...splitToPayloadLimit(batch.slice(middle), fileName),
  ];
};

const Row = ({ label, value, tone = "" }) => (
  <div className="flex items-center justify-between gap-3 py-1 text-sm">
    <span className="text-gray-500 dark:text-gray-400">{label}</span>
    <span
      className={`font-medium ${tone || "text-gray-700 dark:text-gray-200"}`}
    >
      {value}
    </span>
  </div>
);

const BulkCustomerPriceListModal = ({ isOpen, onClose, onImported }) => {
  const fileRef = useRef();

  const [parsed, setParsed] = useState(null);
  const [check, setCheck] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [report, setReport] = useState(null);
  const [parseError, setParseError] = useState("");
  // כשל בבדיקה מול השרת, בנפרד מכשל בפענוח הקובץ: הראשון ניתן לניסיון חוזר
  // בלי לבחור את הקובץ מחדש, והשני מחייב קובץ אחר
  const [checkError, setCheckError] = useState("");

  const resetFile = useCallback(() => {
    setParsed(null);
    setCheck(null);
    setReport(null);
    setParseError("");
    setCheckError("");
    setProgress({ done: 0, total: 0 });
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  const handleClose = () => {
    if (isImporting) return;
    resetFile();
    onClose();
  };

  // הבדיקה שולחת מטא-נתונים בלבד: מספרי הלקוח והמק"טים הייחודיים עם שמותיהם.
  // הקובץ המלא הוא עשרות אלפי שורות ואינו נכנס לבקשה אחת
  const runCheck = useCallback(async (result) => {
    setIsChecking(true);
    setCheckError("");
    try {
      const checkRes = await CustomerPriceListServices.checkBulkImport({
        customerNumbers: result.customers.map((item) => item.customerNumber),
        products: collectUniqueProducts(result.customers),
      });
      setCheck(checkRes);
    } catch (err) {
      setCheck(null);
      setCheckError(describeApiError(err, "הבדיקה מול המערכת נכשלה"));
    } finally {
      setIsChecking(false);
    }
  }, []);

  const handleSelectFile = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setParseError("");
    setCheckError("");
    setParsed(null);
    setCheck(null);
    setReport(null);

    let result;
    try {
      result = await parseBulkPriceListFile(file);
      if (result.customers.length === 0) {
        throw new Error("לא נמצאו שורות מחירון תקינות בקובץ");
      }
      setParsed(result);
    } catch (err) {
      setParseError(describeApiError(err, "פענוח הקובץ נכשל"));
      return;
    } finally {
      setIsParsing(false);
    }

    // ── הבדיקה מופרדת מהפענוח ──
    //
    // כשל בבדיקה אינו כשל בקובץ, ולכן הוא אינו מוצג כשגיאת פענוח ואינו מוחק את
    // מה שכבר פוענח — הוא רק חוסם את היבוא ומציע ניסיון חוזר. בלי ההפרדה כשל
    // רשת רגעי היה מחייב לבחור את הקובץ מחדש
    await runCheck(result);
  };

  const handleImport = async () => {
    // ── בלי בדיקה מוצלחת אין יבוא ──
    //
    // הבדיקה היא השער היחיד שעומד בין קובץ שהעמודות בו הוזזו לבין תמחור שגוי
    // אצל מאות לקוחות בבת אחת. יבוא "עיוור" אחרי כשל רשת רגעי הוא בדיוק המצב
    // שבו אף אחד לא יראה את הבעיה עד שתגיע הזמנה
    if (!parsed?.customers?.length || !check) return;

    const customers = parsed.customers.map(toServerCustomer);
    const batches = chunkCustomers(customers, {
      maxCustomers: MAX_CUSTOMERS_PER_BATCH,
      maxRows: MAX_ROWS_PER_BATCH,
    }).flatMap((batch) => splitToPayloadLimit(batch, parsed.fileName));

    setIsImporting(true);
    setProgress({ done: 0, total: customers.length });

    const totals = {
      customersImported: 0,
      rowsImported: 0,
      created: 0,
      updated: 0,
      notInCatalog: 0,
      // אצווה שספירת הקטלוג שלה לא רצה (השרת מחזיר null) — הסכום שלמטה אינו
      // שלם, ואסור להציג אותו כאילו הוא כן
      catalogStatsPartial: false,
      failures: [],
    };

    try {
      for (let i = 0; i < batches.length; i++) {
        // אצווה שנכשלה אינה עוצרת את השאר: היבוא הוא לפי לקוח, וכל לקוח
        // שנשמר נשמר במלואו. עצירה כאן הייתה מבטלת גם את הלקוחות שאחריו
        try {
          const res = await CustomerPriceListServices.importBulk({
            fileName: parsed.fileName,
            customers: batches[i],
          });

          totals.customersImported += res?.customersImported || 0;
          totals.rowsImported += res?.rowsImported || 0;
          totals.created += res?.created || 0;
          totals.updated += res?.updated || 0;
          if (res?.notInCatalog === null || res?.notInCatalog === undefined) {
            totals.catalogStatsPartial = true;
          } else {
            totals.notInCatalog += res.notInCatalog;
          }
          totals.failures.push(...(res?.failures || []));
        } catch (err) {
          const message = describeApiError(err, "האצווה נכשלה");
          batches[i].forEach((customer) => {
            totals.failures.push({
              customerNumber: customer.customerNumber,
              customerName: customer.customerName,
              message,
            });
          });
        }

        setProgress({
          done: batches
            .slice(0, i + 1)
            .reduce((sum, batch) => sum + batch.length, 0),
          total: customers.length,
        });
      }

      setReport(totals);

      const summary =
        `נשמרו מחירונים ל-${totals.customersImported} לקוחות ` +
        `(${totals.rowsImported} שורות), נכשלו ${totals.failures.length}`;
      if (totals.customersImported > 0) notifySuccess(summary);
      else notifyError(summary);

      // רענון תמיד, כדי שהטבלה תשקף גם יבוא חלקי
      onImported?.();
    } catch (err) {
      // הבקשות עצמן כבר עטופות למעלה, ולכן כאן מגיע רק כשל בלתי צפוי. בלי
      // התפיסה הזו הוא היה נשאר כ-rejection לא מטופל, והמסך היה נתקע בלי דוח
      notifyError(describeApiError(err, "היבוא נכשל"));
    } finally {
      setIsImporting(false);
    }
  };

  const stats = parsed?.stats;

  return (
    // Modal של windmill דורך על מחלקות הבסיס של התמה כשמעבירים className,
    // לכן הבסיס מ-myTheme.js משוכפל כאן עם max-w רחב יותר (תוכן דו-טורי)
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      className="w-full bg-white rounded-lg dark:bg-gray-800 sm:rounded-lg m-4 sm:max-w-4xl custom-modal"
    >
      <ModalBody className="text-sm text-gray-800 dark:text-gray-400 px-6 pt-6 pb-2 text-right max-h-[70vh] overflow-y-auto">
        <h2 className="text-xl font-medium mb-1 flex items-center gap-2 justify-end">
          העלאת מחירונים לכל הלקוחות
          <FiUsers className="text-customGreen" />
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {'קובץ אחד עם העמודות: מספר לקוח, שם המוצר, מק"ט ומחיר. ' +
            "ההתאמה ללקוח לפי מספר הלקוח, וההתאמה למוצר לפי מק\"ט. " +
            "לקוח שאינו בקובץ נשאר עם המחירון הקיים שלו."}
        </p>

        {/* בחירת קובץ */}
        <div className="border border-dashed border-customGreen rounded-md p-4 mb-4">
          <label className="flex items-center justify-center gap-2 cursor-pointer text-sm dark:text-gray-300">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleSelectFile}
              disabled={isParsing || isImporting}
              className="hidden"
            />
            <FiUploadCloud className="text-lg text-customGreen" />
            {parsed?.fileName || "בחר קובץ אקסל (xlsx / xls / csv)"}
          </label>
          {parsed && !isImporting && (
            <button
              type="button"
              onClick={resetFile}
              className="mt-2 mx-auto flex items-center gap-1 text-xs text-red-500 focus:outline-none"
            >
              <FiXCircle /> הסר קובץ
            </button>
          )}
        </div>

        {(isParsing || isChecking) && (
          <div className="flex items-center justify-center gap-2 py-4 text-sm dark:text-gray-300">
            <img src={spinnerLoadingImage} alt="Loading" width={20} height={10} />
            {isParsing ? "קורא את הקובץ..." : "בודק מול המערכת..."}
          </div>
        )}

        {parseError && (
          <div className="flex items-start gap-2 p-3 mb-4 rounded-md bg-red-50 dark:bg-gray-700 text-sm text-red-600">
            <FiAlertTriangle className="mt-0.5" />
            <span>{parseError}</span>
          </div>
        )}

        {/* כשל בבדיקה חוסם את היבוא ומציע ניסיון חוזר — הקובץ כבר פוענח */}
        {checkError && !isChecking && (
          <div className="flex items-start gap-2 p-3 mb-4 rounded-md bg-red-50 dark:bg-gray-700 text-sm text-red-600">
            <FiAlertTriangle className="mt-0.5 shrink-0" />
            <span>
              {`${checkError} בלי הבדיקה אי אפשר לייבא: היא מה שמוודא שהעמודות בקובץ לא הוזזו.`}
              <button
                type="button"
                onClick={() => parsed && runCheck(parsed)}
                className="mr-2 underline focus:outline-none"
              >
                נסה שוב
              </button>
            </span>
          </div>
        )}

        {isImporting && progress.total > 0 && (
          <div className="p-3 mb-4 rounded-md bg-gray-50 dark:bg-gray-700 text-sm dark:text-gray-300">
            {`שומר מחירונים... ${progress.done} מתוך ${progress.total} לקוחות`}
          </div>
        )}

        {/* דוח מסכם */}
        {report && (
          <div className="p-4 mb-4 rounded-md bg-gray-50 dark:bg-gray-700">
            <h3 className="font-medium mb-2 flex items-center gap-2 justify-end dark:text-gray-200">
              היבוא הסתיים
              <FiCheckCircle className="text-customGreen" />
            </h3>
            <Row label="לקוחות שקיבלו מחירון" value={report.customersImported} />
            <Row label="מחירונים חדשים" value={report.created} />
            <Row label="מחירונים שעודכנו" value={report.updated} />
            <Row label="שורות שנשמרו" value={report.rowsImported} />
            {/* ספירת הקטלוג רצה אחרי הכתיבה, ולכן היא יכולה לחסר בלי שהיבוא
                נכשל. הצגת 0 במקרה כזה הייתה נראית כמו "הכול נמצא בקטלוג" */}
            <Row
              label='שורות עם מק"ט שאינו בקטלוג'
              value={
                report.catalogStatsPartial
                  ? `${report.notInCatalog}+ (הספירה חלקית)`
                  : report.notInCatalog
              }
              tone={
                report.notInCatalog > 0 || report.catalogStatsPartial
                  ? "text-orange-500"
                  : ""
              }
            />
            <Row
              label="לקוחות שנכשלו"
              value={report.failures.length}
              tone={report.failures.length > 0 ? "text-red-500" : ""}
            />

            {report.failures.length > 0 && (
              <div className="mt-2 max-h-40 overflow-y-auto text-xs text-red-600">
                {report.failures.slice(0, MAX_LIST).map((failure, index) => (
                  <div
                    key={`${failure.customerNumber}-${index}`}
                    className="py-1 border-b border-gray-200 dark:border-gray-600"
                  >
                    {`לקוח ${failure.customerNumber || "—"}`}
                    {failure.customerName ? ` (${failure.customerName})` : ""}
                    {` — ${failure.message}`}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* תצוגה מקדימה */}
        {parsed && !report && (
          <>
            <div className="grid gap-4 md:grid-cols-2 mb-4">
              <div className="p-4 rounded-md bg-gray-50 dark:bg-gray-700">
                <h3 className="font-medium mb-2 text-sm dark:text-gray-200">
                  סיכום הקובץ
                </h3>
                <Row label="שורת הכותרות שזוהתה" value={parsed.headerRowNumber} />
                <Row label="לקוחות בקובץ" value={stats.customers} />
                <Row label="שורות מחירון" value={stats.totalRows} />
                <Row label='מק"טים ייחודיים' value={stats.uniqueSkus} />
                <Row
                  label="טווח המחירים בקובץ"
                  value={`${formatMoney(stats.minPrice)} – ${formatMoney(stats.maxPrice)}`}
                />
                {stats.duplicateSkus > 0 && (
                  <Row
                    label='מק"טים כפולים אצל אותו לקוח'
                    value={`${stats.duplicateSkus} (השורה האחרונה קובעת)`}
                    tone="text-orange-500"
                  />
                )}
              </div>

              <div className="p-4 rounded-md bg-gray-50 dark:bg-gray-700">
                <h3 className="font-medium mb-2 text-sm dark:text-gray-200">
                  בדיקה מול המערכת
                </h3>
                {check ? (
                  <>
                    <Row label="לקוחות שיקבלו מחירון" value={check.matched} />
                    <Row
                      label="מספרי לקוח שלא נמצאו"
                      value={check.unknown}
                      tone={check.unknown > 0 ? "text-orange-500" : ""}
                    />
                    <Row
                      label="לקוחות שהמחירון שלהם ייכתב מחדש"
                      value={check.overwrites}
                      tone={check.overwrites > 0 ? "text-yellow-600" : ""}
                    />
                    <Row
                      label='מק"טים שנמצאו בקטלוג'
                      value={`${check.skusInCatalog} מתוך ${check.skus}`}
                      tone={
                        check.skusInCatalog < check.skus ? "text-orange-500" : ""
                      }
                    />
                    <Row
                      label="שמות שאינם תואמים לקטלוג"
                      value={check.nameMismatchCount}
                      tone={check.nameMismatchCount > 0 ? "text-orange-500" : ""}
                    />
                    {/* בלי טון אזהרה בכוונה: בקטלוג הזה כל המוצרים מוסתרים
                        כברירת מחדל, ואזהרה שנדלקת בכל ייבוא מאבדת משמעות */}
                    <Row
                      label="מוצרים שאינם מפורסמים בקטלוג"
                      value={check.hiddenProductCount}
                    />
                  </>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    לא בוצעה בדיקה — היבוא חסום
                  </p>
                )}
              </div>
            </div>

            {/* דריסה — האזהרה המרכזית של המסך */}
            {check?.overwrites > 0 && (
              <div className="flex items-start gap-2 p-3 mb-4 rounded-md bg-yellow-50 dark:bg-gray-700 text-sm text-yellow-700 dark:text-yellow-500">
                <FiAlertTriangle className="mt-0.5 shrink-0" />
                <span>
                  {`ל-${check.overwrites} לקוחות כבר יש מחירון, והיבוא יחליף אותו במלואו. ` +
                    'מק"ט שהיה במחירון הקודם ואינו בקובץ החדש יחזור למחיר הקטלוג.'}
                </span>
              </div>
            )}

            {/* ── אי-התאמת שמות: הסימן היחיד לקובץ שהעמודות בו הוזזו ──
                בקובץ מרוכז זה קריטי במיוחד: מק"ט שהוסט שורה אחת מתמחר את כל
                הקטלוג לא נכון אצל **כל** הלקוחות בבת אחת */}
            {check?.nameMismatches?.length > 0 && (
              <div className="p-3 mb-4 rounded-md bg-yellow-50 dark:bg-gray-700 text-xs text-yellow-700 dark:text-yellow-500">
                <p className="mb-2 font-medium">
                  {'שם המוצר בקובץ אינו תואם לשם בקטלוג. ההתאמה נעשית לפי מק"ט, ' +
                    "ולכן כדאי לוודא שהעמודות בקובץ לא הוזזו לפני שמאשרים:"}
                </p>
                <div className="max-h-40 overflow-y-auto">
                  {check.nameMismatches.slice(0, MAX_LIST).map((item, index) => (
                    <div
                      key={`${item.sku}-${index}`}
                      className="py-1 border-b border-gray-200 dark:border-gray-600"
                    >
                      {`מק"ט ${item.sku} — בקובץ: ${item.fileName || "—"} | בקטלוג: ${
                        item.catalogTitle || "—"
                      }`}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* מספרי לקוח שאין להם לקוח במערכת */}
            {check?.unknownNumbers?.length > 0 && (
              <div className="p-3 mb-4 rounded-md bg-yellow-50 dark:bg-gray-700 text-xs text-yellow-700 dark:text-yellow-500">
                <p className="mb-2 font-medium">
                  {"מספרי הלקוח האלה אינם קיימים במערכת והמחירון שלהם ידולג. " +
                    "אפשר לייבא אותם קודם דרך ייבוא הלקוחות מאקסל:"}
                </p>
                <div className="max-h-32 overflow-y-auto">
                  {check.unknownNumbers.slice(0, MAX_LIST).join(", ")}
                </div>
              </div>
            )}

            {/* מק"טים שאינם בקטלוג */}
            {check?.unknownSkuSamples?.length > 0 && (
              <div className="p-3 mb-4 rounded-md bg-gray-50 dark:bg-gray-700 text-xs text-gray-500 dark:text-gray-400">
                <p className="mb-2">
                  {'מק"טים שאינם בקטלוג נשמרים במחירון ויתפסו ברגע שהמוצר ייווצר. ' +
                    "הם אינם מונעים את הייבוא:"}
                </p>
                <div className="max-h-32 overflow-y-auto">
                  {check.unknownSkuSamples.slice(0, MAX_LIST).join(", ")}
                </div>
              </div>
            )}

            {/* שורות שדולגו בפענוח */}
            {stats.skipped > 0 && (
              <div className="flex items-start gap-2 p-3 mb-4 rounded-md bg-yellow-50 dark:bg-gray-700 text-sm text-yellow-700 dark:text-yellow-500">
                <FiAlertTriangle className="mt-0.5 shrink-0" />
                <span>
                  {`${stats.skipped} שורות לא ייובאו. אפשר להשלים באקסל ולהריץ שוב.`}
                  {stats.skippedReasons.length > 0 && (
                    <span className="block mt-1 text-xs">
                      {stats.skippedReasons
                        .map((item) => `${item.reason}: ${item.count}`)
                        .join(" · ")}
                    </span>
                  )}
                </span>
              </div>
            )}
          </>
        )}
      </ModalBody>

      <ModalFooter className="flex items-center justify-center gap-3 px-6 py-3 flex-row bg-gray-50 dark:bg-gray-800 rounded-b-lg">
        <Button
          type="button"
          layout="outline"
          className="w-full sm:w-auto"
          disabled={isImporting}
          onClick={handleClose}
        >
          {report ? "סגור" : "ביטול"}
        </Button>

        {!report &&
          (isImporting ? (
            <Button type="button" disabled className="w-full h-12 sm:w-auto">
              <img src={spinnerLoadingImage} alt="Loading" width={20} height={10} />
              <span className="font-serif mr-1 font-light">שומר...</span>
            </Button>
          ) : (
            <Button
              type="button"
              className="w-full h-12 sm:w-auto"
              // ‏check הוא תנאי: בלי בדיקה מוצלחת אין דרך לדעת שהעמודות בקובץ
              // לא הוזזו, והיבוא הזה נוגע במחירים של מאות לקוחות
              disabled={!parsed?.customers?.length || !check || isParsing || isChecking}
              onClick={handleImport}
            >
              {check?.matched
                ? `שמירת מחירונים ל-${check.matched} לקוחות`
                : "שמירת מחירונים"}
            </Button>
          ))}
      </ModalFooter>
    </Modal>
  );
};

export default BulkCustomerPriceListModal;
