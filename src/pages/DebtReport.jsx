// src/pages/DebtReport.jsx
//
// כמה כל לקוח חייב על חשבוניות שלא שולמו, לפי חודש: "אוקטובר 9,000, נובמבר
// 8,000" (בקשת הלקוחה, 01/11/2026). החודש הוא חודש החיוב של התעודות, ולכן
// חשבונית אוקטובר שהופקה ב-1 בנובמבר נספרת באוקטובר.

import React, { useEffect, useMemo, useState } from "react";
import {
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
import { FiInfo } from "react-icons/fi";
import { Link } from "react-router-dom";

import PageTitle from "@/components/Typography/PageTitle";
import DemoModeBanner from "@/components/common/DemoModeBanner";
import TableLoading from "@/components/preloader/TableLoading";
import NotFound from "@/components/table/NotFound";
import TableHeaderCell from "@/components/table/TableHeaderCell";
import BillingServices from "@/services/BillingServices";
import { formatMonth } from "@/utils/displayFormat";
import { notifyError } from "@/utils/toast";

const shekel = (n) =>
  Number(n || 0).toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const DebtReport = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await BillingServices.getDebtReport();
        if (alive) setReport(res);
      } catch (err) {
        if (alive) notifyError(err?.response?.data?.message || err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // הסינון מקומי: הדוח מגיע שלם, וכל לקוח הוא שורה אחת
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (report?.customers || [])
      .filter(
        (c) =>
          !term ||
          String(c.name || "").toLowerCase().includes(term) ||
          String(c.customerNumber || "").toLowerCase().includes(term)
      )
      .map((c) => {
        if (!month) return c;
        const months = c.months.filter((m) => m.month === month);
        return { ...c, months, total: months.reduce((s, m) => s + m.amount, 0) };
      })
      .filter((c) => c.months.length);
  }, [report, search, month]);

  const shownTotal = rows.reduce((s, c) => s + c.total, 0);

  return (
    <>
      <PageTitle>חובות לקוחות לפי חודש</PageTitle>

      <DemoModeBanner />

      <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
        <CardBody>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex flex-wrap items-end gap-4">
              <Label className="w-56">
                <span>חיפוש לקוח</span>
                <Input
                  className="mt-1"
                  type="search"
                  placeholder="שם לקוח או מס' לקוח"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </Label>
              <Label className="w-48">
                <span>חודש</span>
                <Select className="mt-1" value={month} onChange={(e) => setMonth(e.target.value)}>
                  <option value="">כל החודשים</option>
                  {(report?.months || []).map((m) => (
                    <option key={m.month} value={m.month}>
                      {formatMonth(m.month)}
                    </option>
                  ))}
                </Select>
              </Label>
            </div>

            <div className="flex gap-8">
              <div>
                <p className="text-xs text-gray-500">לקוחות</p>
                <p className="text-2xl font-semibold">{rows.length}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">סה"כ חוב</p>
                <p className="text-2xl font-semibold">{shekel(shownTotal)} ₪</p>
              </div>
            </div>
          </div>

          {report?.months?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
              {report.months.map((m) => (
                <span key={m.month}>
                  {formatMonth(m.month)}:{" "}
                  <span className="font-semibold">{shekel(m.amount)} ₪</span>
                </span>
              ))}
            </div>
          )}

          <p className="mt-4 text-xs text-gray-500 flex items-start gap-2">
            <FiInfo className="mt-0.5 shrink-0" />
            <span>
              הסכומים כוללים מע"מ, על חשבוניות שלא נרשם עליהן תשלום. החודש הוא
              חודש החיוב של התעודות. יתרת הלקוח (למשל חשבונית זיכוי נפרדת) אינה
              שייכת לחודש, ולכן היא מופיעה בנפרד ו"לתשלום" הוא הסכום אחריה.
            </span>
          </p>
        </CardBody>
      </Card>

      {loading ? (
        <TableLoading row={8} col={4} width={160} height={20} />
      ) : rows.length === 0 ? (
        <NotFound title="אין חשבוניות שלא שולמו" />
      ) : (
        <TableContainer className="min-w-0 mb-8">
          <Table className="w-full whitespace-nowrap admin-table">
            <TableHeader>
              <tr>
                <TableHeaderCell>לקוח</TableHeaderCell>
                <TableHeaderCell>לפי חודש</TableHeaderCell>
                <TableHeaderCell className="text-left">סה"כ חוב</TableHeaderCell>
                <TableHeaderCell className="text-left">יתרה בכרטיס</TableHeaderCell>
                {!month && <TableHeaderCell className="text-left">לתשלום</TableHeaderCell>}
              </tr>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.customerId}>
                  <TableCell>
                    {c.name}
                    {c.customerNumber && (
                      <span className="block text-xs text-gray-500">מס' {c.customerNumber}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {c.months.map((m) => (
                      <span key={m.month} className="block text-sm">
                        {formatMonth(m.month)}: {shekel(m.amount)} ₪
                      </span>
                    ))}
                  </TableCell>
                  <TableCell className="text-left font-semibold">
                    <Link
                      to={`/invoices?customer=${c.customerId}`}
                      className="text-blue-600 hover:underline"
                      title="החשבוניות של הלקוח"
                    >
                      {shekel(c.total)} ₪
                    </Link>
                  </TableCell>
                  <TableCell className="text-left text-sm text-gray-600 dark:text-gray-400">
                    {c.balance > 0
                      ? `זכות ${shekel(c.balance)} ₪`
                      : c.balance < 0
                      ? `חוב ${shekel(-c.balance)} ₪`
                      : "—"}
                  </TableCell>
                  {!month && (
                    <TableCell className="text-left font-semibold">{shekel(c.netDue)} ₪</TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </>
  );
};

export default DebtReport;
