// src/pages/SummaryReport.jsx
//
// עמוד ריכוז — "כמה עשיתי מתאריך X ועד היום", בתעודות ובחשבוניות.
//
// שני המספרים מוצגים זה ליד זה ולא מאוחדים: תעודה נספרת לפי יום ההפקה
// שלה, וחשבונית לפי יום החיוב — ותעודות מסוף החודש מחויבות בחודש שאחריו.
// לכן המסך מראה גם כמה מהתעודות בטווח עוד לא חויבו, כדי שהפער בין שני
// המספרים יוסבר על המסך ולא ייראה כטעות.

import {
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
import React, { useCallback, useEffect, useState } from "react";
import { FiDownload } from "react-icons/fi";
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
import { formatMoney, formatNumber } from "@/utils/displayFormat";
import { notifyError } from "@/utils/toast";

const today = () => dayjs().format("YYYY-MM-DD");

// קיצורי הטווח שנשאלים בפועל. "עד היום" הוא תמיד הסוף
const PRESETS = [
  { key: "month", text: "החודש", from: () => dayjs().startOf("month") },
  { key: "lastMonth", text: "החודש הקודם", from: () => dayjs().subtract(1, "month").startOf("month"),
    to: () => dayjs().subtract(1, "month").endOf("month") },
  { key: "year", text: "מתחילת השנה", from: () => dayjs().startOf("year") },
  { key: "all", text: "הכל", from: () => null },
];

const zero = { count: 0, net: 0, gross: 0, vat: 0 };
const emptyReport = {
  notes: { total: zero, billed: zero, open: zero, cancelled: zero },
  invoices: { total: zero, paid: zero, unpaid: zero, credits: zero, afterCredits: zero },
  customers: [],
};

// תשובה עם סטטוס 200 בלי המבנה הצפוי (שרת בגרסה קודמת) הייתה מוצגת
// כאפסים — תשובה שנראית אמיתית. עדיף לומר שהשרת לא ענה כמצופה
const hasReportShape = (res) =>
  Boolean(res?.notes?.total) && Boolean(res?.invoices?.total) && Array.isArray(res?.customers);

// אותה הורדה כמו בדוח הרכישות — ראה שם למה Blob ולא writeFile
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

/** כרטיס של סכום: לפני מע"מ בגדול, כולל מע"מ ומספר המסמכים מתחת. */
const MoneyCard = ({ title, money, docs, accent }) => (
  <div className={`rounded-lg bg-white p-4 text-right dark:bg-gray-800 ${accent ? "border-r-4 border-customGreen-dark" : ""}`}>
    <p className="text-xs text-gray-500 dark:text-gray-400">{title}</p>
    <p className="mt-1 text-xl font-semibold text-gray-700 dark:text-gray-200">
      {formatMoney(money.net)}
      <span className="mr-1 text-xs font-normal text-gray-500 dark:text-gray-400">לפני מע&quot;מ</span>
    </p>
    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
      {formatMoney(money.gross)} כולל מע&quot;מ · {formatNumber(money.count)} {docs}
    </p>
  </div>
);

const SummaryReport = () => {
  const [from, setFrom] = useState(() => dayjs().startOf("month").format("YYYY-MM-DD"));
  const [to, setTo] = useState(today);
  const [customer, setCustomer] = useState("");
  const [applied, setApplied] = useState(() => ({
    from: dayjs().startOf("month").format("YYYY-MM-DD"),
    to: today(),
    customer: "",
  }));

  const [report, setReport] = useState(emptyReport);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    CustomerServices.getAllCustomers({ searchText: "" })
      .then((res) => setCustomers(Array.isArray(res) ? res : res?.customers || []))
      .catch(() => setCustomers([]));
  }, []);

  // isStale: תשובה שמגיעה אחרי שהסינון כבר הוחלף לא דורסת את הדוח שמוצג
  const load = useCallback(async (filters, isStale) => {
    setLoading(true);
    try {
      const res = await BillingServices.getSummaryReport(filters);
      if (isStale()) return;
      if (!hasReportShape(res)) {
        setReport(emptyReport);
        notifyError("התקבלה תשובה לא צפויה מהשרת. ייתכן שהוא מריץ גרסה קודמת.");
        return;
      }
      setReport(res);
    } catch (err) {
      if (isStale()) return;
      notifyError(describeApiError(err, "טעינת הריכוז נכשלה"));
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
    setApplied({ from, to, customer });
  };

  // קיצור טווח מריץ את הדוח מיד — זו כל המטרה שלו
  const applyPreset = (preset) => {
    const nextFrom = preset.from()?.format("YYYY-MM-DD") || "";
    const nextTo = preset.to ? preset.to().format("YYYY-MM-DD") : today();
    setFrom(nextFrom);
    setTo(nextTo);
    setApplied({ from: nextFrom, to: nextTo, customer });
  };

  const { notes, invoices } = report;

  const exportExcel = () => {
    const book = XLSX.utils.book_new();
    const line = (label, m) => ({
      שורה: label,
      מסמכים: m.count,
      'לפני מע"מ': m.net,
      'מע"מ': m.vat,
      'כולל מע"מ': m.gross,
    });

    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.json_to_sheet([
        line("תעודות משלוח", notes.total),
        line("  מתוכן חויבו", notes.billed),
        line("  מתוכן טרם חויבו", notes.open),
        line("תעודות שבוטלו (לא בסכום)", notes.cancelled),
        line("חשבוניות", invoices.total),
        line("  מתוכן שולמו", invoices.paid),
        line("  מתוכן טרם שולמו", invoices.unpaid),
        line("זיכויים חלקיים", invoices.credits),
        line("חשבוניות אחרי זיכויים", invoices.afterCredits),
      ]),
      "ריכוז"
    );

    XLSX.utils.book_append_sheet(
      book,
      XLSX.utils.json_to_sheet(
        report.customers.map((row) => ({
          "מספר לקוח": row.customerNumber || "",
          לקוח: row.name,
          תעודות: row.notes.count,
          'תעודות לפני מע"מ': row.notes.net,
          'תעודות כולל מע"מ': row.notes.gross,
          חשבוניות: row.invoices.count,
          'חשבוניות לפני מע"מ': row.invoices.net,
          'חשבוניות כולל מע"מ': row.invoices.gross,
          'זיכויים כולל מע"מ': row.credits.gross,
        }))
      ),
      "לפי לקוח"
    );

    const range = `${applied.from || "הכל"}_${applied.to || "הכל"}`;
    downloadWorkbook(book, `ריכוז-הכנסות-${range}.xlsx`);
  };

  const nothingFound = !loading && notes.total.count === 0 && invoices.total.count === 0;

  return (
    <>
      <PageTitle>ריכוז הכנסות</PageTitle>

      <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
        <CardBody>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            כמה יצא בתעודות משלוח וכמה בחשבוניות בטווח התאריכים. תעודה נספרת לפי
            יום ההפקה שלה, וחשבונית לפי יום החיוב — ולכן שני המספרים לא אמורים
            להיות שווים. הסכומים כולל מע&quot;מ הם אומדן; הסכום המחייב הוא זה
            שב-iCount.
          </p>

          <div className="mb-4 flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <Button key={preset.key} layout="outline" size="small" onClick={() => applyPreset(preset)}>
                <span className="text-black dark:text-gray-200">{preset.text}</span>
              </Button>
            ))}
          </div>

          <form onSubmit={submit} className="flex flex-wrap items-end gap-4">
            <Label className="w-44">
              <span>מתאריך</span>
              <Input className="mt-1" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Label>

            <Label className="w-44">
              <span>עד תאריך</span>
              <Input className="mt-1" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </Label>

            <Label className="flex-1 min-w-[220px]">
              <span>לקוח</span>
              <Select className="mt-1" value={customer} onChange={(e) => setCustomer(e.target.value)}>
                <option value="">כל הלקוחות</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.erp?.customerNumber ? `${c.erp.customerNumber} — ` : ""}
                    {`${c.name || ""} ${c.lastName || ""}`.trim()}
                  </option>
                ))}
              </Select>
            </Label>

            <div className="flex gap-2">
              <Button type="submit" className="h-12 bg-customGreen-dark">
                הצגה
              </Button>
              <Button
                type="button"
                layout="outline"
                className="h-12"
                disabled={loading || nothingFound}
                onClick={exportExcel}
              >
                <FiDownload className="ml-2" />
                <span className="text-black dark:text-gray-200">ייצוא לאקסל</span>
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {loading ? (
        <TableLoading row={6} col={4} width={180} height={20} />
      ) : (
        <>
          <h2 className="mb-3 text-lg font-semibold text-gray-700 dark:text-gray-200">תעודות משלוח</h2>
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <MoneyCard title={'סה"כ תעודות בטווח'} money={notes.total} docs="תעודות" accent />
            <MoneyCard title="מתוכן חויבו" money={notes.billed} docs="תעודות" />
            <MoneyCard title="מתוכן טרם חויבו" money={notes.open} docs="תעודות" />
          </div>
          {notes.cancelled.count > 0 && (
            <p className="-mt-3 mb-6 text-xs text-gray-500 dark:text-gray-400">
              {formatNumber(notes.cancelled.count)} תעודות שבוטלו בטווח ({formatMoney(notes.cancelled.net)} לפני
              מע&quot;מ) אינן נכללות בסכום.
            </p>
          )}

          <h2 className="mb-3 text-lg font-semibold text-gray-700 dark:text-gray-200">חשבוניות</h2>
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <MoneyCard title={'סה"כ חשבוניות בטווח'} money={invoices.total} docs="חשבוניות" accent />
            <MoneyCard title="מתוכן שולמו" money={invoices.paid} docs="חשבוניות" />
            <MoneyCard title="מתוכן טרם שולמו" money={invoices.unpaid} docs="חשבוניות" />
          </div>
          {invoices.credits.count > 0 && (
            <p className="-mt-3 mb-6 text-sm text-gray-600 dark:text-gray-300">
              זיכויים חלקיים בטווח: {formatMoney(invoices.credits.gross)} כולל מע&quot;מ (
              {formatNumber(invoices.credits.count)}). אחרי הזיכויים:{" "}
              <span className="font-semibold">{formatMoney(invoices.afterCredits.gross)}</span> כולל מע&quot;מ.
            </p>
          )}

          {report.truncated && (
            <div className="mb-5 rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
              הדוח נחתך ב-{formatNumber(report.limit)} תעודות. סכומי התעודות הם של החלק
              שנטען בלבד — כדאי לצמצם את טווח התאריכים.
            </div>
          )}

          <h2 className="mb-3 text-lg font-semibold text-gray-700 dark:text-gray-200">לפי לקוח</h2>
          {nothingFound ? (
            <NotFound title="לא נמצאו תעודות או חשבוניות בטווח שנבחר" />
          ) : (
            // min-w-0: העמוד יושב בתוך grid (layout/Main), ובלי זה הטבלה —
            // שהשורות שלה לא נשברות — מרחיבה את כל העמוד בנייד במקום לגלול בעצמה
            <TableContainer className="mb-8 min-w-0">
              <Table className="w-full whitespace-nowrap admin-table">
                <TableHeader>
                  <tr>
                    <TableHeaderCell>מספר לקוח</TableHeaderCell>
                    <TableHeaderCell>לקוח</TableHeaderCell>
                    <TableHeaderCell className="text-center">תעודות</TableHeaderCell>
                    <TableHeaderCell>תעודות לפני מע&quot;מ</TableHeaderCell>
                    <TableHeaderCell className="text-center">חשבוניות</TableHeaderCell>
                    <TableHeaderCell>חשבוניות לפני מע&quot;מ</TableHeaderCell>
                    <TableHeaderCell>חשבוניות כולל מע&quot;מ</TableHeaderCell>
                  </tr>
                </TableHeader>
                <TableBody>
                  {report.customers.map((row) => (
                    <TableRow key={row.customerId || row.name}>
                      <TableCell>
                        <span className="text-xs font-semibold">{row.customerNumber || "—"}</span>
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
                        <span className="text-sm">{formatNumber(row.notes.count)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{formatMoney(row.notes.net)}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm">{formatNumber(row.invoices.count)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{formatMoney(row.invoices.net)}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-semibold">{formatMoney(row.invoices.gross)}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}
    </>
  );
};

export default SummaryReport;
