// src/pages/Quotes.jsx
//
// הצעות מחיר: רשימה + בונה הצעה חדשה.
//
// המחיר מוצג ליד כל שורה עוד לפני ההפקה, יחד עם מקורו (מחירון הלקוח או
// מחיר קטלוג). זה מכוון: הצעה היא מה שהלקוח יצפה לשלם, וכשרוב הקטלוג
// מתומחר במחירי ברירת מחדל צריך לראות את זה לפני ששולחים ולא אחרי.

import React, { useCallback, useEffect, useState } from "react";
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
import { FiAlertTriangle, FiCopy, FiFileText, FiPlus, FiPrinter, FiTrash2, FiX } from "react-icons/fi";
import { MdOutlineReceiptLong } from "react-icons/md";
import { Link } from "react-router-dom";
import useQueryParam from "@/hooks/useQueryParam";

import PageTitle from "@/components/Typography/PageTitle";
import ProductPicker from "@/components/billing/ProductPicker";
import CustomerPicker from "@/components/billing/CustomerPicker";
import BarcodeInput from "@/components/billing/BarcodeInput";
import TableLoading from "@/components/preloader/TableLoading";
import NotFound from "@/components/table/NotFound";
import BillingServices from "@/services/BillingServices";
import { notifyError, notifySuccess } from "@/utils/toast";

import TableHeaderCell from "@/components/table/TableHeaderCell";
const LIMIT = 25;

const STATUS_LABELS = {
  open: { text: "ממתינה", type: "warning" },
  accepted: { text: "אושרה", type: "success" },
  rejected: { text: "נדחתה", type: "danger" },
  expired: { text: "פג תוקף", type: "neutral" },
};

const SOURCE_LABELS = {
  customerPriceList: { text: "מחירון הלקוח", cls: "text-green-600" },
  catalog: { text: "מחיר קטלוג", cls: "text-yellow-600" },
  manual: { text: "ידני", cls: "text-blue-600" },
  missing: { text: "אין מחיר!", cls: "text-red-600 font-semibold" },
};

const shekel = (n) =>
  Number(n || 0).toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const Quotes = () => {
  const [quotes, setQuotes] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  // סינון לפי לקוח מה-URL, כמו בתעודות המשלוח
  const [customerFilter, setCustomerFilter] = useQueryParam("customer");
  // new=1 מגיע מהכפתור "הצעת מחיר חדשה ללקוח" בכרטיס הלקוח: הבונה נפתח
  // מיד, והלקוח שבסינון כבר נבחר בו
  const [openNew, setOpenNew] = useQueryParam("new");

  const [building, setBuilding] = useState(() => openNew === "1");
  const [customerId, setCustomerId] = useState(() =>
    openNew === "1" ? customerFilter : ""
  );
  const [rows, setRows] = useState([{ sku: "", quantity: 1 }]);
  const [priced, setPriced] = useState(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  // ההצעה שעליה רצה כרגע פעולה — כדי לנטרל את הכפתורים שלה בלבד
  const [working, setWorking] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await BillingServices.getQuotes({ page, limit: LIMIT, status, customer: customerFilter });
      setQuotes(res.quotes || []);
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

  // new נמחק מהכתובת אחרי השימוש: רענון הדף או חזרה אליו לא יפתחו את
  // הבונה שוב. סינון הלקוח נשאר
  useEffect(() => {
    if (openNew) setOpenNew(null);
  }, [openNew, setOpenNew]);

  const updateRow = (i, field, value) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
    // מחיר ידני אינו משנה את מה שהמחירון החזיר, ולכן הטבלה המתומחרת נשארת
    if (field !== "unitPrice") setPriced(null);
  };

  // מחיר שהוקלד ביד לשורה. ריק = "לפי המחירון"; 0 מפורש הוא מחיר תקף
  const hasManualPrice = (row) =>
    row?.unitPrice !== undefined && row.unitPrice !== "" && Number(row.unitPrice) >= 0;

  const toPayload = (r) => ({
    sku: r.sku.trim(),
    quantity: Number(r.quantity),
    ...(hasManualPrice(r) ? { unitPrice: Number(r.unitPrice) } : {}),
  });

  const addRow = () => setRows((prev) => [...prev, { sku: "", quantity: 1 }]);
  // שורה שנשכחה באמצע: נכנסת מעל השורה שנלחצה, כדי שסדר ההצעה יישמר.
  // הכפתור שבתחתית ממשיך להוסיף בסוף
  const insertRow = (i) =>
    setRows((prev) => [...prev.slice(0, i), { sku: "", quantity: 1 }, ...prev.slice(i)]);
  const removeRow = (i) => {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
    setPriced(null);
  };

  /**
   * הוספת שורה מסריקת ברקוד. ממלא שורה ריקה קיימת לפני שמוסיף חדשה,
   * ומעלה כמות של מוצר שכבר בהצעה במקום לפצל אותו לשתי שורות.
   */
  const addByBarcode = (product) => {
    if (!product?.sku) return;
    setPriced(null);
    setRows((prev) => {
      const existing = prev.findIndex((r) => String(r.sku) === String(product.sku));
      if (existing !== -1) {
        return prev.map((r, i) =>
          i === existing ? { ...r, quantity: (Number(r.quantity) || 0) + 1 } : r
        );
      }
      const filled = { sku: String(product.sku), quantity: 1 };
      const emptyIndex = prev.findIndex((r) => !r.sku?.trim());
      if (emptyIndex === -1) return [...prev, filled];
      return prev.map((r, i) => (i === emptyIndex ? filled : r));
    });
  };

  // עם האינדקס המקורי: השרת מחזיר את השורות המתומחרות באותו סדר שבו
  // נשלחו, וזה מה שמקשר שורה בטבלה המתומחרת לשורה שבטופס. קישור לפי
  // מק"ט היה נשבר כשאותו מוצר מופיע בשתי שורות במחירים שונים.
  const validRows = rows
    .map((r, index) => ({ ...r, index }))
    .filter((r) => r.sku?.trim() && Number(r.quantity) > 0);

  const doPrice = async () => {
    if (!customerId) return notifyError("יש לבחור לקוח");
    if (!validRows.length) return notifyError("יש להזין לפחות מוצר אחד עם כמות");

    try {
      const res = await BillingServices.priceItems({
        customer: customerId,
        items: validRows.map((r) => ({ sku: r.sku.trim(), quantity: Number(r.quantity) })),
      });
      setPriced(res);
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    }
  };

  const doCreate = async () => {
    setSaving(true);
    try {
      const res = await BillingServices.createQuote({
        customer: customerId,
        items: validRows.map(toPayload),
        notes,
      });
      notifySuccess(res.message);
      setBuilding(false);
      setRows([{ sku: "", quantity: 1 }]);
      setPriced(null);
      setNotes("");
      setCustomerId("");
      load();
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const setQuoteStatus = async (quote, action) => {
    try {
      const res =
        action === "accept"
          ? await BillingServices.acceptQuote(quote._id)
          : await BillingServices.rejectQuote(quote._id);
      notifySuccess(res.message);
      load();
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    }
  };

  /**
   * הפקת תעודת משלוח (או חשבונית) מההצעה, בלחיצה אחת.
   *
   * מאושר במפורש לפני השליחה: חשבונית היא מסמך מס שאי אפשר למחוק, ותעודה
   * שנייה מאותה הצעה היא חיוב כפול. המפתח נוצר פעם אחת לכל לחיצה ומונע
   * שתי תעודות מלחיצה כפולה.
   */
  const convert = async (quote, target) => {
    const what = target === "invoice" ? "חשבונית מס" : "תעודת משלוח";
    const extra =
      target === "invoice"
        ? "\n\nחשבונית מס נרשמת בספרים ואי אפשר למחוק אותה — רק להוציא זיכוי."
        : "";
    if (
      !window.confirm(
        `להפיק ${what} מהצעה ${quote.number} עבור ${quote.customerSnapshot?.name || "הלקוח"}?${extra}`
      )
    ) {
      return;
    }

    setWorking(quote._id);
    try {
      const res = await BillingServices.convertQuote(quote._id, { target });
      notifySuccess(res.message);
      load();
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
      // ההמרה יכולה להיכשל *אחרי* שהתעודה נוצרה (החשבונית נכשלה) —
      // ריענון הרשימה כדי שהמסך יראה את המצב האמיתי
      load();
    } finally {
      setWorking(null);
    }
  };

  const duplicate = async (quote) => {
    setWorking(quote._id);
    try {
      const res = await BillingServices.duplicateQuote(quote._id);
      notifySuccess(res.message);
      setPage(1);
      load();
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setWorking(null);
    }
  };

  // השורות כפי שיופקו: מחיר שהוקלד ביד גובר על מה שהמחירון החזיר, בדיוק
  // כמו בשרת (quotes.create), כך שהסכום שעל המסך הוא הסכום שעל המסמך
  const shownItems = (priced?.items || []).map((item, i) => {
    const row = validRows[i];
    const base = { ...item, rowIndex: row?.index, listPrice: item.unitPrice, typed: row?.unitPrice };
    if (!hasManualPrice(row)) return base;
    const unitPrice = Number(row.unitPrice);
    return {
      ...base,
      unitPrice,
      lineTotal: Number((unitPrice * item.quantity).toFixed(2)),
      source: "manual",
    };
  });
  const pricedTotal = shownItems.reduce((s, i) => s + i.lineTotal, 0);
  const catalogCount = shownItems.filter((i) => i.source === "catalog").length;
  // מק"ט שאינו בקטלוג נחסם גם עם מחיר ידני — השרת דוחה אותו בכל מקרה
  const unknownCount = shownItems.filter((i) => i.unknownProduct).length;
  // מחיר שלילי אינו נשלח לשרת, ולכן בלי החסימה הזו ההצעה הייתה מופקת
  // במחיר המחירון בזמן שבשדה כתוב מספר אחר
  const hasInvalidPrice = validRows.some(
    (r) => r.unitPrice !== undefined && r.unitPrice !== "" && !hasManualPrice(r)
  );
  const hasMissing =
    unknownCount > 0 || hasInvalidPrice || shownItems.some((i) => i.source === "missing");

  return (
    <>
      <div className="flex items-center justify-between my-6">
        <PageTitle style={{ margin: 0 }}>הצעות מחיר</PageTitle>
        <Button
          onClick={() => {
            // ברשימה המסוננת ללקוח, הצעה חדשה היא כמעט תמיד עבורו
            if (!building && !customerId && customerFilter) setCustomerId(customerFilter);
            setBuilding((v) => !v);
          }}
        >
          {building ? <FiX className="ml-2" /> : <FiPlus className="ml-2" />}
          {building ? "ביטול" : "הצעה חדשה"}
        </Button>
      </div>

      {building && (
        <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-6">
          <CardBody>
            <div className="flex flex-wrap gap-4 mb-4">
              {/* הקלדה של השם או של מספר הלקוח מגיעה אליו ישירות — ברשימה
                  נפתחת רגילה היה צריך לגלול דרך מאות לקוחות */}
              <Label className="flex-1 min-w-[240px]">
                <span>לקוח</span>
                <CustomerPicker
                  className="mt-1"
                  value={customerId}
                  onChange={(id) => {
                    setCustomerId(id);
                    setPriced(null);
                  }}
                />
              </Label>
            </div>

            <div className="mb-4 max-w-sm">
              <BarcodeInput
                onPick={addByBarcode}
                hint="סריקה או הקלדה ואז Enter. ברקוד שכבר בהצעה מעלה את הכמות"
              />
            </div>

            <p className="text-sm font-medium mb-2">פריטים</p>
            {rows.map((row, i) => (
              <div key={i} className="flex flex-wrap gap-2 mb-2 items-center">
                <ProductPicker
                  className="flex-1 min-w-[220px]"
                  value={row.sku}
                  onChange={(sku) => updateRow(i, "sku", sku)}
                />
                {/* רוחב קבוע על העוטף ולא על ה-Input: ל-Input של Windmill יש
                    w-full בבסיס, והוא גובר על w-28 ומועך את בורר המוצר */}
                <div className="w-28">
                  <Input
                    type="number"
                    min="1"
                    placeholder="כמות"
                    value={row.quantity}
                    onChange={(e) => updateRow(i, "quantity", e.target.value)}
                  />
                </div>
                {/* ריק = המחיר נלקח ממחירון הלקוח או מהקטלוג */}
                <div className="w-36">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="מחיר"
                    title="ריק = לפי המחירון"
                    aria-label="מחיר ליחידה"
                    value={row.unitPrice ?? ""}
                    onChange={(e) => updateRow(i, "unitPrice", e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => insertRow(i)}
                  className="p-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                  title="הוספת שורה מעל שורה זו"
                  aria-label="הוספת שורה מעל שורה זו"
                >
                  <FiPlus />
                </button>
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  disabled={rows.length === 1}
                  className="p-2 text-red-500 disabled:opacity-30"
                >
                  <FiTrash2 />
                </button>
              </div>
            ))}

            <div className="flex flex-wrap gap-3 mt-3">
              <Button size="small" layout="outline" onClick={addRow}>
                <FiPlus className="ml-1" /> שורה
              </Button>
              <Button size="small" layout="outline" onClick={doPrice}>
                חשב מחירים
              </Button>
            </div>

            <Label className="mt-4">
              <span>הערות (מופיעות על המסמך)</span>
              <Input
                className="mt-1"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Label>

            {priced && (
              <div className="mt-5">
                <TableContainer>
                  <Table className="w-full whitespace-nowrap admin-table">
                    <TableHeader>
                      <tr>
                        {/* הברקוד לצד השם — זה המזהה שיודפס על המסמך,
                            וכך אפשר להצליב עוד לפני ההפקה */}
                        <TableHeaderCell>ברקוד</TableHeaderCell>
                        <TableHeaderCell>מוצר</TableHeaderCell>
                        <TableHeaderCell className="text-center">כמות</TableHeaderCell>
                        <TableHeaderCell className="text-left">מחיר יח'</TableHeaderCell>
                        <TableHeaderCell className="text-left">סה"כ</TableHeaderCell>
                        <TableHeaderCell>מקור המחיר</TableHeaderCell>
                      </tr>
                    </TableHeader>
                    <TableBody>
                      {shownItems.map((item, i) => {
                        const src = SOURCE_LABELS[item.source] || SOURCE_LABELS.catalog;
                        return (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-xs">
                              {item.barcode || item.sku || "—"}
                            </TableCell>
                            <TableCell>{item.name}</TableCell>
                            <TableCell className="text-center">{item.quantity}</TableCell>
                            <TableCell className="text-left">
                              <div className="w-28 mr-auto">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  aria-label={`מחיר ליחידה — ${item.name}`}
                                  // שדה שלא נגעו בו מציג את מחיר המחירון; שדה
                                  // שרוקן נשאר ריק (והמחירון ברקע) כדי שאפשר
                                  // יהיה להקליד מחיר חדש
                                  value={item.typed ?? (item.listPrice || "")}
                                  placeholder={item.listPrice ? String(item.listPrice) : ""}
                                  onChange={(e) =>
                                    updateRow(item.rowIndex, "unitPrice", e.target.value)
                                  }
                                />
                              </div>
                            </TableCell>
                            <TableCell className="text-left">{shekel(item.lineTotal)}</TableCell>
                            <TableCell className={`text-xs ${src.cls}`}>{src.text}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="text-sm">
                    <p>
                      סה"כ לפני מע"מ:{" "}
                      <span className="font-semibold text-lg">{shekel(pricedTotal)} ₪</span>
                    </p>
                    <p className="text-gray-500">
                      כולל מע"מ: ~{shekel(pricedTotal * 1.18)} ₪
                    </p>
                  </div>

                  <Button onClick={doCreate} disabled={saving || hasMissing}>
                    {saving ? "מפיק..." : "הפק הצעת מחיר"}
                  </Button>
                </div>

                {hasMissing && (
                  <p className="mt-3 text-sm text-red-600 flex items-center gap-2">
                    <FiAlertTriangle />{" "}
                    {unknownCount > 0
                      ? 'יש מק"טים שאינם קיימים בקטלוג — יש להסיר או לתקן אותם לפני הפקה'
                      : hasInvalidPrice
                      ? "מחיר לא יכול להיות שלילי — יש לתקן לפני הפקה"
                      : "יש מוצרים ללא מחיר — יש להקליד מחיר בשורה לפני הפקה"}
                  </p>
                )}

                {catalogCount > 0 && !hasMissing && (
                  <p className="mt-3 text-sm text-yellow-700 dark:text-yellow-500 flex items-start gap-2">
                    <FiAlertTriangle className="mt-0.5 shrink-0" />
                    <span>
                      {catalogCount} מתוך {shownItems.length} השורות מתומחרות לפי
                      מחיר הקטלוג ולא לפי מחירון הלקוח. כל עוד לא הועלה מחירון
                      בסיס אמיתי, אלה מחירי ברירת מחדל — כדאי לבדוק לפני שליחה.
                    </span>
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
              <option value="open">ממתינה</option>
              <option value="accepted">אושרה</option>
              <option value="rejected">נדחתה</option>
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
      ) : quotes.length === 0 ? (
        <NotFound title="לא נמצאו הצעות מחיר" />
      ) : (
        <TableContainer className="mb-8">
          <Table className="w-full whitespace-nowrap admin-table">
            <TableHeader>
              <tr>
                <TableHeaderCell>מספר</TableHeaderCell>
                <TableHeaderCell>תאריך</TableHeaderCell>
                <TableHeaderCell>לקוח</TableHeaderCell>
                <TableHeaderCell className="text-center">שורות</TableHeaderCell>
                <TableHeaderCell className="text-left">סכום</TableHeaderCell>
                <TableHeaderCell>בתוקף עד</TableHeaderCell>
                <TableHeaderCell>סטטוס</TableHeaderCell>
                <TableHeaderCell></TableHeaderCell>
              </tr>
            </TableHeader>
            <TableBody>
              {quotes.map((q) => {
                const label = STATUS_LABELS[q.status] || STATUS_LABELS.open;
                return (
                  <TableRow key={q._id}>
                    <TableCell className="font-mono font-semibold">{q.number}</TableCell>
                    <TableCell>
                      {new Date(q.createdAt).toLocaleDateString("he-IL")}
                    </TableCell>
                    <TableCell>
                      {q.customerSnapshot?.name || "—"}
                      {/* מספר הלקוח לצד השם — לקוחות עם שמות דומים
                          נבדלים בו, וזה גם מה שמקלידים בחיפוש */}
                      {q.customerSnapshot?.customerNumber && (
                        <span className="block text-xs text-gray-500 font-mono">
                          לקוח {q.customerSnapshot.customerNumber}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{q.items?.length || 0}</TableCell>
                    <TableCell className="text-left">{shekel(q.total)} ₪</TableCell>
                    <TableCell>
                      {q.validUntil
                        ? new Date(q.validUntil).toLocaleDateString("he-IL")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge type={label.type}>{label.text}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <Link
                          to={`/quote/${q._id}`}
                          className="text-blue-600 hover:underline flex items-center gap-1 text-sm"
                        >
                          מסמך <FiPrinter />
                        </Link>

                        <button
                          onClick={() => duplicate(q)}
                          disabled={working === q._id}
                          className="text-sm text-gray-600 dark:text-gray-300 hover:underline flex items-center gap-1 disabled:opacity-40"
                          title="יצירת הצעה חדשה זהה לזו"
                        >
                          <FiCopy /> העתק
                        </button>

                        {/* הצעה שכבר הומרה מציגה את התעודה במקום את הכפתורים —
                            הפקה שנייה מאותה הצעה היא חיוב כפול, והשרת חוסם אותה */}
                        {q.convertedNote ? (
                          <span className="text-xs text-green-700 dark:text-green-500">
                            הופקה תעודה {q.convertedNoteNumber}
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => convert(q, "deliveryNote")}
                              disabled={working === q._id}
                              className="text-sm text-green-700 dark:text-green-500 hover:underline flex items-center gap-1 disabled:opacity-40"
                              title="הפקת תעודת משלוח עם השורות והמחירים של ההצעה"
                            >
                              <FiFileText /> תעודה
                            </button>
                            <button
                              onClick={() => convert(q, "invoice")}
                              disabled={working === q._id}
                              className="text-sm text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1 disabled:opacity-40"
                              title="הפקת תעודה + חשבונית מס מיד"
                            >
                              <MdOutlineReceiptLong /> חשבונית
                            </button>
                          </>
                        )}

                        {/* סימון סטטוס בלי הפקת מסמך. נחוץ כשהלקוח אישר
                            בעל פה והסחורה עדיין לא יצאה, או כשההצעה
                            ירדה מהפרק — ולכן נשאר לצד כפתורי ההפקה */}
                        {q.status === "open" && (
                          <>
                            <button
                              onClick={() => setQuoteStatus(q, "accept")}
                              className="text-green-600 text-sm hover:underline"
                            >
                              סמן כאושרה
                            </button>
                            <button
                              onClick={() => setQuoteStatus(q, "reject")}
                              className="text-red-500 text-sm hover:underline"
                            >
                              נדחתה
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

export default Quotes;
