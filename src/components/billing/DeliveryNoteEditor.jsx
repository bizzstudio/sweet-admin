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
// תעודה שחויבה אינה מגיעה לכאן — השרת חוסם אותה, והמסך לא מציג את הכפתור.
// התיקון שם עובר דרך זיכוי, שמחזיר את התעודה למצב פתוח.
//
// ⚠️ תעודה שנערכה מסומנת manuallyEdited, והסנכרון מההזמנה מפסיק לגעת בה.
//    בלי זה עריכה של ההזמנה הייתה מוחקת בשקט את מה שתוקן כאן.

import React, { useMemo, useState } from "react";
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

  const updateRow = (index, field, value) =>
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      { sku: "", name: "", barcode: "", quantity: "", unitPrice: "", fromNote: false },
    ]);

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

        <p className="text-sm font-medium mb-2">שורות</p>
        {rows.map((row, i) => (
          <div key={i} className="flex flex-wrap gap-2 mb-2 items-center">
            <div className="flex-1 min-w-[220px]">
              <ProductPicker value={row.sku} onChange={(sku) => updateRow(i, "sku", sku)} />
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
