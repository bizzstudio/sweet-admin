// src/components/product/ProductStorePanel.jsx
// שדות המוצר בחנות שלא מופיעים בכרטיס העליון של דף פרטי המוצר
// (מחירים, מלאי, דגלי מע"מ, מזהים ותאריכים).
// במצב עריכה (editing) אותם שדות עצמם הופכים לשדות קלט, באותו מקום ברשת -
// אין מגירה ואין חלון שנפתחים. שדות מחושבים (הנחה) ושדות מערכת (תאריכים)
// נשארים לקריאה גם בעריכה.
import React from "react";

import { BoolControl, EditableField } from "@/components/common/EditableFields";
import { Field, Section } from "@/components/common/ReadOnlyFields";
import { formatBool, formatDateTime, formatMoney, formatNumber, text } from "@/utils/displayFormat";

const ProductStorePanel = ({
  product,
  showingTranslateValue,
  currency,
  editing = false,
  register,
  errors = {},
  form = {},
  onSlugChange,
}) => {
  if (!product) return null;

  const {
    isCombination,
    isStockManagement,
    setIsStockManagement,
    isVatFree,
    setIsVatFree,
    isStoreProduct,
    setIsStoreProduct,
    isCartpprod,
    setIsCartpprod,
  } = form;

  const categories = (product.categories || [])
    .map((category) =>
      showingTranslateValue ? showingTranslateValue(category?.name) : ""
    )
    .filter(Boolean)
    .join(", ");

  // מוצר עם וריאציות מקבל את המחיר והמלאי מהוריאציות עצמן, ולכן השדות
  // האלה נעולים בעריכה - בדיוק כמו בטופס המוצר המקורי
  const lockedByCombination = Boolean(isCombination);

  return (
    <Section title="מאפייני מוצר בחנות">
      <EditableField
        editing={editing}
        label='מק"ט'
        value={text(product.sku)}
        name="sku"
        register={register}
        error={errors.sku}
      />
      <EditableField
        editing={editing}
        label="מזהה כתובת (slug)"
        value={text(product.slug)}
        name="slug"
        required
        register={register}
        error={errors.slug}
        onValueChange={onSlugChange}
        wide
      />
      <EditableField
        editing={editing}
        label="סדר תצוגה בחנות"
        value={text(product.barcode)}
        name="barcode"
        type="number"
        register={register}
        error={errors.barcode}
      />
      <EditableField
        editing={editing}
        label="מחיר לצרכן"
        value={formatMoney(product?.prices?.price, currency)}
        name="price"
        type="number"
        register={register}
        error={errors.price}
        disabled={lockedByCombination}
      />
      <EditableField
        editing={editing}
        label="מחיר מקורי"
        value={formatMoney(product?.prices?.originalPrice, currency)}
        name="originalPrice"
        type="number"
        register={register}
        error={errors.originalPrice}
        disabled={lockedByCombination}
        hint="חייב להיות גדול או שווה למחיר לצרכן"
      />
      <EditableField
        editing={editing}
        label="מחיר חנות"
        value={formatMoney(product?.prices?.storePrice, currency)}
        name="storePrice"
        type="number"
        register={register}
        error={errors.storePrice}
        disabled={lockedByCombination}
      />
      {/* ההנחה מחושבת בשמירה מההפרש בין המחיר המקורי למחיר לצרכן */}
      <Field label="הנחה" value={formatNumber(product?.prices?.discount)} />
      <Field label="מבצעי כמות" value={(product?.prices?.offers || []).length} />
      <EditableField
        editing={editing}
        label="מלאי"
        value={
          product.stock >= 1000000
            ? "מלאי בלתי מוגבל"
            : formatNumber(product.stock)
        }
        name="stock"
        type="number"
        register={register}
        error={errors.stock}
        disabled={lockedByCombination || !isStockManagement}
        hint={!isStockManagement ? "ניהול המלאי כבוי - המלאי בלתי מוגבל" : ""}
      />
      <EditableField
        editing={editing}
        label="ניהול מלאי"
        value={formatBool(product.stock < 1000000)}
        control={
          <BoolControl
            value={isStockManagement}
            onChange={setIsStockManagement}
          />
        }
      />
      <EditableField
        editing={editing}
        label="מגבלת רכישה"
        value={product.purchaseLimit ? formatNumber(product.purchaseLimit) : "ללא"}
        name="purchaseLimit"
        type="number"
        register={register}
        error={errors.purchaseLimit}
      />
      <EditableField
        editing={editing}
        label="משקל"
        value={text(product.weight)}
        name="weight"
        register={register}
        error={errors.weight}
      />
      <EditableField
        editing={editing}
        label='פטור ממע"מ'
        value={formatBool(product.isVatFree)}
        control={<BoolControl value={isVatFree} onChange={setIsVatFree} />}
      />
      <EditableField
        editing={editing}
        label="מוצר של החנות הפיזית"
        value={formatBool(product.isStoreProduct)}
        control={
          <BoolControl value={isStoreProduct} onChange={setIsStoreProduct} />
        }
      />
      <EditableField
        editing={editing}
        label="מוצר בעמוד התשלום"
        value={text(product.isCartpprod)}
        control={<BoolControl value={isCartpprod} onChange={setIsCartpprod} />}
      />
      <Field label="מספר תמונות" value={(product.image || []).length} />
      <Field label="קטגוריות" value={text(categories)} wide />
      <Field label="נוצר במערכת" value={formatDateTime(product.createdAt)} />
      <Field label="עודכן לאחרונה" value={formatDateTime(product.updatedAt)} />
    </Section>
  );
};

export default ProductStorePanel;
