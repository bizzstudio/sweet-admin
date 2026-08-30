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
        {note ? <span className="text-xs text-gray-500">{note}</span> : null}
      </div>
    ) : null}
    <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">{children}</div>
  </div>
);

// כרטיס עצמאי עם כותרת, לעמודי צפייה שבהם קבוצות השדות ארוכות מדי
// כדי לשבת ברשימה אחת רצופה. span פורש את הכרטיס על כל רוחב הרשת
export const Panel = ({ title, icon, note, span = false, children }) => (
  <section
    className={`rounded-lg bg-white p-5 text-right dark:bg-gray-800 ${
      span ? "lg:col-span-2" : ""
    }`}
  >
    <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-gray-100 pb-2 dark:border-gray-700">
      {icon ? (
        <span className="text-base text-gray-500 dark:text-gray-500">{icon}</span>
      ) : null}
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
        {title}
      </h3>
      {note ? <span className="text-xs text-gray-500">{note}</span> : null}
    </div>
    <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">{children}</div>
  </section>
);

// אריח למספר בודד שרוצים לראות במבט אחד (יתרות, נקודות)
export const Stat = ({ label, value }) => (
  <div className="rounded-lg bg-white p-4 text-right dark:bg-gray-800">
    <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
    <div className="mt-1 text-lg font-semibold text-gray-700 dark:text-gray-100">
      {value}
    </div>
  </div>
);
