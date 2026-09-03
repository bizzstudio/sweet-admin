// src/pages/InvoiceReissue.jsx
//
// "תיקון חשבונית והפקה מחדש".
//
// חשבונית מס אינה ניתנת לעריכה — לא אצלנו ולא ב-iCount. מרגע שהופקה היא
// רשומה בספרים, ולכן מה שנראה כאן כמו עריכה הוא בפועל שלושה שלבים
// שהשרת עושה בפעולה אחת (ראה lib/billing/reissue):
//
//   זיכוי מלא של החשבונית → תיקון תעודות המשלוח שמאחוריה → חשבונית חדשה
//
// למה מסך שלם ולא חלון: חשבונית חודשית סוגרת עשרות תעודות ומאות שורות,
// והתיקון הוא "בתעודה 1043 נמסרו 4 ולא 6". חלון קופץ לא יכול להחזיק את
// זה, והדרך היחידה שהייתה קודם היא לזכות, למצוא כל תעודה במסך אחר,
// לתקן, ואז לזכור להפיק מחדש.
//
// המסך שולח לשרת רק תעודות שנגעו בהן. תעודה שלא נגעו בה נכנסת לחשבונית
// החדשה כמו שהיא, ולא נשלחת בכלל — כך עריכה שלא נעשתה אינה יכולה לשנות
// כלום בדרך.

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useHistory, Link } from "react-router-dom";
import { Badge, Button, Card, CardBody, Input, Label } from "@windmill/react-ui";
import {
  FiAlertTriangle,
  FiChevronUp,
  FiEdit2,
  FiExternalLink,
  FiPlus,
  FiRotateCcw,
  FiTrash2,
} from "react-icons/fi";

import PageTitle from "@/components/Typography/PageTitle";
import Loading from "@/components/preloader/Loading";
import DemoModeBanner from "@/components/common/DemoModeBanner";
import ProductPicker from "@/components/billing/ProductPicker";
import BarcodeInput from "@/components/billing/BarcodeInput";
import BillingServices from "@/services/BillingServices";
import { notifyError, notifySuccess } from "@/utils/toast";

const shekel = (n) =>
  Number(n || 0).toLocaleString("he-IL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const hebDate = (d) => (d ? new Date(d).toLocaleDateString("he-IL") : "—");

const dayValue = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" })
    : new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });

/** מצב העריכה של תעודה אחת, כפי שהוא נבנה מהתשובה של השרת. */
const initialState = (note) => ({
  removed: false,
  // נגעו בתעודה. רק תעודות כאלה נשלחות לשרת
  touched: false,
  rows: (note.items || []).map((i) => ({
    sku: String(i.sku || ""),
    name: i.name,
    barcode: i.barcode || "",
    quantity: String(i.quantity ?? ""),
    unitPrice: String(i.unitPrice ?? ""),
    // שורה שהגיעה מהתעודה. שורה כזו בלי מק"ט אינה "שורה ריקה שנוספה"
    // אלא סחורה שתיעלם מהמסמך, ולכן היא חוסמת ולא מסוננת בשקט
    fromNote: true,
  })),
  issuedAt: dayValue(note.issuedAt),
  manualReference: note.manualReference || "",
  notes: note.notes || "",
  shippingCost: String(note.shippingCost ?? 0),
  // ההנחה שהוקלדה ביד בלבד. ההנחה הקבועה של הלקוח מחושבת בשרת, ושליחה
  // שלה בחזרה הייתה מוסיפה אותה שוב על עצמה
  discount: String(
    Math.max(
      0,
      Number((Number(note.discount || 0) - Number(note.customerDiscount || 0)).toFixed(2))
    )
  ),
});

const validRowsOf = (rows) => rows.filter((r) => r.sku?.trim() && Number(r.quantity) > 0);

const brokenRowsOf = (rows) =>
  rows.filter((r) => r.fromNote && !(r.sku?.trim() && Number(r.quantity) > 0));

const netOf = (state) =>
  validRowsOf(state.rows).reduce(
    (sum, r) => sum + (Number(r.unitPrice) || 0) * (Number(r.quantity) || 0),
    0
  ) +
  (Number(state.shippingCost) || 0) -
  (Number(state.discount) || 0);

/**
 * תעודה אחת בתוך מסך התיקון.
 *
 * סגורה כברירת מחדל, ונפתחת בלחיצה. לא קישוט: חשבונית חודשית סוגרת עד
 * 60 תעודות, וכל שורה מרנדרת בורר מוצר מעל קטלוג של 4,300 פריטים —
 * פתיחת הכל בבת אחת הייתה אלפי בוררים ודפדפן תקוע. מי שמתקן פותח תעודה
 * אחת או שתיים.
 *
 * readOnly = מצב הדגמה. שם העריכה חסומה בשרת (היא הייתה נוגעת בתעודה
 * האמיתית ולא בכיס הדמו), ולכן אין טעם להציג שדות שלא יתקבלו.
 */
const NoteEditor = ({ note, state, onChange, onReset, readOnly = false }) => {
  const [open, setOpen] = useState(false);
  const patch = (fields) => onChange({ ...state, ...fields, touched: true });

  const setRow = (index, field, value) =>
    patch({ rows: state.rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)) });

  const addRow = () =>
    patch({
      rows: [
        ...state.rows,
        { sku: "", name: "", barcode: "", quantity: "", unitPrice: "", fromNote: false },
      ],
    });

  const removeRow = (index) => patch({ rows: state.rows.filter((_, i) => i !== index) });

  const addByBarcode = (product) => {
    if (!product?.sku) return;
    if (state.rows.some((r) => String(r.sku) === String(product.sku))) {
      return notifyError(`${product.name} כבר נמצא בתעודה ${note.number}`);
    }
    const filled = {
      sku: String(product.sku),
      name: product.name,
      barcode: product.barcode || "",
      quantity: "1",
      unitPrice: "",
      fromNote: false,
    };
    const emptyIndex = state.rows.findIndex((r) => !r.sku?.trim());
    patch({
      rows:
        emptyIndex === -1
          ? [...state.rows, filled]
          : state.rows.map((r, i) => (i === emptyIndex ? filled : r)),
    });
  };

  const broken = brokenRowsOf(state.rows);
  const valid = validRowsOf(state.rows);

  return (
    <Card
      className={`min-w-0 shadow-xs bg-white dark:bg-gray-800 mb-5 border-r-4 ${
        state.removed
          ? "border-red-500 opacity-60"
          : state.touched
          ? "border-blue-500"
          : "border-transparent"
      }`}
    >
      <CardBody>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="font-semibold text-lg">
              תעודה {note.number}{" "}
              <Badge type={note.kind === "manual" ? "warning" : "neutral"}>
                {note.kind === "manual" ? "ידנית" : "מהזמנה"}
              </Badge>
            </h3>
            <p className="text-xs text-gray-500">
              {hebDate(note.issuedAt)}
              {note.orderNumber ? ` · הזמנה ${note.orderNumber}` : ""}
              {note.manualReference ? ` · פנקס ${note.manualReference}` : ""}
              {` · במקור ${shekel(note.total)} ₪`}
            </p>
          </div>

          {!readOnly && (
            <div className="flex items-center gap-3">
              {!state.removed && (
                <button
                  type="button"
                  onClick={() => setOpen((v) => !v)}
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                >
                  {open ? (
                    <>
                      <FiChevronUp /> סגירה
                    </>
                  ) : (
                    <>
                      <FiEdit2 /> עריכת התעודה
                    </>
                  )}
                </button>
              )}
              {state.touched && !state.removed && (
                <button
                  type="button"
                  onClick={onReset}
                  className="text-sm text-gray-500 hover:underline flex items-center gap-1"
                >
                  <FiRotateCcw /> בטל שינויים
                </button>
              )}
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.removed}
                  onChange={(e) => patch({ removed: e.target.checked })}
                />
                <span className="text-red-600">הסרה מהחשבונית</span>
              </label>
            </div>
          )}
        </div>

        {readOnly || (!open && !state.removed) ? (
          <p className="text-sm text-gray-500">
            {state.touched
              ? `${validRowsOf(state.rows).length} שורות · ${shekel(netOf(state))} ₪ לפני מע"מ (תוקנה)`
              : `${note.itemCount} שורות · ${shekel(note.total)} ₪ לפני מע"מ`}
          </p>
        ) : state.removed ? (
          <p className="text-sm text-red-700 dark:text-red-400">
            התעודה תבוטל ולא תיכלל בחשבונית החדשה. הסחורה שבה לא תחויב כלל.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-4 mb-4">
              <Label className="w-44">
                <span>תאריך המסירה</span>
                <Input
                  className="mt-1"
                  type="date"
                  value={state.issuedAt}
                  onChange={(e) => patch({ issuedAt: e.target.value })}
                />
              </Label>
              <Label className="w-44">
                <span>מספר תעודה בפנקס</span>
                <Input
                  className="mt-1"
                  value={state.manualReference}
                  onChange={(e) => patch({ manualReference: e.target.value })}
                  placeholder="אופציונלי"
                />
              </Label>
              <Label className="w-32">
                <span>דמי משלוח</span>
                <Input
                  className="mt-1"
                  type="number"
                  min="0"
                  step="0.01"
                  value={state.shippingCost}
                  onChange={(e) => patch({ shippingCost: e.target.value })}
                />
              </Label>
              <Label className="w-32">
                <span>הנחה נוספת</span>
                <Input
                  className="mt-1"
                  type="number"
                  min="0"
                  step="0.01"
                  value={state.discount}
                  onChange={(e) => patch({ discount: e.target.value })}
                />
              </Label>
            </div>

            {Number(note.discountPercent) > 0 && (
              <p className="text-xs text-green-700 dark:text-green-500 mb-3">
                ללקוח יש הנחה קבועה של {note.discountPercent}% — היא מחושבת בשרת
                ומתווספת להנחה שכאן.
              </p>
            )}

            <div className="mb-4 max-w-sm">
              <BarcodeInput onPick={addByBarcode} hint="הוספת שורה לפי ברקוד ואז Enter" />
            </div>

            {state.rows.map((row, i) => (
              <div key={i} className="flex flex-wrap gap-2 mb-2 items-center">
                <div className="flex-1 min-w-[220px]">
                  <ProductPicker value={row.sku} onChange={(sku) => setRow(i, "sku", sku)} />
                  {row.fromNote && !row.sku && (
                    <p className="mt-1 text-xs text-red-600">
                      {row.name ? `"${row.name}" — ` : ""}אין לשורה מק"ט. יש לבחור מוצר
                      מהקטלוג, אחרת היא תרד מהתעודה.
                    </p>
                  )}
                </div>
                <div className="w-28">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="כמות"
                    value={row.quantity}
                    onChange={(e) => setRow(i, "quantity", e.target.value)}
                  />
                </div>
                <div className="w-28">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="מחיר יח'"
                    value={row.unitPrice}
                    onChange={(e) => setRow(i, "unitPrice", e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  disabled={state.rows.length === 1}
                  className="p-2 text-red-500 disabled:opacity-30"
                  title="הסרת שורה"
                >
                  <FiTrash2 />
                </button>
              </div>
            ))}

            <Button size="small" layout="outline" onClick={addRow} className="mt-2">
              <FiPlus className="ml-1" /> שורה
            </Button>

            <Label className="mt-4">
              <span>הערות (מופיעות על התעודה)</span>
              <Input
                className="mt-1"
                value={state.notes}
                onChange={(e) => patch({ notes: e.target.value })}
              />
            </Label>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm">
                סה"כ התעודה לפני מע"מ:{" "}
                <span className="font-semibold">{shekel(netOf(state))} ₪</span>
                <span className="text-xs text-gray-500">
                  {" "}
                  · {valid.length} שורות
                </span>
              </p>
              {broken.length > 0 && (
                <p className="text-sm text-red-600">
                  {broken.length} שורות מהתעודה חסרות מוצר או כמות
                </p>
              )}
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
};

const InvoiceReissue = () => {
  const { docNum } = useParams();
  const history = useHistory();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [states, setStates] = useState({});
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [allowPaid, setAllowPaid] = useState(false);
  // מצב ההתחלה מגיע מהשרת (BILLING_EMAIL_DOCUMENTS), כמו במסך סגירת החודש
  const [emailDocument, setEmailDocument] = useState(true);
  // במצב הדגמה העריכה חסומה בשרת: היא הייתה משנה את התעודה האמיתית
  // ולא את כיס הדמו. הזיכוי וההפקה מחדש עצמם כן עובדים בהדגמה.
  const [demoMode, setDemoMode] = useState(false);
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await BillingServices.getInvoiceNotes(docNum, { withItems: true });
      setData(res);
      setStates(
        Object.fromEntries((res.notes || []).map((n) => [n._id, initialState(n)]))
      );
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [docNum]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const apply = (s) => {
      setDemoMode(s?.demo === true);
      if (typeof s?.emailDocuments === "boolean") setEmailDocument(s.emailDocuments);
    };
    BillingServices.getIcountMode()
      .then(apply)
      .catch((err) => apply(err?.response?.data));
  }, []);

  const notes = data?.notes || [];
  const kept = notes.filter((n) => !states[n._id]?.removed);
  const touched = notes.filter((n) => states[n._id]?.touched);

  // חשבונית שכבר זוכתה בלי פתיחת התעודות מחדש משאירה את מספר המסמך על
  // תעודות מבוטלות. השרת ידחה תיקון כזה, ועדיף לומר זאת לפני שממלאים
  // את הטופס ולא אחרי
  const billable = notes.filter((n) => n.billingStatus === "billed");

  // הסכום של החשבונית החדשה, לפי מה שמוצג עכשיו על המסך. אומדן ולא
  // הבטחה: ההנחה הקבועה של הלקוח מחושבת בשרת
  const newNet = kept.reduce((sum, n) => sum + netOf(states[n._id] || initialState(n)), 0);

  // רק תעודות שנגעו בהן נבדקות: תעודה ישנה עם שורה בלי מק"ט (הזמנה
  // שנקלטה כך פעם) אינה נשלחת לשרת בכלל, וחסימה בגללה הייתה מונעת תיקון
  // של חשבונית שלמה בגלל שורה שאיש לא נגע בה
  const editable = touched.filter((n) => !states[n._id]?.removed);
  const broken = editable.filter((n) => brokenRowsOf(states[n._id]?.rows || []).length);
  const empty = editable.filter((n) => !validRowsOf(states[n._id]?.rows || []).length);

  const blocked =
    !reason.trim() ||
    !confirmed ||
    !kept.length ||
    !billable.length ||
    broken.length > 0 ||
    empty.length > 0 ||
    (Boolean(data?.paidAt) && !allowPaid);

  const submit = async () => {
    // רק תעודות שנגעו בהן. תעודה שלא נערכה אינה נשלחת, וכך היא אינה
    // יכולה להשתנות בדרך
    const edits = touched.map((n) => {
      const s = states[n._id];
      if (s.removed) return { noteId: n._id, remove: true };
      return {
        noteId: n._id,
        items: validRowsOf(s.rows).map((r) => ({
          sku: r.sku.trim(),
          quantity: Number(r.quantity),
          // מחיר ריק = ייקבע מהמחירון. רלוונטי לשורה שנוספה עכשיו
          unitPrice: r.unitPrice === "" ? undefined : Number(r.unitPrice),
        })),
        issuedAt: s.issuedAt,
        manualReference: s.manualReference.trim(),
        notes: s.notes,
        shippingCost: Number(s.shippingCost) || 0,
        discount: Number(s.discount) || 0,
      };
    });

    setWorking(true);
    try {
      const res = await BillingServices.reissueInvoice(docNum, {
        reason: reason.trim(),
        edits,
        allowPaid,
        emailDocument,
      });
      setResult(res);
      if (res.problems?.length) notifyError(res.message);
      else notifySuccess(res.message);
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setWorking(false);
    }
  };

  if (loading) return <Loading loading={loading} />;

  if (!data) {
    return (
      <>
        <PageTitle>תיקון חשבונית {docNum}</PageTitle>
        <Card className="shadow-xs bg-white dark:bg-gray-800">
          <CardBody>
            <p>לא נמצאו תעודות לחשבונית {docNum}.</p>
            <Button className="mt-4" layout="outline" onClick={() => history.push("/invoices")}>
              חזרה לחשבוניות
            </Button>
          </CardBody>
        </Card>
      </>
    );
  }

  // אחרי ההפקה — סיכום בלבד. המסך אינו חוזר לעריכה: התעודות כבר חויבו
  // בחשבונית החדשה, ותיקון נוסף מתחיל מזיכוי נוסף
  if (result) {
    return (
      <>
        <PageTitle>תיקון חשבונית {docNum}</PageTitle>
        <Card className="shadow-xs bg-white dark:bg-gray-800 mb-6">
          <CardBody>
            <p className="text-lg font-semibold mb-3">{result.message}</p>

            <ul className="text-sm space-y-1 mb-4">
              <li>
                חשבונית זיכוי:{" "}
                {result.creditDocUrl ? (
                  <a
                    href={result.creditDocUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    {result.creditDocNum} <FiExternalLink />
                  </a>
                ) : (
                  result.creditDocNum
                )}
              </li>
              {result.invoices?.map((inv) => (
                <li key={inv.docNum}>
                  חשבונית חדשה:{" "}
                  {inv.url ? (
                    <a
                      href={inv.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      {inv.docNum} <FiExternalLink />
                    </a>
                  ) : (
                    inv.docNum
                  )}
                </li>
              ))}
              {result.editedNotes?.length > 0 && (
                <li>תעודות שתוקנו: {result.editedNotes.join(", ")}</li>
              )}
              {result.removedNotes?.length > 0 && (
                <li>תעודות שהוסרו: {result.removedNotes.join(", ")}</li>
              )}
            </ul>

            {result.problems?.length > 0 && (
              <div className="p-3 rounded bg-red-50 dark:bg-red-900/20 text-sm mb-4">
                <p className="font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
                  <FiAlertTriangle /> חלק מהשלבים לא הושלמו
                </p>
                <ul className="mt-2 list-disc pr-5 text-red-700 dark:text-red-400">
                  {result.problems.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
                {result.stage === "credited" && (
                  <p className="mt-2 text-red-700 dark:text-red-400">
                    הזיכוי הופק והתעודות פתוחות. אפשר לתקן אותן במסך תעודות
                    המשלוח ולהפיק חשבונית מסגירת החודש.
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={() => history.push("/invoices")}>חזרה לחשבוניות</Button>
              <Button layout="outline" onClick={() => history.push("/delivery-notes")}>
                תעודות משלוח
              </Button>
            </div>
          </CardBody>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageTitle>תיקון חשבונית {docNum}</PageTitle>

      <DemoModeBanner />

      <Card className="shadow-xs bg-white dark:bg-gray-800 mb-6">
        <CardBody>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-lg">
                {data.customerSnapshot?.name || "—"}
                {data.customerSnapshot?.customerNumber && (
                  <span className="text-sm text-gray-500">
                    {" "}
                    · מס' {data.customerSnapshot.customerNumber}
                  </span>
                )}
              </p>
              <p className="text-sm text-gray-500">
                הופקה {hebDate(data.billedAt)} · {notes.length} תעודות ·{" "}
                {shekel(data.totals?.net)} ₪ לפני מע"מ
                {data.docUrl && (
                  <>
                    {" · "}
                    <a
                      href={data.docUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      המסמך ב-iCount <FiExternalLink />
                    </a>
                  </>
                )}
              </p>
            </div>
            <Link to="/invoices" className="text-sm text-blue-600 hover:underline">
              חזרה לחשבוניות
            </Link>
          </div>

          <div className="mt-4 p-3 rounded bg-yellow-50 dark:bg-yellow-900/20 text-sm">
            <p className="font-semibold text-yellow-800 dark:text-yellow-400 flex items-center gap-2">
              <FiAlertTriangle /> חשבונית מס אינה ניתנת לעריכה
            </p>
            <p className="mt-1 text-yellow-800 dark:text-yellow-400">
              מה שיקרה בפועל: תופק חשבונית זיכוי על מלוא הסכום של {docNum},
              התעודות יתוקנו לפי מה שמוגדר כאן, ותופק חשבונית חדשה במקומה.
              שני המסמכים נכנסים לספרים ומגיעים לרואה החשבון — אין דרך למחוק
              אותם.
            </p>
            <p className="mt-2 text-yellow-800 dark:text-yellow-400">
              תעודה שתתוקן כאן תסומן כנערכה ידנית, והסנכרון מההזמנה יפסיק
              לעדכן אותה. התעודות לא יישלחו שוב למדפסת — מי שצריך נייר מדפיס
              מהתעודה עצמה.
            </p>
          </div>

          {data.paidAt && (
            <div className="mt-3 p-3 rounded bg-red-50 dark:bg-red-900/20 text-sm">
              <p className="font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
                <FiAlertTriangle /> לחשבונית נרשם תשלום
                {data.receiptDocNum ? ` (קבלה ${data.receiptDocNum})` : ""}
              </p>
              <p className="mt-1 text-red-700 dark:text-red-400">
                הזיכוי ינתק את הקבלה מהחשבונית. הקבלה תישאר ב-iCount ותצטרך
                טיפול מול ההנהלת חשבונות — לרוב רישום התשלום מחדש מול החשבונית
                החדשה.
              </p>
              <label className="mt-2 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowPaid}
                  onChange={(e) => setAllowPaid(e.target.checked)}
                />
                <span>הבנתי, אני רוצה לתקן בכל זאת</span>
              </label>
            </div>
          )}
        </CardBody>
      </Card>

      {demoMode && (
        <Card className="shadow-xs bg-white dark:bg-gray-800 mb-5 border-r-4 border-gray-400">
          <CardBody>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              במצב הדגמה אפשר להפיק זיכוי וחשבונית חדשה, אבל לא לתקן את תוכן
              התעודות: העריכה נכתבת לתעודה עצמה ולא לכיס הדמו, כלומר היא
              הייתה משנה סחורה אמיתית שעוד תחויב.
            </p>
          </CardBody>
        </Card>
      )}

      {notes.map((note) => (
        <NoteEditor
          key={note._id}
          note={note}
          state={states[note._id] || initialState(note)}
          onChange={(next) => setStates((prev) => ({ ...prev, [note._id]: next }))}
          onReset={() =>
            setStates((prev) => ({ ...prev, [note._id]: initialState(note) }))
          }
          readOnly={demoMode}
        />
      ))}

      <Card className="shadow-xs bg-white dark:bg-gray-800 mb-8">
        <CardBody>
          <Label className="mb-4">
            <span>סיבת התיקון (מודפסת על מסמך הזיכוי)</span>
            <Input
              className="mt-1"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="לדוגמה: תיקון כמות בתעודה 1043"
            />
          </Label>

          <label className="flex items-center gap-2 cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={emailDocument}
              onChange={(e) => setEmailDocument(e.target.checked)}
            />
            <span className="text-sm">שליחת החשבונית החדשה ללקוח במייל</span>
          </label>

          <div className="text-sm mb-4">
            <p>
              החשבונית החדשה: {kept.length} תעודות ·{" "}
              <span className="font-semibold text-lg">{shekel(newNet)} ₪</span> לפני
              מע"מ
              {Math.abs(newNet - Number(data.totals?.net || 0)) > 0.01 && (
                <span className="text-gray-500">
                  {" "}
                  (במקור {shekel(data.totals?.net)} ₪)
                </span>
              )}
            </p>
            <p className="text-xs text-gray-500">
              {touched.length
                ? `${touched.length} תעודות ישונו. השאר ייכנסו כמו שהן.`
                : "לא שונתה אף תעודה — תופק חשבונית זהה במקום הקיימת."}
            </p>
          </div>

          {(broken.length > 0 || empty.length > 0) && (
            <p className="text-sm text-red-600 mb-3">
              יש לתקן קודם: {[...new Set([...broken, ...empty])].map((n) => n.number).join(", ")}
            </p>
          )}

          {!kept.length && (
            <p className="text-sm text-red-600 mb-3">
              כל התעודות סומנו להסרה. במקרה כזה מדובר בזיכוי בלבד — יש להשתמש
              בכפתור "זיכוי" במסך החשבוניות.
            </p>
          )}

          {!billable.length && (
            <p className="text-sm text-red-600 mb-3">
              אף תעודה של החשבונית אינה במצב "חויבה" — כנראה שהחשבונית כבר
              זוכתה. אין מה לתקן כאן.
            </p>
          )}

          <label className="flex items-start gap-2 cursor-pointer mb-4">
            <input
              type="checkbox"
              className="mt-1"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            <span className="text-sm">
              אני מאשר/ת הפקת חשבונית זיכוי על {docNum} וחשבונית חדשה במקומה
            </span>
          </label>

          <div className="flex gap-2">
            <Button onClick={submit} disabled={blocked || working}>
              {working ? "מפיק..." : "הפק זיכוי וחשבונית חדשה"}
            </Button>
            <Button layout="outline" onClick={() => history.push("/invoices")} disabled={working}>
              ביטול
            </Button>
          </div>
        </CardBody>
      </Card>
    </>
  );
};

export default InvoiceReissue;
