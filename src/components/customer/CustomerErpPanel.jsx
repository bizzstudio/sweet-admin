// src/components/customer/CustomerErpPanel.jsx
// פרטי הלקוח שהגיעו מיבוא האקסל ("רשימת לקוחות").
// הם מסונכרנים מהקובץ וכל עריכה שלהם הייתה נדרסת ביבוא הבא, ולכן הם מוצגים
// בעמוד "צפייה בלקוח" בלבד ולא במגירת העריכה.
// שדות שהיבוא כותב גם לשדות הלקוח עצמו (אימייל, טלפון, כתובת, עיר) לא חוזרים
// כאן - הם אותם נתונים, ומוצגים פעם אחת בראש העמוד ובקטע "כתובת".
import React from "react";

import { Field, Section } from "@/components/common/ReadOnlyFields";
import {
  formatBool,
  formatDate,
  formatMoney,
  formatNumber,
  text,
} from "@/utils/displayFormat";

const CustomerErpPanel = ({ customer }) => {
  // כל עוד הלקוח לא נטען אין מה להציג, ואין טעם להבהב הודעת "אין נתונים"
  if (!customer) return null;

  const erp = customer.erp;

  if (!erp) {
    return (
      <div className="mb-6 rounded bg-gray-50 p-3 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-300">
        הלקוח נרשם בחנות ולא הגיע מיבוא האקסל.
      </div>
    );
  }

  return (
    <Section>
      <Field label="מספר לקוח" value={text(erp.customerNumber)} />
      <Field label="פעיל" value={formatBool(erp.active)} />
      <Field label="מספר זהות / ח.פ." value={text(erp.idNumber)} />
      <Field label="סוג לקוח" value={text(erp.customerType)} />
      <Field label="איש קשר" value={text(erp.contactPerson)} />
      <Field label="טלפון קווי" value={text(erp.landline)} />
      <Field label="סוכן" value={text(erp.agent)} />
      <Field label="רמת מחירון" value={formatNumber(erp.priceLevel)} />
      <Field label="תנאי תשלום" value={formatNumber(erp.paymentTerms)} />
      <Field label="% הנחה" value={formatNumber(erp.discountPercent)} />
      <Field label="נקודות" value={formatNumber(erp.points)} />
      <Field label="קנייה מצטברת" value={formatMoney(erp.cumulativePurchase)} />
      <Field label="אשראי" value={formatMoney(erp.credit)} />
      <Field label="יתרת פתיחה" value={formatMoney(erp.openingBalance)} />
      <Field label="תאריך פתיחה" value={formatDate(erp.openDate)} />
      <Field label="קנייה אחרונה" value={formatDate(erp.lastPurchaseAt)} />
      <Field label="תאריך לידה" value={formatDate(erp.birthDate)} />
      <Field label="הערות" value={text(erp.notes)} wide />
    </Section>
  );
};

export default CustomerErpPanel;
