// src/components/customer/CustomerAccountPanel.jsx
// מצב החשבון וההטבות של הלקוח בחנות - לקריאה בלבד.
// השדות האלה נקבעים על ידי החנות (הרשמה, מימוש מבצעים, קופון לקנייה הבאה)
// ואין להם טופס עריכה, ולכן הם מוצגים בעמוד "צפייה בלקוח" בלבד ולא במגירת
// העריכה - שם מופיעים רק שדות שניתן לערוך.
import React from "react";

import { Field, Section } from "@/components/common/ReadOnlyFields";
import { formatBool, formatDateTime, text } from "@/utils/displayFormat";

const CustomerAccountPanel = ({ customer }) => {
  if (!customer) return null;

  return (
    <Section title="חשבון והטבות">
      <Field label="רשום לאתר" value={formatBool(customer.isRegistered)} />
      <Field label="קופאי" value={formatBool(customer.isCashier)} />
      <Field label="ברשימה שחורה" value={formatBool(customer.inBlackList)} />
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
      <Field label="מזהה במערכת" value={text(customer._id)} wide />
    </Section>
  );
};

export default CustomerAccountPanel;
