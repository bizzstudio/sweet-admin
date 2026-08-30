import React from "react";

/**
 * תא כותרת אמיתי לטבלה — ‎<th scope="col">.
 *
 * ‎TableCell של ‎@windmill/react-ui מרנדר תמיד ‎<td>, גם כשהוא יושב בתוך
 * ‎<TableHeader> (כלומר בתוך ‎<thead>). לספרייה אין בכלל רכיב שמפיק ‎<th>.
 * התוצאה: בכל טבלאות הפאנל — מוצרים, הזמנות, לקוחות, חשבוניות — אין ולו
 * כותרת עמודה אחת שהדפדפן מזהה ככותרת. משתמש קורא-מסך ששומע תא באמצע טבלת
 * ההזמנות מקבל "1,240" בלי לדעת אם זה סכום, מספר הזמנה או כמות.
 *
 * ‎scope="col" קושר את התא לכל העמודה שמתחתיו, וזו ההצהרה שקורא המסך
 * משתמש בה כדי להקריא "סכום: 1,240" במקום "1,240".
 *
 * המחלקות הבסיסיות זהות ל-‎tableCell.base של Windmill (‎px-4 py-3) בתוספת
 * משקל גופן וצבע — כותרת עמודה צריכה להיראות ככותרת ולא כשורת נתונים.
 */
const TableHeaderCell = ({ children, className = "", scope = "col", ...rest }) => (
  <th
    scope={scope}
    className={`px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 ${className}`}
    {...rest}
  >
    {children}
  </th>
);

export default TableHeaderCell;
