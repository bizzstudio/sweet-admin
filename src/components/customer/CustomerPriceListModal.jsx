// src/components/customer/CustomerPriceListModal.jsx
// העלאת מחירון פרטי ללקוח מקובץ אקסל (מק"ט, שם המוצר, מחיר).
//
// הזרימה: הצגת המחירון הקיים -> בחירת קובץ -> פענוח ובדיקה מול הקטלוג ->
// תצוגה מקדימה -> אישור והרצה -> דוח מסכם.
//
// שתי הדגשות שהמסך חייב להעביר, כי הן ההבדל בין מחירון שעובד לאחד ששובר מחירים:
//   1. היבוא **דורס** את המחירון הקודם במלואו. מחירון הוא הקובץ שהלקוח קיבל.
//   2. מק"ט שאינו במחירון נמכר במחיר הקטלוג. המחירון אינו רשימה סגורה.
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
  FiDollarSign,
  FiTrash2,
  FiUploadCloud,
  FiXCircle,
} from "react-icons/fi";

// Internal import
import spinnerLoadingImage from "@/assets/img/spinner.gif";
import CustomerPriceListServices from "@/services/CustomerPriceListServices";
import { describeApiError } from "@/utils/apiError";
import {
  parseCustomerPriceListFile,
  toServerRow,
} from "@/utils/customerPriceListExcel";
import { formatDateTime, formatMoney } from "@/utils/displayFormat";
import { notifyError, notifySuccess } from "@/utils/toast";

// תקרה לפירוט על המסך, כדי שקובץ פגום לא ירנדר אלפי שורות
const MAX_LIST = 100;

// ── תקרת גוף הבקשה ──
//
// ‏express.json בשרת מוגבל ל-4MB, והמחירון נשלח בבקשה אחת (הדריסה חייבת להיות
// אטומית). חריגה הייתה מוחזרת כ-413 בלי גוף JSON, כלומר הודעה סתמית. הבדיקה
// נעשית כאן, לפני השליחה, כדי שהמשתמש יקבל משפט שאומר מה לעשות.
// נמדד: מחירון בגודל הקטלוג כולו (4,320 שורות) הוא 0.55MB — התקרה רחוקה ממנו.
const MAX_PAYLOAD_BYTES = 3.5 * 1024 * 1024;

const assertPayloadFits = (rows) => {
  const bytes = new Blob([JSON.stringify({ rows })]).size;
  if (bytes <= MAX_PAYLOAD_BYTES) return;
  throw new Error(
    `הקובץ גדול מדי לשליחה בבקשה אחת (${(bytes / 1024 / 1024).toFixed(1)}MB מתוך ` +
      `${(MAX_PAYLOAD_BYTES / 1024 / 1024).toFixed(1)}MB). ` +
      "יש לקצר שמות מוצרים ארוכים בקובץ או לפצל אותו לשני מחירונים.",
  );
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

const CustomerPriceListModal = ({
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
  // כשל בטעינת המחירון הקיים. מוצג בגוף המסך ולא רק כטוסט: טוסט נעלם, והמסך
  // היה נשאר מציג "אין מחירון" — כלומר בדיוק ההיפך ממה שקרה
  const [loadError, setLoadError] = useState("");

  const resetFile = useCallback(() => {
    setParsed(null);
    setCheck(null);
    setReport(null);
    setParseError("");
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  // המחירון הקיים נטען בכל פתיחה: הוא מה שהיבוא עומד לדרוס, ולכן חייב להיות
  // מוצג לפני שלוחצים
  const loadExisting = useCallback(async () => {
    if (!customerId) return;
    setIsLoadingExisting(true);
    setLoadError("");
    // איפוס לפני השליפה: בלעדיו פתיחה של לקוח אחר הייתה מציגה לרגע את המחירון
    // של הלקוח הקודם. ‏isLoadingExisting מכסה את הפער בתצוגה
    setExisting(null);
    try {
      const data = await CustomerPriceListServices.getCustomerPriceList(
        customerId,
        {
          limit: MAX_LIST,
        },
      );
      setExisting(data);
    } catch (err) {
      setExisting(null);
      setLoadError(describeApiError(err, "טעינת המחירון נכשלה"));
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
    setParsed(null);
    setCheck(null);
    setReport(null);

    try {
      const result = await parseCustomerPriceListFile(file);
      if (result.rows.length === 0) {
        throw new Error("לא נמצאו שורות מחירון תקינות בקובץ");
      }

      const rows = result.rows.map(toServerRow);
      assertPayloadFits(rows);
      setParsed(result);

      const checkRes = await CustomerPriceListServices.checkImport(customerId, {
        rows,
      });
      setCheck(checkRes);
    } catch (err) {
      // גם שגיאת פענוח מקומית וגם כשל בבדיקה מול השרת מגיעות לכאן. שגיאה
      // מקומית אינה שגיאת axios ולכן describeApiError מחזיר את ההודעה שלה כמו שהיא
      setParseError(describeApiError(err, "פענוח הקובץ נכשל"));
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = async () => {
    if (!parsed?.rows?.length) return;

    setIsImporting(true);
    try {
      // המחירון נשלח בבקשה אחת: הדריסה חייבת להיות אטומית, וקובץ מפוצל
      // לאצוות היה משאיר את הלקוח עם חצי מחירון אם אצווה נכשלה באמצע
      const res = await CustomerPriceListServices.importPriceList(customerId, {
        rows: parsed.rows.map(toServerRow),
        fileName: parsed.fileName,
      });

      setReport(res);
      notifySuccess(res?.message || "המחירון נשמר");
      await loadExisting();
      onChanged?.();
    } catch (err) {
      notifyError(describeApiError(err, "שמירת המחירון נכשלה"));
    } finally {
      setIsImporting(false);
    }
  };

  const handleDelete = async () => {
    if (!existing?.exists) return;
    setIsDeleting(true);
    try {
      const res = await CustomerPriceListServices.deletePriceList(customerId);
      notifySuccess(res?.message || "המחירון הוסר");
      resetFile();
      await loadExisting();
      onChanged?.();
    } catch (err) {
      notifyError(describeApiError(err, "הסרת המחירון נכשלה"));
    } finally {
      setIsDeleting(false);
    }
  };

  const stats = parsed?.stats;
  const busy = isImporting || isDeleting;

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
          {customerName ? `מחירון ללקוח ${customerName}` : "מחירון לקוח"}
          <FiDollarSign className="text-customGreen" />
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {'הקובץ: עמודת מק"ט, שם המוצר ומחיר. ההתאמה למוצר לפי מק"ט בלבד. ' +
            "מוצר שאינו במחירון נמכר במחיר הקטלוג."}
        </p>

        {/* המחירון הקיים */}
        <div className="p-4 mb-4 rounded-md bg-gray-50 dark:bg-gray-700">
          <h3 className="font-medium mb-2 flex items-center gap-2 justify-end text-sm dark:text-gray-200">
            המחירון הנוכחי
            {/* כשל טעינה אינו "אין מחירון" — הצגתו כ"אין" הייתה מטעה למחשוב
                שהמחירון נמחק, ומזמינה העלאה מחדש שאינה נחוצה */}
            {loadError ? (
              <Badge type="danger">
                <span className="font-bold">לא נטען</span>
              </Badge>
            ) : existing?.exists ? (
              <Badge type="success">
                <span className="font-bold">קיים</span>
              </Badge>
            ) : (
              <Badge type="neutral">
                <span className="font-bold">אין — מחירי קטלוג</span>
              </Badge>
            )}
          </h3>

          {isLoadingExisting ? (
            <div className="flex items-center justify-center gap-2 py-2 text-sm dark:text-gray-300">
              <img
                src={spinnerLoadingImage}
                alt="Loading"
                width={20}
                height={10}
              />
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
              <Row label="שורות במחירון" value={existing.itemsCount} />
              <Row
                label="מהן נמצאו בקטלוג"
                value={existing.matchedInCatalog}
                tone={
                  existing.matchedInCatalog < existing.itemsCount
                    ? "text-orange-500"
                    : ""
                }
              />
              <Row label="הקובץ שממנו יובא" value={existing.fileName || "—"} />
              <Row label="עודכן" value={formatDateTime(existing.importedAt)} />
              {existing.importedBy ? (
                <Row label="הועלה על ידי" value={existing.importedBy} />
              ) : null}
            </>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ללקוח אין מחירון פרטי — הוא משלם את מחירי ברירת המחדל של הקטלוג.
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
            <img
              src={spinnerLoadingImage}
              alt="Loading"
              width={20}
              height={10}
            />
            קורא את הקובץ ובודק מול הקטלוג...
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
              המחירון נשמר
              <FiCheckCircle className="text-customGreen" />
            </h3>
            <Row label="שורות שנשמרו" value={report.imported} />
            <Row label="מהן נמצאו בקטלוג" value={report.matchedInCatalog} />
            <Row
              label='מק"טים שאינם בקטלוג'
              value={report.notInCatalog}
              tone={report.notInCatalog > 0 ? "text-orange-500" : ""}
            />
            <Row
              label="שורות שדולגו"
              value={report.skipped}
              tone={report.skipped > 0 ? "text-orange-500" : ""}
            />
            {report.notInCatalog > 0 && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {'מק"ט שאינו בקטלוג נשמר במחירון ויתפוס ברגע שהמוצר ייווצר. ' +
                  `לדוגמה: ${report.notInCatalogSamples?.slice(0, 10).join(", ")}`}
              </p>
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
                <Row
                  label="שורת הכותרות שזוהתה"
                  value={parsed.headerRowNumber}
                />
                <Row label="שורות מחירון" value={stats.total} />
                <Row
                  label="טווח המחירים בקובץ"
                  value={`${formatMoney(stats.minPrice)} – ${formatMoney(stats.maxPrice)}`}
                />
                {parsed.duplicateSkus.length > 0 && (
                  <Row
                    label='מק"טים כפולים בקובץ'
                    value={`${parsed.duplicateSkus.length} (השורה האחרונה קובעת)`}
                    tone="text-orange-500"
                  />
                )}
              </div>

              <div className="p-4 rounded-md bg-gray-50 dark:bg-gray-700">
                <h3 className="font-medium mb-2 text-sm dark:text-gray-200">
                  בדיקה מול הקטלוג
                </h3>
                {check ? (
                  <>
                    <Row
                      label="מוצרים שיתומחרו מהמחירון"
                      value={check.matched}
                    />
                    <Row
                      label='מק"טים שאינם בקטלוג'
                      value={check.unknown}
                      tone={check.unknown > 0 ? "text-orange-500" : ""}
                    />
                    <Row
                      label="שמות שאינם תואמים לקטלוג"
                      value={check.nameMismatchCount}
                      tone={
                        check.nameMismatchCount > 0 ? "text-orange-500" : ""
                      }
                    />
                    {/* בלי טון אזהרה בכוונה: בקטלוג הזה כל המוצרים מוסתרים
                        כברירת מחדל, ואזהרה שנדלקת בכל ייבוא מאבדת משמעות.
                        המספר עצמו נשאר — הוא רלוונטי אם הקטלוג יפורסם */}
                    <Row
                      label="מוצרים שאינם מפורסמים בקטלוג"
                      value={check.hiddenProductCount}
                    />
                    <Row
                      label="שורות שהמחיר בהן זהה לקטלוג"
                      value={check.samePriceCount}
                    />
                  </>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    לא בוצעה בדיקה
                  </p>
                )}
              </div>
            </div>

            {/* דריסה — האזהרה המרכזית של המסך */}
            {existing?.exists && (
              <div className="flex items-start gap-2 p-3 mb-4 rounded-md bg-yellow-50 dark:bg-gray-700 text-sm text-yellow-700 dark:text-yellow-500">
                <FiAlertTriangle className="mt-0.5 shrink-0" />
                <span>
                  {`הייבוא יחליף את המחירון הקיים (${existing.itemsCount} שורות) במלואו. ` +
                    'מק"ט שהיה במחירון הקודם ואינו בקובץ החדש יחזור למחיר הקטלוג.'}
                </span>
              </div>
            )}

            {/* אי-התאמת שמות: הסימן היחיד לקובץ שהעמודות בו הוזזו */}
            {check?.nameMismatches?.length > 0 && (
              <div className="p-3 mb-4 rounded-md bg-yellow-50 dark:bg-gray-700 text-xs text-yellow-700 dark:text-yellow-500">
                <p className="mb-2 font-medium">
                  {'שם המוצר בקובץ אינו תואם לשם בקטלוג. ההתאמה נעשית לפי מק"ט, ' +
                    "ולכן כדאי לוודא שהעמודות בקובץ לא הוזזו:"}
                </p>
                <div className="max-h-40 overflow-y-auto">
                  {check.nameMismatches
                    .slice(0, MAX_LIST)
                    .map((item, index) => (
                      <div
                        key={`${item.sku}-${index}`}
                        className="py-1 border-b border-gray-200 dark:border-gray-600"
                      >
                        {`מק"ט ${item.sku}`}
                        {item.rowNumber ? ` (שורה ${item.rowNumber})` : ""}
                        {" — בקובץ: "}
                        {item.fileName || "—"}
                        {" | בקטלוג: "}
                        {item.catalogTitle || "—"}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* מק"טים שאינם בקטלוג */}
            {check?.unknownSkus?.length > 0 && (
              <div className="p-3 mb-4 rounded-md bg-gray-50 dark:bg-gray-700 text-xs text-gray-500 dark:text-gray-400">
                <p className="mb-2">
                  {'מק"טים שאינם בקטלוג נשמרים במחירון ויתפסו ברגע שהמוצר ייווצר. ' +
                    "הם אינם מונעים את הייבוא:"}
                </p>
                <div className="max-h-32 overflow-y-auto">
                  {check.unknownSkus.slice(0, MAX_LIST).map((item, index) => (
                    <div key={`${item.sku}-${index}`} className="py-0.5">
                      {item.sku}
                      {item.name ? ` — ${item.name}` : ""}
                    </div>
                  ))}
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
          disabled={busy}
          onClick={handleClose}
        >
          {report ? "סגור" : "ביטול"}
        </Button>

        {/* הסרת המחירון זמינה תמיד כשיש מחירון — גם בלי לבחור קובץ */}
        {existing?.exists && !isImporting && (
          <Button
            type="button"
            layout="outline"
            className="w-full sm:w-auto text-red-500"
            disabled={isDeleting}
            onClick={handleDelete}
          >
            {isDeleting ? (
              <>
                <img
                  src={spinnerLoadingImage}
                  alt="Loading"
                  width={20}
                  height={10}
                />
                <span className="font-serif mr-1 font-light">מסיר...</span>
              </>
            ) : (
              <>
                <FiTrash2 className="mr-1" /> הסרת המחירון
              </>
            )}
          </Button>
        )}

        {!report &&
          (isImporting ? (
            <Button type="button" disabled className="w-full h-12 sm:w-auto">
              <img
                src={spinnerLoadingImage}
                alt="Loading"
                width={20}
                height={10}
              />
              <span className="font-serif mr-1 font-light">שומר...</span>
            </Button>
          ) : (
            <Button
              type="button"
              className="w-full h-12 sm:w-auto"
              disabled={!parsed?.rows?.length || isParsing || isDeleting}
              onClick={handleImport}
            >
              {parsed?.rows?.length
                ? `שמירת מחירון (${parsed.rows.length} שורות)`
                : "שמירת מחירון"}
            </Button>
          ))}
      </ModalFooter>
    </Modal>
  );
};

export default CustomerPriceListModal;
