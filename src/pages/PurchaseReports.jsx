// src/pages/PurchaseReports.jsx
//
// דוח רכישות לקוחות — "מה קנו, ובאילו תעודות".
//
// למה מסך נפרד ולא הרחבה של כרטיס הלקוח: כרטיס הלקוח עונה על "מה קרה
// אצל הלקוח הזה", ואילו כאן השאלה היא חוצת-לקוחות — מי קנה החודש, כמה,
// ומה נמכר. אותו נתיב בשרת עונה על שתי השאלות: כשנבחר לקוח, גם חתך
// המוצרים מצטמצם אליו.
//
// שני מקורות, והמסך בוחר ביניהם:
//   הזמנות       — מה שהוזמן. ההיסטוריה המלאה, וזו התשובה ל"מה קנו".
//   תעודות משלוח — מה שנמסר וחויב בפועל (כולל המשקל שנשקל ידנית).
//
// ברירת המחדל היא הזמנות: התעודות נוצרות רק מאז שמסלול החיוב נכנס
// לאוויר, ודוח שמבוסס עליהן בלבד מציג חלק זעיר מהרכישות.

import {
  Badge,
  Button,
  Card,
  CardBody,
  Input,
  Label,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHeader,
  TableRow,
} from "@windmill/react-ui";
import dayjs from "dayjs";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FiChevronDown, FiChevronLeft, FiDownload } from "react-icons/fi";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";

// Internal import
import TableLoading from "@/components/preloader/TableLoading";
import NotFound from "@/components/table/NotFound";
import TableHeaderCell from "@/components/table/TableHeaderCell";
import PageTitle from "@/components/Typography/PageTitle";
import BillingServices from "@/services/BillingServices";
import CustomerServices from "@/services/CustomerServices";
import { describeApiError } from "@/utils/apiError";
import { formatDate, formatMoney, formatNumber } from "@/utils/displayFormat";
import { notifyError } from "@/utils/toast";

const STATUS_LABELS = {
  open: { text: "ממתינה לחיוב", type: "warning" },
  billing: { text: "בתהליך חיוב", type: "neutral" },
  billed: { text: "חויבה", type: "success" },
  cancelled: { text: "בוטלה", type: "danger" },
};

const KIND_LABELS = { auto: "מהזמנה", manual: "ידנית (משקל)", order: "הזמנה" };

// כל מה שמשתנה בין המקורות יושב כאן, כדי שהמסך לא יתפצל לשני מסכים
const SOURCE_META = {
  orders: {
    label: "הזמנות",
    doc: "הזמנה",
    docs: "הזמנות",
    link: (id) => `/order/${id}`,
    note: 'מה שהלקוחות הזמינו — ההיסטוריה המלאה. הסכומים הם ללא מע"מ.',
  },
  notes: {
    label: "תעודות משלוח",
    doc: "תעודה",
    docs: "תעודות",
    link: (id) => `/delivery-note/${id}`,
    note:
      'מה שנמסר בפועל ונכנס לחיוב, כולל המשקל שנשקל בתעודה ידנית. ' +
      'תעודות נוצרות רק מאז שמסלול החיוב נכנס לאוויר, ולכן הדוח הזה קצר ' +
      'מדוח ההזמנות. הסכומים ללא מע"מ.',
  },
};

// ברירת המחדל היא החודש הנוכחי: זו השאלה שנשאלת בפועל ("מה קנו החודש"),
// והיא גם הטווח שמונע שליפה של כל ההיסטוריה בכניסה למסך
const firstOfMonth = () => dayjs().startOf("month").format("YYYY-MM-DD");
const today = () => dayjs().format("YYYY-MM-DD");

const emptyReport = {
  customers: [],
  products: [],
  totals: { customers: 0, notes: 0, total: 0 },
};

// תשובה עם סטטוס 200 אבל בלי המבנה הצפוי (שרת שמריץ גרסה קודמת, פרוקסי
// שהחזיר HTML) הייתה מוצגת כדוח ריק — כלומר "לא נמצאו תעודות", תשובה
// שנראית אמיתית. עדיף לזהות אותה ולומר שהשרת לא ענה כמצופה
const hasReportShape = (res) =>
  Boolean(res) &&
  Array.isArray(res.customers) &&
  Array.isArray(res.products) &&
  Boolean(res.totals);

// ההורדה נעשית ב-Blob ולא ב-XLSX.writeFile: writeFile של SheetJS בוחר את
// דרך הכתיבה לפי סביבת ההרצה (fs בשרת, עוגן בדפדפן), וזיהוי הסביבה תלוי
// באופן שבו החבילה נארזה. כאן הדרך מפורשת, ולכן היא לא יכולה להשתנות
// מתחתינו בשדרוג של החבילה או של הבנדלר.
const downloadWorkbook = (book, fileName) => {
  const buffer = XLSX.write(book, { bookType: "xlsx", type: "array" });
  const url = URL.createObjectURL(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // שחרור הזיכרון של ה-Blob. בלי זה כל ייצוא משאיר את הקובץ בזיכרון
  // הלשונית עד לרענון
  URL.revokeObjectURL(url);
};

const PurchaseReports = () => {
  const [source, setSource] = useState("orders");
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(today);
  const [customer, setCustomer] = useState("");
  const [kind, setKind] = useState("");

  // הסינון שלפיו נטען הדוח שמוצג כרגע. מוחזק בנפרד מהשדות כדי ששינוי
  // בשדה לא ישנה את כותרת הדוח לפני שהוא נטען מחדש
  const [applied, setApplied] = useState({
    source: "orders",
    from: firstOfMonth(),
    to: today(),
    customer: "",
    kind: "",
  });

  const [report, setReport] = useState(emptyReport);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [tab, setTab] = useState("customers");
  // הלקוח שהשורה שלו פתוחה. אחד בכל רגע — פתיחת כולן הופכת את הדוח
  // לרשימת תעודות ארוכה שאי אפשר לסרוק
  const [openCustomer, setOpenCustomer] = useState(null);

  useEffect(() => {
    // הפונקציה מפרקת את הארגומנט, ולכן קריאה בלי אובייקט זורקת
    CustomerServices.getAllCustomers({ searchText: "" })
      .then((res) => setCustomers(Array.isArray(res) ? res : res?.customers || []))
      .catch(() => setCustomers([]));
  }, []);

  // isStale מסמן שהסינון כבר הוחלף: תשובה שמגיעה באיחור אחרי סינון חדש
  // אסור לה לדרוס את הדוח שמוצג. בלי זה שתי לחיצות רצופות על "הצגת הדוח"
  // יכולות להשאיר על המסך את התוצאה של הסינון הקודם
  const load = useCallback(async (filters, isStale) => {
    setLoading(true);
    try {
      const res = await BillingServices.getCustomerPurchaseReport(filters);
      if (isStale()) return;
      if (!hasReportShape(res)) {
        setReport(emptyReport);
        notifyError("התקבלה תשובה לא צפויה מהשרת. ייתכן שהוא מריץ גרסה קודמת.");
        return;
      }
      setReport({ ...emptyReport, ...res });
      setOpenCustomer(null);
    } catch (err) {
      if (isStale()) return;
      // describeApiError מבדיל בין נתיב שאינו קיים בשרת (שדורש פריסה
      // מחדש) לבין תקלת רשת — שתיהן נראות אחרת למי שצריך לתקן
      notifyError(describeApiError(err, "טעינת הדוח נכשלה"));
      setReport(emptyReport);
    } finally {
      if (!isStale()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    load(applied, () => cancelled);
    return () => {
      cancelled = true;
    };
  }, [load, applied]);

  const submit = (e) => {
    e.preventDefault();
    // "סוג תעודה" קיים רק לתעודות. שליחתו עם מקור ההזמנות נדחית בשרת
    // בכוונה — סינון שאינו רלוונטי לא נבלע בשקט
    setApplied({ source, from, to, customer, kind: source === "notes" ? kind : "" });
  };

  const reset = () => {
    const next = {
      source: "orders",
      from: firstOfMonth(),
      to: today(),
      customer: "",
      kind: "",
    };
    setSource(next.source);
    setFrom(next.from);
    setTo(next.to);
    setCustomer(next.customer);
    setKind(next.kind);
    setApplied(next);
  };

  // המקור שהדוח שמוצג נטען לפיו — ולא זה שנבחר בשדה וטרם הורץ
  const meta = SOURCE_META[report.source] || SOURCE_META[applied.source] || SOURCE_META.orders;
  // "סוג" ו"אסמכתה" קיימים רק בתעודה. בהזמנה שתיהן יוצאות קבועות ("הזמנה")
  // או כפולות של מספר המסמך, כלומר עמודות שלא אומרות דבר
  const showNoteColumns = (report.source || applied.source) === "notes";

  // "מה קנה הלקוח הזה" — אותו דוח, מסונן ללקוח אחד, בחתך המוצרים.
  // בלי הקיצור הזה צריך לבחור את הלקוח בבורר ולהריץ את הדוח מחדש, ולכן
  // השאלה שהמסך נבנה בשבילה הייתה מוסתרת מאחורי שלוש פעולות
  const showCustomerProducts = (row) => {
    if (!row.customerId) return;
    setCustomer(row.customerId);
    // הטווח נשאר כפי שהדוח נטען, ולא כפי שהשדות מציגים כרגע
    setApplied((prev) => ({ ...prev, customer: row.customerId }));
    setTab("products");
  };

  const customerName = useMemo(() => {
    if (!applied.customer) return "";
    const found = customers.find((c) => String(c._id) === String(applied.customer));
    return found ? `${found.name || ""} ${found.lastName || ""}`.trim() : "";
  }, [applied.customer, customers]);

  /** הדוח כקובץ אקסל: גיליון לכל חתך, כולל כל התעודות בגיליון אחד. */
  const exportExcel = () => {
    const book = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.json_to_sheet(
        report.customers.map((row) => ({
          "מספר לקוח": row.customerNumber || "",
          לקוח: row.name,
          [meta.docs]: row.notesCount,
          שורות: row.itemsCount,
          'סה"כ (ללא מע"מ)': row.total,
        }))
      ),
      "לפי לקוח"
    );

    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.json_to_sheet(
        report.products.map((row) => ({
          מוצר: row.name,
          ברקוד: row.barcode || "",
          קטגוריה: row.categoryName || "",
          כמות: row.quantity,
          'סה"כ (ללא מע"מ)': row.total,
          לקוחות: row.customersCount,
        }))
      ),
      "לפי מוצר"
    );

    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.json_to_sheet(
        report.customers.flatMap((row) =>
          row.notes.map((note) => ({
            "מספר לקוח": row.customerNumber || "",
            לקוח: row.name,
            [meta.doc]: note.number,
            תאריך: note.issuedAt ? dayjs(note.issuedAt).format("DD/MM/YYYY") : "",
            ...(showNoteColumns
              ? {
                  סוג: KIND_LABELS[note.kind] || note.kind,
                  אסמכתה: note.orderNumber || note.manualReference || "",
                }
              : {}),
            שורות: note.itemCount,
            'סה"כ (ללא מע"מ)': note.total,
            סטטוס:
              note.statusLabel || STATUS_LABELS[note.status]?.text || note.status || "",
            חשבונית: note.icountDocNum || "",
            "נקלטה חלקית": note.flagged ? "כן" : "",
          }))
        )
      ),
      meta.docs
    );

    const range = `${applied.from || "הכל"}_${applied.to || "הכל"}`;
    downloadWorkbook(book, `דוח-רכישות-${meta.docs}-${range}.xlsx`);
  };

  const nothingFound = !loading && report.totals.notes === 0;

  return (
    <>
      <PageTitle>דוח רכישות לקוחות</PageTitle>

      <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
        <CardBody>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            מה נקנה בטווח התאריכים, לפי לקוח ולפי מוצר. {meta.note}
          </p>

          <form onSubmit={submit} className="flex flex-wrap items-end gap-4">
            <Label className="w-48">
              <span>מקור הנתונים</span>
              <Select
                className="mt-1"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                <option value="orders">הזמנות</option>
                <option value="notes">תעודות משלוח</option>
              </Select>
            </Label>

            <Label className="w-44">
              <span>מתאריך</span>
              <Input
                className="mt-1"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </Label>

            <Label className="w-44">
              <span>עד תאריך</span>
              <Input
                className="mt-1"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </Label>

            <Label className="flex-1 min-w-[220px]">
              <span>לקוח</span>
              <Select
                className="mt-1"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
              >
                <option value="">כל הלקוחות</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.erp?.customerNumber ? `${c.erp.customerNumber} — ` : ""}
                    {`${c.name || ""} ${c.lastName || ""}`.trim()}
                  </option>
                ))}
              </Select>
            </Label>

            {source === "notes" && (
            <Label className="w-44">
              <span>סוג תעודה</span>
              <Select
                className="mt-1"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
              >
                <option value="">הכל</option>
                <option value="auto">מהזמנה</option>
                <option value="manual">ידנית (משקל)</option>
              </Select>
            </Label>
            )}

            <div className="flex gap-2">
              <Button type="submit" className="h-12 bg-customGreen-dark">
                הצגת הדוח
              </Button>
              <Button type="button" layout="outline" className="h-12" onClick={reset}>
                <span className="text-black dark:text-gray-200">איפוס</span>
              </Button>
              <Button
                type="button"
                layout="outline"
                className="h-12"
                disabled={loading || report.totals.notes === 0}
                onClick={exportExcel}
              >
                <FiDownload className="ml-2" />
                <span className="text-black dark:text-gray-200">ייצוא לאקסל</span>
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* המספרים של הטווח שנבחר, לפני הפירוט */}
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "לקוחות שקנו", value: formatNumber(report.totals.customers) },
          { label: meta.docs, value: formatNumber(report.totals.notes) },
          { label: 'סה"כ רכישות (ללא מע"מ)', value: formatMoney(report.totals.total) },
          { label: "מוצרים שונים", value: formatNumber(report.products.length) },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg bg-white p-4 text-right dark:bg-gray-800"
          >
            <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
            <p className="mt-1 text-lg font-semibold text-gray-700 dark:text-gray-200">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {report.flagged > 0 && (
        <div className="mb-5 rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
          {formatNumber(report.flagged)} מתוך {formatNumber(report.totals.notes)}{" "}
          {meta.docs} בטווח נמצאות בסטטוס &quot;{report.flaggedLabel}&quot; — הקליטה
          האוטומטית לא זיהתה בהן את כל השורות. הן נכללות בדוח ומסומנות בטבלה,
          אבל הסכום והשורות שלהן עשויים להיות חלקיים.
        </div>
      )}

      {report.truncated && (
        <div className="mb-5 rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
          הדוח נחתך ב-{formatNumber(report.limit)} תעודות. הסכומים שמוצגים הם של
          החלק שנטען בלבד — כדאי לצמצם את טווח התאריכים.
        </div>
      )}

      <div className="mb-4 flex gap-2">
        {[
          { key: "customers", text: "לפי לקוח" },
          { key: "products", text: customerName ? `מה קנה ${customerName}` : "מה נקנה" },
        ].map((item) => (
          <Button
            key={item.key}
            layout={tab === item.key ? "primary" : "outline"}
            onClick={() => setTab(item.key)}
            className={tab === item.key ? "bg-customGreen-dark" : ""}
          >
            <span className={tab === item.key ? "" : "text-black dark:text-gray-200"}>
              {item.text}
            </span>
          </Button>
        ))}
      </div>

      {loading ? (
        <TableLoading row={10} col={5} width={180} height={20} />
      ) : nothingFound ? (
        <NotFound title="לא נמצאו תעודות בטווח שנבחר" />
      ) : tab === "customers" ? (
        <TableContainer className="mb-8">
          <Table className="w-full whitespace-nowrap admin-table">
            <TableHeader>
              <tr>
                <TableHeaderCell>מספר לקוח</TableHeaderCell>
                <TableHeaderCell>לקוח</TableHeaderCell>
                <TableHeaderCell className="text-center">{meta.docs}</TableHeaderCell>
                <TableHeaderCell className="text-center">שורות</TableHeaderCell>
                <TableHeaderCell>סה&quot;כ</TableHeaderCell>
                <TableHeaderCell className="text-right">פירוט</TableHeaderCell>
              </tr>
            </TableHeader>
            <TableBody>
              {report.customers.map((row) => {
                const key = row.customerId || row.name;
                const isOpen = openCustomer === key;

                return (
                  <React.Fragment key={key}>
                    <TableRow>
                      <TableCell>
                        <span className="text-xs font-semibold">
                          {row.customerNumber || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {row.customerId ? (
                          <Link
                            to={`/customer/${row.customerId}`}
                            className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                          >
                            {row.name}
                          </Link>
                        ) : (
                          <span className="text-sm">{row.name}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm">{formatNumber(row.notesCount)}</span>
                        {row.flaggedCount > 0 && (
                          <span
                            className="mr-1 text-xs text-yellow-700 dark:text-yellow-400"
                            title={`${row.flaggedCount} ${meta.docs} בסטטוס "${report.flaggedLabel}"`}
                          >
                            ⚠{formatNumber(row.flaggedCount)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm">{formatNumber(row.itemsCount)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-semibold">
                          {formatMoney(row.total)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-4">
                          <button
                            type="button"
                            onClick={() => showCustomerProducts(row)}
                            className="text-sm text-gray-600 hover:text-mainColor-dark dark:text-gray-300"
                          >
                            מה קנה
                          </button>
                          <button
                            type="button"
                            onClick={() => setOpenCustomer(isOpen ? null : key)}
                            className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-mainColor-dark dark:text-gray-300"
                            aria-expanded={isOpen}
                          >
                            {isOpen ? <FiChevronDown /> : <FiChevronLeft />}
                            {isOpen ? "סגירה" : meta.docs}
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {isOpen && (
                      <TableRow>
                        <TableCell colSpan="6" className="bg-gray-50 dark:bg-gray-900">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-gray-500 dark:text-gray-400">
                                <th scope="col" className="px-2 py-2 text-right">
                                  {meta.doc}
                                </th>
                                <th scope="col" className="px-2 py-2 text-right">
                                  תאריך
                                </th>
                                {showNoteColumns && (
                                  <>
                                    <th scope="col" className="px-2 py-2 text-right">
                                      סוג
                                    </th>
                                    <th scope="col" className="px-2 py-2 text-right">
                                      אסמכתה
                                    </th>
                                  </>
                                )}
                                <th scope="col" className="px-2 py-2 text-right">
                                  שורות
                                </th>
                                <th scope="col" className="px-2 py-2 text-right">
                                  סה&quot;כ
                                </th>
                                <th scope="col" className="px-2 py-2 text-right">
                                  סטטוס
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {row.notes.map((note) => {
                                // תעודה נושאת סטטוס חיוב; הזמנה נושאת את שם
                                // הסטטוס שלה כפי שהוא מוגדר במערכת
                                const status = note.statusLabel
                                  ? { text: note.statusLabel, type: note.flagged ? "warning" : "neutral" }
                                  : STATUS_LABELS[note.status] || STATUS_LABELS.open;
                                return (
                                  <tr key={note._id}>
                                    <td className="px-2 py-2">
                                      {/* פירוט השורות עצמן נפתח במסמך עצמו */}
                                      <Link
                                        to={meta.link(note._id)}
                                        className="text-blue-600 hover:underline dark:text-blue-400"
                                      >
                                        {note.number ?? "—"}
                                      </Link>
                                    </td>
                                    <td className="px-2 py-2">
                                      {formatDate(note.issuedAt)}
                                    </td>
                                    {showNoteColumns && (
                                      <>
                                        <td className="px-2 py-2">
                                          {KIND_LABELS[note.kind] || note.kind}
                                        </td>
                                        <td className="px-2 py-2">
                                          {note.orderNumber || note.manualReference || "—"}
                                        </td>
                                      </>
                                    )}
                                    <td className="px-2 py-2">{note.itemCount}</td>
                                    <td className="px-2 py-2 font-semibold">
                                      {formatMoney(note.total)}
                                    </td>
                                    <td className="px-2 py-2">
                                      <Badge type={status.type}>{status.text}</Badge>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <TableContainer className="mb-8">
          {/* סכום שורות התעודה אינו סך התעודה: מהתעודה יורדת ההנחה ומתווספים
              דמי משלוח. בלי המשפט הזה שני החתכים מציגים שני סכומים שונים
              לאותו דוח, ומי שמצליב אותם חושב שאחד מהם שגוי */}
          <p className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
            סכומי המוצרים הם לפי שורות התעודה — לפני הנחות ולפני דמי משלוח,
            ולכן הם עשויים להיות נמוכים מסך הרכישות שלמעלה.
          </p>
          <Table className="w-full whitespace-nowrap admin-table">
            <TableHeader>
              <tr>
                <TableHeaderCell>מוצר</TableHeaderCell>
                <TableHeaderCell>ברקוד</TableHeaderCell>
                <TableHeaderCell>קטגוריה</TableHeaderCell>
                <TableHeaderCell className="text-center">כמות</TableHeaderCell>
                <TableHeaderCell>סה&quot;כ</TableHeaderCell>
                <TableHeaderCell className="text-center">לקוחות</TableHeaderCell>
              </tr>
            </TableHeader>
            <TableBody>
              {report.products.map((row) => (
                <TableRow key={row.key}>
                  <TableCell>
                    <span className="text-sm">{row.name}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs">{row.barcode || "—"}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{row.categoryName || "—"}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm">{formatNumber(row.quantity)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-semibold">{formatMoney(row.total)}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-sm">{formatNumber(row.customersCount)}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </>
  );
};

export default PurchaseReports;
