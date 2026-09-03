// src/components/customer/ImportCustomersExcelModal.jsx
// יבוא לקוחות מקובץ האקסל של ההנהח"ש ("רשימת לקוחות").
// הזרימה: בחירת קובץ -> פענוח ובדיקה מול המערכת -> תצוגה מקדימה
// -> אישור והרצה באצוות -> דוח מסכם. אין מחיקת לקוחות ואין נגיעה בסיסמאות.
import { Button, Modal, ModalBody, ModalFooter } from "@windmill/react-ui";
import React, { useCallback, useRef, useState } from "react";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiFileText,
  FiUploadCloud,
  FiXCircle,
} from "react-icons/fi";

// Internal import
import spinnerLoadingImage from "@/assets/img/spinner.gif";
import CustomerServices from "@/services/CustomerServices";
import {
  parseErpCustomersFile,
  toServerRow,
} from "@/utils/erpCustomerExcel";
import { notifyError, notifySuccess } from "@/utils/toast";

const CHUNK_SIZE = 500;

// תקרה לפירוט הכשלים על המסך, כדי שקובץ פגום לא ירנדר אלפי שורות.
// גבוהה מספיק כדי שביבוא רגיל כל הכשלים יופיעו בפועל
const MAX_FAILURE_LIST = 500;

// הגדרות היבוא קבועות ולא מוצגות במסך: לקוח חדש נוצר, נתוני ההנהח"ש
// מסונכרנים, ושם/טלפון/כתובת של לקוח קיים בחנות לא נדרסים מהקובץ.
const IMPORT_OPTIONS = {
  createNew: true,
  updateExisting: true,
  updateName: false,
  updatePhone: false,
  updateAddress: false,
  placeholderEmail: true,
  matchByPhone: true,
};

const Row = ({ label, value, tone = "" }) => (
  <div className="flex items-center justify-between gap-3 py-1 text-sm">
    <span className="text-gray-500 dark:text-gray-400">{label}</span>
    <span className={`font-medium ${tone || "text-gray-700 dark:text-gray-200"}`}>
      {value}
    </span>
  </div>
);

const ImportCustomersExcelModal = ({ isOpen, onClose, onImported }) => {
  const fileRef = useRef();

  const [parsed, setParsed] = useState(null);
  const [check, setCheck] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [report, setReport] = useState(null);
  const [parseError, setParseError] = useState("");

  const resetAll = useCallback(() => {
    setParsed(null);
    setCheck(null);
    setReport(null);
    setParseError("");
    setProgress({ done: 0, total: 0 });
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  const handleClose = () => {
    if (isImporting) return;
    resetAll();
    onClose();
  };

  const handleSelectFile = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setParseError("");
    setParsed(null);
    setCheck(null);
    setReport(null);

    try {
      const result = await parseErpCustomersFile(file);
      if (result.rows.length === 0) {
        throw new Error("לא נמצאו שורות לקוחות תקינות בקובץ");
      }
      setParsed(result);

      const checkRes = await CustomerServices.checkImportCustomers({
        customerNumbers: result.rows.map((row) => row.customerNumber),
        emails: result.rows.map((row) => row.email).filter(Boolean),
        phones: result.rows.map((row) => row.phone).filter(Boolean),
      });
      setCheck(checkRes);
    } catch (err) {
      setParseError(err?.response?.data?.message || err?.message || "פענוח הקובץ נכשל");
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = async () => {
    if (!parsed?.rows?.length) return;

    const rows = parsed.rows.map(toServerRow);
    const chunks = [];
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      chunks.push(rows.slice(i, i + CHUNK_SIZE));
    }

    setIsImporting(true);
    setProgress({ done: 0, total: rows.length });

    // הדוח מציג כמה הועלו, כמה עודכנו, כמה נכשלו ומי נכשל, וכמה נוצרו
    // בלי כתובת מייל אמיתית
    const totals = {
      created: 0,
      updated: 0,
      skipped: 0,
      placeholderEmails: 0,
      errors: [],
    };

    try {
      for (let i = 0; i < chunks.length; i++) {
        const res = await CustomerServices.importCustomers({
          rows: chunks[i],
          options: IMPORT_OPTIONS,
        });

        totals.created += res?.created || 0;
        totals.updated += res?.updated || 0;
        totals.skipped += res?.skipped || 0;
        totals.placeholderEmails += res?.placeholderEmails || 0;
        totals.errors.push(...(res?.errors || []));

        setProgress({
          done: Math.min(rows.length, (i + 1) * CHUNK_SIZE),
          total: rows.length,
        });
      }

      // בניגוד ליבוא מוצרים, כאן כל שורה עם שם או מספר לקוח נשלחת לשרת,
      // ולכן כל הכשלים מגיעים ממנו ואין מה לצרף מצד הלקוח
      setReport({
        created: totals.created,
        updated: totals.updated,
        failed: totals.skipped,
        placeholderEmails: totals.placeholderEmails,
        failures: totals.errors,
      });

      const summary = `הועלו ${totals.created}, עודכנו ${totals.updated}, נכשלו ${totals.skipped}`;
      // כשאף שורה לא נכנסה זו לא הצלחה, גם אם הבקשות עצמן הסתיימו תקין
      if (totals.created + totals.updated > 0) notifySuccess(summary);
      else notifyError(summary);

      // רענון הטבלה מתבצע תמיד, כדי שהמסך ישקף את המסד גם אחרי יבוא חלקי
      onImported?.();
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message || "היבוא נכשל");
    } finally {
      setIsImporting(false);
    }
  };

  const stats = parsed?.stats;
  const importSucceeded = !!report && report.created + report.updated > 0;

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
          ייבוא לקוחות מאקסל
          <FiFileText className="text-customGreen" />
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {"ההתאמה לפי מספר לקוח, ואם אין - לפי אימייל או נייד. לקוחות לא נמחקים וסיסמאות לא משתנות."}
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
              onClick={resetAll}
              className="mt-2 mx-auto flex items-center gap-1 text-xs text-red-500 focus:outline-none"
            >
              <FiXCircle /> הסר קובץ
            </button>
          )}
        </div>

        {isParsing && (
          <div className="flex items-center justify-center gap-2 py-4 text-sm dark:text-gray-300">
            <img src={spinnerLoadingImage} alt="Loading" width={20} height={10} />
            קורא את הקובץ...
          </div>
        )}

        {parseError && (
          <div className="flex items-start gap-2 p-3 mb-4 rounded-md bg-red-50 dark:bg-gray-700 text-sm text-red-600">
            <FiAlertTriangle className="mt-0.5" />
            <span>{parseError}</span>
          </div>
        )}

        {/* דוח מסכם לאחר יבוא */}
        {report && (
          <div className="p-4 mb-4 rounded-md bg-gray-50 dark:bg-gray-700">
            <h3 className="font-medium mb-2 flex items-center gap-2 justify-end dark:text-gray-200">
              {importSucceeded ? "היבוא הושלם" : "לא יובאה אף שורה"}
              {importSucceeded ? (
                <FiCheckCircle className="text-customGreen" />
              ) : (
                <FiAlertTriangle className="text-orange-500" />
              )}
            </h3>
            <Row label="הועלו" value={report.created} />
            <Row label="עודכנו" value={report.updated} />
            <Row
              label="נכשלו"
              value={report.failed}
              tone={report.failed > 0 ? "text-orange-500" : ""}
            />
            {/* לקוח שאין לו מייל בעמודת "דואר אלקטרוני" נוצר עם מזהה פנימי
                (erp-<מספר>@import.local) ולא ניתן לשלוח אליו חשבונית. מייל
                שמופיע בעמודת "איש קשר" אינו ממלא את מקומו - הוא נשמר כמייל
                איש קשר בלבד. הספירה מוצגת כדי שהמצב הזה לא יתגלה רק בסוף החודש */}
            {report.placeholderEmails > 0 && (
              <Row
                label="נוצרו בלי כתובת מייל"
                value={report.placeholderEmails}
                tone="text-orange-500"
              />
            )}
            {report.failures.length > 0 && (
              <div className="mt-3 max-h-40 overflow-y-auto text-xs">
                {report.failures.slice(0, MAX_FAILURE_LIST).map((failure, index) => (
                  <div
                    key={`${failure.rowNumber || ""}-${failure.customerNumber || ""}-${index}`}
                    className="py-1 border-b border-gray-200 dark:border-gray-600 text-orange-600"
                  >
                    {[
                      failure.rowNumber ? `שורה ${failure.rowNumber}` : "",
                      failure.customerNumber,
                      failure.name,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    {" — "}
                    {failure.message}
                  </div>
                ))}
                {/* השרת מפרט עד 50 שגיאות לכל אצווה, והתצוגה מוגבלת בנוסף */}
                {report.failed > Math.min(report.failures.length, MAX_FAILURE_LIST) && (
                  <div className="py-1 text-gray-500 dark:text-gray-400">
                    {`ועוד ${
                      report.failed - Math.min(report.failures.length, MAX_FAILURE_LIST)
                    } שורות שנכשלו (הפירוט מוגבל)`}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* תצוגה מקדימה + הגדרות */}
        {parsed && !report && (
          <>
            <div className="grid gap-4 md:grid-cols-2 mb-4">
              <div className="p-4 rounded-md bg-gray-50 dark:bg-gray-700">
                <h3 className="font-medium mb-2 text-sm dark:text-gray-200">
                  סיכום הקובץ
                </h3>
                <Row label="שורת הכותרות שזוהתה" value={parsed.headerRowNumber} />
                <Row label="לקוחות לייבוא" value={stats.total} />
                {check && (
                  <>
                    <Row
                      label="כבר קיימים לפי מספר לקוח"
                      value={check.matchedByNumber}
                    />
                    <Row
                      label="זוהו לפי אימייל או נייד"
                      value={check.matchedByEmail + check.matchedByPhone}
                    />
                    <Row label="סך הלקוחות במערכת" value={check.totalCustomers} />
                  </>
                )}
                {parsed.duplicateNumbers.length > 0 && (
                  <Row
                    label="מספרי לקוח כפולים בקובץ"
                    value={parsed.duplicateNumbers.length}
                    tone="text-orange-500"
                  />
                )}
              </div>

              <div className="p-4 rounded-md bg-gray-50 dark:bg-gray-700">
                <h3 className="font-medium mb-2 text-sm dark:text-gray-200">
                  בדיקת הנתונים בקובץ
                </h3>
                <Row
                  label="אימיילים כפולים בקובץ"
                  value={parsed.duplicateEmails.length}
                  tone={parsed.duplicateEmails.length > 0 ? "text-orange-500" : ""}
                />
                <Row label="שורות שמסומנות כלא פעילות" value={stats.inactive} />
              </div>
            </div>

            {/* שורות שלא ייובאו */}
            {stats.skipped > 0 && (
              <div className="flex items-start gap-2 p-3 mb-4 rounded-md bg-yellow-50 dark:bg-gray-700 text-sm text-yellow-700 dark:text-yellow-500">
                <FiAlertTriangle className="mt-0.5 shrink-0" />
                <span>
                  {`${stats.skipped} שורות לא ייובאו. הסיבות למטה - אפשר להשלים באקסל ולהריץ שוב.`}
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

            {parsed.duplicateEmails.length > 0 && (
              <div className="p-3 mb-4 rounded-md bg-gray-50 dark:bg-gray-700 text-xs text-gray-500 dark:text-gray-400">
                {"שני לקוחות עם אותה כתובת אימייל נשמרים בנפרד: לשני יינתן מזהה פנימי, והכתובת המקורית נשמרת בנתוני ההנהח\"ש שלו."}
              </div>
            )}

            {isImporting && (
              <div className="mt-4">
                <div className="h-2 rounded bg-gray-200 dark:bg-gray-600 overflow-hidden">
                  <div
                    className="h-full bg-customGreen transition-all"
                    style={{
                      width: `${
                        progress.total
                          ? Math.round((progress.done / progress.total) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {progress.done} / {progress.total}
                </p>
              </div>
            )}
          </>
        )}
      </ModalBody>

      <ModalFooter className="flex items-center justify-center gap-3 px-6 py-3 flex-row bg-gray-50 dark:bg-gray-800 rounded-b-lg">
        <Button
          layout="outline"
          className="w-full sm:w-auto"
          disabled={isImporting}
          onClick={handleClose}
        >
          {report ? "סגור" : "ביטול"}
        </Button>

        {!report && (
          <>
            {isImporting ? (
              <Button disabled className="w-full h-12 sm:w-auto">
                <img src={spinnerLoadingImage} alt="Loading" width={20} height={10} />
                <span className="font-serif mr-1 font-light">מעבד...</span>
              </Button>
            ) : (
              <Button
                className="w-full h-12 sm:w-auto"
                disabled={!parsed?.rows?.length || isParsing}
                onClick={handleImport}
              >
                {parsed?.rows?.length
                  ? `ייבוא ${parsed.rows.length} שורות`
                  : "ייבוא"}
              </Button>
            )}
          </>
        )}
      </ModalFooter>
    </Modal>
  );
};

export default ImportCustomersExcelModal;
