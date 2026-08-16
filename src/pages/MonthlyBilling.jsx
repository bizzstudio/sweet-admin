// src/pages/MonthlyBilling.jsx
//
// מסך סגירת חודש. הזרימה מכוונת: קודם תצוגה מקדימה, ורק אחריה אפשר להפיק.
// חשבונית מס אינה ניתנת למחיקה, ולכן כפתור ההפקה נעול עד שנטענה תצוגה
// מקדימה ונדרש אישור מפורש בתיבת סימון.

import React, { useState } from "react";
import {
  Button,
  Card,
  CardBody,
  Label,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHeader,
  TableRow,
} from "@windmill/react-ui";
import { FiAlertTriangle, FiCheckCircle, FiExternalLink, FiEye } from "react-icons/fi";
import { notifyError, notifySuccess } from "@/utils/toast";

import PageTitle from "@/components/Typography/PageTitle";
import BillingServices from "@/services/BillingServices";

/** רשימת 12 החודשים האחרונים, מהאחרון לאחור. */
const recentMonths = () => {
  const out = [];
  const now = new Date();
  for (let i = 1; i <= 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
};

const shekel = (n) =>
  Number(n || 0).toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const MonthlyBilling = () => {
  const months = recentMonths();
  const [month, setMonth] = useState(months[0]);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);

  const loadPreview = async () => {
    setLoading(true);
    setResult(null);
    setConfirmed(false);
    try {
      setPreview(await BillingServices.previewMonth({ month }));
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const doClose = async () => {
    setClosing(true);
    try {
      const res = await BillingServices.closeMonth({ month });
      setResult(res);
      setPreview(null);
      setConfirmed(false);
      notifySuccess(res.message);
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setClosing(false);
    }
  };

  // הסכומים בתצוגה המקדימה הם נטו — המע"מ מתווסף ב-iCount, ולכן מוצג
  // גם האומדן ברוטו כדי שהמספר על המסך יהיה מה שהלקוח יראה על החשבונית
  const netTotal = (preview?.results || []).reduce(
    (sum, r) => sum + r.invoices.reduce((s, i) => s + i.netTotal, 0),
    0
  );

  return (
    <>
      <PageTitle>סגירת חודש והפקת חשבוניות</PageTitle>

      <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
        <CardBody>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label>
                <span>חודש לחיוב</span>
                <Select
                  className="mt-1"
                  value={month}
                  onChange={(e) => {
                    setMonth(e.target.value);
                    setPreview(null);
                    setResult(null);
                    setConfirmed(false);
                  }}
                >
                  {months.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>
              </Label>
            </div>

            <Button layout="outline" onClick={loadPreview} disabled={loading}>
              <FiEye className="ml-2" />
              {loading ? "טוען..." : "תצוגה מקדימה"}
            </Button>
          </div>

          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            סגירת חודש אוספת את כל תעודות המשלוח הפתוחות של אותו חודש ומפיקה
            חשבונית מס אחת לכל לקוח. לקוח שמוגדר לו פיצול לפי קטגוריה יקבל
            חשבונית נפרדת לכל קטגוריה.
          </p>
        </CardBody>
      </Card>

      {preview && (
        <>
          <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
            <CardBody>
              <div className="flex flex-wrap gap-8">
                <div>
                  <p className="text-xs text-gray-500">לקוחות לחיוב</p>
                  <p className="text-2xl font-semibold">{preview.customersProcessed}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">חשבוניות שייווצרו</p>
                  <p className="text-2xl font-semibold">{preview.invoicesCreated}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">סה"כ לפני מע"מ</p>
                  <p className="text-2xl font-semibold">{shekel(netTotal)} ₪</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">אומדן כולל מע"מ</p>
                  <p className="text-2xl font-semibold text-gray-500">
                    ~{shekel(netTotal * 1.18)} ₪
                  </p>
                </div>
              </div>

              {preview.failures?.length > 0 && (
                <div className="mt-4 p-3 rounded bg-red-50 dark:bg-red-900/20 text-sm">
                  <p className="font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
                    <FiAlertTriangle /> {preview.failures.length} לקוחות עם בעיה
                  </p>
                  <ul className="mt-2 list-disc pr-5 text-red-700 dark:text-red-400">
                    {preview.failures.map((f, i) => (
                      <li key={i}>
                        {f.customerName || f.customerId}: {f.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardBody>
          </Card>

          {preview.invoicesCreated > 0 && (
            <>
              <TableContainer className="mb-5">
                <Table>
                  <TableHeader>
                    <tr>
                      <TableCell>לקוח</TableCell>
                      <TableCell>קטגוריה</TableCell>
                      <TableCell className="text-center">תעודות</TableCell>
                      <TableCell className="text-center">שורות</TableCell>
                      <TableCell className="text-left">סכום לפני מע"מ</TableCell>
                    </tr>
                  </TableHeader>
                  <TableBody>
                    {preview.results.flatMap((r) =>
                      r.invoices.map((inv, idx) => (
                        <TableRow key={`${r.customerId}-${idx}`}>
                          <TableCell>{idx === 0 ? r.customerName : ""}</TableCell>
                          <TableCell>{inv.category || "—"}</TableCell>
                          <TableCell className="text-center">{inv.noteCount}</TableCell>
                          <TableCell className="text-center">{inv.itemCount}</TableCell>
                          <TableCell className="text-left">{shekel(inv.netTotal)} ₪</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-8 border-r-4 border-red-500">
                <CardBody>
                  <p className="font-semibold flex items-center gap-2 text-red-700 dark:text-red-400">
                    <FiAlertTriangle /> פעולה בלתי הפיכה
                  </p>
                  <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                    חשבונית מס אינה ניתנת למחיקה. ביטול אפשרי רק בהוצאת חשבונית
                    זיכוי, שגם היא נרשמת בספרים. ודאי שהמחירים בתעודות נכונים
                    לפני ההפקה.
                  </p>

                  <label className="mt-4 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">
                      בדקתי את הרשימה למעלה ואני מאשרת הפקת {preview.invoicesCreated} חשבוניות
                    </span>
                  </label>

                  <Button
                    className="mt-4"
                    disabled={!confirmed || closing}
                    onClick={doClose}
                  >
                    {closing ? "מפיק חשבוניות..." : `הפק ${preview.invoicesCreated} חשבוניות`}
                  </Button>
                </CardBody>
              </Card>
            </>
          )}

          {preview.invoicesCreated === 0 && (
            <Card className="mb-8">
              <CardBody>
                <p className="text-gray-600 dark:text-gray-400">
                  אין תעודות משלוח פתוחות בחודש {preview.month}.
                </p>
              </CardBody>
            </Card>
          )}
        </>
      )}

      {result && (
        <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-8 border-r-4 border-green-500">
          <CardBody>
            <p className="font-semibold flex items-center gap-2 text-green-700 dark:text-green-400">
              <FiCheckCircle /> {result.message}
            </p>

            <TableContainer className="mt-4">
              <Table>
                <TableHeader>
                  <tr>
                    <TableCell>לקוח</TableCell>
                    <TableCell>קטגוריה</TableCell>
                    <TableCell>מספר חשבונית</TableCell>
                    <TableCell className="text-center">תעודות</TableCell>
                    <TableCell></TableCell>
                  </tr>
                </TableHeader>
                <TableBody>
                  {result.results.flatMap((r) =>
                    r.invoices.map((inv, idx) => (
                      <TableRow key={`${r.customerId}-${idx}`}>
                        <TableCell>{idx === 0 ? r.customerName : ""}</TableCell>
                        <TableCell>{inv.category || "—"}</TableCell>
                        <TableCell className="font-mono">{inv.docNum}</TableCell>
                        <TableCell className="text-center">{inv.noteCount}</TableCell>
                        <TableCell>
                          {inv.url && (
                            <a
                              href={inv.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1"
                            >
                              צפייה <FiExternalLink />
                            </a>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {result.failures?.length > 0 && (
              <div className="mt-4 p-3 rounded bg-red-50 dark:bg-red-900/20 text-sm">
                <p className="font-semibold text-red-700 dark:text-red-400">
                  {result.failures.length} לקוחות נכשלו — התעודות שלהם נשארו פתוחות
                </p>
                <ul className="mt-2 list-disc pr-5 text-red-700 dark:text-red-400">
                  {result.failures.map((f, i) => (
                    <li key={i}>
                      {f.customerName || f.customerId}: {f.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </>
  );
};

export default MonthlyBilling;
