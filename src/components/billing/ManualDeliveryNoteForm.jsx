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

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
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
  TableHeader,
  TableRow,
} from "@windmill/react-ui";
import { FiAlertTriangle, FiPlus, FiTrash2 } from "react-icons/fi";

import ProductPicker from "@/components/billing/ProductPicker";
import BarcodeInput from "@/components/billing/BarcodeInput";
import BillingServices from "@/services/BillingServices";
import CustomerServices from "@/services/CustomerServices";
import { notifyError, notifySuccess } from "@/utils/toast";

import TableHeaderCell from "@/components/table/TableHeaderCell";
const SOURCE_LABELS = {
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

const emptyRow = () => ({ sku: "", quantity: "", ordered: null, name: "", unitPrice: "" });

// שדה הלקוח בהזמנה מגיע לפעמים כמזהה ולפעמים כאובייקט מאוכלס, תלוי במסך
// שקרא. שליחת אובייקט לשרת הייתה נכשלת על "מזהה לקוח לא תקין"
const customerIdOf = (value) =>
  value && typeof value === "object" ? String(value._id || "") : value ? String(value) : "";

/**
 * @param {string}   [orderId]      - הזמנה שממנה נטענות השורות הממתינות
 * @param {string}   [customerId]   - לקוח קבוע מראש (כשמגיעים מהזמנה)
 * @param {function} onCreated      - נקרא עם התעודה שנוצרה
 * @param {function} onCancel
 */
const ManualDeliveryNoteForm = ({ orderId, customerId: rawFixedCustomer, onCreated, onCancel }) => {
  const fixedCustomer = customerIdOf(rawFixedCustomer);

  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState(fixedCustomer);
  const [rows, setRows] = useState([emptyRow()]);
  const [manualReference, setManualReference] = useState("");
  const [issuedAt, setIssuedAt] = useState(todayInIsrael());
  const [notes, setNotes] = useState("");
  const [shippingCost, setShippingCost] = useState(0);
  const [discount, setDiscount] = useState(0);

  const [priced, setPriced] = useState(null);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [saving, setSaving] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(newKey);

  // רשימת הלקוחות נדרשת רק לתעודה עצמאית. כשהלקוח נקבע מההזמנה אין טעם
  // למשוך 769 רשומות רק כדי להציג שם אחד
  useEffect(() => {
    if (fixedCustomer) return;
    CustomerServices.getAllCustomers({ searchText: "" })
      .then((res) => setCustomers(Array.isArray(res) ? res : res?.customers || []))
      .catch(() => setCustomers([]));
  }, [fixedCustomer]);

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

  const updateRow = (index, field, value) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
    // כל שינוי מבטל את התמחור שהוצג: מחיר שנשאר על המסך אחרי ששונתה
    // הכמות הוא בדיוק המספר שמישהו יאשר בלי לשים לב
    setPriced(null);
  };

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);
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

      const filled = { sku: String(product.sku), quantity: "", ordered: null, name: product.name, unitPrice: "" };
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
    if (!validRows.length) return notifyError("יש להזין לפחות שורה אחת עם משקל");

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

  const doCreate = async () => {
    // כשהתעודה קשורה להזמנה השרת גוזר את הלקוח ממנה, ולכן אין צורך בבחירה
    if (!customerId && !orderId) return notifyError("יש לבחור לקוח");
    if (!validRows.length) return notifyError("יש להזין לפחות שורה אחת עם משקל");

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
      });

      notifySuccess(res.message);
      // מפתח חדש לטופס הבא, אחרת תעודה שנייה לאותו לקוח הייתה חוזרת עם
      // התעודה הראשונה במקום להיווצר
      setIdempotencyKey(newKey());
      onCreated?.(res.note);
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const pricedTotal = (priced?.items || []).reduce((s, i) => s + i.lineTotal, 0);
  const noteTotal = pricedTotal + (Number(shippingCost) || 0) - (Number(discount) || 0);
  // השרת דוחה הנחה שגדולה מסכום התעודה. עדיף לחסום כאן מאשר לתת למשתמשת
  // למלא טופס שלם ולקבל שגיאה בהפקה
  const discountTooBig = priced && noteTotal < 0;

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
        <div className="mb-4">
          <h3 className="font-semibold text-lg">תעודת משלוח ידנית</h3>
          <p className="text-sm text-gray-500">
            הכמות שתוקלד כאן היא המשקל שנשקל בפועל, והיא זו שתחויב בחשבונית
            בסוף החודש.
          </p>
        </div>

        <div className="flex flex-wrap gap-4 mb-5">
          {!fixedCustomer && (
            <Label className="flex-1 min-w-[240px]">
              <span>לקוח</span>
              <Select
                className="mt-1"
                value={customerId}
                onChange={(e) => {
                  setCustomerId(e.target.value);
                  setPriced(null);
                }}
              >
                <option value="">— בחרי לקוח —</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Label>
          )}

          <Label className="w-48">
            <span>תאריך המסירה</span>
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
          התאריך קובע לאיזה חודש התעודה תיכנס בחיוב. תעודה שהוקלדה באיחור —
          יש לתארך אותה ליום המסירה בפועל.
        </p>

        {/* הדרך המהירה למלא את הטופס: סורקים או מקלידים ברקוד, והשורה
            נוספת. הבורר למטה נשאר למי שמחפש לפי שם */}
        <div className="mb-4 max-w-sm">
          <BarcodeInput
            onPick={addByBarcode}
            hint="סריקה או הקלדה של הברקוד ואז Enter — השורה תתווסף למטה"
          />
        </div>

        <p className="text-sm font-medium mb-2">שורות</p>
        {rows.map((row, i) => (
          <div key={i} className="flex flex-wrap gap-2 mb-2 items-center">
            <div className="flex-1 min-w-[220px]">
              <ProductPicker value={row.sku} onChange={(sku) => updateRow(i, "sku", sku)} />
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
                placeholder="משקל בפועל"
                value={row.quantity}
                onChange={(e) => updateRow(i, "quantity", e.target.value)}
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
              />
            </div>

            {/* המשקל שהוזמן, כדי שיהיה ברור במה השורה שונה ממה שהלקוח ביקש */}
            <span className="text-xs text-gray-500 w-28 shrink-0">
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
          מחיר יח' ריק — נלקח ממחירון הלקוח, ובהיעדרו ממחיר הקטלוג.
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
          <span>הערות (מופיעות על התעודה)</span>
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
                {onCancel && (
                  <Button layout="outline" onClick={onCancel} disabled={saving}>
                    ביטול
                  </Button>
                )}
                <Button
                  onClick={doCreate}
                  disabled={saving || priced.quality?.hasMissing || discountTooBig}
                >
                  {saving ? "מפיק..." : "הפק תעודת משלוח"}
                </Button>
              </div>
            </div>

            {priced.quality?.hasMissing && (
              <p className="mt-3 text-sm text-red-600 flex items-center gap-2">
                <FiAlertTriangle /> יש מק"טים ללא מחיר — יש להזין מחיר יח' ידני
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
            {onCancel && (
              <Button layout="outline" onClick={onCancel} disabled={saving}>
                ביטול
              </Button>
            )}
            {/* הפקה בלי תמחור מוקדם מותרת — השרת מתמחר ממילא. הכפתור
                "חשב מחירים" הוא אמצעי בקרה, לא שלב חובה */}
            <Button onClick={doCreate} disabled={saving || !validRows.length}>
              {saving ? "מפיק..." : "הפק תעודת משלוח"}
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default ManualDeliveryNoteForm;
