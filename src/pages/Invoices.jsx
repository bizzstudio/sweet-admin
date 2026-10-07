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

import React, { useCallback, useEffect, useRef, useState } from "react";
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
import {
  FiAlertTriangle,
  FiCornerUpLeft,
  FiDollarSign,
  FiEdit2,
  FiExternalLink,
  FiList,
  FiPlus,
  FiX,
} from "react-icons/fi";
import { Link } from "react-router-dom";
import useQueryParam from "@/hooks/useQueryParam";

import PageTitle from "@/components/Typography/PageTitle";
import DemoModeBanner from "@/components/common/DemoModeBanner";
import ManualDeliveryNoteForm from "@/components/billing/ManualDeliveryNoteForm";
import TableLoading from "@/components/preloader/TableLoading";
import NotFound from "@/components/table/NotFound";
import BillingServices from "@/services/BillingServices";
import { notifyError, notifySuccess } from "@/utils/toast";

import TableHeaderCell from "@/components/table/TableHeaderCell";
const shekel = (n) =>
  Number(n || 0).toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const hebDate = (d) => (d ? new Date(d).toLocaleDateString("he-IL") : "—");

// יתרה קטנה מאגורה היא שארית עיגול ולא יתרה
const hasBalance = (n) => Math.abs(Number(n) || 0) >= 0.005;

const round2 = (n) => Number((Number(n) || 0).toFixed(2));

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
  const [building, setBuilding] = useState(false);
  // הסכום המחייב מ-iCount, או null אם לא נטען (iCount לא זמין)
  const [icountTotal, setIcountTotal] = useState(null);
  const [loadingTotal, setLoadingTotal] = useState(false);
  // יתרת הלקוח מתשלומים קודמים. חיובי = לזכותו, שלילי = לחובתו
  const [balance, setBalance] = useState(0);
  // איזו פתיחה של החלון היא האחרונה. תשובה שחוזרת אחרי שהחלון כבר נפתח
  // על חשבונית אחרת הייתה ממלאת את הסכום של הקודמת
  const openSeq = useRef(0);

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
    // היתרה שהגיעה עם הרשימה, עד שהעדכנית נטענת
    const known = Number(inv.customerBalance) || 0;
    setBalance(known);
    setAmount(String(Math.max(0, round2(inv.grossEstimate - known))));
    setPayFor(inv);
    const seq = ++openSeq.current;

    // הסכום המחייב הוא זה שעל החשבונית ב-iCount, לא האומדן שלנו.
    // היתרה נטענת מחדש באותה הזדמנות: הרשימה יכולה להיות פתוחה שעה,
    // ובינתיים נרשם ללקוח תשלום ממסך אחר.
    setLoadingTotal(true);
    const [totalRes, balanceRes] = await Promise.allSettled([
      BillingServices.getInvoiceTotal(inv.docNum),
      BillingServices.getCustomerBalance(inv.customer),
    ]);
    if (seq !== openSeq.current) return;

    // iCount לא זמין — נשארים עם האומדן, והמסך מציין זאת
    const total = totalRes.status === "fulfilled" && totalRes.value?.totalWithVat > 0
      ? totalRes.value
      : null;
    const fresh = balanceRes.status === "fulfilled"
      ? Number(balanceRes.value?.balance) || 0
      : known;

    if (total) setIcountTotal(total);
    setBalance(fresh);
    // מה שנשאר לגבות: החשבונית פחות יתרת הזכות, או בתוספת חוב קודם
    setAmount(String(Math.max(0, round2((total?.totalWithVat ?? inv.grossEstimate) - fresh))));
    setLoadingTotal(false);
  };

  // סכום החשבונית שמולו נמדד התשלום, ומה יישאר ביתרה אחריו. אותו חשבון
  // שהשרת עושה ברישום — כאן רק כדי להראות מראש מה עומד לקרות.
  const invoiceTotal = icountTotal?.totalWithVat ?? payFor?.grossEstimate ?? 0;
  const balanceAfter = round2(balance + (Number(amount) || 0) - invoiceTotal);
  // היתרה מכסה את כל החשבונית: אין כסף שנכנס, ולכן גם אין קבלה
  const closesFromBalance = !(Number(amount) > 0) && balance + 0.005 >= invoiceTotal;

  const submitPayment = async () => {
    const value = Number(amount) || 0;
    if (value < 0 || (!(value > 0) && !closesFromBalance)) {
      return notifyError("יש להזין סכום חיובי");
    }

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
      <div className="flex items-center justify-between my-6">
        <PageTitle style={{ margin: 0 }}>חשבוניות וגבייה</PageTitle>
        <Button onClick={() => setBuilding((v) => !v)}>
          {building ? <FiX className="ml-2" /> : <FiPlus className="ml-2" />}
          {building ? "ביטול" : "חשבונית חדשה"}
        </Button>
      </div>

      <DemoModeBanner />

      {building && (
        <ManualDeliveryNoteForm
          asInvoice
          onCancel={() => setBuilding(false)}
          onCreated={() => {
            setBuilding(false);
            load();
          }}
        />
      )}

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
          <Table className="w-full whitespace-nowrap admin-table">
            <TableHeader>
              <tr>
                <TableHeaderCell>חשבונית</TableHeaderCell>
                <TableHeaderCell>לקוח</TableHeaderCell>
                <TableHeaderCell>הופקה</TableHeaderCell>
                <TableHeaderCell>לפירעון</TableHeaderCell>
                <TableHeaderCell className="text-left">סכום כולל מע"מ</TableHeaderCell>
                <TableHeaderCell className="text-center">תעודות</TableHeaderCell>
                <TableHeaderCell>מצב</TableHeaderCell>
                <TableHeaderCell></TableHeaderCell>
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
                    {hasBalance(inv.customerBalance) && (
                      <span
                        className={`block text-xs ${
                          inv.customerBalance > 0 ? "text-green-700" : "text-red-600"
                        }`}
                      >
                        {inv.customerBalance > 0 ? "יתרת זכות" : "יתרת חוב"}{" "}
                        {shekel(Math.abs(inv.customerBalance))} ₪
                      </span>
                    )}
                    {inv.credits?.length > 0 && (
                      <span className="block text-xs text-red-600">
                        {inv.credits.length} זיכויים
                        {/* זיכוי חלקי (מתעודת זיכוי) אינו מבטל את החשבונית,
                            ולכן הסכום שלו מוצג — זה מה שיורד מהגבייה */}
                        {inv.credits.some((c) => c.partial) &&
                          ` · ${shekel(
                            inv.credits
                              .filter((c) => c.partial)
                              .reduce((s, c) => s + (c.grossEstimate || 0), 0)
                          )} ₪`}
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
                        {inv.paidFromBalance && !inv.receiptDocNum && (
                          <span className="text-xs text-gray-500">מיתרת הזכות</span>
                        )}
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
                      {/* הנספח שמצורף לחשבונית: כל תעודות המשלוח שהיא
                          סגרה, עם התאריכים והסכומים. זה מה שהלקוח מצליב
                          מול הניירות שקיבל */}
                      <Link
                        to={`/invoice-summary/${encodeURIComponent(inv.docNum)}`}
                        className="text-blue-600 text-sm hover:underline flex items-center gap-1"
                        title="ריכוז תעודות המשלוח שנסגרו בחשבונית"
                      >
                        <FiList /> ריכוז תעודות
                      </Link>

                      {/* תיקון: זיכוי + תעודות מתוקנות + חשבונית חדשה,
                          במסך אחד. חשבונית מס אינה ניתנת לעריכה, ולכן
                          "עריכה" כאן היא תמיד הפקה מחדש */}
                      <Link
                        to={`/invoice-reissue/${encodeURIComponent(inv.docNum)}`}
                        className="text-yellow-600 text-sm hover:underline flex items-center gap-1"
                        title="זיכוי, תיקון התעודות והפקת חשבונית חדשה"
                      >
                        <FiEdit2 /> תיקון והפקה מחדש
                      </Link>

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

          {hasBalance(balance) && (
            <p
              className={`text-sm mb-3 p-2 rounded ${
                balance > 0
                  ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                  : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
              }`}
            >
              {balance > 0
                ? `ללקוח יתרת זכות של ${shekel(balance)} ₪ מתשלומים קודמים — קוזזה מהסכום לגבייה.`
                : `ללקוח יתרת חוב של ${shekel(-balance)} ₪ מתשלומים קודמים — נוספה לסכום לגבייה.`}
            </p>
          )}

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

          {!closesFromBalance && method === "check" && (
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

          {!closesFromBalance && method === "transfer" && (
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

          {/* מה יישאר ללקוח אחרי הרישום. מוצג רק כשיש מה לומר: תשלום
              מדויק בלי יתרה קודמת הוא המקרה הרגיל ואינו צריך הסבר */}
          {!loadingTotal && (hasBalance(balance) || hasBalance(balanceAfter)) && (
            <p
              className={`mt-3 text-sm flex items-start gap-2 ${
                balanceAfter < -0.005
                  ? "text-red-700 dark:text-red-400"
                  : "text-gray-700 dark:text-gray-300"
              }`}
            >
              {balanceAfter < -0.005 && <FiAlertTriangle className="mt-0.5 shrink-0" />}
              <span>
                {!hasBalance(balanceAfter)
                  ? "אחרי הרישום היתרה של הלקוח תהיה מאוזנת."
                  : balanceAfter > 0
                  ? `אחרי הרישום יישארו ללקוח ${shekel(balanceAfter)} ₪ זכות, שיקוזזו מהחשבונית הבאה.`
                  : `הסכום אינו מכסה את החשבונית. היא תיסגר, ו-${shekel(
                      -balanceAfter
                    )} ₪ יירשמו כחוב של הלקוח וייגבו עם החשבונית הבאה.`}
              </span>
            </p>
          )}

          <p className="mt-4 text-xs text-gray-500">
            {closesFromBalance
              ? `החשבונית ${payFor?.docNum} תיסגר מיתרת הזכות של הלקוח. לא תופק קבלה, כי לא התקבל תשלום חדש.`
              : `תופק קבלה ב-iCount המקושרת לחשבונית ${payFor?.docNum}. יש לרשום תשלום רק אחרי שהכסף התקבל בפועל.`}
          </p>
        </ModalBody>
        <ModalFooter>
          <Button layout="outline" onClick={() => setPayFor(null)}>
            ביטול
          </Button>
          <Button onClick={submitPayment} disabled={working || loadingTotal}>
            {working ? "רושם..." : closesFromBalance ? "סגירה מהיתרה" : "הפק קבלה"}
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
            <p className="mt-2 text-red-700 dark:text-red-400">
              אם המטרה היא לתקן את החשבונית ולא לבטלה — עדיף{" "}
              <Link
                to={`/invoice-reissue/${encodeURIComponent(creditFor?.docNum || "")}`}
                className="underline font-semibold"
              >
                תיקון והפקה מחדש
              </Link>
              , שמפיק גם את החשבונית החדשה באותה פעולה.
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
