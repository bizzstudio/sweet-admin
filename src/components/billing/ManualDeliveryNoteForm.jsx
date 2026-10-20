// src/components/billing/ManualDeliveryNoteForm.jsx
//
// טופס תעודת משלוח ידנית — הסחורה שנשקלת (פירות וירקות).
//
// ההזמנה נקלטת עם המשקל שהלקוח *ביקש*, אבל מה שנמסר נקבע על המאזניים ביום
// האריזה. הטופס הזה הוא הנקודה שבה המשקל האמיתי נכנס למערכת: הכמות שמוקלדת
// כאן היא זו שתגיע לחשבונית בסוף החודש.
//
// לכן המשקל שהוזמן מוצג לצד שדה הקלט ולא *בתוכו* בלבד: מי שמקליד צריך
// לראות במה הוא שינה. שדה שרק אותחל לערך המוזמן היה נראה זהה בין "נשקל
// בדיוק כמו שהוזמן" לבין "עוד לא נגעתי בו".
//
// כשמגיעים מהזמנה, השורות נטענות מראש (pending-manual) ורק מה שעדיין לא
// הוקלד בתעודה קודמת מוצע. כשמפיקים תעודה עצמאית בוחרים לקוח ובונים שורות
// מאפס — משלוח פירות שאין מולו הזמנה במערכת.
//
// asInvoice — "חשבונית חדשה" ממסך החשבוניות. אותו טופס בדיוק, והשרת יוצר
// את התעודה ומחייב אותה מיד (billNow). חשבונית נבנית תמיד מתעודה, ולכן אין
// כאן מסלול שני שעוקף את הגנת החיוב הכפול.
//
// draftId — הטופס שומר את עצמו כטיוטה בכל שינוי (utils/noteDrafts), כדי
// שאפשר יהיה להשהות אותו, לעבור לתעודה אחרת ולחזור. רק לטופס עצמאי: טופס
// של הזמנה נטען ממילא מחדש מההזמנה.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
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
import { FiAlertTriangle, FiClock, FiPlus, FiTrash2 } from "react-icons/fi";

import ProductPicker from "@/components/billing/ProductPicker";
import CatalogScopeToggle from "@/components/billing/CatalogScopeToggle";
import CustomerPicker from "@/components/billing/CustomerPicker";
import ExpectedPrice, { isPriceListSource, useExpectedPrices } from "@/components/billing/ExpectedPrice";
import BarcodeInput from "@/components/billing/BarcodeInput";
import CustomerHistoryWindow from "@/components/customer/CustomerHistoryWindow";
import BillingServices from "@/services/BillingServices";
import CustomerPriceListServices from "@/services/CustomerPriceListServices";
import useCustomerKnownSkus from "@/hooks/useCustomerKnownSkus";
import { notifyError, notifySuccess } from "@/utils/toast";
import { deleteDraft, loadDraft, saveDraft } from "@/utils/noteDrafts";

import TableHeaderCell from "@/components/table/TableHeaderCell";
const SOURCE_LABELS = {
  groupPriceList: { text: "מחירון קבוצתי", cls: "text-green-600" },
  customerPriceList: { text: "מחירון הלקוח", cls: "text-green-600" },
  catalog: { text: "מחיר קטלוג", cls: "text-yellow-600" },
  missing: { text: "אין מחיר!", cls: "text-red-600 font-semibold" },
};


const shekel = (n) =>
  Number(n || 0).toLocaleString("he-IL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// YYYY-MM-DD לפי שעון ישראל, לשדה התאריך. toISOString היה מחזיר את היום
// הקודם אחרי חצות UTC — כלומר תעודה שהוקלדה ב-1 בחודש בשעה 01:00 הייתה
// נופלת לחודש החיוב הקודם.
const todayInIsrael = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });

// מפתח נגד שליחה כפולה. randomUUID אינו זמין בהקשר לא מאובטח (http בלי
// TLS), ושם הפאנל עדיין צריך לעבוד
const newKey = () =>
  globalThis.crypto?.randomUUID?.() ||
  `dn-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

// סורק ברקוד "מקליד" תו כל כמה אלפיות שנייה; אדם אינו מקליד ארבעה תווים
// ברצף בקצב כזה
const SCAN_GAP_MS = 35;
const SCAN_MIN_CHARS = 4;

// מחיר שהוקלד בשורה נשמר תמיד גם במחירון, בלי בחירה (בקשת המנהל,
// 13/10/2026: "לתמיד, אפשר לשנות במחירון אחר כך"). מוצר שמתומחר מהמחירון
// הקבוצתי מתעדכן שם, לכל לקוחות הקבוצה; כל השאר במחירון הפרטי של הלקוח
const emptyRow = () => ({ sku: "", quantity: "", ordered: null, name: "", unitPrice: "" });

// שדה הלקוח בהזמנה מגיע לפעמים כמזהה ולפעמים כאובייקט מאוכלס, תלוי במסך
// שקרא. שליחת אובייקט לשרת הייתה נכשלת על "מזהה לקוח לא תקין"
const customerIdOf = (value) =>
  value && typeof value === "object" ? String(value._id || "") : value ? String(value) : "";


/**
 * @param {string}   [orderId]      - הזמנה שממנה נטענות השורות הממתינות
 * @param {string}   [customerId]   - לקוח קבוע מראש (כשמגיעים מהזמנה)
 * @param {boolean}  [asInvoice]    - להפיק חשבונית מס מיד, ולא רק תעודה
 * @param {string}   [draftId]      - הטיוטה שהטופס נטען ממנה ונשמר אליה
 * @param {function} onCreated      - נקרא עם התעודה שנוצרה
 * @param {function} onCancel
 * @param {function} [onPause]      - סגירה שמשאירה את הטיוטה להמשך
 */
const ManualDeliveryNoteForm = ({
  orderId,
  customerId: rawFixedCustomer,
  asInvoice = false,
  draftId,
  onCreated,
  onCancel,
  onPause,
}) => {
  const fixedCustomer = customerIdOf(rawFixedCustomer);
  // טיוטה רק לטופס עצמאי (ראו הערת הקובץ)
  const draftKey = orderId ? null : draftId || null;
  const [draft] = useState(() => loadDraft(draftKey));

  const [customerId, setCustomerId] = useState(draft?.customerId || fixedCustomer);
  const [rows, setRows] = useState(draft?.rows?.length ? draft.rows : [emptyRow()]);
  const [manualReference, setManualReference] = useState(draft?.manualReference || "");
  const [issuedAt, setIssuedAt] = useState(draft?.issuedAt || todayInIsrael());
  const [notes, setNotes] = useState(draft?.notes || "");
  const [shippingCost, setShippingCost] = useState(draft?.shippingCost ?? 0);
  const [discount, setDiscount] = useState(draft?.discount ?? 0);

  const [priced, setPriced] = useState(null);
  // asInvoice: התעודה נוצרה והחיוב נכשל. מכאן הטופס נעול — שליחה חוזרת שלו
  // הייתה מחייבת את התעודה הקיימת עם השורות הישנות גם אם בינתיים תוקנו
  const [unbilledNote, setUnbilledNote] = useState(null);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [saving, setSaving] = useState(false);
  // נשמר גם בטיוטה: תעודה שנשלחה, התשובה אבדה והטיוטה נפתחה שוב — השליחה
  // החוזרת מחזירה את אותה תעודה ולא יוצרת שנייה
  const [idempotencyKey, setIdempotencyKey] = useState(() => draft?.idempotencyKey || newKey());

  // הבורר מציג רק מוצרים שהלקוח הנבחר קנה בעבר או שבמחירון שלו, ולא את כל
  // הקטלוג שרובו מוצרים של לקוחות אחרים. ללקוח בלי היסטוריה ובלי מחירון
  // (null) מוצג הקטלוג כולו. "כל הקטלוג" נשאר זמין: מוצר שנמכר ללקוח בפעם
  // הראשונה עוד אינו באף אחד מהם
  //
  // historyVersion: היסטוריה שהועלתה או הוסרה מחלון ההיסטוריה משנה את
  // הרשימה הזו, והבורר צריך לקבל אותה בלי לבחור את הלקוח מחדש
  const [historyVersion, setHistoryVersion] = useState(0);
  const knownSkus = useCustomerKnownSkus(customerId, historyVersion);
  const [wholeCatalog, setWholeCatalog] = useState(false);
  const pickerSkus = wholeCatalog ? null : knownSkus;

  // חלון ההיסטוריה של הלקוח. null — עוד לא נפתח, ואז אינו מורכב כלל
  const [historyOpen, setHistoryOpen] = useState(null);

  // טעינת השורות הממתינות מההזמנה
  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;

    setLoading(true);
    BillingServices.getPendingManualItems(orderId)
      .then((res) => {
        if (cancelled) return;

        // הלקוח נגזר מההזמנה ולא מהמסך. הוא נחוץ כאן כדי שאפשר יהיה לתמחר
        // לפני ההפקה — השרת גוזר אותו בעצמו ממילא, אבל "חשב מחירים" צריך
        // לדעת למי לתמחר
        if (res.order?.user) setCustomerId(String(res.order.user));

        const items = res.items || [];
        setRows(
          items.length
            ? items.map((i) => ({
                sku: String(i.sku || ""),
                // הכמות מאותחלת למשקל שהוזמן — זו נקודת ההתחלה הסבירה
                // ביותר, ובדרך כלל צריך רק לתקן אותה
                quantity: String(i.quantity),
                ordered: i.quantity,
                name: i.name,
                unitPrice: "",
              }))
            : [emptyRow()]
        );

        // דמי המשלוח וההנחה מגיעים מהשרת כשארית: הוא מחזיר 0 כשתעודה
        // אוטומטית כבר נושאת אותם, ואת הסכום המלא כשההזמנה כולה נשקלת.
        // בלי זה ההנחה שניתנה על הפירות הייתה נעלמת והלקוח היה משלם מלא
        setShippingCost(res.shippingCost || 0);
        setDiscount(res.remainingDiscount || 0);
      })
      .catch((err) => {
        if (!cancelled) notifyError(err?.response?.data?.message || err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  // ── שמירה אוטומטית כטיוטה ──
  //
  // finished: אחרי הפקה הטיוטה נמחקת, ועדכון state שמגיע אחריה (מפתח חדש)
  // אסור שיחזיר אותה לרשימה
  const finished = useRef(false);
  const hasContent = Boolean(
    (!fixedCustomer && customerId) || rows.some((r) => r.sku?.trim()) || notes.trim() || manualReference.trim()
  );

  useEffect(() => {
    if (!draftKey || finished.current) return;
    if (!hasContent) {
      deleteDraft(draftKey);
      return;
    }
    saveDraft({
      id: draftKey,
      kind: asInvoice ? "invoice" : "note",
      customerId,
      rows: rows.map(({ sku, quantity, ordered, name, unitPrice }) => ({ sku, quantity, ordered, name, unitPrice })),
      manualReference,
      issuedAt,
      notes,
      shippingCost,
      discount,
      idempotencyKey,
    });
  }, [draftKey, asInvoice, hasContent, customerId, rows, manualReference, issuedAt, notes, shippingCost, discount, idempotencyKey]);

  const finishDraft = () => {
    finished.current = true;
    if (draftKey) deleteDraft(draftKey);
  };

  // "ביטול" מוחק את מה שהוקלד; מי שרוצה לחזור לזה משהה במקום
  const discard = () => {
    if (
      draftKey &&
      hasContent &&
      !window.confirm(
        `לבטל את ${asInvoice ? "החשבונית" : "התעודה"}? מה שהוקלד יימחק.\n\n` +
          "כדי לחזור אליה אחר כך יש ללחוץ \"השהה\"."
      )
    ) {
      return;
    }
    finishDraft();
    onCancel?.();
  };

  // המחיר השמור מוצג בשורה, בלי לחכות ל"חשב מחירים" (ראו ExpectedPrice)
  const { expectedFor, remember: rememberExpected } = useExpectedPrices(customerId, rows);

  const updateRow = (index, field, value) => {
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== index) return r;
        const next = { ...r, [field]: value };
        // מוצר שהוחלף בשורה: המחיר שבשדה הוקלד למוצר הקודם. הוא נמחק, אחרת
        // היה נכנס גם לתעודה וגם למחירון של המוצר החדש בלי שאיש הקליד אותו
        if (field === "sku" && r.sku?.trim() && value !== r.sku) next.unitPrice = "";
        // מוצר שנבחר בשורה בלי כמות מקבל 1 (בקשת הלקוחה, 19/10/2026). הערך
        // מסומן כשהמיקוד עובר לשדה, ולכן הקלדה מחליפה אותו
        if (field === "sku" && value && String(r.quantity ?? "").trim() === "") next.quantity = "1";
        return next;
      })
    );
    // כל שינוי מבטל את התמחור שהוצג: מחיר שנשאר על המסך אחרי ששונתה
    // הכמות הוא בדיוק המספר שמישהו יאשר בלי לשים לב
    setPriced(null);
  };

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);

  // ── הקלדה רצופה בלי עכבר ──
  //
  // בחירת מוצר מעבירה את המיקוד לשדה המשקל, ו-Enter שם עובר לשורה הבאה
  // (ופותח חדשה אם זו האחרונה). בלי זה כל שורה דרשה שתי נגיעות בעכבר: אחת
  // לשדה המשקל ואחת לכפתור "שורה" (05/10/2026).
  //
  // המיקוד עובר דרך state ו-effect ולא ישירות: השדה של שורה שזה עתה נוספה
  // עוד לא קיים ברגע הלחיצה.
  const pickerRefs = useRef([]);
  const quantityRefs = useRef([]);
  const [focusTarget, setFocusTarget] = useState(null);

  useEffect(() => {
    if (!focusTarget) return;
    const refs = focusTarget.field === "sku" ? pickerRefs : quantityRefs;
    const el = refs.current[focusTarget.row];
    el?.focus?.();
    // הערך הקיים מסומן, כדי שהקלדה תחליף את המשקל שהוזמן ולא תתווסף אליו
    if (focusTarget.field === "quantity") el?.select?.();
  }, [focusTarget]);

  const pickProduct = (index, sku) => {
    updateRow(index, "sku", sku);
    // ניקוי הבחירה (X) אינו סיבה לקפוץ לשדה המשקל
    if (sku) setFocusTarget({ row: index, field: "quantity" });
  };

  // ── סריקת ברקוד שנחתה בשדה המשקל ──
  //
  // מי שסורק בתוך בורר המוצר (ולא בשדה הברקוד) מקבל את הסמן בשדה המשקל,
  // והסריקה הבאה הייתה נכנסת לשם: ברקוד 1071 היה הופך ל-1071 ק"ג בתעודה
  // ופותח שורה. רצף תווים בקצב של סורק שמסתיים ב-Enter נמחק ואינו מתקדם.
  const burst = useRef({ row: -1, count: 0, last: 0 });

  const onQuantityKeyDown = (e, index) => {
    const b = burst.current;
    const fast = b.row === index && e.timeStamp - b.last < SCAN_GAP_MS;

    if (e.key === "Enter") {
      const scanned = fast && b.count >= SCAN_MIN_CHARS;
      burst.current = { row: -1, count: 0, last: 0 };
      if (scanned) {
        e.preventDefault();
        updateRow(index, "quantity", "");
        return notifyError(
          `נראה שנסרק ברקוד בשדה ${asInvoice ? "הכמות" : "המשקל"} — הערך נמחק. לסריקה יש להשתמש בשדה "הקלדת ברקוד"`
        );
      }
      return onRowEnter(e, index);
    }

    if (e.key.length !== 1) return;
    // מקש שנשאר לחוץ חוזר באותו קצב כמו סורק, ואינו סריקה
    burst.current = { row: index, count: fast && !e.repeat ? b.count + 1 : 1, last: e.timeStamp };
  };

  const onRowEnter = (e, index) => {
    // repeat: Enter שנשאר לחוץ מבחירת המוצר לא ידלג הלאה על שדה המשקל
    if (e.key !== "Enter" || e.repeat) return;
    e.preventDefault();

    if (index < rows.length - 1) {
      // שורה שכבר נושאת מוצר (נטענה מההזמנה) — ישר למשקל שלה
      const next = rows[index + 1];
      return setFocusTarget({ row: index + 1, field: next.sku?.trim() ? "quantity" : "sku" });
    }

    // שורה אחרונה שעוד לא מולאה: Enter נוסף לא יערום שורות ריקות מתחתיה
    const row = rows[index];
    if (!row.sku?.trim() || !(Number(row.quantity) > 0)) return;
    addRow();
    setFocusTarget({ row: index + 1, field: "sku" });
  };
  // שורה שנשכחה באמצע: נכנסת מעל השורה שנלחצה, כדי שסדר התעודה יישמר.
  // הכפתור שבתחתית ממשיך להוסיף בסוף
  const insertRow = (index) =>
    setRows((prev) => [...prev.slice(0, index), emptyRow(), ...prev.slice(index)]);
  const removeRow = (index) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
    setPriced(null);
  };

  /**
   * הוספת שורה מסריקת ברקוד.
   *
   * ממלא שורה ריקה קיימת לפני שהוא מוסיף חדשה — הטופס נפתח עם שורה ריקה
   * אחת, ובלי זה הסריקה הראשונה הייתה משאירה אותה תלויה מתחת.
   *
   * מק"ט שכבר נמצא בטופס מקבל אזהרה ולא שורה שנייה: השרת חוסם ממילא שתי
   * שורות לאותו מק"ט, ועדיף שזה ייאמר בסריקה ולא בהפקה.
   */
  const addByBarcode = (product) => {
    if (!product?.sku) return;

    setPriced(null);
    setRows((prev) => {
      if (prev.some((r) => String(r.sku) === String(product.sku))) {
        notifyError(`${product.name} כבר נמצא בטופס`);
        return prev;
      }

      const filled = { sku: String(product.sku), quantity: "1", ordered: null, name: product.name, unitPrice: "" };
      const emptyIndex = prev.findIndex((r) => !r.sku?.trim());
      if (emptyIndex === -1) return [...prev, filled];
      return prev.map((r, i) => (i === emptyIndex ? filled : r));
    });
  };

  const validRows = useMemo(
    () => rows.filter((r) => r.sku?.trim() && Number(r.quantity) > 0),
    [rows]
  );

  const payloadItems = useCallback(
    () =>
      validRows.map((r) => ({
        sku: r.sku.trim(),
        quantity: Number(r.quantity),
        unitPrice: r.unitPrice === "" ? undefined : Number(r.unitPrice),
      })),
    [validRows]
  );

  const doPrice = async () => {
    if (!customerId) return notifyError("יש לבחור לקוח");
    if (!validRows.length) return notifyError(noRowsMessage);

    // מחושב פעם אחת: payloadItems בונה מערך חדש בכל קריאה, וקריאה בתוך
    // ה-map הייתה בונה אותו מחדש לכל שורה
    const sent = payloadItems();

    try {
      const res = await BillingServices.priceItems({
        customer: customerId,
        items: sent.map(({ sku, quantity }) => ({ sku, quantity })),
      });

      // מחיר ידני שהוזן בשורה גובר על מה שהשרת החזיר, כדי שהתצוגה תשקף את
      // מה שבאמת ייווצר
      const items = (res.items || []).map((item, i) => {
        const override = sent[i]?.unitPrice;
        if (override === undefined || !Number.isFinite(override)) return item;
        return {
          ...item,
          unitPrice: override,
          lineTotal: Number((override * item.quantity).toFixed(2)),
          source: "manual",
        };
      });

      // quality מחושב בשרת על המחירים שהוא מצא, ולכן אינו יודע על מחיר ידני
      // שהוזן בשורה. בלי החישוב מחדש כאן, שורה שתוקנה ביד הייתה ממשיכה
      // לחסום את כפתור ההפקה
      setPriced({
        ...res,
        items,
        quality: { ...res.quality, hasMissing: items.some((i) => i.source === "missing") },
      });
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    }
  };

  // מחירים ידניים נכתבים תמיד גם למחירון. השרת מכריע לכל מוצר אם זה
  // המחירון הקבוצתי או הפרטי (applyToGroup). כישלון כאן
  // אינו מבטל את התעודה שכבר הופקה — רק אומר במפורש שהמחירון לא עודכן
  const savePricesToPriceList = async (targetCustomer) => {
    const items = validRows
      .filter((r) => Number(r.unitPrice) > 0)
      .filter((r) => {
        const known = expectedFor(r.sku);
        // מחיר שזהה למה שכבר במחירון — אין מה לשמור
        return !(isPriceListSource(known?.source) && known.unitPrice === Number(r.unitPrice));
      })
      .map((r) => ({ sku: r.sku.trim(), price: Number(r.unitPrice) }));
    if (!items.length || !targetCustomer) return;

    try {
      const res = await CustomerPriceListServices.upsertItems(customerIdOf(targetCustomer), {
        items,
        applyToGroup: true,
      });
      notifySuccess(res.message);

      // הטופס נשאר פתוח לתעודה הבאה של אותו לקוח, והמחיר שמוצג מתחת לשדה
      // (ולפיו מדלגים על מחיר "שכבר במחירון") חייב להיות זה שנשמר עכשיו
      const toGroup = new Set(res?.groupSkus || []);
      const savedFor = customerIdOf(targetCustomer);
      const bySku = {};
      for (const { sku, price } of items) {
        bySku[sku] = {
          unitPrice: price,
          source: toGroup.has(sku) ? "groupPriceList" : "customerPriceList",
        };
      }
      rememberExpected(savedFor, bySku);
    } catch (err) {
      notifyError(
        `התעודה הופקה, אבל המחיר לא נשמר במחירון: ${err?.response?.data?.message || err.message}`
      );
    }
  };

  const doCreate = async () => {
    // כשהתעודה קשורה להזמנה השרת גוזר את הלקוח ממנה, ולכן אין צורך בבחירה
    if (!customerId && !orderId) return notifyError("יש לבחור לקוח");
    if (!validRows.length) return notifyError(noRowsMessage);
    if (
      asInvoice &&
      !window.confirm(
        "להפיק חשבונית מס ללקוח?\n\n" +
          (priced
            ? `סה"כ לפני מע"מ: ${shekel(noteTotal)} ₪\n\n`
            : "המחירים ייקבעו לפי מחירון הלקוח — כדי לראות סכום לפני ההפקה, לחצו \"חשב מחירים\".\n\n") +
          "חשבונית מס נרשמת בספרים ואי אפשר למחוק אותה — רק להוציא זיכוי."
      )
    ) {
      return;
    }

    setSaving(true);
    try {
      const res = await BillingServices.createManualDeliveryNote({
        customer: customerId,
        order: orderId || undefined,
        items: payloadItems(),
        manualReference: manualReference.trim() || undefined,
        issuedAt,
        notes: notes.trim() || undefined,
        shippingCost: Number(shippingCost) || 0,
        discount: Number(discount) || 0,
        idempotencyKey,
        billNow: asInvoice || undefined,
      });

      notifySuccess(res.message);
      finishDraft();
      // אחרי ההפקה ולא לפניה: מחיר שנשמר למחירון כשההפקה נכשלה היה משנה
      // ללקוח את המחיר בלי שום תעודה שמסבירה למה
      await savePricesToPriceList(res.note?.customer || customerId);
      // מפתח חדש לטופס הבא, אחרת תעודה שנייה לאותו לקוח הייתה חוזרת עם
      // התעודה הראשונה במקום להיווצר
      setIdempotencyKey(newKey());
      onCreated?.(res.note);
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);

      // השרת מחזיר note רק כשהתעודה נוצרה והחשבונית לא. הניסיון החוזר
      // מחייב את התעודה הזו בדיוק (billDeliveryNote), והמפתח מתחדש כדי
      // שאף שליחה של הטופס לא תיפול עליה בטעות
      const created = err?.response?.data?.note;
      if (asInvoice && created?._id) {
        // השורות כבר בתעודה שנוצרה; טיוטה שלהן הייתה מפיקה אותן פעמיים
        finishDraft();
        setUnbilledNote(created);
        setIdempotencyKey(newKey());
        await savePricesToPriceList(created.customer || customerId);
      }
    } finally {
      setSaving(false);
    }
  };

  const retryBill = async () => {
    setSaving(true);
    try {
      const res = await BillingServices.billDeliveryNote(unbilledNote._id);
      notifySuccess(res.message);
      const note = unbilledNote;
      setUnbilledNote(null);
      onCreated?.(note);
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const noRowsMessage = asInvoice
    ? "יש להזין לפחות שורה אחת עם כמות"
    : "יש להזין לפחות שורה אחת עם משקל";

  const createLabel = saving ? "מפיק..." : asInvoice ? "הפק חשבונית מס" : "הפק תעודת משלוח";

  const pricedTotal = (priced?.items || []).reduce((s, i) => s + i.lineTotal, 0);
  const noteTotal = pricedTotal + (Number(shippingCost) || 0) - (Number(discount) || 0);
  // השרת דוחה הנחה שגדולה מסכום התעודה. עדיף לחסום כאן מאשר לתת למשתמשת
  // למלא טופס שלם ולקבל שגיאה בהפקה
  const discountTooBig = priced && noteTotal < 0;

  if (unbilledNote) {
    return (
      <Card className="min-w-0 shadow-xs bg-white dark:bg-gray-800 my-5 border-r-4 border-red-500">
        <CardBody>
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <FiAlertTriangle className="text-red-600" /> החשבונית לא הופקה
          </h3>
          <p className="text-sm mt-2">
            תעודת משלוח {unbilledNote.number} נוצרה, אבל הפקת החשבונית ב-iCount
            נכשלה. התעודה פתוחה ותחויב בסגירת החודש אם לא תופק עכשיו.
          </p>
          <p className="text-sm text-gray-500 mt-1">
            לתיקון שורות או מחירים — יש לערוך את התעודה במסך תעודות משלוח,
            ולהפיק ממנה חשבונית שם.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            {onCancel && (
              <Button layout="outline" onClick={onCancel} disabled={saving}>
                סגירה
              </Button>
            )}
            <Button onClick={retryBill} disabled={saving}>
              {saving ? "מפיק..." : "נסה שוב להפיק חשבונית"}
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="min-w-0 shadow-xs bg-white dark:bg-gray-800 my-5">
        <CardBody>
          <p className="text-sm text-gray-500">טוען את השורות הנשקלות...</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="min-w-0 shadow-xs bg-white dark:bg-gray-800 my-5 border-r-4 border-green-500">
      <CardBody>
        {historyOpen !== null && (
          <CustomerHistoryWindow
            isOpen={historyOpen}
            onClose={() => setHistoryOpen(false)}
            customerId={customerId}
            onChanged={() => setHistoryVersion((v) => v + 1)}
          />
        )}

        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-lg">
              {asInvoice ? "חשבונית מס חדשה" : "תעודת משלוח ידנית"}
            </h3>
            <p className="text-sm text-gray-500">
              {asInvoice
                ? "החשבונית מופקת ב-iCount מיד ונשלחת במייל ללקוח (אם יש בכרטיס שלו כתובת מייל אמיתית). במערכת תיווצר גם תעודת משלוח שעליה היא מבוססת."
                : "הכמות שתוקלד כאן היא המשקל שנשקל בפועל, והיא זו שתחויב בחשבונית בסוף החודש."}
            </p>
          </div>

          {/* בכותרת ולא ליד בורר הלקוח: כשמגיעים מהזמנה הבורר אינו מוצג,
              וההיסטוריה נחוצה גם שם */}
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

        <div className="flex flex-wrap gap-4 mb-5">
          {/* הבורר נטען רק לתעודה עצמאית: כשהלקוח נקבע מההזמנה אין טעם
              למשוך את כל רשימת הלקוחות רק כדי להציג שם אחד */}
          {!fixedCustomer && (
            <Label className="flex-1 min-w-[240px]">
              <span>לקוח</span>
              <CustomerPicker
                className="mt-1"
                value={customerId}
                onChange={(id) => {
                  setCustomerId(id);
                  setPriced(null);
                  setWholeCatalog(false);
                }}
              />
            </Label>
          )}

          <Label className="w-48">
            <span>{asInvoice ? "תאריך האספקה" : "תאריך המסירה"}</span>
            <Input
              className="mt-1"
              type="date"
              value={issuedAt}
              onChange={(e) => setIssuedAt(e.target.value)}
            />
          </Label>

          <Label className="w-48">
            <span>מספר תעודה בפנקס</span>
            <Input
              className="mt-1"
              value={manualReference}
              onChange={(e) => setManualReference(e.target.value)}
              placeholder="אופציונלי"
            />
          </Label>

          {/* משלוח והנחה אינם משנים את מחירי השורות, ולכן אינם מאפסים את
              טבלת התמחור — הסכום הכולל מחושב מהם ישירות */}
          <Label className="w-36">
            <span>דמי משלוח</span>
            <Input
              className="mt-1"
              type="number"
              min="0"
              step="0.01"
              value={shippingCost}
              onChange={(e) => setShippingCost(e.target.value)}
            />
          </Label>

          <Label className="w-36">
            <span>הנחה</span>
            <Input
              className="mt-1"
              type="number"
              min="0"
              step="0.01"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
            />
          </Label>
        </div>

        <p className="text-xs text-gray-500 mb-3">
          {asInvoice
            ? "תאריך החשבונית ב-iCount הוא היום. התאריך כאן הוא תאריך האספקה שיופיע על התעודה."
            : "התאריך קובע לאיזה חודש התעודה תיכנס בחיוב. תעודה שהוקלדה באיחור — יש לתארך אותה ליום המסירה בפועל."}
        </p>

        {/* הדרך המהירה למלא את הטופס: סורקים או מקלידים ברקוד, והשורה
            נוספת. הבורר למטה נשאר למי שמחפש לפי שם */}
        <div className="mb-4 max-w-sm">
          <BarcodeInput
            onPick={addByBarcode}
            hint="סריקה או הקלדה של הברקוד ואז Enter — השורה תתווסף למטה"
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2">
          <p className="text-sm font-medium">שורות</p>
          <CatalogScopeToggle
            knownSkus={knownSkus}
            wholeCatalog={wholeCatalog}
            onChange={setWholeCatalog}
          />
        </div>
        {rows.map((row, i) => (
          // items-start: הרמז שמתחת לשדה המחיר מגביה רק את העמודה שלו, ויישור
          // למרכז היה מזיז את שדה המחיר ביחס לשדות שלצידו
          <div key={i} className="flex flex-wrap gap-2 mb-2 items-start">
            <div className="flex-1 min-w-[220px]">
              <ProductPicker
                value={row.sku}
                onChange={(sku) => pickProduct(i, sku)}
                onlySkus={pickerSkus}
                selectRef={(el) => (pickerRefs.current[i] = el)}
              />
              {/* שורה שנטענה מההזמנה בלי מק"ט — הבורר עובד על מק"טים, ולכן
                  היא מגיעה ריקה. בלי השם המקורי אי אפשר לדעת מה לבחור */}
              {!row.sku && row.name && (
                <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-500">
                  מההזמנה: {row.name} — יש לבחור את המוצר מהקטלוג
                </p>
              )}
            </div>

            <div className="w-32">
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder={asInvoice ? "כמות" : "משקל בפועל"}
                value={row.quantity}
                ref={(el) => (quantityRefs.current[i] = el)}
                onChange={(e) => updateRow(i, "quantity", e.target.value)}
                onKeyDown={(e) => onQuantityKeyDown(e, i)}
              />
            </div>

            <div className="w-28">
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="מחיר יח'"
                value={row.unitPrice}
                onChange={(e) => updateRow(i, "unitPrice", e.target.value)}
                onKeyDown={(e) => onRowEnter(e, i)}
              />
              <ExpectedPrice known={expectedFor(row.sku)} typed={row.unitPrice} />
            </div>

            {/* מוצר שמתומחר מהמחירון הקבוצתי: המחיר החדש נשמר שם, ולכן משנה
                את המחיר לכל לקוחות הקבוצה ולא רק ללקוח שבתעודה */}
            {Number(row.unitPrice) > 0 &&
              row.sku &&
              expectedFor(row.sku)?.source === "groupPriceList" &&
              Number(row.unitPrice) !== expectedFor(row.sku).unitPrice && (
                <span className="py-2 text-xs text-yellow-700 dark:text-yellow-500 shrink-0">
                  ישתנה במחירון הקבוצתי — לכל לקוחות הקבוצה
                </span>
              )}

            {/* המשקל שהוזמן, כדי שיהיה ברור במה השורה שונה ממה שהלקוח ביקש */}
            <span className="py-2 text-xs text-gray-500 w-28 shrink-0">
              {row.ordered != null ? (
                Number(row.quantity) !== Number(row.ordered) ? (
                  <span className="text-yellow-700 dark:text-yellow-500">
                    הוזמן {row.ordered}
                  </span>
                ) : (
                  <>הוזמן {row.ordered}</>
                )
              ) : null}
            </span>

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
              title="הסרת שורה"
            >
              <FiTrash2 />
            </button>
          </div>
        ))}

        <p className="text-xs text-gray-500 mt-1">
          הקלדה רצופה: בחירת מוצר מעבירה לשדה {asInvoice ? "הכמות" : "המשקל"}, ו-Enter
          שם פותח את השורה הבאה.
        </p>
        <p className="text-xs text-gray-500 mt-1">
          מחיר יח' ריק — נלקח ממחירון הלקוח, ובהיעדרו ממחיר הקטלוג; המחיר
          שיחול מופיע מתחת לשדה. מחיר שהוקלד נשמר גם במחירון עם הפקת התעודה
          ויתפוס בפעם הבאה — במחירון הקבוצתי אם המוצר מתומחר ממנו (לכל לקוחות
          הקבוצה), אחרת במחירון הלקוח. אפשר לשנות אותו אחר כך במחירון.
        </p>

        <div className="flex flex-wrap gap-3 mt-4">
          <Button size="small" layout="outline" onClick={addRow}>
            <FiPlus className="ml-1" /> שורה
          </Button>
          <Button size="small" layout="outline" onClick={doPrice}>
            חשב מחירים
          </Button>
        </div>

        <Label className="mt-4">
          <span>
            {asInvoice
              ? "הערה לחשבונית (למשל עבור מי, באישור מי)"
              : "הערות (מופיעות על התעודה ועל החשבונית)"}
          </span>
          <Input
            className="mt-1"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Label>

        {priced && (
          <div className="mt-5">
            <TableContainer>
              <Table className="w-full whitespace-nowrap">
                <TableHeader>
                  <tr>
                    {/* הברקוד לצד השם — זה המזהה שיודפס על התעודה,
                        וכך אפשר להצליב עוד לפני ההפקה */}
                    <TableHeaderCell>ברקוד</TableHeaderCell>
                    <TableHeaderCell>מוצר</TableHeaderCell>
                    <TableHeaderCell className="text-center">משקל</TableHeaderCell>
                    <TableHeaderCell className="text-left">מחיר יח'</TableHeaderCell>
                    <TableHeaderCell className="text-left">סה"כ</TableHeaderCell>
                    <TableHeaderCell>מקור המחיר</TableHeaderCell>
                  </tr>
                </TableHeader>
                <TableBody>
                  {priced.items.map((item, i) => {
                    const src =
                      item.source === "manual"
                        ? { text: "ידני", cls: "text-blue-600" }
                        : SOURCE_LABELS[item.source] || SOURCE_LABELS.catalog;
                    return (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">
                          {item.barcode || item.sku || "—"}
                        </TableCell>
                        <TableCell>{item.name}</TableCell>
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

            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <div className="text-sm">
                <p>
                  סה"כ לפני מע"מ:{" "}
                  <span className="font-semibold text-lg">
                    {shekel(noteTotal)} ₪
                  </span>
                </p>
                {(Number(shippingCost) > 0 || Number(discount) > 0) && (
                  <p className="text-gray-500 text-xs">
                    שורות {shekel(pricedTotal)} ₪
                    {Number(shippingCost) > 0 && ` · משלוח ${shekel(shippingCost)} ₪`}
                    {Number(discount) > 0 && ` · הנחה ${shekel(discount)} ₪`}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                {onPause && draftKey && (
                  <Button layout="outline" onClick={onPause} disabled={saving} title="הטופס נשמר ואפשר לחזור אליו מרשימת הטיוטות">
                    השהה
                  </Button>
                )}
                {onCancel && (
                  <Button layout="outline" onClick={discard} disabled={saving}>
                    ביטול
                  </Button>
                )}
                <Button
                  onClick={doCreate}
                  disabled={saving || priced.quality?.hasMissing || discountTooBig}
                >
                  {createLabel}
                </Button>
              </div>
            </div>

            {priced.quality?.hasMissing && (
              <p className="mt-3 text-sm text-red-600 flex items-center gap-2">
                <FiAlertTriangle /> יש מוצרים ללא מחיר — יש להזין מחיר יח' ידני
                לפני ההפקה
              </p>
            )}

            {discountTooBig && (
              <p className="mt-3 text-sm text-red-600 flex items-center gap-2">
                <FiAlertTriangle /> ההנחה גדולה מסכום התעודה
              </p>
            )}
          </div>
        )}

        {!priced && (
          <div className="mt-5 flex justify-end gap-2">
            {onPause && draftKey && (
              <Button layout="outline" onClick={onPause} disabled={saving} title="הטופס נשמר ואפשר לחזור אליו מרשימת הטיוטות">
                השהה
              </Button>
            )}
            {onCancel && (
              <Button layout="outline" onClick={discard} disabled={saving}>
                ביטול
              </Button>
            )}
            {/* הפקה בלי תמחור מוקדם מותרת — השרת מתמחר ממילא. הכפתור
                "חשב מחירים" הוא אמצעי בקרה, לא שלב חובה */}
            <Button onClick={doCreate} disabled={saving || !validRows.length}>
              {createLabel}
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default ManualDeliveryNoteForm;
