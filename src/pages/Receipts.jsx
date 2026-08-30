// src/pages/Receipts.jsx
//
// כל הקבלות שהופקו: מתי נכנס הכסף, ממי, ועל איזו חשבונית.
//
// מסך צפייה בלבד. הפקת קבלה נעשית מ"חשבוניות וגבייה", כי היא מתחילה
// מהשאלה "איזו חשבונית שולמה" — כאן כבר אין חשבונית פתוחה לבחור.
//
// הסכום המוצג הוא אומדן מתעודות המשלוח ולא הסכום שנרשם על הקבלה, וקבלה
// שהופקה ידנית ב-iCount אינה מופיעה כאן כלל (ראו lib/billing/receipts
// בשרת). לכן המסך אומר את זה במפורש — דוח שנראה כמו כרטסת ואינו כרטסת
// הוא בדיוק מה שגורם להתאמת בנק שגויה.

import React, { useEffect, useMemo, useState } from "react";
import {
  Badge,
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
import { FiAlertTriangle, FiExternalLink, FiInfo } from "react-icons/fi";
import useQueryParam from "@/hooks/useQueryParam";

import PageTitle from "@/components/Typography/PageTitle";
import DemoModeBanner from "@/components/common/DemoModeBanner";
import TableLoading from "@/components/preloader/TableLoading";
import NotFound from "@/components/table/NotFound";
import BillingServices from "@/services/BillingServices";
import { notifyError } from "@/utils/toast";

import TableHeaderCell from "@/components/table/TableHeaderCell";
const shekel = (n) =>
  Number(n || 0).toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// שעון ישראל במפורש, ולא שעון הדפדפן: הסינון בשרת עובד לפי היום הישראלי,
// ובלי זה תשלום שנרשם ב-23:30 היה מסונן ליום אחד ומוצג ביום אחר
const hebDate = (d) =>
  d ? new Date(d).toLocaleDateString("he-IL", { timeZone: "Asia/Jerusalem" }) : "—";

// כתובת המסמך מגיעה מ-iCount ונשמרת אצלנו. היא מוצגת כקישור רק אם היא
// באמת http(s): ערך אחר (javascript:, נתון פגום) הופך לטקסט ולא לקישור
// לחיץ, כדי שהמסך לא יהיה הדרך להריץ משהו מתוך שדה במסד
const externalHref = (url) =>
  /^https?:\/\//i.test(String(url || "")) ? String(url) : null;

const Receipts = () => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");

  // סינון לפי לקוח מגיע מהכתובת (קישור מכרטיס הלקוח), כמו בשאר מסכי החיוב
  const [customerFilter, setCustomerFilter] = useQueryParam("customer");

  // דגל stale ולא רק setState: שינוי מהיר של שני התאריכים שולח שתי בקשות,
  // והתשובה של הישנה יכולה להגיע אחרונה ולדרוס את החדשה. במסך של כסף זה
  // אומר טווח אחד בבורר ורשימה של טווח אחר
  useEffect(() => {
    let current = true;

    (async () => {
      setLoading(true);
      try {
        const res = await BillingServices.getReceipts({ from, to, customer: customerFilter });
        if (current) setReceipts(res?.receipts || []);
      } catch (err) {
        if (!current) return;
        notifyError(err?.response?.data?.message || err.message);
        setReceipts([]);
      } finally {
        if (current) setLoading(false);
      }
    })();

    return () => {
      current = false;
    };
  }, [from, to, customerFilter]);

  // החיפוש מקומי ולא בשרת: הרשימה כבר מסוננת לטווח תאריכים ומגיעה שלמה,
  // ובקשה לכל הקלדה הייתה מוסיפה עומס בלי להוסיף תוצאות
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return receipts;
    return receipts.filter(
      (r) =>
        String(r.docNum).toLowerCase().includes(term) ||
        String(r.customerName || "").toLowerCase().includes(term) ||
        String(r.customerNumber || "").toLowerCase().includes(term) ||
        (r.invoices || []).some((i) => String(i.docNum).toLowerCase().includes(term)) ||
        (r.notes || []).some((n) => String(n).includes(term))
    );
  }, [receipts, search]);

  const total = filtered.reduce((s, r) => s + Number(r.grossEstimate || 0), 0);
  const hasFilter = Boolean(from || to || customerFilter || search);

  return (
    <>
      <PageTitle>קבלות</PageTitle>

      <DemoModeBanner />

      <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
        <CardBody>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex flex-wrap items-end gap-4">
              {/* max/min חוסמים טווח הפוך כבר בבורר התאריכים. השרת בודק
                  שוב — הקלדה ידנית עוקפת את הבורר */}
              <Label>
                <span>מתאריך תשלום</span>
                <Input
                  className="mt-1"
                  type="date"
                  value={from}
                  max={to || undefined}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </Label>

              <Label>
                <span>עד תאריך</span>
                <Input
                  className="mt-1"
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(e) => setTo(e.target.value)}
                />
              </Label>

              <Label className="w-56">
                <span>חיפוש</span>
                <Input
                  className="mt-1"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="מספר קבלה, חשבונית או שם לקוח"
                />
              </Label>

              {hasFilter && (
                <Button
                  layout="link"
                  onClick={() => {
                    setFrom("");
                    setTo("");
                    setSearch("");
                    setCustomerFilter(null);
                  }}
                >
                  נקה סינון
                </Button>
              )}
            </div>

            <div className="flex gap-8">
              <div>
                <p className="text-xs text-gray-500">קבלות</p>
                <p className="text-2xl font-semibold">{filtered.length}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">סה"כ תקבולים (אומדן)</p>
                <p className="text-2xl font-semibold">{shekel(total)} ₪</p>
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs text-gray-500 flex items-start gap-2">
            <FiInfo className="mt-0.5 shrink-0" />
            <span>
              הסכומים כאן מחושבים מתעודות המשלוח של החשבוניות שנסגרו, ולא
              מהסכום שנרשם על הקבלה עצמה. קבלה שהופקה ישירות ב-iCount, בלי
              לעבור דרך "חשבוניות וגבייה", אינה מופיעה ברשימה. לצורכי הנהלת
              חשבונות יש להסתמך על iCount.
            </span>
          </p>
        </CardBody>
      </Card>

      {loading ? (
        <TableLoading row={8} col={6} width={160} height={20} />
      ) : filtered.length === 0 ? (
        <NotFound title="לא נמצאו קבלות" />
      ) : (
        <TableContainer className="mb-8">
          <Table className="w-full whitespace-nowrap admin-table">
            <TableHeader>
              <tr>
                <TableHeaderCell>קבלה</TableHeaderCell>
                <TableHeaderCell>לקוח</TableHeaderCell>
                <TableHeaderCell>תאריך תשלום</TableHeaderCell>
                <TableHeaderCell>חשבוניות</TableHeaderCell>
                <TableHeaderCell className="text-center">תעודות</TableHeaderCell>
                <TableHeaderCell className="text-left">סכום (אומדן)</TableHeaderCell>
              </tr>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                // מגן על שרת בגרסה קודמת שאינו מחזיר את השדות האלה: מסך
                // קבלות ריק עדיף על מסך לבן באמצע בירור של תשלום
                const invoices = r.invoices || [];
                const notes = r.notes || [];
                const receiptHref = externalHref(r.docUrl);

                return (
                <TableRow key={`${r.customer}-${r.docNum}`}>
                  <TableCell className="font-mono font-semibold">
                    {receiptHref ? (
                      <a
                        href={receiptHref}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline inline-flex items-center gap-1"
                        title="פתיחת הקבלה ב-iCount"
                      >
                        {r.docNum} <FiExternalLink />
                      </a>
                    ) : (
                      r.docNum
                    )}
                  </TableCell>
                  <TableCell>
                    {r.customerName}
                    {r.customerNumber && (
                      <span className="block text-xs text-gray-500">מס' {r.customerNumber}</span>
                    )}
                  </TableCell>
                  <TableCell>{hebDate(r.paidAt)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-2">
                      {invoices.length === 0 && <span className="text-gray-500">—</span>}
                      {invoices.map((inv) => {
                        const href = externalHref(inv.docUrl);
                        return href ? (
                          <a
                            key={inv.docNum}
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-sm text-blue-600 hover:underline"
                          >
                            {inv.docNum}
                          </a>
                        ) : (
                          <span key={inv.docNum} className="font-mono text-sm">
                            {inv.docNum}
                          </span>
                        );
                      })}
                      {/* חשבונית שזוכתה ובכל זאת נשארה הקבלה עליה — לא תקלה,
                          אבל מי שסוגר חודש צריך לדעת שזה לא תקבול נקי */}
                      {r.hasCredit && (
                        <Badge type="warning" title="הוצא זיכוי על החשבונית של הקבלה">
                          זוכתה
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center" title={notes.join(", ")}>
                    {notes.length}
                  </TableCell>
                  <TableCell className="text-left">{shekel(r.grossEstimate)} ₪</TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {!loading && receipts.length === 0 && !hasFilter && (
        <p className="text-sm text-yellow-700 dark:text-yellow-500 flex items-start gap-2">
          <FiAlertTriangle className="mt-0.5 shrink-0" />
          <span>
            טרם הופקו קבלות במערכת. קבלה נוצרת ברישום תשלום במסך "חשבוניות
            וגבייה".
          </span>
        </p>
      )}
    </>
  );
};

export default Receipts;
