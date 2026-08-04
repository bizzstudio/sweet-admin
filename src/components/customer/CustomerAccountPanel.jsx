// src/components/customer/CustomerAccountPanel.jsx
// מצב החשבון וההטבות של הלקוח בחנות - לקריאה בלבד.
// השדות האלה נקבעים על ידי החנות (הרשמה, מימוש מבצעים, קופון לקנייה הבאה)
// ואין להם טופס עריכה, ולכן הם מוצגים בעמוד "צפייה בלקוח" בלבד ולא במגירת
// העריכה - שם מופיעים רק שדות שניתן לערוך.
import React from "react";
import { FiGift } from "react-icons/fi";

import { Field, Panel } from "@/components/common/ReadOnlyFields";
import { formatBool, formatDateTime } from "@/utils/displayFormat";

const CustomerAccountPanel = ({ customer }) => {
  if (!customer) return null;

  return (
    <Panel title="חשבון והטבות בחנות" icon={<FiGift />}>
      <Field label="רשום לאתר" value={formatBool(customer.isRegistered)} />
      <Field label="קופאי" value={formatBool(customer.isCashier)} />
      {/* inBlackList חוסם רק את הודעת הסקר אחרי הזמנה
          (orderController.js -> match: { inBlackList: { $ne: true } }),
          ולכן התווית מבהירה שאין מדובר בחסימת לקוח */}
      <Field
        label="ברשימה שחורה (לא מקבל סקר)"
        value={formatBool(customer.inBlackList)}
      />
      <Field
        label="מתנת הצטרפות נוצלה"
        value={formatBool(customer?.welcomeGift?.isUsed)}
      />
      <Field
        label='קופון "לקנייה הבאה" הונפק'
        value={formatBool(customer.shippingRewardIssued)}
      />
      <Field
        label="מבצעים חד-פעמיים שנוצלו"
        value={(customer.redeemedOffers || []).length}
      />
      <Field label="נוצר במערכת" value={formatDateTime(customer.createdAt)} />
      <Field label="עודכן לאחרונה" value={formatDateTime(customer.updatedAt)} />
    </Panel>
  );
};

export default CustomerAccountPanel;
