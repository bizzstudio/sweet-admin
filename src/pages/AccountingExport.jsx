// src/pages/AccountingExport.jsx
//
// ייצוא להנהלת חשבונות — כל מסמכי המס בטווח תאריכים, לפי סוג, להדפסה או
// לאקסל (בקשת הלקוחה, 04/11/2026).
//
// הנתונים באים ישירות מ-iCount ולא מהמסד שלנו (ראה lib/billing/accountingExport
// בשרת), ולכן הסכומים כאן הם הסכומים המחייבים ולא אומדן. מספר הלקוח הוא
// המספר של מנוע.

import {
  Button,
  Card,
  CardBody,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHeader,
  TableRow,
} from "@windmill/react-ui";
import dayjs from "dayjs";
import React, { useRef, useState } from "react";
import { FiDownload, FiPrinter } from "react-icons/fi";
import ReactToPrint from "react-to-print";
import * as XLSX from "xlsx";

// Internal import
import TableLoading from "@/components/preloader/TableLoading";
import NotFound from "@/components/table/NotFound";
import TableHeaderCell from "@/components/table/TableHeaderCell";
import PageTitle from "@/components/Typography/PageTitle";
import BillingServices from "@/services/BillingServices";
import { describeApiError } from "@/utils/apiError";
import { formatMoney, formatNumber } from "@/utils/displayFormat";
import { notifyError } from "@/utils/toast";

// אותו סדר כמו בשרת (DOC_TYPES)
const TYPES = [
  { key: "invoice", text: "חשבונית מס" },
  { key: "invrec", text: "חשבונית מס קבלה" },
  { key: "refund", text: "חשבונית זיכוי" },
  { key: "receipt", text: "קבלה" },
];
const typeText = (key) => TYPES.find((t) => t.key === key)?.text || key;

const fmt = (d) => d.format("YYYY-MM-DD");

const PRESETS = [
  { key: "lastMonth", text: "החודש הקודם", from: () => dayjs().subtract(1, "month").startOf("month"),
    to: () => dayjs().subtract(1, "month").endOf("month") },
  { key: "month", text: "החודש", from: () => dayjs().startOf("month"), to: () => dayjs() },
  { key: "year", text: "מתחילת השנה", from: () => dayjs().startOf("year"), to: () => dayjs() },
];

const showDate = (day) => (day ? day.split("-").reverse().join("/") : "");

// סכום ריק (קבלה אין לה מע"מ) מוצג כקו ולא כאפס, כדי שלא ייקרא כ"מע"מ 0"
const cellMoney = (n) => (n === null || n === undefined ? "—" : formatMoney(n));

// אותה הורדה כמו בריכוז ההכנסות
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
  URL.revokeObjectURL(url);
};

// הדפסה לרוחב: הטבלה רחבה, ובעמוד לאורך העמודות האחרונות נחתכות. מיכל
// הטבלה גולל בגלילה אופקית, ובהדפסה מה שמעבר לרוחב היה נחתך — לכן overflow
// גלוי ושורות שנשברות. כותרת הטבלה חוזרת בכל עמוד
const PRINT_PAGE_STYLE = `
  @page { size: A4 landscape; margin: 10mm; }
  @media print {
    html { font-size: 11px !important; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    * { overflow: visible !important; }
    table { white-space: normal !important; }
    thead { display: table-header-group; }
    tr { break-inside: avoid; }
  }
`;

const AccountingExport = () => {
  const [from, setFrom] = useState(() => fmt(PRESETS[0].from()));
  const [to, setTo] = useState(() => fmt(PRESETS[0].to()));
  const [types, setTypes] = useState(() => TYPES.map((t) => t.key));

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const printRef = useRef();

  const allSelected = types.length === TYPES.length;

  const toggleType = (key) =>
    setTypes((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : TYPES.map((t) => t.key).filter((k) => k === key || prev.includes(k))
    );

  const toggleAll = () => setTypes(allSelected ? [] : TYPES.map((t) => t.key));

  const load = async (range = { from, to }) => {
    if (!range.from || !range.to) return notifyError("יש לבחור מתאריך ועד תאריך");
    if (range.from > range.to) return notifyError("תאריך הסיום מוקדם מתאריך ההתחלה");
    if (!types.length) return notifyError("יש לבחור לפחות סוג מסמך אחד");

    setLoading(true);
    try {
      const res = await BillingServices.getAccountingExport({ ...range, types: types.join(",") });
      if (!Array.isArray(res?.rows) || !res?.totals) {
        setReport(null);
        notifyError("התקבלה תשובה לא צפויה מהשרת. ייתכן שהוא מריץ גרסה קודמת.");
        return;
      }
      setReport(res);
    } catch (err) {
      notifyError(describeApiError(err, "טעינת המסמכים מ-iCount נכשלה"));
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    load();
  };

  const applyPreset = (preset) => {
    const range = { from: fmt(preset.from()), to: fmt(preset.to()) };
    setFrom(range.from);
    setTo(range.to);
    load(range);
  };

  const rows = report?.rows || [];
  const shownTypes = report ? report.types : [];
  const rangeText = report ? `${showDate(report.from)} – ${showDate(report.to)}` : "";

  const exportExcel = () => {
    const book = XLSX.utils.book_new();
    const blank = (n) => (n === null || n === undefined ? "" : n);

    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.json_to_sheet(
        rows.map((r) => ({
          "סוג מסמך": r.typeLabel,
          "מספר מסמך": r.docNum,
          תאריך: showDate(r.date),
          "מספר לקוח": r.customerNumber,
          לקוח: r.customerName,
          'ח"פ / ת"ז': r.vatId,
          'חייב במע"מ': blank(r.taxable),
          'פטור ממע"מ': blank(r.exempt),
          'סה"כ לפני מע"מ': blank(r.net),
          'מע"מ': blank(r.vat),
          'סה"כ': r.gross,
          הנחה: r.discount || "",
          "אמצעי תשלום": r.paymentMethod,
          סטטוס: r.status,
          "מבוסס על": r.basedOn,
          "מספר הקצאה": r.allocationNumber,
          "קישור למסמך": r.url,
        }))
      ),
      "מסמכים"
    );

    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.json_to_sheet(
        shownTypes.map((type) => {
          const t = report.totals[type];
          const payment = type === "receipt";
          return {
            "סוג מסמך": typeText(type),
            מסמכים: t.count,
            'חייב במע"מ': payment ? "" : t.taxable,
            'פטור ממע"מ': payment ? "" : t.exempt,
            'סה"כ לפני מע"מ': payment ? "" : t.net,
            'מע"מ': payment ? "" : t.vat,
            'סה"כ': t.gross,
          };
        })
      ),
      "סיכום"
    );

    downloadWorkbook(book, `ייצוא-הנהלת-חשבונות-${report.from}_${report.to}.xlsx`);
  };

  return (
    <>
      <PageTitle>ייצוא להנהלת חשבונות</PageTitle>

      <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
        <CardBody>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            כל מסמכי המס שהופקו ב-iCount בטווח התאריכים, לפי תאריך המסמך. הסכומים
            נלקחים מ-iCount עצמו. חשבוניות זיכוי מוצגות במינוס, ומסמכים שבוטלו
            נשארים ברשימה עם הסימון &quot;בוטל&quot; — יחד עם הזיכוי שביטל אותם.
          </p>

          <div className="mb-4 flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <Button key={preset.key} layout="outline" size="small" disabled={loading} onClick={() => applyPreset(preset)}>
                <span className="text-black dark:text-gray-200">{preset.text}</span>
              </Button>
            ))}
          </div>

          <form onSubmit={submit}>
            <div className="flex flex-wrap items-end gap-4">
              <Label className="w-44">
                <span>מתאריך</span>
                <Input className="mt-1" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </Label>

              <Label className="w-44">
                <span>עד תאריך</span>
                <Input className="mt-1" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </Label>
            </div>

            <fieldset className="mt-4">
              <legend className="mb-2 text-sm text-gray-700 dark:text-gray-400">סוגי מסמכים</legend>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <Label check>
                  <Input type="checkbox" checked={allSelected} onChange={toggleAll} />
                  <span className="mr-2 font-semibold">כל סוגי המסמכים</span>
                </Label>
                {TYPES.map((t) => (
                  <Label check key={t.key}>
                    <Input type="checkbox" checked={types.includes(t.key)} onChange={() => toggleType(t.key)} />
                    <span className="mr-2">{t.text}</span>
                  </Label>
                ))}
              </div>
            </fieldset>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="submit" className="h-12 bg-customGreen-dark" disabled={loading}>
                {loading ? "טוען מ-iCount..." : "הצגה"}
              </Button>
              <Button
                type="button"
                layout="outline"
                className="h-12"
                disabled={loading || !rows.length}
                onClick={exportExcel}
              >
                <FiDownload className="ml-2" />
                <span className="text-black dark:text-gray-200">ייצוא לאקסל</span>
              </Button>
              <ReactToPrint
                trigger={() => (
                  <Button type="button" layout="outline" className="h-12" disabled={loading || !rows.length}>
                    <FiPrinter className="ml-2" />
                    <span className="text-black dark:text-gray-200">הדפסה / PDF</span>
                  </Button>
                )}
                content={() => printRef.current}
                documentTitle={report ? `ייצוא-הנהלת-חשבונות-${report.from}_${report.to}` : "ייצוא-הנהלת-חשבונות"}
                pageStyle={PRINT_PAGE_STYLE}
              />
            </div>
          </form>
        </CardBody>
      </Card>

      {loading ? (
        <TableLoading row={8} col={6} width={160} height={20} />
      ) : !report ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">יש לבחור טווח תאריכים וסוגי מסמכים וללחוץ &quot;הצגה&quot;.</p>
      ) : (
        <div ref={printRef} dir="rtl" className="min-w-0">
          <h2 className="mb-1 text-lg font-semibold text-gray-700 dark:text-gray-200">
            מסמכי מס {rangeText}
          </h2>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            {shownTypes.map(typeText).join(" · ")}
          </p>

          {/* סיכום לפי סוג — קבלה בנפרד, כי היא תקבול ולא הכנסה */}
          <TableContainer className="mb-6 min-w-0">
            <Table className="w-full whitespace-nowrap admin-table">
              <TableHeader>
                <tr>
                  <TableHeaderCell>סוג מסמך</TableHeaderCell>
                  <TableHeaderCell className="text-center">מסמכים</TableHeaderCell>
                  <TableHeaderCell>חייב במע&quot;מ</TableHeaderCell>
                  <TableHeaderCell>פטור ממע&quot;מ</TableHeaderCell>
                  <TableHeaderCell>לפני מע&quot;מ</TableHeaderCell>
                  <TableHeaderCell>מע&quot;מ</TableHeaderCell>
                  <TableHeaderCell>סה&quot;כ</TableHeaderCell>
                </tr>
              </TableHeader>
              <TableBody>
                {shownTypes.map((type) => {
                  const t = report.totals[type];
                  const payment = type === "receipt";
                  return (
                    <TableRow key={type}>
                      <TableCell><span className="text-sm font-semibold">{typeText(type)}</span></TableCell>
                      <TableCell className="text-center"><span className="text-sm">{formatNumber(t.count)}</span></TableCell>
                      <TableCell><span className="text-sm">{payment ? "—" : formatMoney(t.taxable)}</span></TableCell>
                      <TableCell><span className="text-sm">{payment ? "—" : formatMoney(t.exempt)}</span></TableCell>
                      <TableCell><span className="text-sm">{payment ? "—" : formatMoney(t.net)}</span></TableCell>
                      <TableCell><span className="text-sm">{payment ? "—" : formatMoney(t.vat)}</span></TableCell>
                      <TableCell><span className="text-sm font-semibold">{formatMoney(t.gross)}</span></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {!rows.length ? (
            <NotFound title="לא נמצאו מסמכים בטווח שנבחר" />
          ) : (
            <TableContainer className="mb-8 min-w-0">
              <Table className="w-full whitespace-nowrap admin-table">
                <TableHeader>
                  <tr>
                    <TableHeaderCell>סוג</TableHeaderCell>
                    <TableHeaderCell>מספר</TableHeaderCell>
                    <TableHeaderCell>תאריך</TableHeaderCell>
                    <TableHeaderCell>מס&apos; לקוח</TableHeaderCell>
                    <TableHeaderCell>לקוח</TableHeaderCell>
                    <TableHeaderCell>לפני מע&quot;מ</TableHeaderCell>
                    <TableHeaderCell>מע&quot;מ</TableHeaderCell>
                    <TableHeaderCell>סה&quot;כ</TableHeaderCell>
                    <TableHeaderCell>סטטוס</TableHeaderCell>
                    <TableHeaderCell>מבוסס על</TableHeaderCell>
                  </tr>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={`${r.type}-${r.docNum}`}>
                      <TableCell><span className="text-sm">{r.typeLabel}</span></TableCell>
                      <TableCell>
                        {r.url ? (
                          <a href={r.url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
                            {r.docNum}
                          </a>
                        ) : (
                          <span className="text-sm">{r.docNum}</span>
                        )}
                      </TableCell>
                      <TableCell><span className="text-sm">{showDate(r.date)}</span></TableCell>
                      <TableCell><span className="text-xs font-semibold">{r.customerNumber || "—"}</span></TableCell>
                      <TableCell><span className="text-sm">{r.customerName}</span></TableCell>
                      <TableCell><span className="text-sm">{cellMoney(r.net)}</span></TableCell>
                      <TableCell><span className="text-sm">{cellMoney(r.vat)}</span></TableCell>
                      <TableCell><span className="text-sm font-semibold">{formatMoney(r.gross)}</span></TableCell>
                      <TableCell><span className="text-sm">{r.status || r.paymentMethod}</span></TableCell>
                      <TableCell><span className="text-xs">{r.basedOn}</span></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </div>
      )}
    </>
  );
};

export default AccountingExport;
