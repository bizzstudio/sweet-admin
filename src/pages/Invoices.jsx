// src/pages/Invoices.jsx
//
// החשבוניות שהופקו: מי שילם, מי חייב, ומה באיחור — ומכאן גם רישום תשלום
// (קבלה) והפקת זיכוי.
//
// שתי הפעולות במסך אחד ולא בשניים, כי שתיהן מתחילות מאותה שאלה: "איזו
// חשבונית". מסך זיכוי נפרד היה מחייב להקליד מספר חשבונית מהזיכרון.
//
// שתי הפעולות מפיקות מסמכי מס ב-iCount שאי אפשר למחוק, ולכן שתיהן עוברות
// דרך דיאלוג אישור עם פירוט מה עומד לקרות — ולא לחיצה אחת בטבלה.

import React, { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHeader,
  TableRow,
} from "@windmill/react-ui";
import { FiAlertTriangle, FiCornerUpLeft, FiDollarSign, FiExternalLink } from "react-icons/fi";
import useQueryParam from "@/hooks/useQueryParam";

import PageTitle from "@/components/Typography/PageTitle";
import DemoModeBanner from "@/components/common/DemoModeBanner";
import TableLoading from "@/components/preloader/TableLoading";
import NotFound from "@/components/table/NotFound";
import BillingServices from "@/services/BillingServices";
import { notifyError, notifySuccess } from "@/utils/toast";

const shekel = (n) =>
  Number(n || 0).toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const hebDate = (d) => (d ? new Date(d).toLocaleDateString("he-IL") : "—");

const PAYMENT_METHODS = [
  { value: "transfer", label: "העברה בנקאית" },
  { value: "check", label: "צ'ק" },
  { value: "cash", label: "מזומן" },
  { value: "creditcard", label: "אשראי" },
];

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [termsConfirmed, setTermsConfirmed] = useState(true);
  const [status, setStatus] = useState("unpaid");
  const [loading, setLoading] = useState(true);

  const [customerFilter, setCustomerFilter] = useQueryParam("customer");

  const [payFor, setPayFor] = useState(null);
  const [creditFor, setCreditFor] = useState(null);
  const [working, setWorking] = useState(false);
  // הסכום המחייב מ-iCount, או null אם לא נטען (iCount לא זמין)
  const [icountTotal, setIcountTotal] = useState(null);
  const [loadingTotal, setLoadingTotal] = useState(false);

  // טופס התשלום
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("transfer");
  const [details, setDetails] = useState({});
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await BillingServices.getInvoices({ status, customer: customerFilter });
      setInvoices(res.invoices || []);
      setTermsConfirmed(res.termsConfirmed !== false);
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [status, customerFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const openPayment = async (inv) => {
    setMethod("transfer");
    setDetails({});
    setIcountTotal(null);
    // האומדן שלנו כערך פתיחה, כדי שהשדה לא יהיה ריק אם iCount לא זמין
    setAmount(String(inv.grossEstimate));
    setPayFor(inv);

    // הסכום המחייב הוא זה שעל החשבונית ב-iCount, לא האומדן שלנו.
    // קבלה על סכום שונה מהחשבונית היא אי-התאמה בכרטסת של הלקוח.
    setLoadingTotal(true);
    try {
      const res = await BillingServices.getInvoiceTotal(inv.docNum);
      if (res?.totalWithVat > 0) {
        setIcountTotal(res);
        setAmount(String(res.totalWithVat));
      }
    } catch {
      // iCount לא זמין — נשארים עם האומדן, והמסך מציין זאת
    } finally {
      setLoadingTotal(false);
    }
  };

  const submitPayment = async () => {
    const value = Number(amount);
    if (!(value > 0)) return notifyError("יש להזין סכום חיובי");

    setWorking(true);
    try {
      const res = await BillingServices.createReceipt({
        customer: payFor.customer,
        amount: value,
        method,
        forInvoices: [payFor.docNum],
        details,
      });
      notifySuccess(res.message);
      setPayFor(null);
      load();
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setWorking(false);
    }
  };

  const submitCredit = async () => {
    if (!reason.trim()) return notifyError("חובה לציין סיבת זיכוי");

    setWorking(true);
    try {
      const res = await BillingServices.creditInvoice({
        icountDocNum: creditFor.docNum,
        reason: reason.trim(),
        reopenNotes: true,
      });
      notifySuccess(res.message);
      setCreditFor(null);
      setReason("");
      load();
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setWorking(false);
    }
  };

  const totalOwed = invoices
    .filter((i) => !i.isPaid)
    .reduce((s, i) => s + i.grossEstimate, 0);
  const overdueCount = invoices.filter((i) => i.isOverdue).length;

  return (
    <>
      <PageTitle>חשבוניות וגבייה</PageTitle>

      <DemoModeBanner />

      <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
        <CardBody>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <Label className="w-56">
              <span>הצג</span>
              <Select className="mt-1" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="unpaid">לא שולמו</option>
                <option value="overdue">באיחור</option>
                <option value="paid">שולמו</option>
                <option value="">הכל</option>
              </Select>
            </Label>

            {customerFilter && (
              <Button
                layout="link"
                onClick={() => setCustomerFilter(null)}
              >
                הצג את כל הלקוחות
              </Button>
            )}

            <div className="flex gap-8">
              <div>
                <p className="text-xs text-gray-500">חשבוניות</p>
                <p className="text-2xl font-semibold">{invoices.length}</p>
              </div>
              {status !== "paid" && (
                <div>
                  <p className="text-xs text-gray-500">סה"כ לגבייה</p>
                  <p className="text-2xl font-semibold">{shekel(totalOwed)} ₪</p>
                </div>
              )}
              {overdueCount > 0 && (
                <div>
                  <p className="text-xs text-gray-500">באיחור</p>
                  <p className="text-2xl font-semibold text-red-600">{overdueCount}</p>
                </div>
              )}
            </div>
          </div>

          {!termsConfirmed && (
            <p className="mt-4 text-sm text-yellow-700 dark:text-yellow-500 flex items-start gap-2">
              <FiAlertTriangle className="mt-0.5 shrink-0" />
              <span>
                מועדי הפירעון מחושבים לפי שוטף+30 לכל הלקוחות — מיפוי שטרם אושר
                מול ההנהלת חשבונות. ייתכן שלקוחות מסוימים בתנאים אחרים.
              </span>
            </p>
          )}
        </CardBody>
      </Card>

      {loading ? (
        <TableLoading row={8} col={8} width={160} height={20} />
      ) : invoices.length === 0 ? (
        <NotFound title="אין חשבוניות להצגה" />
      ) : (
        <TableContainer className="mb-8">
          <Table>
            <TableHeader>
              <tr>
                <TableCell>חשבונית</TableCell>
                <TableCell>לקוח</TableCell>
                <TableCell>הופקה</TableCell>
                <TableCell>לפירעון</TableCell>
                <TableCell className="text-left">סכום כולל מע"מ</TableCell>
                <TableCell className="text-center">תעודות</TableCell>
                <TableCell>מצב</TableCell>
                <TableCell></TableCell>
              </tr>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={`${inv.customer}-${inv.docNum}`}>
                  <TableCell className="font-mono font-semibold">
                    {inv.icountDocUrl ? (
                      <a
                        href={inv.icountDocUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline inline-flex items-center gap-1"
                        title="פתיחת המסמך ב-iCount"
                      >
                        {inv.docNum} <FiExternalLink />
                      </a>
                    ) : (
                      inv.docNum
                    )}
                  </TableCell>
                  <TableCell>
                    {inv.customerName}
                    {inv.customerNumber && (
                      <span className="block text-xs text-gray-500">
                        מס' {inv.customerNumber}
                      </span>
                    )}
                    {inv.credits?.length > 0 && (
                      <span className="block text-xs text-red-600">
                        {inv.credits.length} זיכויים
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{hebDate(inv.billedAt)}</TableCell>
                  <TableCell>
                    {hebDate(inv.dueDate)}
                    {inv.termsLabel && (
                      <span className="block text-xs text-gray-500">{inv.termsLabel}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-left">{shekel(inv.grossEstimate)} ₪</TableCell>
                  <TableCell className="text-center" title={inv.notes.join(", ")}>
                    {inv.notes.length}
                  </TableCell>
                  <TableCell>
                    {inv.isPaid ? (
                      <div className="flex flex-col gap-1">
                        <Badge type="success">שולמה</Badge>
                        {inv.receiptDocNum &&
                          (inv.receiptDocUrl ? (
                            <a
                              href={inv.receiptDocUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                            >
                              קבלה {inv.receiptDocNum} <FiExternalLink />
                            </a>
                          ) : (
                            <span className="text-xs text-gray-500">
                              קבלה {inv.receiptDocNum}
                            </span>
                          ))}
                      </div>
                    ) : inv.isOverdue ? (
                      <Badge type="danger">באיחור {inv.daysLate} ימים</Badge>
                    ) : (
                      <Badge type="warning">ממתינה</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {!inv.isPaid && (
                        <button
                          onClick={() => openPayment(inv)}
                          className="text-green-600 text-sm hover:underline flex items-center gap-1"
                        >
                          <FiDollarSign /> רשום תשלום
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setReason("");
                          setCreditFor(inv);
                        }}
                        className="text-red-500 text-sm hover:underline flex items-center gap-1"
                      >
                        <FiCornerUpLeft /> זיכוי
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── רישום תשלום ── */}
      <Modal isOpen={!!payFor} onClose={() => setPayFor(null)}>
        <ModalHeader>רישום תשלום — חשבונית {payFor?.docNum}</ModalHeader>
        <ModalBody>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {payFor?.customerName} · הופקה {hebDate(payFor?.billedAt)}
            {payFor?.dueDate ? ` · לפירעון ${hebDate(payFor.dueDate)}` : ""}
          </p>

          <Label className="mb-1">
            <span>סכום שהתקבל (כולל מע"מ)</span>
            <Input
              className="mt-1"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Label>

          <p className="text-xs mb-3">
            {loadingTotal ? (
              <span className="text-gray-500">טוען את הסכום מ-iCount...</span>
            ) : icountTotal ? (
              <span className="text-green-700 dark:text-green-500">
                סכום החשבונית ב-iCount: {shekel(icountTotal.totalWithVat)} ₪
                {" "}({shekel(icountTotal.totalBeforeVat)} + מע"מ {shekel(icountTotal.vat)})
              </span>
            ) : (
              <span className="text-yellow-700 dark:text-yellow-500">
                לא ניתן לטעון את הסכום מ-iCount. המוצג הוא אומדן מהתעודות —
                יש לוודא מול החשבונית לפני ההפקה.
              </span>
            )}
          </p>

          <Label className="mb-3">
            <span>אמצעי תשלום</span>
            <Select className="mt-1" value={method} onChange={(e) => setMethod(e.target.value)}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Label>

          {method === "check" && (
            <div className="grid grid-cols-2 gap-3">
              <Label>
                <span>מספר צ'ק</span>
                <Input
                  className="mt-1"
                  value={details.checkNum || ""}
                  onChange={(e) => setDetails({ ...details, checkNum: e.target.value })}
                />
              </Label>
              <Label>
                <span>תאריך הצ'ק</span>
                <Input
                  className="mt-1"
                  type="date"
                  value={details.date || ""}
                  onChange={(e) => setDetails({ ...details, date: e.target.value })}
                />
              </Label>
              <Label>
                <span>בנק</span>
                <Input
                  className="mt-1"
                  value={details.bank || ""}
                  onChange={(e) => setDetails({ ...details, bank: e.target.value })}
                />
              </Label>
              <Label>
                <span>סניף</span>
                <Input
                  className="mt-1"
                  value={details.branch || ""}
                  onChange={(e) => setDetails({ ...details, branch: e.target.value })}
                />
              </Label>
            </div>
          )}

          {method === "transfer" && (
            <div className="grid grid-cols-2 gap-3">
              <Label>
                <span>בנק</span>
                <Input
                  className="mt-1"
                  value={details.bank || ""}
                  onChange={(e) => setDetails({ ...details, bank: e.target.value })}
                />
              </Label>
              <Label>
                <span>סניף</span>
                <Input
                  className="mt-1"
                  value={details.branch || ""}
                  onChange={(e) => setDetails({ ...details, branch: e.target.value })}
                />
              </Label>
            </div>
          )}

          {icountTotal && Math.abs(Number(amount) - icountTotal.totalWithVat) > 0.01 && (
            <p className="mt-3 text-sm text-yellow-700 dark:text-yellow-500 flex items-start gap-2">
              <FiAlertTriangle className="mt-0.5 shrink-0" />
              <span>
                הסכום שונה מסכום החשבונית. הקבלה תופק על{" "}
                {shekel(Number(amount) || 0)} ₪ ותשאיר יתרה פתוחה.
              </span>
            </p>
          )}

          <p className="mt-4 text-xs text-gray-500">
            תופק קבלה ב-iCount המקושרת לחשבונית {payFor?.docNum}. יש לרשום תשלום
            רק אחרי שהכסף התקבל בפועל.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button layout="outline" onClick={() => setPayFor(null)}>
            ביטול
          </Button>
          <Button onClick={submitPayment} disabled={working || loadingTotal}>
            {working ? "מפיק קבלה..." : "הפק קבלה"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* ── זיכוי ── */}
      <Modal isOpen={!!creditFor} onClose={() => setCreditFor(null)}>
        <ModalHeader>חשבונית זיכוי — ביטול חשבונית {creditFor?.docNum}</ModalHeader>
        <ModalBody>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {creditFor?.customerName} · {shekel(creditFor?.grossEstimate)} ₪ כולל מע"מ
          </p>

          <div className="p-3 rounded bg-red-50 dark:bg-red-900/20 text-sm mb-4">
            <p className="font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
              <FiAlertTriangle /> פעולה בלתי הפיכה
            </p>
            <p className="mt-1 text-red-700 dark:text-red-400">
              תופק חשבונית זיכוי ב-iCount שתירשם בספרים ותגיע לרואה החשבון.
              {creditFor?.notes?.length} תעודות המשלוח יחזרו למצב פתוח וייכללו
              בסגירת החודש הבאה.
            </p>
          </div>

          <Label>
            <span>סיבת הזיכוי (מופיעה על המסמך)</span>
            <Input
              className="mt-1"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="לדוגמה: טעות בכמות, החזרת סחורה"
            />
          </Label>
        </ModalBody>
        <ModalFooter>
          <Button layout="outline" onClick={() => setCreditFor(null)}>
            ביטול
          </Button>
          <Button onClick={submitCredit} disabled={working || !reason.trim()}>
            {working ? "מפיק זיכוי..." : "הפק חשבונית זיכוי"}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};

export default Invoices;
