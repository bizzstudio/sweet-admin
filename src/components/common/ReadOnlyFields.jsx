// src/components/common/ReadOnlyFields.jsx
// פריסת "תווית + ערך" המשותפת לכל הפאנלים לקריאה בלבד בפאנל הניהול
// (כרטיס לקוח, כרטיס מוצר), כדי שכל המסכים ייראו זהים.
import React from "react";

// wide נותן לערכים ארוכים (הערות, כתובת, שם מוצר) את כל רוחב השורה
export const Field = ({ label, value, wide = false }) => (
  <div className={wide ? "sm:col-span-2" : ""}>
    <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
    <div className="text-sm font-medium text-gray-700 dark:text-gray-200 break-words whitespace-pre-wrap">
      {value}
    </div>
  </div>
);

// בלי title מוצגת רק רשת השדות, בלי שורת כותרת - לשימוש בקבוצות שדות
// שהן המשך ישיר של הקבוצה שמעליהן ולא חלק נפרד בכרטיס
export const Section = ({ title, note, children }) => (
  <div className="mb-6">
    {title ? (
      <div className="mb-2 flex flex-wrap items-center gap-2 border-b border-gray-100 pb-1 dark:border-gray-600">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{title}</h3>
        {note ? <span className="text-xs text-gray-400">{note}</span> : null}
      </div>
    ) : null}
    <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">{children}</div>
  </div>
);
