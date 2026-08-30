// src/pages/IcountDemo.jsx
//
// מסך הדגמה של iCount. מפיק מסמכים אמיתיים — בחשבון הדמו.
//
// שני דברים שהמסך הזה חייב לעשות נכון:
//
//   1. להגיד בבירור, בכל רגע, לאיזה חשבון הוא מחובר. מסך שנראה זהה בדמו
//      ובאמת הוא איך שמפיקים בטעות חשבונית מס ללקוח אמיתי.
//   2. לא לגעת בשום תעודת משלוח. אפשר להפיק חשבונית דמו "על בסיס" תעודה
//      קיימת כדי לראות שורות אמיתיות, אבל התעודה נשארת פתוחה ותחויב
//      כרגיל בסגירת החודש.

import React, { useEffect, useState } from "react";
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
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiExternalLink,
  FiFileText,
  FiRefreshCw,
} from "react-icons/fi";
import { notifyError, notifySuccess } from "@/utils/toast";

import PageTitle from "@/components/Typography/PageTitle";
import BillingServices from "@/services/BillingServices";

import TableHeaderCell from "@/components/table/TableHeaderCell";
const shekel = (n) =>
  Number(n || 0).toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const errText = (err) => err?.response?.data?.message || err?.message || "שגיאה לא ידועה";

const IcountDemo = () => {
  const [status, setStatus] = useState(null);
  const [options, setOptions] = useState(null);
  const [source, setSource] = useState("sample"); // sample | note
  const [customerId, setCustomerId] = useState("");
  const [noteId, setNoteId] = useState("");
  const [invoice, setInvoice] = useState(null);
  const [icountTotals, setIcountTotals] = useState(null);
  const [followUps, setFollowUps] = useState([]);
  const [busy, setBusy] = useState("");

  const loadStatus = async () => {
    try {
      setStatus(await BillingServices.getIcountStatus());
    } catch (err) {
      // 503 מגיע עם גוף שכולל mode — נשתמש בו כדי להציג את המצב גם בכשלון
      setStatus({ connected: false, ...(err?.response?.data || {}), message: errText(err) });
    }
  };

  const loadOptions = async () => {
    try {
      const res = await BillingServices.getDemoOptions();
      setOptions(res);
      if (!customerId && res.customers?.length) setCustomerId(res.customers[0]._id);
      if (!noteId && res.deliveryNotes?.length) setNoteId(res.deliveryNotes[0]._id);
    } catch (err) {
      setOptions({ blocked: errText(err) });
    }
  };

  useEffect(() => {
    loadStatus();
    loadOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const issue = async () => {
    setBusy("invoice");
    setIcountTotals(null);
    setFollowUps([]);
    try {
      const res = await BillingServices.createDemoInvoice(
        source === "note" ? { deliveryNoteId: noteId } : { customerId }
      );
      setInvoice(res);
      notifySuccess(`חשבונית דמו ${res.docNum} הופקה`);

      // הסכום המחייב מגיע מ-iCount ולא מהאומדן שלנו — אותה התנהגות כמו
      // בזרימה האמיתית, וכאן היא גם מדגימה שהחישוב שלנו תואם
      try {
        setIcountTotals(await BillingServices.getDemoInvoiceTotal(res.docNum));
      } catch {
        setIcountTotals(null);
      }
    } catch (err) {
      notifyError(errText(err));
    } finally {
      setBusy("");
    }
  };

  const addFollowUp = (doc, label) => {
    setFollowUps((prev) => [...prev, { ...doc, label }]);
    notifySuccess(`${label} ${doc.docNum} הופקה`);
  };

  const doCredit = async () => {
    setBusy("credit");
    try {
      addFollowUp(
        await BillingServices.createDemoCredit({ docNum: invoice.docNum, reason: "הדגמה" }),
        "חשבונית זיכוי"
      );
    } catch (err) {
      notifyError(errText(err));
    } finally {
      setBusy("");
    }
  };

  const doReceipt = async () => {
    setBusy("receipt");
    try {
      addFollowUp(
        await BillingServices.createDemoReceipt({ docNum: invoice.docNum, method: "transfer" }),
        "קבלה"
      );
    } catch (err) {
      notifyError(errText(err));
    } finally {
      setBusy("");
    }
  };

  const isDemo = status?.demo === true;
  const blocked = options?.blocked;

  return (
    <>
      <PageTitle>הדגמת iCount</PageTitle>

      {/* מצב החיבור — הדבר הראשון על המסך, בכוונה */}
      <Card
        className={`min-w-0 shadow-xs overflow-hidden mb-5 border-r-4 ${
          isDemo
            ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"
            : "border-red-500 bg-red-50 dark:bg-red-900/20"
        }`}
      >
        <CardBody>
          {isDemo ? (
            <>
              <p className="font-semibold flex items-center gap-2 text-yellow-800 dark:text-yellow-300">
                <FiAlertTriangle /> מצב דמו — המסמכים אינם נכנסים לספרים
              </p>
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                חשבון: <span className="font-mono">{status?.cid}</span>
                {status?.user && <> · משתמש <span className="font-mono">{status.user}</span></>}
                {status?.fullName && <> · {status.fullName}</>}
              </p>
              <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                המסך הזה מפיק מסמך בודד ואינו נוגע בתעודות כלל. לזרימה המלאה —
                סגירת חודש, מסך החשבוניות, רישום תשלום וקבלות — כל המסכים
                הרגילים עובדים כרגיל ומציגים את נתוני הדמו.
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold flex items-center gap-2 text-red-700 dark:text-red-400">
                <FiAlertTriangle /> המערכת מחוברת לחשבון האמיתי
              </p>
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                {status?.connected
                  ? <>חשבון <span className="font-mono">{status?.cid}</span> — הפקת מסמכי הדגמה חסומה. להפעלת המצב: <span className="font-mono">ICOUNT_MODE=demo</span> בקובץ .env של השרת, ואז ריסטארט.</>
                  : `אין חיבור ל-iCount: ${status?.message || "..."}`}
              </p>
            </>
          )}

          <Button layout="outline" size="small" className="mt-3" onClick={() => { loadStatus(); loadOptions(); }}>
            <FiRefreshCw className="ml-2" /> בדיקה מחדש
          </Button>
        </CardBody>
      </Card>

      {/* טופס ההפקה */}
      <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
        <CardBody>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label>
                <span>מקור החשבונית</span>
                <Select
                  className="mt-1"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  disabled={!isDemo}
                >
                  <option value="sample">סל הדגמה קבוע</option>
                  <option value="note">תעודת משלוח קיימת</option>
                </Select>
              </Label>
            </div>

            {source === "sample" ? (
              <div className="flex-1 min-w-[16rem]">
                <Label>
                  <span>לקוח</span>
                  <Select
                    className="mt-1"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    disabled={!isDemo}
                  >
                    {(options?.customers || []).map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.customerNumber} — {c.name}
                      </option>
                    ))}
                  </Select>
                </Label>
              </div>
            ) : (
              <div className="flex-1 min-w-[16rem]">
                <Label>
                  <span>תעודת משלוח</span>
                  <Select
                    className="mt-1"
                    value={noteId}
                    onChange={(e) => setNoteId(e.target.value)}
                    disabled={!isDemo}
                  >
                    {(options?.deliveryNotes || []).map((n) => (
                      <option key={n._id} value={n._id}>
                        #{n.number} — {n.customerName} — {shekel(n.total)} ₪
                      </option>
                    ))}
                  </Select>
                </Label>
              </div>
            )}

            <Button onClick={issue} disabled={!isDemo || busy === "invoice"}>
              <FiFileText className="ml-2" />
              {busy === "invoice" ? "מפיק..." : "הפק חשבונית דמו"}
            </Button>
          </div>

          {options?.customersTotal > (options?.customers?.length || 0) && source === "sample" && (
            <p className="mt-2 text-xs text-gray-500">
              מוצגים {options.customers.length} מתוך {options.customersTotal} לקוחות
            </p>
          )}

          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            {source === "sample"
              ? "סל ההדגמה כולל שתי שורות חייבות במע\"מ ושורה פטורה אחת, כדי להראות שהמע\"מ מחושב ברמת השורה."
              : "התעודה משמשת כמקור לשורות בלבד — ההפקה כאן אינה נרשמת עליה כלל, גם לא בכיס הדמו. לזרימה המלאה (חיוב, תשלום, קבלה) יש להשתמש במסך סגירת החודש."}
          </p>

          {blocked && !isDemo && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{blocked}</p>
          )}
        </CardBody>
      </Card>

      {/* התוצאה */}
      {invoice && (
        <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5 border-r-4 border-green-500">
          <CardBody>
            <p className="font-semibold flex items-center gap-2 text-green-700 dark:text-green-400">
              <FiCheckCircle /> חשבונית דמו {invoice.docNum} — {invoice.customerName}
              {invoice.sourceNote && <span className="font-normal text-sm">(מבוססת על תעודה #{invoice.sourceNote})</span>}
            </p>

            {invoice.url && (
              <a
                href={invoice.url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-blue-600 hover:underline"
              >
                פתיחת המסמך ב-iCount <FiExternalLink />
              </a>
            )}

            <TableContainer className="mt-4">
              <Table className="w-full whitespace-nowrap admin-table">
                <TableHeader>
                  <tr>
                    <TableHeaderCell>פריט</TableHeaderCell>
                    <TableHeaderCell className="text-center">כמות</TableHeaderCell>
                    <TableHeaderCell className="text-center">מחיר ליחידה</TableHeaderCell>
                    <TableHeaderCell className="text-center">מע"מ</TableHeaderCell>
                    <TableHeaderCell className="text-left">סה"כ שורה</TableHeaderCell>
                  </tr>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((it, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        {it.name}
                        {it.sku && <span className="text-xs text-gray-500 mr-2 font-mono">{it.sku}</span>}
                      </TableCell>
                      <TableCell className="text-center">{it.quantity}</TableCell>
                      <TableCell className="text-center">{shekel(it.unitPrice)} ₪</TableCell>
                      <TableCell className="text-center">{it.isVatFree ? "פטור" : "חייב"}</TableCell>
                      <TableCell className="text-left">{shekel(it.lineTotal)} ₪</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <div className="mt-4 flex flex-wrap gap-8">
              <div>
                <p className="text-xs text-gray-500">לפני מע"מ (אומדן שלנו)</p>
                <p className="text-xl font-semibold">{shekel(invoice.estimate?.beforeVat)} ₪</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">מע"מ</p>
                <p className="text-xl font-semibold">{shekel(invoice.estimate?.vat)} ₪</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">סה"כ</p>
                <p className="text-xl font-semibold">{shekel(invoice.estimate?.total)} ₪</p>
              </div>
              {icountTotals && (
                <div>
                  <p className="text-xs text-gray-500">סה"כ לפי iCount</p>
                  <p
                    className={`text-xl font-semibold ${
                      Math.abs(icountTotals.totalWithVat - (invoice.estimate?.total || 0)) < 0.02
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {shekel(icountTotals.totalWithVat)} ₪
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Button layout="outline" onClick={doReceipt} disabled={busy === "receipt"}>
                {busy === "receipt" ? "מפיק..." : "הפק קבלה על החשבונית"}
              </Button>
              <Button layout="outline" onClick={doCredit} disabled={busy === "credit"}>
                {busy === "credit" ? "מפיק..." : "הפק חשבונית זיכוי"}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {followUps.length > 0 && (
        <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-8">
          <CardBody>
            <p className="font-semibold mb-3">מסמכי המשך</p>
            <TableContainer>
              <Table className="w-full whitespace-nowrap admin-table">
                <TableHeader>
                  <tr>
                    <TableHeaderCell>סוג</TableHeaderCell>
                    <TableHeaderCell>מספר</TableHeaderCell>
                    <TableHeaderCell>סכום</TableHeaderCell>
                    <TableHeaderCell></TableHeaderCell>
                  </tr>
                </TableHeader>
                <TableBody>
                  {followUps.map((d, i) => (
                    <TableRow key={i}>
                      <TableCell>{d.label}</TableCell>
                      <TableCell className="font-mono">{d.docNum}</TableCell>
                      <TableCell>{d.amount ? `${shekel(d.amount)} ₪` : "—"}</TableCell>
                      <TableCell>
                        {d.url && (
                          <a
                            href={d.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1"
                          >
                            צפייה <FiExternalLink />
                          </a>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardBody>
        </Card>
      )}
    </>
  );
};

export default IcountDemo;
