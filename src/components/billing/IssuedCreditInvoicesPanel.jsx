// src/components/billing/IssuedCreditInvoicesPanel.jsx
//
// "חשבוניות זיכוי שהופקו" — קובייה בראש מסך הזיכויים, שורה לכל מסמך.
//
// נבנה ב-02/11/2026: הלקוחה הפיקה חשבונית זיכוי מרוכזת ולא מצאה אותה.
// היא אינה מקושרת לחשבונית, ולכן אינה במסך החשבוניות, ובטבלת התעודות
// מספרה מופיע קטן מתחת לסטטוס של כל תעודה שבה.
//
// נכלל גם זיכוי של חשבונית שלמה (כפתור "זיכוי" במסך החשבוניות). הוא אינו
// תעודת זיכוי, והחשבונית שזוכתה יוצאת מרשימת החשבוניות — בלי הקובייה
// אין מקום שבו רואים אותו. הסכום שלו לא נשמר (total: null), ולכן מוצג
// "—" והוא אינו נספר בסיכום; הסכום במסמך עצמו.
//
// הקובייה מסוננת לפי אותו חיפוש ואותו לקוח כמו הטבלה שמתחתיה.

import React, { useEffect, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHeader,
  TableRow,
} from "@windmill/react-ui";
import { FiExternalLink } from "react-icons/fi";
import { MdOutlineReceiptLong } from "react-icons/md";

import TableHeaderCell from "@/components/table/TableHeaderCell";
import BillingServices from "@/services/BillingServices";

const SHOWN = 5;

const shekel = (n) =>
  Number(n || 0).toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const hebDate = (d) => (d ? new Date(d).toLocaleDateString("he-IL") : "—");

// reload משתנה אחרי כל הפקה במסך, כדי שהמסמך החדש יופיע בלי רענון
const IssuedCreditInvoicesPanel = ({ customer, search, reload }) => {
  const [docs, setDocs] = useState(null);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let alive = true;
    setError(null);
    BillingServices.getIssuedCreditInvoices({ customer, search })
      .then((res) => alive && setDocs(res.docs || []))
      .catch((err) => alive && setError(err?.response?.data?.message || err.message));
    return () => {
      alive = false;
    };
  }, [customer, search, reload]);

  const list = docs || [];
  const shown = showAll ? list : list.slice(0, SHOWN);
  const sum = list.reduce((s, d) => s + (d.total || 0), 0);
  const withoutTotal = list.filter((d) => d.total === null).length;

  return (
    <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
      <CardBody>
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-700 dark:text-gray-200">
            <MdOutlineReceiptLong /> חשבוניות זיכוי שהופקו
          </h2>
          {docs && list.length > 0 && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {list.length} מסמכים · {shekel(sum)} ₪ כולל מע"מ
              {withoutTotal > 0 && ` (בלי ${withoutTotal} זיכויי חשבונית שלמה)`}
            </span>
          )}
        </div>

        {error ? (
          <p className="text-sm text-red-600">לא ניתן לטעון את חשבוניות הזיכוי: {error}</p>
        ) : !docs ? (
          <p className="text-sm text-gray-500">טוען...</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-gray-500">
            {search || customer ? "אין חשבוניות זיכוי שמתאימות לסינון" : "עדיין לא הופקו חשבוניות זיכוי"}
          </p>
        ) : (
          <>
            <TableContainer>
              <Table className="w-full whitespace-nowrap admin-table">
                <TableHeader>
                  <tr>
                    <TableHeaderCell>חשבונית זיכוי</TableHeaderCell>
                    <TableHeaderCell>תאריך</TableHeaderCell>
                    <TableHeaderCell>לקוח</TableHeaderCell>
                    <TableHeaderCell>מה זוכה</TableHeaderCell>
                    <TableHeaderCell className="text-left">סכום כולל מע"מ</TableHeaderCell>
                  </tr>
                </TableHeader>
                <TableBody>
                  {shown.map((d) => (
                    <TableRow key={d.creditDocNum}>
                      <TableCell className="font-mono font-semibold">
                        {d.creditDocUrl ? (
                          <a
                            href={d.creditDocUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline inline-flex items-center gap-1"
                            title="פתיחת המסמך ב-iCount"
                          >
                            {d.creditDocNum} <FiExternalLink />
                          </a>
                        ) : (
                          d.creditDocNum
                        )}
                        {d.originalDocNum && !d.wholeInvoice && (
                          <span className="block text-xs text-gray-500 font-sans font-normal">
                            בגין חשבונית {d.originalDocNum}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{hebDate(d.billedAt)}</TableCell>
                      <TableCell>
                        {d.customerName || "—"}
                        {d.customerNumber && (
                          <span className="block text-xs text-gray-500 font-mono">
                            לקוח {d.customerNumber}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-normal max-w-xs">
                        {d.wholeInvoice ? (
                          <span title={d.reason || undefined}>
                            זיכוי כל חשבונית <span className="font-mono">{d.originalDocNum}</span>
                          </span>
                        ) : (
                          <span className="font-mono">{d.noteNumbers.join(", ")}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-left">
                        {d.total === null ? (
                          <span title="הסכום מופיע במסמך עצמו">—</span>
                        ) : (
                          `${shekel(d.total)} ₪`
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {list.length > SHOWN && (
              <Button layout="link" size="small" className="mt-2" onClick={() => setShowAll((v) => !v)}>
                {showAll ? "הצג פחות" : `הצג את כולן (${list.length})`}
              </Button>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
};

export default IssuedCreditInvoicesPanel;
