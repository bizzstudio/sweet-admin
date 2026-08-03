// src/components/product/ImportExcelModal.jsx
// יבוא מוצרים מקובץ האקסל של ההנהח"ש ("רשימת המוצרים - כל הספקים").
// הזרימה: בחירת קובץ -> פענוח ובדיקה מול המערכת -> תצוגה מקדימה
// -> אישור והרצה באצוות -> דוח מסכם. אין מחיקת מוצרים בשום שלב.
import { Button, Modal, ModalBody, ModalFooter } from "@windmill/react-ui";
import React, { useCallback, useRef, useState } from "react";
import { FiAlertTriangle, FiCheckCircle, FiFileText, FiUploadCloud, FiXCircle } from "react-icons/fi";

// Internal import
import spinnerLoadingImage from "@/assets/img/spinner.gif";
import ProductServices from "@/services/ProductServices";
import { parseErpProductsFile, toServerRow } from "@/utils/erpProductExcel";
import { notifyError, notifySuccess } from "@/utils/toast";

const CHUNK_SIZE = 500;

// תקרה לפירוט הכשלים על המסך, כדי שקובץ פגום לא ירנדר אלפי שורות.
// גבוהה מספיק כדי שביבוא רגיל כל הכשלים יופיעו בפועל
const MAX_FAILURE_LIST = 500;

// הגדרות היבוא קבועות ולא מוצגות במסך: מוצר חדש נוצר מוסתר (עד שיוגדרו לו
// מחיר ותמונה), קטגוריות חסרות נוצרות מ"שם קבוצה", ושם/מלאי/הצגה של מוצר
// קיים לא נדרסים מהקובץ.
const IMPORT_OPTIONS = {
  createNew: true,
  updateExisting: true,
  updateName: false,
  updateCategory: false,
  // מחירים כן מתעדכנים: מחיר 0 בקובץ תמיד מדולג בשרת, ולכן בקובץ הנוכחי
  // (שכל המחירים בו 0) שום מחיר בחנות לא ייגע. כשהקובץ יסודר המחירים ייכנסו
  updatePrices: true,
  updateStock: false,
  updateStatus: false,
  zeroNegativeStock: true,
  createCategories: true,
  priceFallback: true,
  // מחיר המוצר בחנות הוא מחיר סופי כולל מע"מ, ולכן המקור חייב להיות עמודה
  // "כולל מע"מ". "חנות ללא מע"מ" הייתה מתמחרת בחסר בשיעור המע"מ
  priceSource: "consumerIncVat",
  newProductStatus: "hide",
  defaultCategory: null,
};

const Row = ({ label, value, tone = "" }) => (
  <div className="flex items-center justify-between gap-3 py-1 text-sm">
    <span className="text-gray-500 dark:text-gray-400">{label}</span>
    <span className={`font-medium ${tone || "text-gray-700 dark:text-gray-200"}`}>
      {value}
    </span>
  </div>
);

const ImportExcelModal = ({ isOpen, onClose, onImported }) => {
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
      const result = await parseErpProductsFile(file);
      if (result.rows.length === 0) {
        throw new Error(
          result.invalidRows.length > 0
            ? `לא נמצאו שורות מוצרים תקינות בקובץ (${result.invalidRows.length} שורות ללא שם או מק"ט)`
            : "לא נמצאו שורות מוצרים בקובץ"
        );
      }
      setParsed(result);

      // בדיקה מול המערכת: כמה מק"טים קיימים ואילו קבוצות אינן קטגוריה
      const skus = result.rows.map((row) => row.sku);
      const groups = [
        ...new Set(result.rows.map((row) => row.groupName).filter(Boolean)),
      ];
      const checkRes = await ProductServices.checkImportProducts({ skus, groups });
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

    // הדוח מציג רק כמה הועלו, כמה עודכנו, כמה נכשלו ומי נכשל
    const totals = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    // שורות שנפסלו כבר בקריאת הקובץ לא נשלחות לשרת, ולכן הן לא מופיעות
    // בספירה שלו. בלי לצרף אותן כאן הן היו נעלמות מהדוח לגמרי
    const parseFailures = (parsed.invalidRows || []).map((row) => ({
      rowNumber: row.rowNumber,
      sku: row.sku,
      name: row.name,
      message: row.reason,
    }));

    try {
      for (let i = 0; i < chunks.length; i++) {
        const res = await ProductServices.importProducts({
          rows: chunks[i],
          options: IMPORT_OPTIONS,
        });

        totals.created += res?.created || 0;
        totals.updated += res?.updated || 0;
        totals.skipped += res?.skipped || 0;
        totals.errors.push(...(res?.errors || []));

        setProgress({
          done: Math.min(rows.length, (i + 1) * CHUNK_SIZE),
          total: rows.length,
        });
      }

      const failed = totals.skipped + parseFailures.length;
      setReport({
        created: totals.created,
        updated: totals.updated,
        failed,
        failures: [...parseFailures, ...totals.errors],
      });

      const summary = `הועלו ${totals.created}, עודכנו ${totals.updated}, נכשלו ${failed}`;
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
  const missingGroups = check?.missingGroups || [];
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
          ייבוא מוצרים מאקסל
          <FiFileText className="text-customGreen" />
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {"העדכון מתבצע לפי מק\"ט: מוצר קיים מתעדכן, מוצר חדש נוצר. מוצרים לא נמחקים."}
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
            {report.failures.length > 0 && (
              <div className="mt-3 max-h-40 overflow-y-auto text-xs">
                {report.failures.slice(0, MAX_FAILURE_LIST).map((failure, index) => (
                  <div
                    key={`${failure.rowNumber || ""}-${failure.sku || ""}-${index}`}
                    className="py-1 border-b border-gray-200 dark:border-gray-600 text-orange-600"
                  >
                    {[
                      failure.rowNumber ? `שורה ${failure.rowNumber}` : "",
                      failure.sku,
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
                <Row label="שורות מוצרים תקינות" value={stats.total} />
                {check && (
                  <>
                    <Row
                      label={"כבר קיימים במערכת (לפי מק\"ט)"}
                      value={check.existingCount}
                    />
                    <Row label="מוצרים חדשים" value={check.newCount} />
                  </>
                )}
                {parsed.invalidRows.length > 0 && (
                  <Row
                    label={"שורות ללא שם או מק\"ט"}
                    value={parsed.invalidRows.length}
                    tone="text-orange-500"
                  />
                )}
                {parsed.duplicateSkus.length > 0 && (
                  <Row
                    label={"מק\"טים כפולים בקובץ"}
                    value={parsed.duplicateSkus.length}
                    tone="text-orange-500"
                  />
                )}
              </div>

              <div className="p-4 rounded-md bg-gray-50 dark:bg-gray-700">
                <h3 className="font-medium mb-2 text-sm dark:text-gray-200">
                  בדיקת הנתונים בקובץ
                </h3>
                <Row
                  label='שורות עם מחיר כולל מע"מ (ייובאו)'
                  value={stats.withVatInclusivePrice}
                />
                <Row
                  label='רק מחיר ללא מע"מ (לא ייובא)'
                  value={stats.withExVatPriceOnly}
                  tone={stats.withExVatPriceOnly > 0 ? "text-orange-500" : ""}
                />
                <Row
                  label="שורות בלי מחיר בכלל"
                  value={stats.withoutAnyPrice}
                  tone={stats.withoutAnyPrice > 0 ? "text-orange-500" : ""}
                />
                <Row
                  label="שורות עם מלאי שלילי"
                  value={stats.negativeStock}
                  tone={stats.negativeStock > 0 ? "text-orange-500" : ""}
                />
                <Row label="שורות שמסומנות כלא פעילות" value={stats.inactive} />
              </div>
            </div>

            {stats.withoutAnyPrice > 0 && (
              <div className="flex items-start gap-2 p-3 mb-4 rounded-md bg-yellow-50 dark:bg-gray-700 text-sm text-yellow-700 dark:text-yellow-500">
                <FiAlertTriangle className="mt-0.5 shrink-0" />
                <span>
                  {`ל-${stats.withoutAnyPrice} שורות בקובץ אין מחיר בכלל. מחיר 0 לא ידרוך על מחיר קיים בחנות, ומוצרים חדשים ייווצרו במחיר 0 - לכן כדאי להשאיר אותם מוסתרים עד להשלמת המחירים.`}
                </span>
              </div>
            )}

            {stats.withExVatPriceOnly > 0 && (
              <div className="flex items-start gap-2 p-3 mb-4 rounded-md bg-yellow-50 dark:bg-gray-700 text-sm text-yellow-700 dark:text-yellow-500">
                <FiAlertTriangle className="mt-0.5 shrink-0" />
                <span>
                  {`ל-${stats.withExVatPriceOnly} שורות יש מחיר רק בעמודה ללא מע"מ. המחיר בחנות הוא מחיר סופי ללקוח, ולכן הן לא ייובאו - כדי לא לתמחר בחסר בשיעור המע"מ. יש למלא באקסל את "צרכן כולל מע"מ".`}
                </span>
              </div>
            )}

            {/* קבוצות שיהפכו לקטגוריות */}
            <div className="p-4 mb-4 rounded-md bg-gray-50 dark:bg-gray-700">
              <h3 className="font-medium mb-2 text-sm dark:text-gray-200">
                קבוצות בקובץ (יהפכו לקטגוריות)
              </h3>
              <div className="flex flex-wrap gap-2">
                {stats.groups.map((group) => {
                  const isMissing = missingGroups.includes(group.name);
                  return (
                    <span
                      key={group.name || "empty"}
                      className={`text-xs px-2 py-1 rounded-full ${
                        isMissing
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {group.name || "בלי קבוצה"} ({group.count})
                      {isMissing ? " · חדשה" : ""}
                    </span>
                  );
                })}
              </div>
            </div>

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

export default ImportExcelModal;
