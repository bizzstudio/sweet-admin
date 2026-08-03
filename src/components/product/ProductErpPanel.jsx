// src/components/product/ProductErpPanel.jsx
// המק"טים, הספק והעלות של המוצר, כפי שהגיעו מיבוא האקסל
// ("רשימת המוצרים - כל הספקים"). לתצוגה בלבד במסך פרטי המוצר; בעריכה הם
// מופיעים כשדות טופס (ProductErpFields).
// "שם קבוצה" לא מוצג כאן - הוא אותו נתון כמו הקטגוריה, שכבר מופיעה למעלה.
import React from "react";

import { Field, Section } from "@/components/common/ReadOnlyFields";
import { formatDateTime, formatMoney, formatNumber, text } from "@/utils/displayFormat";

const ProductErpPanel = ({ product }) => {
  if (!product) return null;

  const erp = product.erp;

  if (!erp) {
    return (
      <div className="rounded bg-gray-50 p-3 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-300">
        למוצר הזה אין מק"ט ספק ועלות — הוא נוצר בפאנל ולא הגיע מיבוא האקסל.
      </div>
    );
  }

  return (
    <Section
      title='מק"טים, ספק ועלות'
      note={erp.syncedAt ? `סונכרן מהאקסל ב-${formatDateTime(erp.syncedAt)}` : ""}
    >
      <Field label="בר-קוד" value={text(erp.barcode)} />
      <Field label="בר-קוד נוסף" value={text(erp.barcode2)} />
      <Field label='מק"ט חיצוני' value={text(erp.externalSku)} />
      <Field label='מק"ט ספק' value={text(erp.supplierSku)} />
      <Field label="שם הספק" value={text(erp.supplierName)} />
      <Field label="מספר ספק" value={formatNumber(erp.supplierNumber)} />
      <Field label="יחידת מידה" value={text(erp.unit)} />
      <Field label="קוד קבוצה" value={formatNumber(erp.groupCode)} />
      <Field label="מחלקה" value={formatNumber(erp.departmentCode)} />
      <Field label="עלות" value={formatMoney(erp.cost)} />
      <Field label="קוד מטבע" value={text(erp.currency)} />
      <Field label="הערות" value={text(erp.notes)} wide />
    </Section>
  );
};

export default ProductErpPanel;
