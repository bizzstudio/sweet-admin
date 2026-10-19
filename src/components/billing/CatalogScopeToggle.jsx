// src/components/billing/CatalogScopeToggle.jsx
//
// תיבת "כל הקטלוג" שליד רשימת השורות במסמך: כברירת מחדל הבורר מציג רק את
// המוצרים שהלקוח מכיר (useCustomerKnownSkus), והתיבה פותחת את השאר — מוצר
// שנמכר ללקוח בפעם הראשונה עוד אינו בהיסטוריה ולא במחירון.
//
// משותף לתעודת משלוח, חשבונית, הצעת מחיר וזיכוי, כדי שהניסוח יהיה זהה בכולם.

import React from "react";

/**
 * @param {Set<string>|null} knownSkus - null: אין במה לסנן, והתיבה אינה מוצגת
 */
const CatalogScopeToggle = ({ knownSkus, wholeCatalog, onChange }) => {
  if (!knownSkus) return null;

  return (
    <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
      <input
        type="checkbox"
        checked={wholeCatalog}
        onChange={(e) => onChange(e.target.checked)}
      />
      כל הקטלוג
      <span className="text-gray-500">
        {wholeCatalog
          ? "— מוצגים גם מוצרים שהלקוח לא קנה"
          : "— מוצגים רק מוצרים שהלקוח קנה או שבמחירון שלו"}
      </span>
    </label>
  );
};

export default CatalogScopeToggle;
