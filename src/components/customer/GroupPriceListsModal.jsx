// src/components/customer/GroupPriceListsModal.jsx
// מחירונים קבוצתיים: מחירון אחד מאקסל, עם שם, שמשויכים אליו כמה לקוחות.
//
// שני מצבים באותו מודאל: רשימת הקבוצות, ועריכה של קבוצה אחת (שם, קובץ,
// לקוחות). הקובץ הוא אותו קובץ כמו במחירון פרטי — מק"ט, שם המוצר, מחיר.
//
// מה שהמסך חייב להעביר:
//   1. מחירון קבוצתי גובר על המחירון הפרטי של הלקוח, בכל מק"ט שמופיע בו.
//   2. לקוח שייך לקבוצה אחת — שיוך לכאן מוציא אותו מהקבוצה הקודמת.
//   3. העלאת קובץ לקבוצה קיימת דורסת את המחירון שלה במלואו.
import {
  Badge,
  Button,
  Modal,
  ModalBody,
  ModalFooter,
} from "@windmill/react-ui";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiAlertTriangle,
  FiArrowRight,
  FiEdit2,
  FiList,
  FiPlus,
  FiTrash2,
  FiUploadCloud,
  FiUsers,
  FiXCircle,
} from "react-icons/fi";

// Internal import
import spinnerLoadingImage from "@/assets/img/spinner.gif";
import GroupPriceListServices from "@/services/GroupPriceListServices";
import { describeApiError } from "@/utils/apiError";
import {
  parseCustomerPriceListFile,
  toServerRow,
} from "@/utils/customerPriceListExcel";
import { formatDateTime, formatMoney } from "@/utils/displayFormat";
import { notifyError, notifySuccess } from "@/utils/toast";

// תקרה לפירוט על המסך, כדי שקובץ פגום לא ירנדר אלפי שורות
const MAX_LIST = 100;

// ‏express.json בשרת מוגבל ל-4MB והמחירון נשלח בבקשה אחת — ראה ההסבר
// ב-CustomerPriceListModal
const MAX_PAYLOAD_BYTES = 3.5 * 1024 * 1024;

const assertPayloadFits = (rows) => {
  const bytes = new Blob([JSON.stringify({ rows })]).size;
  if (bytes <= MAX_PAYLOAD_BYTES) return;
  throw new Error(
    `הקובץ גדול מדי לשליחה בבקשה אחת (${(bytes / 1024 / 1024).toFixed(1)}MB מתוך ` +
      `${(MAX_PAYLOAD_BYTES / 1024 / 1024).toFixed(1)}MB). ` +
      "יש לקצר שמות מוצרים ארוכים בקובץ או לפצל אותו.",
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

const Spinner = ({ children }) => (
  <div className="flex items-center justify-center gap-2 py-4 text-sm dark:text-gray-300">
    <img src={spinnerLoadingImage} alt="Loading" width={20} height={10} />
    {children}
  </div>
);

const customerLabel = (customer) =>
  `${customer?.name || ""} ${customer?.lastName || ""}`.trim() || "—";

const inputClass =
  "block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-gray-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200";

const GroupPriceListsModal = ({ isOpen, onClose, customers = [], onChanged }) => {
  const fileRef = useRef();

  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  // null = רשימת הקבוצות; "new" = קבוצה חדשה; אחרת — הקבוצה שנערכת
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [customerSearch, setCustomerSearch] = useState("");
  const [onlySelected, setOnlySelected] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [check, setCheck] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  // שורות המחירון של הקבוצה שנערכת. נטענות רק כשמבקשים לראות אותן
  const [priceRows, setPriceRows] = useState(null);
  const [priceSearch, setPriceSearch] = useState("");
  const [isLoadingRows, setIsLoadingRows] = useState(false);

  const isNew = editing === "new";
  const busy = isSaving || Boolean(deletingId);

  const loadGroups = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      setGroups((await GroupPriceListServices.getAll()) || []);
    } catch (err) {
      setLoadError(describeApiError(err, "טעינת המחירונים הקבוצתיים נכשלה"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetFile = useCallback(() => {
    setParsed(null);
    setCheck(null);
    setParseError("");
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  const backToList = useCallback(() => {
    setEditing(null);
    setName("");
    setSelected(new Set());
    setCustomerSearch("");
    setOnlySelected(false);
    setPriceRows(null);
    setPriceSearch("");
    resetFile();
  }, [resetFile]);

  useEffect(() => {
    if (!isOpen) return;
    backToList();
    loadGroups();
  }, [isOpen, backToList, loadGroups]);

  // לאיזו קבוצה כל לקוח שייך כרגע — כדי להראות ליד לקוח שהשיוך מעביר אותו
  const groupByCustomer = useMemo(() => {
    const map = new Map();
    groups.forEach((group) =>
      (group.customers || []).forEach((id) => map.set(String(id), group)),
    );
    return map;
  }, [groups]);

  const startNew = () => {
    backToList();
    setEditing("new");
  };

  const startEdit = (group) => {
    backToList();
    setEditing(group);
    setName(group.name);
    setSelected(new Set((group.customers || []).map(String)));
  };

  const loadPriceRows = async (searchText = "") => {
    if (!editing?._id || isLoadingRows) return;
    setIsLoadingRows(true);
    try {
      setPriceRows(
        await GroupPriceListServices.getOne(editing._id, {
          search: searchText,
          limit: MAX_LIST,
        }),
      );
    } catch (err) {
      notifyError(describeApiError(err, "טעינת המחירון נכשלה"));
    } finally {
      setIsLoadingRows(false);
    }
  };

  const handleClose = () => {
    if (busy) return;
    onClose();
  };

  const handleSelectFile = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setParseError("");
    setParsed(null);
    setCheck(null);

    try {
      const result = await parseCustomerPriceListFile(file);
      if (result.rows.length === 0) {
        throw new Error("לא נמצאו שורות מחירון תקינות בקובץ");
      }
      const rows = result.rows.map(toServerRow);
      assertPayloadFits(rows);
      setParsed(result);
      setCheck(await GroupPriceListServices.checkImport({ rows }));
    } catch (err) {
      setParseError(describeApiError(err, "פענוח הקובץ נכשל"));
    } finally {
      setIsParsing(false);
    }
  };

  const toggleCustomer = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const visibleCustomers = useMemo(() => {
    const term = customerSearch.trim().toLowerCase();
    return (Array.isArray(customers) ? customers : []).filter((customer) => {
      const id = String(customer._id);
      if (onlySelected && !selected.has(id)) return false;
      if (!term) return true;
      return [
        customerLabel(customer),
        customer.erp?.customerNumber,
        customer.email,
        customer.phone,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [customers, customerSearch, onlySelected, selected]);

  // לקוחות שנבחרו ושייכים כרגע לקבוצה אחרת — השמירה תעביר אותם
  const movedCount = useMemo(() => {
    let count = 0;
    selected.forEach((id) => {
      const current = groupByCustomer.get(id);
      if (current && current._id !== editing?._id) count += 1;
    });
    return count;
  }, [selected, groupByCustomer, editing]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      notifyError("יש לתת שם למחירון הקבוצתי");
      return;
    }
    if (isNew && !parsed?.rows?.length) {
      notifyError("יש לבחור קובץ אקסל עם המחירון");
      return;
    }

    setIsSaving(true);
    try {
      const body = { name: trimmed, customers: [...selected] };
      if (parsed?.rows?.length) {
        body.rows = parsed.rows.map(toServerRow);
        body.fileName = parsed.fileName;
      }
      const res = isNew
        ? await GroupPriceListServices.create(body)
        : await GroupPriceListServices.update(editing._id, body);

      notifySuccess(res?.message || "המחירון הקבוצתי נשמר");
      backToList();
      await loadGroups();
      onChanged?.();
    } catch (err) {
      notifyError(describeApiError(err, "שמירת המחירון הקבוצתי נכשלה"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (group) => {
    if (busy) return;
    if (
      !window.confirm(
        `למחוק את המחירון הקבוצתי "${group.name}"?\n\n` +
          `${group.customersCount} הלקוחות שבו יחזרו למחירון הפרטי שלהם ולמחירי הקטלוג.`,
      )
    ) {
      return;
    }
    setDeletingId(group._id);
    try {
      const res = await GroupPriceListServices.remove(group._id);
      notifySuccess(res?.message || "המחירון הקבוצתי נמחק");
      await loadGroups();
      onChanged?.();
    } catch (err) {
      notifyError(describeApiError(err, "מחיקת המחירון הקבוצתי נכשלה"));
    } finally {
      setDeletingId(null);
    }
  };

  const stats = parsed?.stats;

  return (
    // אותו בסיס כמו ב-CustomerPriceListModal: className דורך על מחלקות התמה
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      className="w-full bg-white rounded-lg dark:bg-gray-800 sm:rounded-lg m-4 sm:max-w-4xl custom-modal"
    >
      <ModalBody className="text-sm text-gray-800 dark:text-gray-400 px-6 pt-6 pb-2 text-right max-h-[70vh] overflow-y-auto">
        <h2 className="text-xl font-medium mb-1 flex items-center gap-2 justify-end">
          {editing
            ? isNew
              ? "מחירון קבוצתי חדש"
              : `עריכת מחירון קבוצתי — ${editing.name}`
            : "מחירונים קבוצתיים"}
          <FiUsers className="text-customGreen" />
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {"מחירון אחד לכמה לקוחות. מחירון קבוצתי גובר על המחירון הפרטי של הלקוח " +
            'בכל מק"ט שמופיע בו. מק"ט שאינו במחירון הקבוצתי נמכר לפי המחירון הפרטי, ' +
            "ואם אין — במחיר הקטלוג."}
        </p>

        {!editing ? (
          /* ── רשימת הקבוצות ── */
          isLoading ? (
            <Spinner>טוען...</Spinner>
          ) : loadError ? (
            <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 dark:bg-gray-700 text-sm text-red-600">
              <FiAlertTriangle className="mt-0.5 shrink-0" />
              <span>
                {loadError}
                <button
                  type="button"
                  onClick={loadGroups}
                  className="ml-2 underline focus:outline-none"
                >
                  נסה שוב
                </button>
              </span>
            </div>
          ) : groups.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              עדיין אין מחירונים קבוצתיים.
            </p>
          ) : (
            <div className="rounded-md border border-gray-100 dark:border-gray-700">
              <table className="w-full text-right text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                  <tr>
                    <th className="px-3 py-2 font-medium">שם הקבוצה</th>
                    <th className="px-3 py-2 font-medium">שורות במחירון</th>
                    <th className="px-3 py-2 font-medium">לקוחות</th>
                    <th className="px-3 py-2 font-medium">עודכן</th>
                    <th className="px-3 py-2 font-medium">
                      <span className="sr-only">פעולות</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="text-gray-700 dark:text-gray-200">
                  {groups.map((group) => (
                    <tr
                      key={group._id}
                      className="border-t border-gray-100 dark:border-gray-700"
                    >
                      <td className="px-3 py-2 font-semibold">{group.name}</td>
                      <td className="px-3 py-2">{group.itemsCount}</td>
                      <td className="px-3 py-2">
                        {group.customersCount > 0 ? (
                          <Badge type="success">
                            <span className="font-bold">{group.customersCount}</span>
                          </Badge>
                        ) : (
                          <span className="text-orange-500">אין לקוחות</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                        {formatDateTime(group.updatedAt || group.importedAt)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <button
                          type="button"
                          onClick={() => startEdit(group)}
                          disabled={busy}
                          title="עריכה"
                          aria-label={`עריכת המחירון הקבוצתי ${group.name}`}
                          className="p-1 text-gray-500 hover:text-blue-600 disabled:opacity-40"
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(group)}
                          disabled={busy}
                          title="מחיקה"
                          aria-label={`מחיקת המחירון הקבוצתי ${group.name}`}
                          className="p-1 text-gray-500 hover:text-red-600 disabled:opacity-40"
                        >
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* ── עריכת קבוצה ── */
          <>
            <label className="mb-4 block">
              <span className="mb-1 block text-sm font-medium dark:text-gray-200">
                שם הקבוצה
              </span>
              <input
                type="text"
                value={name}
                maxLength={80}
                onChange={(e) => setName(e.target.value)}
                placeholder="לדוגמה: גני ילדים, מוסדות, סיטונאים"
                className={inputClass}
              />
            </label>

            {/* קובץ המחירון */}
            <div className="mb-1 text-sm font-medium dark:text-gray-200">
              {isNew ? "קובץ המחירון" : "החלפת המחירון (לא חובה)"}
            </div>
            {!isNew && (
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                {`במחירון כרגע ${editing.itemsCount} שורות` +
                  (editing.fileName ? ` (${editing.fileName})` : "") +
                  ". בלי קובץ חדש המחירים נשארים כמו שהם."}
              </p>
            )}
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
                {parsed?.fileName ||
                  'בחר קובץ אקסל — עמודת מק"ט, שם המוצר ומחיר (xlsx / xls / csv)'}
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

            {/* המחירים שבמחירון כרגע — לצפייה. שינוי מחירים נעשה בהעלאת קובץ */}
            {!isNew && !parsed && (
              <div className="mb-4">
                {priceRows ? (
                  <>
                    <div className="mb-2 flex items-center gap-2">
                      <input
                        type="search"
                        value={priceSearch}
                        onChange={(e) => setPriceSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") loadPriceRows(priceSearch);
                        }}
                        placeholder='חיפוש במחירון לפי מק"ט או שם (Enter)'
                        className={inputClass}
                      />
                    </div>
                    <div className="max-h-56 overflow-y-auto rounded-md border border-gray-100 dark:border-gray-700">
                      <table className="w-full text-right text-xs">
                        <thead className="sticky top-0 bg-gray-50 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                          <tr>
                            <th className="px-3 py-2 font-medium">מק"ט</th>
                            <th className="px-3 py-2 font-medium">המוצר</th>
                            <th className="px-3 py-2 font-medium">מחיר בקבוצה</th>
                            <th className="px-3 py-2 font-medium">מחיר קטלוג</th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-700 dark:text-gray-200">
                          {priceRows.items.map((item) => (
                            <tr
                              key={item.sku}
                              className="border-t border-gray-100 dark:border-gray-700"
                            >
                              <td className="px-3 py-1.5 font-medium">{item.sku}</td>
                              <td className="px-3 py-1.5">
                                {item.inCatalog ? (
                                  item.catalogTitle || item.name
                                ) : (
                                  <span className="text-orange-500">
                                    {item.name ? `${item.name} — אינו בקטלוג` : "אינו בקטלוג"}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-1.5 font-semibold">
                                {formatMoney(item.price)}
                              </td>
                              <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400">
                                {formatMoney(item.catalogPrice)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {priceRows.items.length === 0
                        ? "לא נמצאו שורות מתאימות."
                        : priceRows.filtered > priceRows.returned
                          ? `מוצגות ${priceRows.returned} מתוך ${priceRows.filtered} שורות — אפשר לצמצם בחיפוש.`
                          : `${priceRows.returned} שורות.`}
                    </p>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => loadPriceRows("")}
                    disabled={isLoadingRows}
                    className="flex items-center gap-1 text-xs text-blue-600 underline focus:outline-none disabled:opacity-40 dark:text-blue-400"
                  >
                    <FiList /> {isLoadingRows ? "טוען..." : "הצגת המחירים שבמחירון"}
                  </button>
                )}
              </div>
            )}

            {isParsing && <Spinner>קורא את הקובץ ובודק מול הקטלוג...</Spinner>}

            {parseError && (
              <div className="flex items-start gap-2 p-3 mb-4 rounded-md bg-red-50 dark:bg-gray-700 text-sm text-red-600">
                <FiAlertTriangle className="mt-0.5 shrink-0" />
                <span>{parseError}</span>
              </div>
            )}

            {parsed && (
              <>
                <div className="grid gap-4 md:grid-cols-2 mb-4">
                  <div className="p-4 rounded-md bg-gray-50 dark:bg-gray-700">
                    <h3 className="font-medium mb-2 text-sm dark:text-gray-200">
                      סיכום הקובץ
                    </h3>
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
                    {stats.skipped > 0 && (
                      <Row
                        label="שורות שלא ייובאו"
                        value={stats.skipped}
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
                        <Row label="מוצרים שיתומחרו מהמחירון" value={check.matched} />
                        <Row
                          label='מק"טים שאינם בקטלוג'
                          value={check.unknown}
                          tone={check.unknown > 0 ? "text-orange-500" : ""}
                        />
                        <Row
                          label="שמות שאינם תואמים לקטלוג"
                          value={check.nameMismatchCount}
                          tone={check.nameMismatchCount > 0 ? "text-orange-500" : ""}
                        />
                      </>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        לא בוצעה בדיקה
                      </p>
                    )}
                  </div>
                </div>

                {!isNew && (
                  <div className="flex items-start gap-2 p-3 mb-4 rounded-md bg-yellow-50 dark:bg-gray-700 text-sm text-yellow-700 dark:text-yellow-500">
                    <FiAlertTriangle className="mt-0.5 shrink-0" />
                    <span>
                      {`הקובץ יחליף את המחירון הקיים של הקבוצה (${editing.itemsCount} שורות) במלואו. ` +
                        'מק"ט שהיה במחירון הקודם ואינו בקובץ החדש יחזור למחירון הפרטי של כל לקוח או למחיר הקטלוג.'}
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
                    <div className="max-h-32 overflow-y-auto">
                      {check.nameMismatches.slice(0, MAX_LIST).map((item, index) => (
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
              </>
            )}

            {/* בחירת הלקוחות */}
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium dark:text-gray-200">
                {`לקוחות בקבוצה (${selected.size})`}
              </span>
              <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={onlySelected}
                  onChange={(e) => setOnlySelected(e.target.checked)}
                />
                להציג רק את מי שנבחר
              </label>
            </div>
            <input
              type="search"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="חיפוש לקוח לפי שם, מספר לקוח, מייל או טלפון"
              className={`${inputClass} mb-2`}
            />
            <div className="max-h-64 overflow-y-auto rounded-md border border-gray-100 dark:border-gray-700 mb-3">
              {visibleCustomers.length === 0 ? (
                <p className="p-3 text-sm text-gray-500 dark:text-gray-400">
                  לא נמצאו לקוחות מתאימים.
                </p>
              ) : (
                visibleCustomers.map((customer) => {
                  const id = String(customer._id);
                  const current = groupByCustomer.get(id);
                  const inOther = current && current._id !== editing?._id;
                  return (
                    <label
                      key={id}
                      className="flex cursor-pointer items-center gap-2 border-b border-gray-100 px-3 py-1.5 text-sm last:border-b-0 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(id)}
                        onChange={() => toggleCustomer(id)}
                        disabled={busy}
                      />
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        {customerLabel(customer)}
                      </span>
                      {customer.erp?.customerNumber ? (
                        <span className="text-xs text-gray-500">
                          {customer.erp.customerNumber}
                        </span>
                      ) : null}
                      {inOther ? (
                        <span className="mr-auto text-xs text-orange-500">
                          {`כרגע בקבוצה "${current.name}"`}
                        </span>
                      ) : null}
                    </label>
                  );
                })
              )}
            </div>

            {movedCount > 0 && (
              <div className="flex items-start gap-2 p-3 mb-3 rounded-md bg-yellow-50 dark:bg-gray-700 text-sm text-yellow-700 dark:text-yellow-500">
                <FiAlertTriangle className="mt-0.5 shrink-0" />
                <span>
                  {`${movedCount} מהלקוחות שנבחרו שייכים כרגע לקבוצה אחרת. ` +
                    "לקוח שייך לקבוצה אחת בלבד, ולכן השמירה תעביר אותם לקבוצה הזו."}
                </span>
              </div>
            )}
          </>
        )}
      </ModalBody>

      <ModalFooter className="flex items-center justify-center gap-3 px-6 py-3 flex-row bg-gray-50 dark:bg-gray-800 rounded-b-lg">
        {editing ? (
          <>
            <Button
              type="button"
              layout="outline"
              className="w-full sm:w-auto"
              disabled={busy}
              onClick={backToList}
            >
              <FiArrowRight className="ml-1" /> חזרה לרשימה
            </Button>
            <Button
              type="button"
              className="w-full h-12 sm:w-auto"
              disabled={busy || isParsing}
              onClick={handleSave}
            >
              {isSaving ? (
                <>
                  <img src={spinnerLoadingImage} alt="Loading" width={20} height={10} />
                  <span className="font-serif mr-1 font-light">שומר...</span>
                </>
              ) : (
                "שמירת המחירון הקבוצתי"
              )}
            </Button>
          </>
        ) : (
          <>
            <Button
              type="button"
              layout="outline"
              className="w-full sm:w-auto"
              disabled={busy}
              onClick={handleClose}
            >
              סגור
            </Button>
            <Button
              type="button"
              className="w-full h-12 sm:w-auto"
              disabled={busy || isLoading}
              onClick={startNew}
            >
              <FiPlus className="ml-1" /> מחירון קבוצתי חדש
            </Button>
          </>
        )}
      </ModalFooter>
    </Modal>
  );
};

export default GroupPriceListsModal;
