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
} from "@windmill/react-ui";
import { FiAlertTriangle, FiClock, FiCopy, FiEdit2, FiFileText, FiPlus, FiPrinter, FiTrash2, FiX } from "react-icons/fi";
import { MdOutlineReceiptLong } from "react-icons/md";
import { Link, useLocation } from "react-router-dom";
import useQueryParam from "@/hooks/useQueryParam";

import PageTitle from "@/components/Typography/PageTitle";
import ProductPicker from "@/components/billing/ProductPicker";
import CustomerPicker from "@/components/billing/CustomerPicker";
import BarcodeInput from "@/components/billing/BarcodeInput";
import useRowEntryKeys from "@/hooks/useRowEntryKeys";
import useCustomerKnownSkus from "@/hooks/useCustomerKnownSkus";
import CatalogScopeToggle from "@/components/billing/CatalogScopeToggle";
import ExpectedPrice, { isPriceListSource, useExpectedPrices } from "@/components/billing/ExpectedPrice";
import CustomerHistoryWindow from "@/components/customer/CustomerHistoryWindow";
import TableLoading from "@/components/preloader/TableLoading";
import ListPager from "@/components/table/ListPager";
import NotFound from "@/components/table/NotFound";
import BillingServices from "@/services/BillingServices";
import CustomerPriceListServices from "@/services/CustomerPriceListServices";
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
  groupPriceList: { text: "מחירון קבוצתי", cls: "text-green-600" },
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
  // העמוד והסטטוס בכתובת, כדי שכפתור "חזרה" במסמך ינחת על אותה רשימה
  const location = useLocation();
  const [pageParam, setPageParam] = useQueryParam("page");
  const page = Number(pageParam) || 1;
  const setPage = useCallback((p) => setPageParam(p > 1 ? String(p) : null), [setPageParam]);
  const [status, setStatus] = useQueryParam("status");
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

  // הבורר מציג רק מוצרים שהלקוח קנה או שבמחירון שלו (בקשת הלקוחה,
  // 19/10/2026), כמו בתעודת המשלוח; "כל הקטלוג" פותח את השאר
  //
  // historyVersion: היסטוריה שהועלתה או הוסרה מחלון ההיסטוריה משנה את
  // הרשימה הזו, והבורר צריך לקבל אותה בלי לבחור את הלקוח מחדש
  const [historyVersion, setHistoryVersion] = useState(0);
  const knownSkus = useCustomerKnownSkus(customerId, historyVersion);
  // חלון ההיסטוריה של הלקוח, כמו בתעודת המשלוח (בקשת הלקוחה, 19/10/2026).
  // null — עוד לא נפתח, ואז אינו מורכב כלל
  const [historyOpen, setHistoryOpen] = useState(null);
  // המחיר של הלקוח מוצג מתחת לשדה המחיר מיד כשנבחר מוצר, ולא רק אחרי
  // "חשב מחירים" — אחרת נראה כאילו ההצעה מתעלמת מהמחירון שלו
  const { expectedFor } = useExpectedPrices(customerId, rows);
  const [wholeCatalog, setWholeCatalog] = useState(false);
  const pickerSkus = wholeCatalog ? null : knownSkus;
  const [priced, setPriced] = useState(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  // ההצעה שנערכת כרגע בבונה. null = הבונה מפיק הצעה חדשה
  const [editing, setEditing] = useState(null);
  // ההצעה שעליה רצה כרגע פעולה — כדי לנטרל את הכפתורים שלה בלבד
  const [working, setWorking] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await BillingServices.getQuotes({ page, limit: LIMIT, status, customer: customerFilter });
      setQuotes(res.quotes || []);
      setTotal(res.total || 0);
      // עמוד מהכתובת שכבר לא קיים — למשל חזרה לעמוד האחרון אחרי שהמסמך
      // היחיד בו בוטל ויצא מהסינון. בלי זה: מסך ריק בלי עימוד לצאת ממנו
      const lastPage = Math.ceil((res.total || 0) / LIMIT);
      if (lastPage && page > lastPage) setPage(lastPage);
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [page, setPage, status, customerFilter]);

  useEffect(() => {
    load();
  }, [load]);

  // new נמחק מהכתובת אחרי השימוש: רענון הדף או חזרה אליו לא יפתחו את
  // הבונה שוב. סינון הלקוח נשאר
  useEffect(() => {
    if (openNew) setOpenNew(null);
  }, [openNew, setOpenNew]);

  const updateRow = (i, field, value) => {
    setRows((prev) =>
      prev.map((r, idx) => {
        if (idx !== i) return r;
        // בעריכה: שורה שהוחלף בה המוצר לא תישאר עם המחיר של המוצר הקודם
        if (field === "sku" && r.origPrice !== undefined && value !== r.sku) {
          return { sku: value, quantity: r.quantity };
        }
        return { ...r, [field]: value };
      })
    );
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

  // הקלדה רצופה בלי עכבר, כמו בתעודת המשלוח: בחירת מוצר מעבירה לכמות,
  // ו-Enter שם עובר לשורה הבאה ופותח חדשה אם זו האחרונה
  const keys = useRowEntryKeys({
    rows,
    addRow,
    hasItem: (r) => !!r.sku?.trim(),
    onScan: (i) => {
      updateRow(i, "quantity", "");
      notifyError('נראה שנסרק ברקוד בשדה הכמות — הערך נמחק. לסריקה יש להשתמש בשדה "הקלדת ברקוד"');
    },
  });
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

  const resetBuilder = () => {
    setBuilding(false);
    setEditing(null);
    setRows([{ sku: "", quantity: 1 }]);
    setPriced(null);
    setNotes("");
    setCustomerId("");
  };

  /**
   * פתיחת הצעה קיימת בבונה לתיקון. השורות נטענות עם המחיר שכבר בהצעה:
   * זה מה שנמסר ללקוח, ועריכת כמות לא אמורה לתמחר מחדש לפי המחירון של
   * היום. שורה שמחירה לא נגעו בו שומרת על מקור המחיר שנרשם לה (origSource).
   */
  const startEdit = (quote) => {
    setEditing(quote);
    setCustomerId(String(quote.customer?._id || quote.customer || ""));
    setRows(
      (quote.items || []).map((i) => ({
        sku: String(i.sku || ""),
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        origPrice: i.unitPrice,
        origSource: i.priceSource,
      }))
    );
    setNotes(quote.notes || "");
    setPriced(null);
    setBuilding(true);
    window.scrollTo?.({ top: 0, behavior: "smooth" });
  };

  // מחיר ידני בהצעה נכתב גם למחירון, כמו בתעודת המשלוח (בקשת הלקוחה,
  // 22/10/2026: "המחירים של הצעות מחיר לא מתעדכנים אצל הלקוח"). השרת
  // מכריע לכל מוצר אם זה המחירון הקבוצתי או הפרטי (applyToGroup). כישלון
  // כאן אינו מבטל את ההצעה שכבר נשמרה — רק אומר במפורש שהמחירון לא עודכן
  const savePricesToPriceList = async (customer, items, done) => {
    if (!items.length || !customer) return;
    try {
      const res = await CustomerPriceListServices.upsertItems(customer, { items, applyToGroup: true });
      notifySuccess(res.message);
    } catch (err) {
      notifyError(`${done}, אבל המחיר לא נשמר במחירון: ${err?.response?.data?.message || err.message}`);
    }
  };

  // השורות שמחירן הוקלד ביד ושונה ממה שכבר במחירון. בעריכה, שורה שהמחיר
  // שלה לא נגעו בו לא הוקלדה עכשיו — ואם המחירון שונה מאז ההצעה, אסור
  // שעריכת כמות תחזיר אותו לאחור
  const typedPrices = () =>
    validRows
      .filter((r) => hasManualPrice(r) && Number(r.unitPrice) > 0)
      .filter((r) => !(r.origSource && Number(r.unitPrice) === Number(r.origPrice)))
      .filter((r) => {
        const known = expectedFor(r.sku);
        return !(isPriceListSource(known?.source) && known.unitPrice === Number(r.unitPrice));
      })
      .map((r) => ({ sku: r.sku.trim(), price: Number(r.unitPrice) }));

  const doCreate = async () => {
    setSaving(true);
    const toSave = typedPrices();
    const savedFor = editing ? String(editing.customer?._id || editing.customer || "") : customerId;
    try {
      const res = editing
        ? await BillingServices.updateQuote(editing._id, {
            items: validRows.map(toPayload),
            notes,
          })
        : await BillingServices.createQuote({
            customer: customerId,
            items: validRows.map(toPayload),
            notes,
          });
      notifySuccess(res.message);
      await savePricesToPriceList(savedFor, toSave, "ההצעה נשמרה");
      resetBuilder();
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
      await savePricesOnConvert(quote);
      load();
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
      // ההמרה יכולה להיכשל *אחרי* שהתעודה נוצרה (החשבונית נכשלה) — התעודה
      // קיימת, ולכן גם המחירים שלה נכנסים למחירון. ריענון הרשימה כדי
      // שהמסך יראה את המצב האמיתי
      if (err?.response?.data?.note) await savePricesOnConvert(quote);
      load();
    } finally {
      setWorking(null);
    }
  };

  /**
   * בהפקת תעודה מהצעה: מחיר ידני של מוצר שעדיין אינו במחירון נכתב אליו,
   * כדי שהמוצר יופיע אצל הלקוח בתעודה הבאה. זה מכסה הצעות שנשמרו לפני
   * שההצעה התחילה לכתוב למחירון.
   *
   * מוצר שכבר יש לו מחיר במחירון אינו נדרס: ייתכן שהמחיר שם שונה ביד אחרי
   * ההצעה, והצעה ישנה לא אמורה להחזיר אותו לאחור בשקט.
   */
  const savePricesOnConvert = async (quote) => {
    const customer = String(quote.customer?._id || quote.customer || "");
    const manual = (quote.items || []).filter(
      (i) => i.priceSource === "manual" && Number(i.unitPrice) > 0
    );
    if (!customer || !manual.length) return;
    try {
      const current = await BillingServices.priceItems({
        customer,
        items: manual.map((i) => ({ sku: String(i.sku), quantity: 1 })),
      });
      const inList = new Set(
        (current?.items || []).filter((i) => isPriceListSource(i.source)).map((i) => String(i.sku))
      );
      const items = manual
        .filter((i) => !inList.has(String(i.sku)))
        .map((i) => ({ sku: String(i.sku), price: Number(i.unitPrice) }));
      await savePricesToPriceList(customer, items, "התעודה הופקה");
    } catch (err) {
      notifyError(`התעודה הופקה, אבל המחיר לא נשמר במחירון: ${err?.response?.data?.message || err.message}`);
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
    // בעריכה: מחיר שנשאר כמו שהיה בהצעה לא הוקלד ביד עכשיו
    const untouched = row.origSource && unitPrice === Number(row.origPrice);
    return {
      ...base,
      unitPrice,
      lineTotal: Number((unitPrice * item.quantity).toFixed(2)),
      source: untouched ? row.origSource : "manual",
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
            // ביטול עריכה מנקה את הבונה: שורות של הצעה קיימת לא יישארו בו
            // ויהפכו להצעה חדשה. טיוטה של הצעה חדשה נשמרת, כמו תמיד
            if (building) return editing ? resetBuilder() : setBuilding(false);
            // ברשימה המסוננת ללקוח, הצעה חדשה היא כמעט תמיד עבורו
            if (!customerId && customerFilter) setCustomerId(customerFilter);
            setBuilding(true);
          }}
        >
          {building ? <FiX className="ml-2" /> : <FiPlus className="ml-2" />}
          {building ? "ביטול" : "הצעה חדשה"}
        </Button>
      </div>

      {building && (
        <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-6">
          <CardBody>
            {historyOpen !== null && (
              <CustomerHistoryWindow
                isOpen={historyOpen}
                onClose={() => setHistoryOpen(false)}
                customerId={customerId}
                onChanged={() => setHistoryVersion((v) => v + 1)}
              />
            )}

            <div className="flex justify-end mb-2">
              <Button
                type="button"
                size="small"
                layout="outline"
                onClick={() => setHistoryOpen(true)}
                disabled={!customerId}
                title={customerId ? "מה הלקוח קנה בעבר" : "יש לבחור לקוח"}
              >
                <FiClock className="ml-1" /> היסטוריית הלקוח
              </Button>
            </div>

            {editing ? (
              // הלקוח של הצעה קיימת אינו משתנה — להצעה ללקוח אחר יש "העתק"
              <p className="mb-4 font-semibold">
                עריכת הצעה {editing.number} — {editing.customerSnapshot?.name || "לקוח"}
              </p>
            ) : (
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
            )}

            <div className="mb-4 max-w-sm">
              <BarcodeInput
                onPick={addByBarcode}
                hint="סריקה או הקלדה ואז Enter. ברקוד שכבר בהצעה מעלה את הכמות"
              />
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2">
              <p className="text-sm font-medium">פריטים</p>
              <CatalogScopeToggle
                knownSkus={knownSkus}
                wholeCatalog={wholeCatalog}
                onChange={setWholeCatalog}
              />
            </div>
            {rows.map((row, i) => (
              <div key={i} className="flex flex-wrap gap-2 mb-2 items-start">
                <ProductPicker
                  className="flex-1 min-w-[220px]"
                  value={row.sku}
                  onlySkus={pickerSkus}
                  selectRef={keys.itemRef(i)}
                  onChange={(sku) => {
                    updateRow(i, "sku", sku);
                    // ניקוי הבחירה (X) אינו סיבה לקפוץ לשדה הכמות
                    if (sku) keys.focusQuantity(i);
                  }}
                />
                {/* רוחב קבוע על העוטף ולא על ה-Input: ל-Input של Windmill יש
                    w-full בבסיס, והוא גובר על w-28 ומועך את בורר המוצר */}
                <div className="w-28">
                  <Input
                    type="number"
                    min="1"
                    placeholder="כמות"
                    value={row.quantity}
                    ref={keys.quantityRef(i)}
                    onChange={(e) => updateRow(i, "quantity", e.target.value)}
                    onKeyDown={(e) => keys.onQuantityKeyDown(e, i)}
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
                    onKeyDown={(e) => keys.onRowEnter(e, i)}
                  />
                  {/* מחיר ידני בהצעה נשמר גם במחירון, כמו בתעודה */}
                  <ExpectedPrice known={expectedFor(row.sku)} typed={row.unitPrice} />
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

            <p className="text-xs text-gray-500 mt-1">
              הקלדה רצופה: בחירת מוצר מעבירה לשדה הכמות, ו-Enter שם פותח את השורה הבאה.
            </p>

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
                    {saving ? "שומר..." : editing ? "שמור שינויים" : "הפק הצעת מחיר"}
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
                          to={{ pathname: `/quote/${q._id}`, state: { from: location.pathname + location.search } }}
                          className="text-blue-600 hover:underline flex items-center gap-1 text-sm"
                        >
                          מסמך <FiPrinter />
                        </Link>

                        {/* הצעה שהופקה ממנה תעודה נעולה לעריכה — התעודה
                            נושאת את השורות כפי שהיו */}
                        {!q.convertedNote && (
                          <button
                            onClick={() => startEdit(q)}
                            disabled={working === q._id}
                            className="text-sm text-gray-600 dark:text-gray-300 hover:underline flex items-center gap-1 disabled:opacity-40"
                            title="תיקון שורות, כמויות ומחירים בהצעה"
                          >
                            <FiEdit2 /> עריכה
                          </button>
                        )}

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
            <ListPager
              totalResults={total}
              resultsPerPage={LIMIT}
              page={page}
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
