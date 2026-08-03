// src/components/product/ProductStorePanel.jsx
// שדות המוצר בחנות שלא מופיעים בכרטיס העליון של דף פרטי המוצר
// (מחירים משניים, דגלי מע"מ, מזהים ותאריכים). לקריאה בלבד - העריכה
// נעשית במגירת עריכת המוצר.
import React from "react";

import { Field, Section } from "@/components/common/ReadOnlyFields";
import { formatBool, formatDateTime, formatMoney, formatNumber, text } from "@/utils/displayFormat";

const ProductStorePanel = ({ product, showingTranslateValue, currency }) => {
  if (!product) return null;

  const categories = (product.categories || [])
    .map((category) =>
      showingTranslateValue ? showingTranslateValue(category?.name) : ""
    )
    .filter(Boolean)
    .join(", ");

  return (
    <Section title="מאפייני מוצר בחנות">
      <Field label='מק"ט' value={text(product.sku)} />
      <Field label="מזהה כתובת (slug)" value={text(product.slug)} wide />
      <Field label="סדר תצוגה בחנות" value={text(product.barcode)} />
      <Field label="מחיר לצרכן" value={formatMoney(product?.prices?.price, currency)} />
      <Field label="מחיר מקורי" value={formatMoney(product?.prices?.originalPrice, currency)} />
      <Field label="מחיר חנות" value={formatMoney(product?.prices?.storePrice, currency)} />
      <Field label="הנחה" value={formatNumber(product?.prices?.discount)} />
      <Field label="מבצעי כמות" value={(product?.prices?.offers || []).length} />
      <Field label="מלאי" value={formatNumber(product.stock)} />
      <Field
        label="מגבלת רכישה"
        value={product.purchaseLimit ? formatNumber(product.purchaseLimit) : "ללא"}
      />
      <Field label='פטור ממע"מ' value={formatBool(product.isVatFree)} />
      <Field label="מוצר של החנות הפיזית" value={formatBool(product.isStoreProduct)} />
      <Field label="מוצר בעמוד התשלום" value={text(product.isCartpprod)} />
      <Field label="משקל" value={text(product.weight)} />
      <Field label="מספר תמונות" value={(product.image || []).length} />
      <Field label="קטגוריות" value={text(categories)} wide />
      <Field label="נוצר במערכת" value={formatDateTime(product.createdAt)} />
      <Field label="עודכן לאחרונה" value={formatDateTime(product.updatedAt)} />
    </Section>
  );
};

export default ProductStorePanel;
