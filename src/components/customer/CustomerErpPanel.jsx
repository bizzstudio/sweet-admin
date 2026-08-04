// src/components/customer/CustomerErpPanel.jsx
// פרטי הלקוח שהגיעו מיבוא האקסל ("רשימת לקוחות").
// הם מסונכרנים מהקובץ וכל עריכה שלהם הייתה נדרסת ביבוא הבא, ולכן הם מוצגים
// בעמוד "צפייה בלקוח" בלבד ולא במגירת העריכה.
// שדות שהיבוא כותב גם לשדות הלקוח עצמו (אימייל, טלפון, כתובת, עיר) לא חוזרים
// כאן - הם אותם נתונים, ומוצגים פעם אחת בראש העמוד ובכרטיס "כתובת".
// גם מספר הלקוח וסטטוס הפעילות לא חוזרים כאן: הם מוצגים בראש העמוד.
import React from "react";
import { FiCalendar, FiPercent, FiUser } from "react-icons/fi";

import { Field, Panel, Stat } from "@/components/common/ReadOnlyFields";
import {
  formatDate,
  formatMoney,
  formatNumber,
  text,
} from "@/utils/displayFormat";

// המספרים שרוצים לראות במבט אחד, מעל כרטיסי הפירוט
export const CustomerErpStats = ({ customer }) => {
  const erp = customer?.erp;
  if (!erp) return null;

  return (
    <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Stat label="קנייה מצטברת" value={formatMoney(erp.cumulativePurchase)} />
      <Stat label="יתרת פתיחה" value={formatMoney(erp.openingBalance)} />
      <Stat label="אשראי" value={formatMoney(erp.credit)} />
      <Stat label="נקודות" value={formatNumber(erp.points)} />
    </div>
  );
};

const CustomerErpPanel = ({ customer }) => {
  // כל עוד הלקוח לא נטען אין מה להציג, ואין טעם להבהב הודעת "אין נתונים"
  if (!customer) return null;

  const erp = customer.erp;

  if (!erp) {
    return (
      <Panel title="פרטי הנהח״ש" icon={<FiUser />} span>
        <div className="sm:col-span-2 text-sm text-gray-500 dark:text-gray-300">
          הלקוח נרשם בחנות ולא הגיע מיבוא האקסל.
        </div>
      </Panel>
    );
  }

  return (
    <>
      <Panel title="פרטי לקוח" icon={<FiUser />}>
        <Field label="מספר זהות / ח.פ." value={text(erp.idNumber)} />
        <Field label="סוג לקוח" value={text(erp.customerType)} />
        <Field label="איש קשר" value={text(erp.contactPerson)} />
        <Field label="טלפון קווי" value={text(erp.landline)} />
        <Field label="סוכן" value={text(erp.agent)} />
        <Field label="תאריך לידה" value={formatDate(erp.birthDate)} />
      </Panel>

      <Panel title="תנאי מסחר" icon={<FiPercent />}>
        <Field label="רמת מחירון" value={formatNumber(erp.priceLevel)} />
        <Field label="תנאי תשלום" value={formatNumber(erp.paymentTerms)} />
        <Field label="% הנחה" value={formatNumber(erp.discountPercent)} />
      </Panel>

      <Panel title="תאריכים" icon={<FiCalendar />}>
        <Field label="תאריך פתיחה" value={formatDate(erp.openDate)} />
        <Field label="קנייה אחרונה" value={formatDate(erp.lastPurchaseAt)} />
      </Panel>
    </>
  );
};

export default CustomerErpPanel;
