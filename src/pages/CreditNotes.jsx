// src/pages/CreditNotes.jsx
//
// זיכויים: חשבונית זיכוי ותעודת משלוח זיכוי.
//
// שני הכפתורים פותחים את אותו טופס, וההבדל ביניהם הוא מה קורה בסוף:
//
//   תעודת משלוח זיכוי — המסמך נשמר ומודפס אצלנו (מה שמחתימים כשסחורה
//                        חוזרת). חשבונית זיכוי אפשר להפיק ממנו אחר כך.
//   חשבונית זיכוי      — אותה תעודה, ומיד אחריה חשבונית זיכוי ב-iCount.
//
// זה אינו ביטול חשבונית שלמה — ביטול כזה נעשה ממסך "חשבוניות וגבייה",
// והוא מחזיר את תעודות המשלוח למצב פתוח. כאן מזכים סחורה או סכום מסוימים.
//
// הסכומים שעל המסך מגיעים מחושבים מהשרת (כולל מע"מ והנחת הלקוח), כדי
// שמה שרואים לפני ההפקה יהיה מה שיודפס על המסמך.

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  Input,
  Label,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHeader,
  TableRow,
  Pagination,
} from "@windmill/react-ui";
import { FiAlertTriangle, FiPlus, FiPrinter, FiTrash2, FiX, FiXCircle } from "react-icons/fi";
import { MdOutlineReceiptLong } from "react-icons/md";
import { Link, useHistory } from "react-router-dom";
import useQueryParam from "@/hooks/useQueryParam";

import PageTitle from "@/components/Typography/PageTitle";
import ProductPicker from "@/components/billing/ProductPicker";
import CustomerPicker from "@/components/billing/CustomerPicker";
import BarcodeInput from "@/components/billing/BarcodeInput";
import TableLoading from "@/components/preloader/TableLoading";
import NotFound from "@/components/table/NotFound";
import TableHeaderCell from "@/components/table/TableHeaderCell";
import BillingServices from "@/services/BillingServices";
import { notifyError, notifySuccess } from "@/utils/toast";

const LIMIT = 25;

const MODES = {
  invoice: { title: "חשבונית זיכוי חדשה", submit: "הפק חשבונית זיכוי" },
  note: { title: "תעודת משלוח זיכוי חדשה", submit: "הפק תעודת משלוח זיכוי" },
};

const STATUS_LABELS = {
  open: { text: "טרם הופקה חשבונית", type: "warning" },
  billing: { text: "בהפקה", type: "neutral" },
  billed: { text: "הופקה חשבונית זיכוי", type: "success" },
  cancelled: { text: "בוטלה", type: "danger" },
};

const SOURCE_LABELS = {
  customerPriceList: { text: "מחירון הלקוח", cls: "text-green-600" },
  catalog: { text: "מחיר קטלוג", cls: "text-yellow-600" },
  manual: { text: "ידני", cls: "text-blue-600" },
  missing: { text: "אין מחיר!", cls: "text-red-600 font-semibold" },
};

const shekel = (n) =>
  Number(n || 0).toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const hebDate = (d) => (d ? new Date(d).toLocaleDateString("he-IL") : "—");

// מפתח נגד שליחה כפולה. randomUUID אינו זמין בהקשר לא מאובטח (http בלי TLS)
const newIdempotencyKey = () =>
  globalThis.crypto?.randomUUID?.() ||
  `credit-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const emptyProductRow = () => ({ kind: "product", sku: "", quantity: 1, unitPrice: "" });
const emptyFreeRow = () => ({ kind: "free", name: "", quantity: 1, unitPrice: "" });

const hasPrice = (row) => row.unitPrice !== undefined && row.unitPrice !== "";

const CreditNotes = () => {
  const history = useHistory();

  const [notes, setNotes] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  // התעודה שעליה רצה כרגע פעולה — כדי לנטרל את הכפתורים שלה בלבד
  const [working, setWorking] = useState(null);

  const [customerFilter, setCustomerFilter] = useQueryParam("customer");

  // null = הטופס סגור; "invoice" / "note" = מה יופק בסופו
  const [mode, setMode] = useState(null);
  const [customerId, setCustomerId] = useState("");
  const [invoices, setInvoices] = useState([]);
  const [originalDocNum, setOriginalDocNum] = useState("");
  const [reason, setReason] = useState("");
  const [docNotes, setDocNotes] = useState("");
  const [rows, setRows] = useState([emptyProductRow()]);
  const [discount, setDiscount] = useState("");
  const [applyCustomerDiscount, setApplyCustomerDiscount] = useState(true);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  // מפתח אחד לכל פתיחה של הטופס: לחיצה כפולה או שליחה חוזרת אחרי תקלת
  // רשת מחזירות את אותה תעודה ולא יוצרות שנייה
  const idempotencyKey = useRef(newIdempotencyKey());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await BillingServices.getCreditNotes({
        page,
        limit: LIMIT,
        status,
        customer: customerFilter,
      });
      setNotes(res.creditNotes || []);
      setTotal(res.total || 0);
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [page, status, customerFilter]);

  useEffect(() => {
    load();
  }, [load]);

  // החשבוניות של הלקוח שנבחר — לקישור הזיכוי לחשבונית שהוא מתייחס אליה
  useEffect(() => {
    setOriginalDocNum("");
    setInvoices([]);
    if (!customerId) return undefined;

    let alive = true;
    BillingServices.getInvoices({ customer: customerId })
      .then((res) => {
        if (!alive) return;
        const list = [...(res.invoices || [])].sort(
          (a, b) => new Date(b.billedAt || 0) - new Date(a.billedAt || 0)
        );
        setInvoices(list);
      })
      // הקישור לחשבונית הוא רשות; בלי הרשימה אפשר עדיין להפיק זיכוי
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [customerId]);

  const openForm = (next) => {
    if (!mode && !customerId && customerFilter) setCustomerId(customerFilter);
    setMode(next);
  };

  const resetForm = () => {
    setMode(null);
    setCustomerId("");
    setReason("");
    setDocNotes("");
    setRows([emptyProductRow()]);
    setDiscount("");
    setApplyCustomerDiscount(true);
    setPreview(null);
    idempotencyKey.current = newIdempotencyKey();
  };

  const updateRow = (i, field, value) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
    setPreview(null);
  };

  const addRow = (row) => {
    setRows((prev) => [...prev, row]);
    setPreview(null);
  };

  const removeRow = (i) => {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
    setPreview(null);
  };

  /** סריקת ברקוד: מעלה כמות של מוצר שכבר בזיכוי, או ממלאת שורה ריקה. */
  const addByBarcode = (product) => {
    if (!product?.sku) return;
    setPreview(null);
    setRows((prev) => {
      const existing = prev.findIndex(
        (r) => r.kind === "product" && String(r.sku) === String(product.sku)
      );
      if (existing !== -1) {
        return prev.map((r, i) =>
          i === existing ? { ...r, quantity: (Number(r.quantity) || 0) + 1 } : r
        );
      }
      const filled = { ...emptyProductRow(), sku: String(product.sku) };
      const emptyIndex = prev.findIndex((r) => r.kind === "product" && !r.sku?.trim());
      if (emptyIndex === -1) return [...prev, filled];
      return prev.map((r, i) => (i === emptyIndex ? filled : r));
    });
  };

  // שורות שיש בהן משהו. שורת מוצר ריקה שנשארה בתחתית הטופס אינה נשלחת
  const filledRows = rows.filter((r) =>
    r.kind === "free" ? r.name.trim() : r.sku?.trim()
  );

  const payload = () => ({
    customer: customerId,
    items: filledRows.map((r) => ({
      ...(r.kind === "free" ? { name: r.name.trim() } : { sku: r.sku.trim() }),
      quantity: Number(r.quantity),
      ...(hasPrice(r) ? { unitPrice: Number(r.unitPrice) } : {}),
    })),
    discount: Number(discount) || 0,
    applyCustomerDiscount,
  });

  const validate = () => {
    if (!customerId) return "יש לבחור לקוח";
    if (!filledRows.length) return "יש להזין לפחות שורה אחת";
    if (filledRows.some((r) => !(Number(r.quantity) > 0))) return "כמות חייבת להיות גדולה מאפס";
    if (filledRows.some((r) => hasPrice(r) && !(Number(r.unitPrice) >= 0))) {
      return "מחיר לא יכול להיות שלילי";
    }
    if (filledRows.some((r) => r.kind === "free" && !hasPrice(r))) {
      return "לשורה חופשית חובה להקליד מחיר";
    }
    return null;
  };

  const doPreview = async (overrides = {}) => {
    const invalid = validate();
    if (invalid) return notifyError(invalid);

    try {
      setPreview(await BillingServices.previewCreditNote({ ...payload(), ...overrides }));
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    }
    return undefined;
  };

  const hasMissing = (preview?.items || []).some((i) => i.source === "missing");

  const doCreate = async () => {
    if (!reason.trim()) return notifyError("חובה לציין סיבת זיכוי");

    const issueInvoice = mode === "invoice";
    if (
      issueInvoice &&
      !window.confirm(
        `להפיק חשבונית זיכוי על ${shekel(preview.totals.total)} ₪ כולל מע"מ?\n\n` +
          `חשבונית זיכוי היא מסמך מס: היא נרשמת בספרים, נשלחת ללקוח במייל, ` +
          `ואי אפשר למחוק אותה.`
      )
    ) {
      return undefined;
    }

    setSaving(true);
    try {
      const res = await BillingServices.createCreditNote({
        ...payload(),
        reason: reason.trim(),
        notes: docNotes.trim(),
        originalDocNum: originalDocNum || undefined,
        issueInvoice,
        idempotencyKey: idempotencyKey.current,
      });

      // התעודה נשמרה גם כשהחשבונית נכשלה — משם אפשר לנסות שוב, ולכן
      // עוברים אליה בשני המקרים במקום להשאיר טופס מלא שיישלח פעם שנייה
      if (res.invoiceError) notifyError(res.message);
      else notifySuccess(res.message);

      resetForm();
      history.push(`/credit-note/${res.note._id}`);
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
    return undefined;
  };

  const issue = async (note) => {
    if (
      !window.confirm(
        `להפיק חשבונית זיכוי מתעודת זיכוי ${note.number} עבור ` +
          `${note.customerSnapshot?.name || "הלקוח"} — ${shekel(note.totals?.total)} ₪ כולל מע"מ?\n\n` +
          `חשבונית זיכוי היא מסמך מס: היא נרשמת בספרים, נשלחת ללקוח במייל, ` +
          `ואי אפשר למחוק אותה.`
      )
    ) {
      return;
    }

    setWorking(note._id);
    try {
      const res = await BillingServices.issueCreditNoteInvoice(note._id);
      notifySuccess(res.message);
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setWorking(null);
      load();
    }
  };

  const cancel = async (note) => {
    const why = window.prompt(`ביטול תעודת זיכוי ${note.number}. מה הסיבה?`);
    // ביטול הדיאלוג מחזיר null; מחרוזת ריקה היא "אישרתי בלי סיבה"
    if (why === null) return;

    setWorking(note._id);
    try {
      const res = await BillingServices.cancelCreditNote(note._id, why);
      notifySuccess(res.message);
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setWorking(null);
      load();
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 my-6">
        <PageTitle style={{ margin: 0 }}>זיכויים</PageTitle>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => openForm("invoice")} disabled={mode === "invoice"}>
            <FiPlus className="ml-2" /> חשבונית זיכוי
          </Button>
          <Button onClick={() => openForm("note")} disabled={mode === "note"}>
            <FiPlus className="ml-2" /> תעודת משלוח זיכוי
          </Button>
        </div>
      </div>

      {mode && (
        <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-6">
          <CardBody>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                  {MODES[mode].title}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {mode === "invoice"
                    ? "תישמר תעודת זיכוי, ומיד תופק ממנה חשבונית זיכוי ב-iCount."
                    : "המסמך נשמר ומודפס מהמערכת. חשבונית זיכוי אפשר להפיק ממנו אחר כך."}
                </p>
              </div>
              <Button layout="outline" size="small" onClick={resetForm}>
                <FiX className="ml-1" /> ביטול
              </Button>
            </div>

            <div className="flex flex-wrap gap-4 mb-4">
              <Label className="flex-1 min-w-[240px]">
                <span>לקוח</span>
                <CustomerPicker
                  className="mt-1"
                  value={customerId}
                  onChange={(id) => {
                    setCustomerId(id);
                    setPreview(null);
                  }}
                />
              </Label>

              <Label className="flex-1 min-w-[240px]">
                <span>בגין חשבונית (רשות)</span>
                <Select
                  className="mt-1"
                  value={originalDocNum}
                  disabled={!customerId}
                  onChange={(e) => setOriginalDocNum(e.target.value)}
                >
                  <option value="">ללא קישור לחשבונית</option>
                  {invoices.map((inv) => (
                    <option key={inv.docNum} value={inv.docNum}>
                      {inv.docNum} · {hebDate(inv.billedAt)} · {shekel(inv.grossEstimate)} ₪
                    </option>
                  ))}
                </Select>
              </Label>
            </div>

            <Label className="mb-4">
              <span>סיבת הזיכוי (מופיעה על המסמך)</span>
              <Input
                className="mt-1"
                value={reason}
                maxLength={300}
                placeholder="למשל: החזרת סחורה פגומה, הפרש מחיר"
                onChange={(e) => setReason(e.target.value)}
              />
            </Label>

            <div className="mb-4 max-w-sm">
              <BarcodeInput
                onPick={addByBarcode}
                hint="סריקה או הקלדה ואז Enter. ברקוד שכבר בזיכוי מעלה את הכמות"
              />
            </div>

            <p className="text-sm font-medium mb-2">מה מזוכה</p>
            {rows.map((row, i) => (
              <div key={i} className="flex flex-wrap gap-2 mb-2 items-center">
                {row.kind === "free" ? (
                  <div className="flex-1 min-w-[220px]">
                    <Input
                      value={row.name}
                      maxLength={200}
                      placeholder="תיאור חופשי — למשל: הפרש מחיר"
                      aria-label="תיאור השורה"
                      onChange={(e) => updateRow(i, "name", e.target.value)}
                    />
                  </div>
                ) : (
                  <ProductPicker
                    className="flex-1 min-w-[220px]"
                    value={row.sku}
                    onChange={(sku) => updateRow(i, "sku", sku)}
                  />
                )}
                {/* רוחב קבוע על העוטף ולא על ה-Input: ל-Input של Windmill יש
                    w-full בבסיס, והוא גובר על w-28 ומועך את בורר המוצר */}
                <div className="w-28">
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="כמות"
                    aria-label="כמות"
                    value={row.quantity}
                    onChange={(e) => updateRow(i, "quantity", e.target.value)}
                  />
                </div>
                <div className="w-36">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={row.kind === "free" ? "מחיר (חובה)" : "מחיר"}
                    title={row.kind === "free" ? "מחיר ליחידה, ללא מע\"מ" : "ריק = לפי המחירון"}
                    aria-label="מחיר ליחידה"
                    value={row.unitPrice}
                    onChange={(e) => updateRow(i, "unitPrice", e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  disabled={rows.length === 1}
                  aria-label="הסרת השורה"
                  className="p-2 text-red-500 disabled:opacity-30"
                >
                  <FiTrash2 />
                </button>
              </div>
            ))}

            <div className="flex flex-wrap gap-3 mt-3">
              <Button size="small" layout="outline" onClick={() => addRow(emptyProductRow())}>
                <FiPlus className="ml-1" /> מוצר
              </Button>
              {/* זיכוי שאינו על סחורה: הפרש מחיר, פיצוי */}
              <Button size="small" layout="outline" onClick={() => addRow(emptyFreeRow())}>
                <FiPlus className="ml-1" /> שורה חופשית
              </Button>
            </div>

            <div className="flex flex-wrap gap-4 mt-4">
              <Label className="w-40">
                <span>הנחה (₪)</span>
                <Input
                  className="mt-1"
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(e) => {
                    setDiscount(e.target.value);
                    setPreview(null);
                  }}
                />
              </Label>
              <Label className="flex-1 min-w-[240px]">
                <span>הערות (מופיעות על התעודה)</span>
                <Input
                  className="mt-1"
                  value={docNotes}
                  onChange={(e) => setDocNotes(e.target.value)}
                />
              </Label>
            </div>

            <div className="mt-4">
              <Button layout="outline" onClick={() => doPreview()}>
                חשב סכומים
              </Button>
            </div>

            {preview && (
              <div className="mt-5">
                <TableContainer>
                  <Table className="w-full whitespace-nowrap admin-table">
                    <TableHeader>
                      <tr>
                        <TableHeaderCell>ברקוד</TableHeaderCell>
                        <TableHeaderCell>תיאור</TableHeaderCell>
                        <TableHeaderCell className="text-center">כמות</TableHeaderCell>
                        <TableHeaderCell className="text-left">מחיר יח'</TableHeaderCell>
                        <TableHeaderCell className="text-left">סה"כ</TableHeaderCell>
                        <TableHeaderCell>מקור המחיר</TableHeaderCell>
                      </tr>
                    </TableHeader>
                    <TableBody>
                      {preview.items.map((item, i) => {
                        const src = SOURCE_LABELS[item.source] || SOURCE_LABELS.catalog;
                        return (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-xs">
                              {item.barcode || item.sku || "—"}
                            </TableCell>
                            <TableCell>
                              {item.name}
                              {item.isVatFree && (
                                <span className="text-xs text-gray-500"> (פטור ממע"מ)</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">{item.quantity}</TableCell>
                            <TableCell className="text-left">{shekel(item.unitPrice)}</TableCell>
                            <TableCell className="text-left">{shekel(item.lineTotal)}</TableCell>
                            <TableCell className={`text-xs ${src.cls}`}>{src.text}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>

                {preview.customerDiscountPercent > 0 && (
                  <label className="mt-4 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={applyCustomerDiscount}
                      onChange={(e) => {
                        setApplyCustomerDiscount(e.target.checked);
                        // הסכומים מחושבים בשרת, ולכן שינוי הסימון מחשב מחדש
                        doPreview({ applyCustomerDiscount: e.target.checked });
                      }}
                    />
                    להפחית מהזיכוי את הנחת הלקוח הקבועה ({preview.customerDiscountPercent}%) —
                    הלקוח שילם על הסחורה אחרי ההנחה
                  </label>
                )}

                <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                  <table className="text-sm w-72">
                    <tbody>
                      <tr>
                        <td className="py-1">סה"כ שורות</td>
                        <td className="text-left py-1">{shekel(preview.totals.net)} ₪</td>
                      </tr>
                      {preview.totals.discount > 0 && (
                        <tr>
                          <td className="py-1">הנחה</td>
                          <td className="text-left py-1">-{shekel(preview.totals.discount)} ₪</td>
                        </tr>
                      )}
                      <tr className="border-t border-gray-300">
                        <td className="py-1">סה"כ לפני מע"מ</td>
                        <td className="text-left py-1">{shekel(preview.totals.beforeVat)} ₪</td>
                      </tr>
                      <tr>
                        <td className="py-1">מע"מ</td>
                        <td className="text-left py-1">{shekel(preview.totals.vat)} ₪</td>
                      </tr>
                      <tr className="border-t-2 border-gray-600 font-bold text-base">
                        <td className="py-2">סה"כ לזיכוי</td>
                        <td className="text-left py-2">{shekel(preview.totals.total)} ₪</td>
                      </tr>
                    </tbody>
                  </table>

                  <Button
                    onClick={doCreate}
                    disabled={saving || hasMissing || !(preview.total > 0)}
                  >
                    <MdOutlineReceiptLong className="ml-2" />
                    {saving ? "מפיק..." : MODES[mode].submit}
                  </Button>
                </div>

                {hasMissing && (
                  <p className="mt-3 text-sm text-red-600 flex items-center gap-2">
                    <FiAlertTriangle /> יש מוצרים ללא מחיר — יש להקליד מחיר בשורה ולחשב שוב
                  </p>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
        <CardBody className="flex flex-wrap items-end gap-4">
          <Label className="w-56">
            <span>סטטוס</span>
            <Select
              className="mt-1"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">הכל</option>
              <option value="open">טרם הופקה חשבונית</option>
              <option value="billed">הופקה חשבונית זיכוי</option>
              <option value="cancelled">בוטלה</option>
            </Select>
          </Label>

          {customerFilter && (
            <Button
              layout="link"
              className="mt-6"
              onClick={() => {
                setCustomerFilter(null);
                setPage(1);
              }}
            >
              הצג את כל הלקוחות
            </Button>
          )}
        </CardBody>
      </Card>

      {loading ? (
        <TableLoading row={8} col={7} width={160} height={20} />
      ) : notes.length === 0 ? (
        <NotFound title="לא נמצאו תעודות זיכוי" />
      ) : (
        <TableContainer className="mb-8">
          <Table className="w-full whitespace-nowrap admin-table">
            <TableHeader>
              <tr>
                <TableHeaderCell>תעודת זיכוי</TableHeaderCell>
                <TableHeaderCell>תאריך</TableHeaderCell>
                <TableHeaderCell>לקוח</TableHeaderCell>
                <TableHeaderCell>סיבה</TableHeaderCell>
                <TableHeaderCell className="text-left">סכום כולל מע"מ</TableHeaderCell>
                <TableHeaderCell>סטטוס</TableHeaderCell>
                <TableHeaderCell></TableHeaderCell>
              </tr>
            </TableHeader>
            <TableBody>
              {notes.map((n) => {
                const state = n.billing?.status || "open";
                const label = STATUS_LABELS[state] || STATUS_LABELS.open;
                return (
                  <TableRow key={n._id}>
                    <TableCell className="font-mono font-semibold">{n.number}</TableCell>
                    <TableCell>{hebDate(n.issuedAt)}</TableCell>
                    <TableCell>
                      {n.customerSnapshot?.name || "—"}
                      {n.customerSnapshot?.customerNumber && (
                        <span className="block text-xs text-gray-500 font-mono">
                          לקוח {n.customerSnapshot.customerNumber}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-normal max-w-xs">
                      {n.reason}
                      {n.billing?.originalDocNum && (
                        <span className="block text-xs text-gray-500">
                          בגין חשבונית {n.billing.originalDocNum}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-left">{shekel(n.totals?.total)} ₪</TableCell>
                    <TableCell>
                      <Badge type={label.type}>{label.text}</Badge>
                      {state === "billed" && n.billing?.creditDocNum && (
                        <span className="block text-xs mt-1 font-mono">
                          {n.billing.creditDocUrl ? (
                            <a
                              href={n.billing.creditDocUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {n.billing.creditDocNum}
                            </a>
                          ) : (
                            n.billing.creditDocNum
                          )}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <Link
                          to={`/credit-note/${n._id}`}
                          className="text-blue-600 hover:underline flex items-center gap-1 text-sm"
                        >
                          מסמך <FiPrinter />
                        </Link>

                        {state === "open" && (
                          <>
                            <button
                              onClick={() => issue(n)}
                              disabled={working === n._id}
                              className="text-sm text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1 disabled:opacity-40"
                              title="הפקת חשבונית זיכוי ב-iCount מהתעודה הזו"
                            >
                              <MdOutlineReceiptLong /> חשבונית זיכוי
                            </button>
                            <button
                              onClick={() => cancel(n)}
                              disabled={working === n._id}
                              className="text-sm text-red-500 hover:underline flex items-center gap-1 disabled:opacity-40"
                            >
                              <FiXCircle /> בטל
                            </button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <TableFooter>
            <Pagination
              totalResults={total}
              resultsPerPage={LIMIT}
              onChange={setPage}
              label="ניווט בין עמודים"
            />
          </TableFooter>
        </TableContainer>
      )}
    </>
  );
};

export default CreditNotes;
