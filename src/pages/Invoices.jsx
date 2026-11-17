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

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import NoteDraftsBar from "@/components/billing/NoteDraftsBar";
import { newDraftId } from "@/utils/noteDrafts";
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
  { value: "other", label: "אחר" },
];

// אילו פרטים שייכים לכל אמצעי. נשלחים רק אלה: מעבר מהעברה לצ'ק היה
// משאיר בטופס את התאריך והחשבון של ההעברה ושולח אותם עם הצ'ק
const DETAIL_KEYS = {
  transfer: ["date", "depositAccountId", "bank", "branch"],
  check: ["checkNum", "date", "bank", "branch", "account"],
  other: ["otherNote"],
  cash: [],
  creditcard: [],
};

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// החשבון שאליו נכנסות ההעברות כמעט תמיד אותו חשבון, ולכן הבחירה
// האחרונה נזכרת בדפדפן (בקשת הלקוחה, 16/11/2026: "מספר החשבון שלי שאני
// בדרך כלל ממלאה")
const DEPOSIT_KEY = "receipt.depositAccountId";
const rememberedDeposit = () => {
  try {
    return localStorage.getItem(DEPOSIT_KEY) || "";
  } catch {
    return "";
  }
};
// גם "לא לציין" נזכר — אחרת החשבון הקודם היה חוזר בפעם הבאה
const rememberDeposit = (id) => {
  try {
    localStorage.setItem(DEPOSIT_KEY, id || "");
  } catch {
    // דפדפן בלי אחסון — פשוט לא נזכר
  }
};

// השדות המספריים בקבלה (בנק, סניף, חשבון, מס' צ'ק) — ספרות בלבד
const onlyDigits = (v) => String(v || "").replace(/\D/g, "");

// סכום כל חשבונית נקרא מ-iCount בנפרד. ללקוח בחיוב לכל משלוח יכולות
// להיות עשרות חשבוניות פתוחות, ועשרות בקשות בבת אחת היו מציפות את iCount
const settledInBatches = async (items, fn, size = 4) => {
  const out = [];
  for (let k = 0; k < items.length; k += size) {
    out.push(...(await Promise.allSettled(items.slice(k, k + size).map(fn))));
  }
  return out;
};

/** סכום החשבוניות שנבחרו: מ-iCount כשנטען, אחרת האומדן מהתעודות. */
const selectedTotal = (list, selected) =>
  round2(
    list
      .filter((i) => selected.includes(i.docNum))
      .reduce((s, i) => s + (i.total ?? i.estimate), 0)
  );

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [termsConfirmed, setTermsConfirmed] = useState(true);
  // התצוגה בכתובת, כדי שחזרה מ"ריכוז תעודות" או מ"תיקון והפקה מחדש" תנחת
  // על אותה תצוגה. ברירת המחדל "לא שולמו" אינה נכתבת; "הכל" נכתב כ-all,
  // כי ערך ריק פירושו ברירת המחדל
  const [statusParam, setStatusParam] = useQueryParam("status");
  const status = statusParam === "all" ? "" : statusParam || "unpaid";
  const setStatus = (next) => setStatusParam(next === "unpaid" ? null : next || "all");
  const [loading, setLoading] = useState(true);

  const [customerFilter, setCustomerFilter] = useQueryParam("customer");
  // חיפוש חופשי לפי שם לקוח, מספר לקוח או מספר חשבונית (בקשת הלקוחה,
  // 20/10/2026). מסנן את מה שכבר נטען — הרשימה מהשרת אינה מדפדפת
  const [searchParam, setSearchParam] = useQueryParam("q");
  const search = searchParam || "";

  const [payFor, setPayFor] = useState(null);
  const [creditFor, setCreditFor] = useState(null);
  const [working, setWorking] = useState(false);
  // הטיוטה שפתוחה בטופס (null — הטופס סגור). כל טופס נשמר כטיוטה, וסגירה
  // מהכותרת או "השהה" משאירות אותה ברשימה להמשך (בקשת הלקוחה, 19/10/2026)
  const [building, setBuilding] = useState(null);
  // כל החשבוניות הפתוחות של הלקוח, כדי שתשלום אחד יסגור כמה מהן בקבלה
  // אחת (בקשת הלקוחה, 16/11/2026 — "ריכוז חשבוניות פתוחות ללקוח" מהתוכנה
  // הקודמת). total הוא הסכום מ-iCount, או null אם לא נטען
  const [openList, setOpenList] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loadingTotal, setLoadingTotal] = useState(false);
  // חשבונות הבנק של העסק ב-iCount. null — טרם נטענו
  const [bankAccounts, setBankAccounts] = useState(null);
  const bankAccountsRef = useRef(null);
  const bankLoading = useRef(false);
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

  // איזו טעינה היא האחרונה. החלפה מהירה של הסינון שולחת שתי בקשות,
  // והתשובה של הישנה יכולה להגיע אחרונה ולדרוס את החדשה
  const loadSeq = useRef(0);

  const load = useCallback(async () => {
    const seq = ++loadSeq.current;
    setLoading(true);
    try {
      const res = await BillingServices.getInvoices({ status, customer: customerFilter });
      if (seq !== loadSeq.current) return;
      setInvoices(res.invoices || []);
      setTermsConfirmed(res.termsConfirmed !== false);
    } catch (err) {
      if (seq !== loadSeq.current) return;
      notifyError(err?.response?.data?.message || err.message);
      setInvoices([]);
    } finally {
      if (seq === loadSeq.current) setLoading(false);
    }
  }, [status, customerFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const openPayment = useCallback(async (inv) => {
    setMethod("transfer");
    // תאריך ההעברה/הצ'ק מתחיל מהיום, כמו בתוכנה הקודמת
    setDetails({ date: todayIso(), depositAccountId: rememberedDeposit() });
    // האומדן שלנו כערך פתיחה, כדי שהשדה לא יהיה ריק אם iCount לא זמין
    // היתרה שהגיעה עם הרשימה, עד שהעדכנית נטענת
    const known = Number(inv.customerBalance) || 0;
    const first = {
      docNum: inv.docNum,
      billedAt: inv.billedAt,
      dueDate: inv.dueDate,
      estimate: inv.grossEstimate,
      total: null,
    };
    setOpenList([first]);
    setSelected([inv.docNum]);
    setBalance(known);
    setAmount(String(Math.max(0, round2(inv.grossEstimate - known))));
    setPayFor(inv);
    const seq = ++openSeq.current;

    // חשבונות הבנק נטענים פעם אחת למסך. כשלון אינו חוסם: הקבלה תופק
    // בלי החשבון שאליו נכנס הכסף, והמסך אומר זאת
    // חשבון יחיד — אין מה לבחור. חשבון שנזכר ונמחק ב-iCount — לא נשלח
    const pickDeposit = (accounts) =>
      setDetails((d) => {
        const keep = accounts.some((a) => a.id === d.depositAccountId);
        return {
          ...d,
          depositAccountId: keep ? d.depositAccountId : accounts.length === 1 ? accounts[0].id : "",
        };
      });
    if (bankAccountsRef.current) {
      pickDeposit(bankAccountsRef.current);
    } else if (!bankLoading.current) {
      bankLoading.current = true;
      BillingServices.getBankAccounts()
        .then((res) => {
          const accounts = res?.accounts || [];
          bankAccountsRef.current = accounts;
          setBankAccounts(accounts);
          pickDeposit(accounts);
        })
        // ננסה שוב בפתיחה הבאה
        .catch(() => setBankAccounts([]))
        .finally(() => {
          bankLoading.current = false;
        });
    }

    // הסכום המחייב הוא זה שעל החשבונית ב-iCount, לא האומדן שלנו.
    // היתרה נטענת מחדש באותה הזדמנות: הרשימה יכולה להיות פתוחה שעה,
    // ובינתיים נרשם ללקוח תשלום ממסך אחר.
    setLoadingTotal(true);
    const [openRes, balanceRes] = await Promise.allSettled([
      BillingServices.getCustomerOpenInvoices(inv.customer),
      BillingServices.getCustomerBalance(inv.customer),
    ]);
    if (seq !== openSeq.current) return;

    const others = openRes.status === "fulfilled"
      ? (openRes.value?.invoices || [])
          .filter((i) => !i.isPaid && String(i.docNum) !== String(inv.docNum))
          .map((i) => ({
            docNum: i.docNum,
            billedAt: i.billedAt,
            dueDate: i.dueDate,
            estimate: i.grossEstimate,
            total: null,
          }))
      : [];
    const list = [first, ...others].sort(
      (a, b) => new Date(a.billedAt || 0) - new Date(b.billedAt || 0)
    );

    // iCount לא זמין — נשארים עם האומדן, והמסך מציין זאת
    const totals = await settledInBatches(list, (i) => BillingServices.getInvoiceTotal(i.docNum));
    if (seq !== openSeq.current) return;
    const withTotals = list.map((i, k) => {
      const r = totals[k];
      const t = r.status === "fulfilled" ? Number(r.value?.totalWithVat) : 0;
      return { ...i, total: t > 0 ? t : null };
    });

    const fresh = balanceRes.status === "fulfilled"
      ? Number(balanceRes.value?.balance) || 0
      : known;

    setOpenList(withTotals);
    setBalance(fresh);
    // מה שנשאר לגבות: החשבונית פחות יתרת הזכות, או בתוספת חוב קודם
    setAmount(String(Math.max(0, round2(selectedTotal(withTotals, [inv.docNum]) - fresh))));
    setLoadingTotal(false);
  }, []);

  // סימון/ביטול חשבונית בתשלום. הסכום המוצע מתעדכן לפי הבחירה — זה
  // הסכום שנשלח ברוב המקרים בלי שאיש נוגע בו
  const applySelection = (next) => {
    if (!next.length) return; // קבלה תמיד סוגרת לפחות חשבונית אחת
    setSelected(next);
    setAmount(String(Math.max(0, round2(selectedTotal(openList, next) - balance))));
  };
  const toggleInvoice = (docNum) =>
    applySelection(
      selected.includes(docNum) ? selected.filter((d) => d !== docNum) : [...selected, docNum]
    );

  // סכום החשבוניות שמולו נמדד התשלום, ומה יישאר ביתרה אחריו. אותו חשבון
  // שהשרת עושה ברישום — כאן רק כדי להראות מראש מה עומד לקרות.
  const invoiceTotal = selectedTotal(openList, selected);
  const chosen = openList.filter((i) => selected.includes(i.docNum));
  const allFromIcount = chosen.length > 0 && chosen.every((i) => i.total != null);
  // לפי סדר הרשימה (מהישנה לחדשה), לא לפי סדר הלחיצות
  const chosenNums = chosen.map((i) => i.docNum);
  const chosenLabel =
    chosenNums.length > 1 ? `חשבוניות ${chosenNums.join(", ")}` : `חשבונית ${chosenNums[0] || ""}`;
  const balanceAfter = round2(balance + (Number(amount) || 0) - invoiceTotal);
  // היתרה מכסה את כל החשבונית: אין כסף שנכנס, ולכן גם אין קבלה
  const closesFromBalance = !(Number(amount) > 0) && balance + 0.005 >= invoiceTotal;

  const setDetail = (key, value) => setDetails((d) => ({ ...d, [key]: value }));

  const submitPayment = async () => {
    const value = Number(amount) || 0;
    if (value < 0 || (!(value > 0) && !closesFromBalance)) {
      return notifyError("יש להזין סכום חיובי");
    }
    if (!closesFromBalance && method === "check" && !details.checkNum) {
      return notifyError("יש להזין מספר צ'ק");
    }

    const sentDetails = Object.fromEntries(
      (DETAIL_KEYS[method] || [])
        .filter((k) => details[k])
        .map((k) => [k, details[k]])
    );

    setWorking(true);
    try {
      const res = await BillingServices.createReceipt({
        customer: payFor.customer,
        amount: value,
        method,
        forInvoices: chosenNums,
        details: sentDetails,
      });
      if (method === "transfer") rememberDeposit(details.depositAccountId);
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

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter((inv) =>
      [inv.customerName, inv.customerNumber, inv.docNum, ...(inv.notes || [])].some((v) =>
        String(v ?? "").toLowerCase().includes(q)
      )
    );
  }, [invoices, search]);

  const totalOwed = shown
    .filter((i) => !i.isPaid)
    .reduce((s, i) => s + i.grossEstimate, 0);
  const overdueCount = shown.filter((i) => i.isOverdue).length;

  // השורות נבנות מחדש רק כשהרשימה משתנה. בלי זה כל הקלדה בחלון התשלום
  // או הזיכוי מרנדרת מחדש את כל הטבלה
  const rows = useMemo(
    () =>
      shown.map((inv) => (
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
            {inv.creditNotes?.length > 0 && (
              <span className="block text-xs text-gray-500" title={inv.creditNotes.join(", ")}>
                כולל {inv.creditNotes.length} תעודות זיכוי
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
            {/* שתי עמודות ולא שורה אחת: ארבעה כפתורים בשורה הרחיבו את
                הטבלה מעבר למסך במחשב נייד, ו"זיכוי" נדחק מחוץ לתצוגה */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 justify-items-start">
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
                to={(loc) => ({ pathname: `/invoice-summary/${encodeURIComponent(inv.docNum)}`, state: { from: loc.pathname + loc.search } })}
                className="text-blue-600 text-sm hover:underline flex items-center gap-1"
                title="ריכוז תעודות המשלוח שנסגרו בחשבונית"
              >
                <FiList /> ריכוז תעודות
              </Link>

              {/* תיקון: זיכוי + תעודות מתוקנות + חשבונית חדשה,
                  במסך אחד. חשבונית מס אינה ניתנת לעריכה, ולכן
                  "עריכה" כאן היא תמיד הפקה מחדש */}
              <Link
                to={(loc) => ({ pathname: `/invoice-reissue/${encodeURIComponent(inv.docNum)}`, state: { from: loc.pathname + loc.search } })}
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
      )),
    [shown, openPayment]
  );

  return (
    <>
      <div className="flex items-center justify-between my-6">
        <PageTitle style={{ margin: 0 }}>חשבוניות וגבייה</PageTitle>
        <Button onClick={() => setBuilding((v) => (v ? null : newDraftId()))}>
          {building ? <FiX className="ml-2" /> : <FiPlus className="ml-2" />}
          {building ? "השהה" : "חשבונית חדשה"}
        </Button>
      </div>

      <DemoModeBanner />

      <NoteDraftsBar kind="invoice" activeId={building} onResume={setBuilding} />

      {building && (
        <ManualDeliveryNoteForm
          key={building}
          asInvoice
          draftId={building}
          onCancel={() => setBuilding(null)}
          onPause={() => setBuilding(null)}
          onCreated={() => {
            setBuilding(null);
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

            <Label className="w-64">
              <span>חיפוש לקוח או חשבונית</span>
              <Input
                className="mt-1"
                type="search"
                placeholder="שם לקוח, מס' לקוח, מס' חשבונית או תעודה"
                value={search}
                onChange={(e) => setSearchParam(e.target.value || null)}
              />
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
                <p className="text-2xl font-semibold">{shown.length}</p>
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
      ) : shown.length === 0 ? (
        <NotFound
          title={
            invoices.length && search.trim()
              ? status
                ? `אין חשבוניות שמתאימות ל"${search.trim()}" בתצוגה הזו — נסו "הצג: הכל"`
                : `אין חשבוניות שמתאימות ל"${search.trim()}"`
              : "אין חשבוניות להצגה"
          }
        />
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
              {rows}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── רישום תשלום ── */}
      <Modal isOpen={!!payFor} onClose={() => setPayFor(null)}>
        <ModalHeader>רישום תשלום — {chosenLabel}</ModalHeader>
        <ModalBody>
          {openList.length > 1 ? (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {payFor?.customerName} · {openList.length} חשבוניות פתוחות. סמנו את כל
                  מה שהתשלום הזה סוגר, ותופק עליהן קבלה אחת.
                </p>
                {selected.length < openList.length && (
                  <button
                    type="button"
                    className="text-sm text-blue-600 hover:underline shrink-0 mr-3"
                    onClick={() => applySelection(openList.map((i) => i.docNum))}
                  >
                    סמן הכל
                  </button>
                )}
              </div>
              <div className="border rounded divide-y dark:border-gray-700 dark:divide-gray-700 max-h-48 overflow-y-auto">
                {openList.map((i) => (
                  <label
                    key={i.docNum}
                    className="flex items-center gap-3 px-3 py-1.5 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(i.docNum)}
                      onChange={() => toggleInvoice(i.docNum)}
                    />
                    <span className="font-mono font-semibold">{i.docNum}</span>
                    <span className="text-gray-500">{hebDate(i.billedAt)}</span>
                    <span className="mr-auto">
                      {shekel(i.total ?? i.estimate)} ₪
                      {i.total == null && !loadingTotal && (
                        <span className="text-xs text-yellow-700"> (אומדן)</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {payFor?.customerName} · הופקה {hebDate(payFor?.billedAt)}
              {payFor?.dueDate ? ` · לפירעון ${hebDate(payFor.dueDate)}` : ""}
            </p>
          )}

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
            ) : allFromIcount ? (
              <span className="text-green-700 dark:text-green-500">
                {chosen.length > 1
                  ? `סכום ${chosen.length} החשבוניות ב-iCount: ${shekel(invoiceTotal)} ₪`
                  : `סכום החשבונית ב-iCount: ${shekel(invoiceTotal)} ₪`}
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
                  inputMode="numeric"
                  value={details.checkNum || ""}
                  onChange={(e) => setDetail("checkNum", onlyDigits(e.target.value))}
                />
              </Label>
              <Label>
                <span>תאריך פירעון</span>
                <Input
                  className="mt-1"
                  type="date"
                  value={details.date || ""}
                  onChange={(e) => setDetail("date", e.target.value)}
                />
              </Label>
              <Label>
                <span>בנק</span>
                <Input
                  className="mt-1"
                  inputMode="numeric"
                  placeholder="מספר בנק"
                  value={details.bank || ""}
                  onChange={(e) => setDetail("bank", onlyDigits(e.target.value))}
                />
              </Label>
              <Label>
                <span>סניף</span>
                <Input
                  className="mt-1"
                  inputMode="numeric"
                  value={details.branch || ""}
                  onChange={(e) => setDetail("branch", onlyDigits(e.target.value))}
                />
              </Label>
              <Label className="col-span-2">
                <span>מספר חשבון (של הלקוח, כפי שמודפס על הצ'ק)</span>
                <Input
                  className="mt-1"
                  inputMode="numeric"
                  value={details.account || ""}
                  onChange={(e) => setDetail("account", onlyDigits(e.target.value))}
                />
              </Label>
            </div>
          )}

          {!closesFromBalance && method === "transfer" && (
            <div className="grid grid-cols-2 gap-3">
              <Label>
                <span>תאריך ההעברה</span>
                <Input
                  className="mt-1"
                  type="date"
                  value={details.date || ""}
                  onChange={(e) => setDetail("date", e.target.value)}
                />
              </Label>
              <Label>
                <span>לחשבון (שלנו)</span>
                {bankAccounts && bankAccounts.length > 0 ? (
                  <Select
                    className="mt-1"
                    value={details.depositAccountId || ""}
                    onChange={(e) => setDetail("depositAccountId", e.target.value)}
                  >
                    <option value="">— לא לציין —</option>
                    {bankAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {[a.title, a.account && `חשבון ${a.account}`, a.branch && `סניף ${a.branch}`]
                          .filter(Boolean)
                          .join(" · ")}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <p className="mt-2 text-xs text-gray-500">
                    {bankAccounts === null
                      ? "טוען את חשבונות הבנק מ-iCount..."
                      : "לא נמצאו חשבונות בנק ב-iCount. אפשר להגדיר אותם ב-iCount תחת הגדרות ← חשבונות בנק."}
                  </p>
                )}
              </Label>
              <Label>
                <span>בנק הלקוח (לא חובה)</span>
                <Input
                  className="mt-1"
                  inputMode="numeric"
                  placeholder="מספר בנק"
                  value={details.bank || ""}
                  onChange={(e) => setDetail("bank", onlyDigits(e.target.value))}
                />
              </Label>
              <Label>
                <span>סניף (לא חובה)</span>
                <Input
                  className="mt-1"
                  inputMode="numeric"
                  value={details.branch || ""}
                  onChange={(e) => setDetail("branch", onlyDigits(e.target.value))}
                />
              </Label>
            </div>
          )}

          {!closesFromBalance && method === "other" && (
            <Label>
              <span>פירוט (לא חובה)</span>
              <Input
                className="mt-1"
                placeholder="למשל: ביט, קיזוז, שובר"
                value={details.otherNote || ""}
                onChange={(e) => setDetail("otherNote", e.target.value)}
              />
            </Label>
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
              ? `${chosenNums.length > 1 ? "החשבוניות" : "החשבונית"} ${chosenNums.join(", ")} ${
                  chosenNums.length > 1 ? "ייסגרו" : "תיסגר"
                } מיתרת הזכות של הלקוח. לא תופק קבלה, כי לא התקבל תשלום חדש.`
              : `תופק קבלה אחת ב-iCount המקושרת ל${chosenLabel}. יש לרשום תשלום רק אחרי שהכסף התקבל בפועל.`}
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
                to={(loc) => ({ pathname: `/invoice-reissue/${encodeURIComponent(creditFor?.docNum || "")}`, state: { from: loc.pathname + loc.search } })}
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
