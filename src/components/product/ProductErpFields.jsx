// src/components/product/ProductErpFields.jsx
// שדות המק"טים, הספק והעלות של המוצר בטופס העריכה.
// הערכים מגיעים מיבוא האקסל ("רשימת המוצרים - כל הספקים") אבל ניתנים לעריכה
// ידנית. יבוא אקסל הבא של אותו מק"ט ידרוס עריכה ידנית בחזרה לערכי הקובץ.
// "שם קבוצה" לא מופיע כאן בכוונה - הוא אותו נתון כמו קטגוריית המוצר,
// שנערכת למעלה בטופס.
import React from "react";

import InputArea from "@/components/form/input/InputArea";
import LabelArea from "@/components/form/selectOption/LabelArea";

// השדות המספריים מקבלים step="any": בלעדיו הדפדפן חוסם ערך עשרוני כמו
// עלות 12.75, כי ברירת המחדל של step היא 1
const FIELDS = [
  { name: "erpBarcode", label: "בר-קוד" },
  { name: "erpBarcode2", label: "בר-קוד נוסף" },
  { name: "erpExternalSku", label: 'מק"ט חיצוני' },
  { name: "erpSupplierSku", label: 'מק"ט ספק' },
  { name: "erpUnit", label: "יחידת מידה" },
  { name: "erpSupplierName", label: "שם הספק" },
  { name: "erpSupplierNumber", label: "מספר ספק", numeric: true },
  { name: "erpGroupCode", label: "קוד קבוצה", numeric: true },
  { name: "erpDepartmentCode", label: "מחלקה", numeric: true },
  { name: "erpCost", label: "עלות", numeric: true },
  { name: "erpCurrency", label: "קוד מטבע" },
  { name: "erpNotes", label: "הערות" },
];

const ProductErpFields = ({ register, error }) => {
  // בשגיאת טעינה השדות לא מוצגים: בלי הערכים הקיימים אי אפשר לשמור אותם,
  // ועריכה "על ריק" הייתה נראית כאילו נשמרה בזמן שהיא נזרקת
  if (error) {
    return (
      <div className="col-span-12 rounded bg-red-50 p-3 text-sm text-red-500 dark:bg-gray-800">
        {error}
      </div>
    );
  }

  return (
    <>
      <div className="col-span-12 mt-2 border-t border-gray-100 dark:border-gray-600" />

      {/* השדות מרונדרים גם בזמן הטעינה, כמו שאר שדות המגירה: הם נרשמים
          בטופס מיד ומתמלאים כשהנתונים חוזרים */}
      {FIELDS.map((field) => (
        <div key={field.name} className="flex flex-col gap-1 md:col-span-6 col-span-12">
          <LabelArea label={field.label} />
          <div className="col-span-6">
            <InputArea
              required
              register={register}
              label={field.label}
              name={field.name}
              type={field.numeric ? "number" : "text"}
              step={field.numeric ? "any" : undefined}
              placeholder={field.label}
            />
          </div>
        </div>
      ))}
    </>
  );
};

export default ProductErpFields;
