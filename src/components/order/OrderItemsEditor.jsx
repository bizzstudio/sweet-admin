// src/components/order/OrderItemsEditor.jsx
//
// עריכת שורות ההזמנה.
//
// למה זה קיים: ההזמנה נקלטת מהמייל או מווצאפ עם מה שהמנוע הצליח לקרוא,
// ותעודת המשלוח נגזרת ממנה אוטומטית. כמות שגויה שנקלטה הייתה ממשיכה עד
// לחשבונית החודשית בלי שום מקום לתקן אותה — זה המקום.
//
// המחיר אינו נערך כאן במכוון: הוא נקבע במחירון הלקוח, וזו הנקודה שבה
// מתקנים אותו. מחיר שהוקלד ידנית על שורה בודדת היה נעלם בהזמנה הבאה
// ומייצר שני מחירים שונים לאותו מוצר לאותו לקוח.

import React, { useMemo, useRef, useState } from "react";
import {
  Badge,
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
import { FiAlertTriangle, FiPlus, FiSave, FiTrash2, FiX } from "react-icons/fi";

import ProductPicker from "@/components/billing/ProductPicker";
import BillingServices from "@/services/BillingServices";
import OrderServices from "@/services/OrderServices";
import { notifyError, notifySuccess } from "@/utils/toast";

import TableHeaderCell from "@/components/table/TableHeaderCell";
const shekel = (n) =>
  Number(n || 0).toLocaleString("he-IL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const SOURCE_LABELS = {
  customerPriceList: { text: "מחירון הלקוח", cls: "text-green-600" },
  catalog: { text: "מחיר קטלוג", cls: "text-yellow-600" },
  missing: { text: "אין מחיר!", cls: "text-red-600 font-semibold" },
};

// למה הסנכרון לא נגע בתעודה. המילים האלה מגיעות מ-syncFromOrder בשרת
const NOTE_REASONS = {
  billed: "היא כבר חויבה; תיקון נעשה בחשבונית זיכוי",
  billing: "היא נתפסה כרגע על ידי סגירת חודש",
  cancelled: "היא בוטלה",
  cancelledEmpty: "לא נותרו בהזמנה שורות אוטומטיות והיא בוטלה",
  raced: "היא השתנתה במקביל; יש לרענן את המסך",
  noNote: "אין להזמנה תעודה אוטומטית",
};

const titleOf = (line) =>
  line?.title?.he || line?.title?.en || line?.title || line?.name || line?.sku || "פריט";

// שורה שמנוע המבצעים או קופון יצרו. היא מחושבת מחדש בשרת בכל שמירה, ולכן
// מוצגת אבל אינה נערכת — עריכה שלה הייתה נמחקת רגע אחר כך
const isEngineLine = (line) =>
  Boolean(line?.isRewardProduct || line?.isWelcomeGift || line?.isCouponFreeProduct);

const customerIdOf = (value) =>
  value && typeof value === "object" ? String(value._id || "") : value ? String(value) : "";

const toRow = (line) => ({
  key: String(line._id || line.id || line.sku || Math.random()),
  id: String(line._id || line.id || ""),
  sku: line.sku ? String(line.sku) : "",
  name: titleOf(line),
  quantity: String(line.quantity ?? ""),
  unitPrice: Number(line.prices?.price ?? line.price) || 0,
  source: line.priceSource === "customer-price-list" ? "customerPriceList" : null,
});

// שתי שורות של אותו מוצר בעגלה אחת קורות כשהלקוח כתב אותו פעמיים בהודעה.
// הן מאוחדות לשורה אחת עם סכום הכמויות: שתי שורות עריכה לאותו מוצר היו
// נשלחות כשתי שורות עם אותו מזהה, והשרת חוסם כפילות כזו
const buildRows = (cart) => {
  const rows = [];
  const index = new Map();
  let merged = 0;

  for (const line of cart.filter((l) => !isEngineLine(l))) {
    const row = toRow(line);
    const existing = index.get(row.key);
    if (existing) {
      existing.quantity = String(
        (Number(existing.quantity) || 0) + (Number(row.quantity) || 0)
      );
      merged += 1;
      continue;
    }
    index.set(row.key, row);
    rows.push(row);
  }

  return { rows, merged };
};

/**
 * @param {string}   orderId
 * @param {object}   order      - ההזמנה כפי שנטענה במסך
 * @param {function} onSaved    - נקרא אחרי שמירה מוצלחת (לרענון המסך)
 * @param {function} onCancel
 */
const OrderItemsEditor = ({ orderId, order, onSaved, onCancel }) => {
  const customerId = customerIdOf(order?.user);
  const cart = useMemo(() => order?.cart || [], [order]);

  const engineLines = useMemo(() => cart.filter(isEngineLine), [cart]);

  // צילום מצב חד-פעמי בהרכבה: טעינה מחדש של ההזמנה ברקע לא תדרוס עריכה
  // שבאמצע. גם updatedAt נלקח כאן ולא מה-prop — אחרת רענון רקע היה מרענן
  // את החותמת ומבטל בשקט את הנעילה האופטימית מול השורות שעל המסך
  const initial = useRef(null);
  if (!initial.current) initial.current = { ...buildRows(cart), updatedAt: order?.updatedAt };

  const [rows, setRows] = useState(initial.current.rows);
  const mergedRows = initial.current.merged;
  const [shippingCost, setShippingCost] = useState(String(order?.shippingCost ?? 0));
  const [discount, setDiscount] = useState(String(order?.discount ?? 0));

  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  // אישור מפורש לעריכה כשהתעודה כבר נעולה (חויבה / נתפסה / בוטלה)
  const [lockWarning, setLockWarning] = useState(null);

  const setQuantity = (key, value) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, quantity: value } : r)));

  const removeRow = (key) => setRows((prev) => prev.filter((r) => r.key !== key));

  // מוצר שנבחר מהבורר — המחיר נשלף מהשרת ולא מהקטלוג שבדפדפן, כי המחיר
  // הקובע הוא זה שבמחירון הלקוח
  const addProduct = async (sku) => {
    if (!sku) return;
    setPicking(false);

    if (rows.some((r) => r.sku === String(sku))) {
      notifyError("המוצר כבר קיים בהזמנה — יש לשנות את הכמות בשורה שלו");
      return;
    }

    try {
      const res = await BillingServices.priceItems({
        customer: customerId,
        items: [{ sku: String(sku), quantity: 1 }],
      });
      const priced = res?.items?.[0];
      if (!priced) throw new Error("תמחור המוצר נכשל");

      setRows((prev) => [
        ...prev,
        {
          key: `new-${sku}`,
          id: "",
          sku: String(sku),
          name: priced.name,
          quantity: "1",
          unitPrice: Number(priced.unitPrice) || 0,
          source: priced.source,
        },
      ]);
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    }
  };

  const itemsTotal = rows.reduce(
    (sum, r) => sum + (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0),
    0
  );
  const preview =
    itemsTotal + (Number(shippingCost) || 0) - (Number(discount) || 0) - (Number(order?.offerDiscount) || 0);

  const save = async (allowLockedNote = false) => {
    const invalid = rows.find((r) => !(Number(r.quantity) > 0));
    if (invalid) {
      notifyError(`כמות לא תקינה עבור ${invalid.name}`);
      return;
    }
    if (!rows.length) {
      notifyError("לא ניתן להשאיר הזמנה בלי פריטים");
      return;
    }

    setSaving(true);
    try {
      const res = await OrderServices.updateOrderItems(orderId, {
        items: rows.map((r) => ({
          _id: r.id || undefined,
          sku: r.sku || undefined,
          quantity: Number(r.quantity),
        })),
        shippingCost: Number(shippingCost) || 0,
        discount: Number(discount) || 0,
        allowLockedNote,
        // נעילה אופטימית: אם ההזמנה השתנתה מאז שהמסך נטען, השרת יעצור
        expectedUpdatedAt: initial.current.updatedAt,
      });

      const note = res?.note;
      notifySuccess(
        note?.updated
          ? `ההזמנה עודכנה ותעודה ${note.number} סונכרנה`
          : "ההזמנה עודכנה"
      );
      if (note && !note.updated && note.reason && note.reason !== "unchanged") {
        // הסנכרון לא נגע בתעודה — חשוב לומר את זה, אחרת "נשמר בהצלחה"
        // נקרא כאילו גם החיוב תוקן
        notifyError(`שימו לב: תעודה ${note.number} לא עודכנה — ${NOTE_REASONS[note.reason] || note.reason}`);
      }
      onSaved?.();
    } catch (err) {
      const data = err?.response?.data;
      if (data?.code === "NOTE_LOCKED") {
        setLockWarning(data.message);
      } else {
        notifyError(data?.message || err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="my-6 border border-yellow-300 dark:border-yellow-700">
      <CardBody>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-700 dark:text-gray-300">עריכת פריטי ההזמנה</h3>
          <Button size="small" layout="link" onClick={onCancel}>
            <FiX className="ml-1" />
            סגירה
          </Button>
        </div>

        {lockWarning && (
          <div className="mb-4 p-3 rounded bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-sm">
            <p className="flex items-start text-red-700 dark:text-red-400">
              <FiAlertTriangle className="ml-2 mt-1 shrink-0" />
              <span>{lockWarning}</span>
            </p>
            <div className="mt-3 flex gap-2">
              <Button size="small" disabled={saving} onClick={() => save(true)}>
                לעדכן את ההזמנה בכל זאת
              </Button>
              <Button size="small" layout="outline" onClick={() => setLockWarning(null)}>
                ביטול
              </Button>
            </div>
          </div>
        )}

        {mergedRows > 0 && (
          <p className="mb-3 text-xs text-yellow-700 dark:text-yellow-500">
            בהזמנה היו {mergedRows} שורות כפולות של אותו מוצר — הן אוחדו כאן לשורה אחת עם סכום
            הכמויות, וכך גם יישמרו.
          </p>
        )}

        <TableContainer className="mb-4">
          <Table className="w-full whitespace-nowrap admin-table">
            <TableHeader>
              <tr>
                <TableHeaderCell>מוצר</TableHeaderCell>
                <TableHeaderCell className="text-center">מק"ט</TableHeaderCell>
                <TableHeaderCell className="text-center">כמות</TableHeaderCell>
                <TableHeaderCell className="text-center">מחיר ליחידה</TableHeaderCell>
                <TableHeaderCell className="text-left">סה"כ שורה</TableHeaderCell>
                <TableHeaderCell />
              </tr>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell>
                    <span className="text-sm">{row.name}</span>
                    {row.source && SOURCE_LABELS[row.source] && (
                      <span className={`block text-xs ${SOURCE_LABELS[row.source].cls}`}>
                        {SOURCE_LABELS[row.source].text}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center font-mono text-xs">{row.sku || "—"}</TableCell>
                  <TableCell className="text-center">
                    <Input
                      className="w-24 text-center"
                      type="number"
                      min="0"
                      // סחורה נשקלת מוזמנת גם בשברי קילו
                      step="0.001"
                      value={row.quantity}
                      onChange={(e) => setQuantity(row.key, e.target.value)}
                    />
                  </TableCell>
                  <TableCell className="text-center text-sm">{shekel(row.unitPrice)} ₪</TableCell>
                  <TableCell className="text-left text-sm font-semibold">
                    {shekel((Number(row.quantity) || 0) * row.unitPrice)} ₪
                  </TableCell>
                  <TableCell className="text-left">
                    <Button
                      size="small"
                      layout="link"
                      aria-label={`הסרת ${row.name}`}
                      onClick={() => removeRow(row.key)}
                    >
                      <FiTrash2 className="text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {engineLines.map((line, i) => (
                <TableRow key={`engine-${i}`} className="opacity-70">
                  <TableCell>
                    <span className="text-sm">{titleOf(line)}</span>
                    <Badge type="success" className="mr-2">
                      {line.isWelcomeGift ? "מתנת הצטרפות" : line.isRewardProduct ? "מתנת מבצע" : "מקופון"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center font-mono text-xs">{line.sku || "—"}</TableCell>
                  <TableCell className="text-center text-sm">{line.quantity}</TableCell>
                  <TableCell className="text-center text-sm">
                    {shekel(line.rewardPrice ?? 0)} ₪
                  </TableCell>
                  <TableCell className="text-left text-sm">—</TableCell>
                  <TableCell className="text-left text-xs text-gray-500">מחושב</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {picking ? (
          <div className="mb-4">
            <Label className="mb-1 block">הוספת מוצר</Label>
            <ProductPicker value="" onChange={addProduct} />
            <Button size="small" layout="link" className="mt-1" onClick={() => setPicking(false)}>
              ביטול
            </Button>
          </div>
        ) : (
          <Button size="small" layout="outline" className="mb-4" onClick={() => setPicking(true)}>
            <FiPlus className="ml-1" />
            הוספת מוצר
          </Button>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <Label>
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
          </div>
          <div>
            <Label>
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
          <div className="flex flex-col justify-end">
            <span className="text-xs text-gray-500">סה"כ משוער (לפני מע"מ)</span>
            <span className="text-lg font-bold">{shekel(preview)} ₪</span>
          </div>
        </div>

        <p className="text-xs text-gray-500 mb-4">
          הסכומים כאן ללא מע"מ, כמו בכל המערכת. הנחות ממבצעים מחושבות מחדש בשרת בעת השמירה,
          ולכן הסכום הסופי עשוי להשתנות מהמשוער. עדכון הכמות מרענן גם את תעודת המשלוח, כל עוד
          היא ממתינה לחיוב.
        </p>

        <div className="flex gap-2">
          <Button disabled={saving} onClick={() => save(false)}>
            <FiSave className="ml-2" />
            {saving ? "שומר..." : "שמירת השינויים"}
          </Button>
          <Button layout="outline" disabled={saving} onClick={onCancel}>
            ביטול
          </Button>
        </div>
      </CardBody>
    </Card>
  );
};

export default OrderItemsEditor;
