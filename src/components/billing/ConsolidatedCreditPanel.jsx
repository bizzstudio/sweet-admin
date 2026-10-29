// src/components/billing/ConsolidatedCreditPanel.jsx
//
// חשבונית זיכוי מרוכזת: ללקוח, על כל תעודות הזיכוי הפתוחות שלו.
//
// נבנה ב-29/10/2026, כשהחשבוניות החודשיות כבר יצאו ו-87 תעודות זיכוי
// נשארו פתוחות. במקום חשבונית זיכוי ומייל לכל תעודה — מסמך אחד ללקוח,
// או אחד לכל חלק אצל לקוח שהחשבוניות שלו מפוצלות (חד פעמי לבד וכו').
//
// ההפקה רצה לקוח אחרי לקוח, בקשה לכל לקוח, כדי שהמסך יראה מה הופק ומה
// נכשל. לקוח שנכשל לא עוצר את האחרים, ואפשר להריץ שוב: מה שכבר הופק
// כבר לא פתוח ולא ייכלל.

import React, { useCallback, useEffect, useState } from "react";
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
import { FiX } from "react-icons/fi";
import { MdOutlineReceiptLong } from "react-icons/md";

import TableHeaderCell from "@/components/table/TableHeaderCell";
import BillingServices from "@/services/BillingServices";
import { notifyError, notifySuccess } from "@/utils/toast";

const shekel = (n) =>
  Number(n || 0).toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const errorText = (err) => err?.response?.data?.message || err.message;

const ConsolidatedCreditPanel = ({ onClose, onIssued }) => {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState({});
  // לפי לקוח: { state: "working" | "done" | "partial" | "error", docs, errors }
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await BillingServices.getConsolidatedCredit();
      setData(res);
      setSelected(Object.fromEntries(res.customers.map((c) => [c.customerId, true])));
      setResults({});
    } catch (err) {
      notifyError(errorText(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const chosen = (data?.customers || []).filter(
    (c) => selected[c.customerId] && results[c.customerId]?.state !== "done"
  );
  const chosenTotal = chosen.reduce((s, c) => s + c.total, 0);
  // לקוח שחלק מהחשבוניות שלו כבר הופקו — רק מה שנכשל נשאר להפיק
  const remainingOf = (c) => {
    const r = results[c.customerId];
    return r?.docs?.length ? r.errors.length : c.invoices.length;
  };
  const chosenInvoices = chosen.reduce((s, c) => s + remainingOf(c), 0);

  const run = async () => {
    if (
      !window.confirm(
        `להפיק ${chosenInvoices} חשבוניות זיכוי ל-${chosen.length} לקוחות, ` +
          `בסך ${shekel(chosenTotal)} ₪ כולל מע"מ?\n\n` +
          `החשבוניות נשלחות ללקוחות במייל. חשבונית זיכוי היא מסמך מס: ` +
          `היא נרשמת בספרים ואי אפשר למחוק אותה.`
      )
    ) {
      return;
    }

    setRunning(true);
    let issued = 0;
    let failed = 0;
    for (const c of chosen) {
      setResults((prev) => ({
        ...prev,
        [c.customerId]: { state: "working", docs: prev[c.customerId]?.docs || [], errors: [] },
      }));
      try {
        // כל התעודות שהוצגו, גם בריצה חוזרת: מה שכבר הופק אינו פתוח ונשאר בחוץ
        const res = await BillingServices.issueConsolidatedCredit(
          c.customerId,
          c.notes.map((n) => n._id)
        );
        const errors = res.errors || [];
        issued += res.docs.length;
        failed += errors.length;
        setResults((prev) => ({
          ...prev,
          [c.customerId]: {
            state: errors.length ? "partial" : "done",
            // מה שהופק בריצה קודמת נשאר מוצג לצד מה שהופק עכשיו
            docs: [...(prev[c.customerId]?.docs || []), ...res.docs],
            errors,
          },
        }));
      } catch (err) {
        failed++;
        setResults((prev) => ({
          ...prev,
          [c.customerId]: {
            state: "error",
            docs: prev[c.customerId]?.docs || [],
            errors: [{ message: errorText(err) }],
          },
        }));
      }
    }
    setRunning(false);
    if (issued) notifySuccess(`הופקו ${issued} חשבוניות זיכוי`);
    if (failed) notifyError(`${failed} חשבוניות זיכוי לא הופקו — הפירוט בטבלה`);
    onIssued?.();
  };

  const allChecked = !!data?.customers.length && data.customers.every((c) => selected[c.customerId]);

  return (
    <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-6">
      <CardBody>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
              חשבונית זיכוי מרוכזת
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              חשבונית זיכוי לכל לקוח, על כל תעודות הזיכוי שעוד לא הופקה להן חשבונית, עם
              כל המוצרים שזוכו. לקוח שהחשבוניות שלו מפוצלות (למשל חד פעמי לבד) מקבל זיכוי
              מפוצל באותו אופן.
            </p>
          </div>
          <Button layout="outline" size="small" onClick={onClose} disabled={running}>
            <FiX className="ml-1" /> סגירה
          </Button>
        </div>

        {!data ? (
          <p className="text-sm text-gray-500">טוען...</p>
        ) : !data.customers.length ? (
          <p className="text-sm text-gray-500">אין תעודות זיכוי פתוחות.</p>
        ) : (
          <>
            <TableContainer>
              <Table className="w-full admin-table">
                <TableHeader>
                  <tr>
                    <TableHeaderCell>
                      <input
                        type="checkbox"
                        aria-label="בחירת כל הלקוחות"
                        checked={allChecked}
                        disabled={running}
                        onChange={(e) =>
                          setSelected(
                            Object.fromEntries(
                              data.customers.map((c) => [c.customerId, e.target.checked])
                            )
                          )
                        }
                      />
                    </TableHeaderCell>
                    <TableHeaderCell>לקוח</TableHeaderCell>
                    <TableHeaderCell>חשבוניות זיכוי שיופקו</TableHeaderCell>
                    <TableHeaderCell className="text-left">סכום כולל מע"מ</TableHeaderCell>
                    <TableHeaderCell>תוצאה</TableHeaderCell>
                  </tr>
                </TableHeader>
                <TableBody>
                  {data.customers.map((c) => {
                    const r = results[c.customerId];
                    return (
                      <TableRow key={c.customerId}>
                        <TableCell>
                          <input
                            type="checkbox"
                            aria-label={`בחירת ${c.name}`}
                            checked={!!selected[c.customerId]}
                            disabled={running || r?.state === "done"}
                            onChange={(e) =>
                              setSelected((prev) => ({ ...prev, [c.customerId]: e.target.checked }))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          {c.name || "—"}
                          {c.customerNumber && (
                            <span className="block text-xs text-gray-500 font-mono">
                              לקוח {c.customerNumber}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-normal max-w-sm">
                          {c.invoices.map((inv, i) => (
                            <span key={i} className="block text-sm">
                              {inv.label && <span className="font-semibold">{inv.label}: </span>}
                              {inv.notes.length} תעודות · {inv.lines} שורות · {shekel(inv.total)} ₪
                              <span className="block text-xs text-gray-500 font-mono">
                                {inv.notes.join(", ")}
                              </span>
                            </span>
                          ))}
                        </TableCell>
                        <TableCell className="text-left">{shekel(c.total)} ₪</TableCell>
                        <TableCell className="whitespace-normal max-w-xs text-sm">
                          {r?.state === "working" && <span className="text-gray-500">מפיק...</span>}
                          {(r?.docs || []).map((d) => (
                            <span key={d.creditDocNum} className="block text-green-700 dark:text-green-400">
                              {d.url ? (
                                <a href={d.url} target="_blank" rel="noreferrer" className="hover:underline">
                                  חשבונית זיכוי {d.creditDocNum}
                                </a>
                              ) : (
                                `חשבונית זיכוי ${d.creditDocNum}`
                              )}
                              {d.label && ` (${d.label})`}
                              <span className="block text-xs text-gray-500">
                                {d.emailedTo ? `נשלחה ל-${d.emailedTo}` : "לא נשלחה במייל"}
                              </span>
                            </span>
                          ))}
                          {(r?.errors || []).map((e, i) => (
                            <span key={i} className="block text-red-600">
                              {e.label && `${e.label}: `}
                              {e.message}
                            </span>
                          ))}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                נבחרו {chosen.length} לקוחות ·{" "}
                {chosen.reduce((s, c) => s + c.notes.length, 0)} תעודות ·{" "}
                <span className="font-bold">{shekel(chosenTotal)} ₪</span> כולל מע"מ
              </p>
              <Button onClick={run} disabled={running || !chosen.length}>
                <MdOutlineReceiptLong className="ml-2" />
                {running ? "מפיק..." : `הפק ${chosenInvoices} חשבוניות זיכוי`}
              </Button>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
};

export default ConsolidatedCreditPanel;
