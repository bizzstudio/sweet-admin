// src/components/product/ProductErpPanel.jsx
// המק"טים, הספק והעלות של המוצר, כפי שהגיעו מיבוא האקסל
// ("רשימת המוצרים - כל הספקים"). במצב עריכה (editing) אותם שדות עצמם הופכים
// לשדות קלט באותו מקום במסך פרטי המוצר, ונשמרים עם שאר המוצר.
// יבוא אקסל הבא של אותו מק"ט ידרוס עריכה ידנית בחזרה לערכי הקובץ.
// "שם קבוצה" לא מוצג כאן - הוא אותו נתון כמו הקטגוריה, שכבר מופיעה למעלה.
import React from "react";

import { EditableField } from "@/components/common/EditableFields";
import { Section } from "@/components/common/ReadOnlyFields";
import { formatDateTime, formatMoney, formatNumber, text } from "@/utils/displayFormat";

// שם השדה בטופס (erpBarcode וכו') חייב להתאים ל-ERP_FORM_FIELDS
// ב-useProductSubmit, שם הוא מתורגם בחזרה לשם השדה ב-erp
const FIELDS = [
  { name: "erpBarcode", label: "בר-קוד", key: "barcode" },
  { name: "erpBarcode2", label: "בר-קוד נוסף", key: "barcode2" },
  { name: "erpExternalSku", label: 'מק"ט חיצוני', key: "externalSku" },
  { name: "erpSupplierSku", label: 'מק"ט ספק', key: "supplierSku" },
  { name: "erpSupplierName", label: "שם הספק", key: "supplierName" },
  {
    name: "erpSupplierNumber",
    label: "מספר ספק",
    key: "supplierNumber",
    numeric: true,
  },
  { name: "erpUnit", label: "יחידת מידה", key: "unit" },
  { name: "erpGroupCode", label: "קוד קבוצה", key: "groupCode", numeric: true },
  {
    name: "erpDepartmentCode",
    label: "מחלקה",
    key: "departmentCode",
    numeric: true,
  },
  { name: "erpCost", label: "עלות", key: "cost", numeric: true, money: true },
  { name: "erpCurrency", label: "קוד מטבע", key: "currency" },
  { name: "erpNotes", label: "הערות", key: "notes", wide: true },
];

const ProductErpPanel = ({ product, editing = false, register, error }) => {
  if (!product) return null;

  const erp = product.erp;

  if (!erp) {
    return (
      <div className="rounded bg-gray-50 p-3 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-300">
        למוצר הזה אין מק"ט ספק ועלות — הוא נוצר בפאנל ולא הגיע מיבוא האקסל.
      </div>
    );
  }

  // בשגיאת טעינה של נתוני ההנהח"ש לא מציגים שדות עריכה: בלי הערכים הקיימים
  // אי אפשר לשמור אותם, ועריכה "על ריק" הייתה נראית כאילו נשמרה בזמן שהיא
  // נזרקת. הערכים שכבר יש בעמוד ממשיכים להיות מוצגים לקריאה
  const canEdit = editing && !error;

  const showValue = (field) => {
    const value = erp[field.key];
    if (field.money) return formatMoney(value);
    if (field.numeric) return formatNumber(value);
    return text(value);
  };

  return (
    <Section
      title='מק"טים, ספק ועלות'
      note={erp.syncedAt ? `סונכרן מהאקסל ב-${formatDateTime(erp.syncedAt)}` : ""}
    >
      {editing && error ? (
        <div className="sm:col-span-2 rounded bg-red-50 p-3 text-sm text-red-500 dark:bg-gray-800">
          {error}
        </div>
      ) : null}

      {FIELDS.map((field) => (
        <EditableField
          key={field.name}
          editing={canEdit}
          label={field.label}
          value={showValue(field)}
          name={field.name}
          type={field.numeric ? "number" : "text"}
          register={register}
          wide={field.wide}
        />
      ))}
    </Section>
  );
};

export default ProductErpPanel;
