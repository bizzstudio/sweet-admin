// src/components/billing/DeliveryNoteEditor.jsx
//
// עריכת תעודת משלוח שעדיין לא חויבה.
//
// המקרה: התעודה יצאה, ומתברר שצריך לתקן — כמות שנמסרה בפועל, שורה
// שנוספה, מחיר שסוכם אחרת. עד עכשיו הדרך היחידה הייתה לבטל ולהקליד מחדש,
// כלומר מספר תעודה חדש ללקוח על אותו משלוח.
//
// המחירים נטענים כמו שהם ולא מתומחרים מחדש: התעודה היא צילום מצב, ומחירון
// שהתעדכן בינתיים אינו אמור לשנות משלוח שכבר יצא. שינוי מחיר נעשה ביד.
//
// הכיוון ההפוך כן קיים (13/10/2026): מחיר ששונה כאן נשמר גם במחירון הלקוח,
// כדי שיתפוס בתעודה הבאה. מי שרוצה תיקון חד-פעמי מסירה את הסימון בשורה.
//
// תעודה שחויבה אינה מגיעה לכאן — השרת חוסם אותה, והמסך לא מציג את הכפתור.
// התיקון שם עובר דרך זיכוי, שמחזיר את התעודה למצב פתוח.
//
// ⚠️ תעודה שנערכה מסומנת manuallyEdited, והסנכרון מההזמנה מפסיק לגעת בה.
//    בלי זה עריכה של ההזמנה הייתה מוחקת בשקט את מה שתוקן כאן.

import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  Input,
  Label,
} from "@windmill/react-ui";
import { FiAlertTriangle, FiPlus, FiTrash2 } from "react-icons/fi";

import ProductPicker from "@/components/billing/ProductPicker";
import BarcodeInput from "@/components/billing/BarcodeInput";
import BillingServices from "@/services/BillingServices";
import CustomerPriceListServices from "@/services/CustomerPriceListServices";
import useCustomerKnownSkus from "@/hooks/useCustomerKnownSkus";
import { notifyError, notifySuccess } from "@/utils/toast";

const shekel = (n) =>
  Number(n || 0).toLocaleString("he-IL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const dayValue = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" })
    : new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });

/**
 * @param {object}   note      - התעודה כפי שחזרה מהשרת
 * @param {function} onSaved   - נקרא עם התעודה המעודכנת
 * @param {function} onCancel
 */
const DeliveryNoteEditor = ({ note, onSaved, onCancel }) => {
  const [rows, setRows] = useState(() =>
    (note.items || []).map((i) => ({
      sku: String(i.sku || ""),
      name: i.name,
      barcode: i.barcode || "",
      quantity: String(i.quantity ?? ""),
      unitPrice: String(i.unitPrice ?? ""),
      // המוצר והמחיר כפי שהיו על התעודה — לפיהם נקבע אם המחיר שונה
      originalSku: String(i.sku || ""),
      originalPrice: Number(i.unitPrice),
      savePrice: true,
      // שורה שהגיעה מהתעודה עצמה. ההבחנה נחוצה כדי לא לאבד שורה בשקט:
      // שורת מק"ט ריקה שנוספה עכשיו היא סתם שורה שלא מולאה, אבל שורה
      // *מהתעודה* בלי מק"ט (יכולה להיווצר מהזמנה שנקלטה בלי מק"ט) הייתה
      // נופלת מהסינון ונעלמת מהתעודה בשמירה.
      fromNote: true,
    }))
  );
  const [issuedAt, setIssuedAt] = useState(dayValue(note.issuedAt));
  const [manualReference, setManualReference] = useState(note.manualReference || "");
  const [notes, setNotes] = useState(note.notes || "");
  const [shippingCost, setShippingCost] = useState(String(note.shippingCost ?? 0));

  // ההנחה שבשדה היא זו שהוקלדה, בלי החלק שאחוז ההנחה הקבוע של הלקוח יצר.
  // השרת מוסיף אותו בעצמו, ובלי ההפרדה כל שמירה הייתה מוסיפה אותו שוב.
  const [discount, setDiscount] = useState(
    String(
      Math.max(0, Number((Number(note.discount || 0) - Number(note.customerDiscount || 0)).toFixed(2)))
    )
  );
  const [saving, setSaving] = useState(false);

  // כמו בטופס התעודה הידנית: הבורר מציג רק מוצרים שהלקוח קנה או שבמחירון שלו,
  // ו"כל הקטלוג" פותח את השאר. שדה הלקוח מגיע כמזהה או כאובייקט מאוכלס
  const customerId = String(note.customer?._id || note.customer || "");
  const knownSkus = useCustomerKnownSkus(customerId);
  const [wholeCatalog, setWholeCatalog] = useState(false);
  const pickerSkus = wholeCatalog ? null : knownSkus;

  const updateRow = (index, field, value) =>
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== index) return r;
        const next = { ...r, [field]: value };
        // כמו בטופס הידני: מחיר שנמחק חוזר לברירת המחדל, ומוצר שהוחלף
        // בשורה שנושאת מחיר (של המוצר הקודם) נשמר למחירון רק בסימון מפורש
        if (field === "unitPrice" && !(Number(value) > 0)) next.savePrice = true;
        if (field === "sku") next.savePrice = !(Number(r.unitPrice) > 0);
        return next;
      })
    );

  const emptyRow = () => ({ sku: "", name: "", barcode: "", quantity: "", unitPrice: "", fromNote: false, savePrice: true });

  // מחיר ששונה: הוקלד מחיר, והוא אינו המחיר שהיה על התעודה לאותו מוצר.
  // שורה חדשה עם מחיר ידני נחשבת גם היא
  const priceChanged = (r) =>
    Boolean(r.sku?.trim()) &&
    Number(r.unitPrice) > 0 &&
    !(r.fromNote && r.sku.trim() === r.originalSku && Number(r.unitPrice) === r.originalPrice);

  // ── מה כתוב היום במחירון, לכל מוצר שבתעודה ──
  //
  // נחוץ בשביל המחירון הקבוצתי: הוא גובר על הפרטי, ולכן מחיר שנשמר בפרטי
  // לא היה תופס. נשאל כבר כשהמוצר נכנס לטופס ולא כשהמחיר משתנה, כדי
  // שהתשובה תהיה כאן לפני השמירה. { [sku]: { unitPrice, source } }
  const [expected, setExpected] = useState({});
  const skuKey = useMemo(
    () => [...new Set(rows.map((r) => r.sku?.trim()).filter(Boolean))].sort().join("\n"),
    [rows]
  );

  useEffect(() => {
    if (!customerId || !skuKey) return;
    const missing = skuKey
      .split("\n")
      .filter((sku) => !Object.prototype.hasOwnProperty.call(expected, sku));
    if (!missing.length) return;

    let cancelled = false;
    BillingServices.priceItems({
      customer: customerId,
      items: missing.map((sku) => ({ sku, quantity: 1 })),
    })
      .then((res) => {
        if (cancelled) return;
        const found = {};
        for (const item of res?.items || []) {
          found[String(item.sku)] = { unitPrice: item.unitPrice, source: item.source };
        }
        setExpected((prev) => ({ ...prev, ...found }));
      })
      // תצוגת עזר: בלי התשובה המחיר נשמר במחירון הפרטי כרגיל
      .catch(() => {});

    return () => {
      cancelled = true;
    };
    // expected נקרא רק כדי לדלג על מה שכבר ידוע
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, skuKey]);

  const inGroupPriceList = (r) => expected[r.sku?.trim()]?.source === "groupPriceList";

  // כישלון כאן אינו מבטל את התעודה שכבר נשמרה — רק אומר במפורש שהמחירון
  // לא עודכן
  const savePricesToPriceList = async () => {
    const items = validRows
      .filter((r) => r.savePrice && priceChanged(r) && !inGroupPriceList(r))
      .filter((r) => {
        const known = expected[r.sku.trim()];
        return !(known?.source === "customerPriceList" && known.unitPrice === Number(r.unitPrice));
      })
      .map((r) => ({ sku: r.sku.trim(), price: Number(r.unitPrice) }));
    if (!items.length || !customerId) return;

    try {
      const res = await CustomerPriceListServices.upsertItems(customerId, { items });
      notifySuccess(res.message);
    } catch (err) {
      notifyError(
        `התעודה עודכנה, אבל המחיר לא נשמר במחירון: ${err?.response?.data?.message || err.message}`
      );
    }
  };

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);
  // שורה שנשכחה באמצע: נכנסת מעל השורה שנלחצה, כדי שסדר התעודה יישמר.
  // הכפתור שבתחתית ממשיך להוסיף בסוף
  const insertRow = (index) =>
    setRows((prev) => [...prev.slice(0, index), emptyRow(), ...prev.slice(index)]);

  const removeRow = (index) => setRows((prev) => prev.filter((_, i) => i !== index));

  const addByBarcode = (product) => {
    if (!product?.sku) return;
    setRows((prev) => {
      if (prev.some((r) => String(r.sku) === String(product.sku))) {
        notifyError(`${product.name} כבר נמצא בתעודה`);
        return prev;
      }
      const filled = {
        sku: String(product.sku),
        name: product.name,
        barcode: product.barcode || "",
        quantity: "1",
        unitPrice: "",
        fromNote: false,
        savePrice: true,
      };
      const emptyIndex = prev.findIndex((r) => !r.sku?.trim());
      if (emptyIndex === -1) return [...prev, filled];
      return prev.map((r, i) => (i === emptyIndex ? filled : r));
    });
  };

  const validRows = useMemo(
    () => rows.filter((r) => r.sku?.trim() && Number(r.quantity) > 0),
    [rows]
  );

  // שורות שהיו על התעודה ואי אפשר לשלוח אותן — הן לא יישמרו, וזו סחורה
  // שנעלמת מהמסמך. חוסמות את השמירה במקום להיעלם בשקט.
  const brokenRows = useMemo(
    () => rows.filter((r) => r.fromNote && !(r.sku?.trim() && Number(r.quantity) > 0)),
    [rows]
  );

  const itemsTotal = validRows.reduce(
    (sum, r) => sum + (Number(r.unitPrice) || 0) * (Number(r.quantity) || 0),
    0
  );
  const preview = itemsTotal + (Number(shippingCost) || 0) - (Number(discount) || 0);

  const save = async () => {
    if (!validRows.length) return notifyError("תעודה חייבת לכלול לפחות שורה אחת עם כמות");
    if (brokenRows.length) {
      return notifyError(
        `יש ${brokenRows.length} שורות מהתעודה בלי מוצר או בלי כמות — הן יימחקו מהתעודה. ` +
          `יש להשלים אותן או להסיר אותן במפורש.`
      );
    }

    setSaving(true);
    try {
      const res = await BillingServices.updateDeliveryNote(note._id, {
        items: validRows.map((r) => ({
          sku: r.sku.trim(),
          quantity: Number(r.quantity),
          // מחיר ריק = ייקבע מהמחירון. שורה קיימת תמיד נושאת מחיר, ולכן
          // זה רלוונטי רק לשורה שנוספה עכשיו
          unitPrice: r.unitPrice === "" ? undefined : Number(r.unitPrice),
        })),
        issuedAt,
        manualReference: manualReference.trim(),
        notes,
        shippingCost: Number(shippingCost) || 0,
        discount: Number(discount) || 0,
      });
      notifySuccess(res.message);
      // אחרי השמירה ולא לפניה: מחיר שנכנס למחירון כשהתעודה לא עודכנה היה
      // משנה ללקוח את המחיר בלי שום תעודה שמסבירה למה
      await savePricesToPriceList();
      onSaved?.(res.note);
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="min-w-0 shadow-xs bg-white dark:bg-gray-800 mb-6 border-r-4 border-blue-500">
      <CardBody>
        <div className="mb-4">
          <h3 className="font-semibold text-lg">עריכת תעודה {note.number}</h3>
          <p className="text-sm text-gray-500">
            אחרי השמירה התעודה תישלח שוב למדפסת, והסנכרון מההזמנה יפסיק לעדכן
            אותה — התיקון שנעשה כאן הוא האמת.
          </p>
        </div>

        <div className="flex flex-wrap gap-4 mb-4">
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
            <span>הנחה נוספת</span>
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

        {Number(note.discountPercent) > 0 && (
          <p className="text-xs text-green-700 dark:text-green-500 mb-3">
            ללקוח יש הנחה קבועה של {note.discountPercent}% — היא מחושבת בשרת
            ומתווספת להנחה שכאן.
          </p>
        )}

        <p className="text-xs text-yellow-700 dark:text-yellow-500 mb-4 flex items-start gap-2">
          <FiAlertTriangle className="mt-0.5 shrink-0" />
          <span>
            שינוי תאריך המסירה מזיז את התעודה לחודש חיוב אחר. אם היא כבר
            נכללה בתצוגה מקדימה של סגירת חודש — כדאי לבדוק שם שוב.
          </span>
        </p>

        <div className="mb-4 max-w-sm">
          <BarcodeInput onPick={addByBarcode} hint="הוספת שורה לפי ברקוד ואז Enter" />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2">
          <p className="text-sm font-medium">שורות</p>
          {knownSkus && (
            <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                checked={wholeCatalog}
                onChange={(e) => setWholeCatalog(e.target.checked)}
              />
              כל הקטלוג
              <span className="text-gray-500">
                {wholeCatalog
                  ? "— מוצגים גם מוצרים שהלקוח לא קנה"
                  : "— מוצגים רק מוצרים שהלקוח קנה או שבמחירון שלו"}
              </span>
            </label>
          )}
        </div>
        {rows.map((row, i) => (
          <div key={i} className="flex flex-wrap gap-2 mb-2 items-center">
            <div className="flex-1 min-w-[220px]">
              <ProductPicker
                value={row.sku}
                onChange={(sku) => updateRow(i, "sku", sku)}
                onlySkus={pickerSkus}
              />
              {/* שורה שהייתה על התעודה ואין לה מוצר בקטלוג — בלי הסימון
                  הזה היא פשוט נעלמת בשמירה, וזו סחורה שיצאה ולא תחויב */}
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
            {/* מופיע רק כשהמחיר שונה. מוצר שמתומחר מהמחירון הקבוצתי אינו מקבל
                את הסימון: הקבוצתי גובר, ומחיר שנשמר בפרטי לא היה תופס */}
            {priceChanged(row) &&
              (inGroupPriceList(row) ? (
                <span className="text-xs text-gray-500 shrink-0">
                  המחיר הקבוע — במחירון הקבוצתי
                </span>
              ) : (
                <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 shrink-0">
                  <input
                    type="checkbox"
                    checked={row.savePrice}
                    onChange={(e) => updateRow(i, "savePrice", e.target.checked)}
                  />
                  לשמור במחירון הלקוח
                </label>
              ))}
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

        <Button size="small" layout="outline" onClick={addRow} className="mt-2">
          <FiPlus className="ml-1" /> שורה
        </Button>
        <p className="text-xs text-gray-500 mt-2">
          מחיר ששונה כאן נשמר גם במחירון הלקוח ויתפוס בתעודה הבאה; לתיקון
          חד-פעמי יש להסיר את הסימון "לשמור במחירון הלקוח".
        </p>

        <Label className="mt-4">
          <span>הערות (מופיעות על התעודה)</span>
          <Input className="mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Label>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm">
            <p>
              סה"כ לפני מע"מ:{" "}
              <span className="font-semibold text-lg">{shekel(preview)} ₪</span>
            </p>
            <p className="text-xs text-gray-500">
              שורות {shekel(itemsTotal)} ₪
              {Number(shippingCost) > 0 && ` · משלוח ${shekel(shippingCost)} ₪`}
              {Number(discount) > 0 && ` · הנחה ${shekel(discount)} ₪`}
              {Number(note.discountPercent) > 0 &&
                ` · ועוד ${note.discountPercent}% הנחת לקוח`}
            </p>
          </div>

          <div className="flex gap-2">
            {brokenRows.length > 0 && (
              <p className="text-sm text-red-600 self-center">
                {brokenRows.length} שורות מהתעודה חסרות מוצר או כמות
              </p>
            )}
            <Button layout="outline" onClick={onCancel} disabled={saving}>
              ביטול
            </Button>
            <Button
              onClick={save}
              disabled={saving || !validRows.length || brokenRows.length > 0}
            >
              {saving ? "שומר..." : "שמירה והדפסה מחדש"}
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

export default DeliveryNoteEditor;
