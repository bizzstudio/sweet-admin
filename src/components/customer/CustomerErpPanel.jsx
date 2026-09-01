// src/components/customer/CustomerErpPanel.jsx
// פרטי הלקוח שהגיעו מיבוא האקסל ("רשימת לקוחות").
// במצב עריכה (editing) אותם שדות עצמם הופכים לשדות קלט באותו מקום בעמוד.
// שימו לב: הם מסונכרנים מהקובץ, ויבוא הבא של אותו מספר לקוח ידרוס עריכה
// ידנית בחזרה לערכי הקובץ.
// שדות שהיבוא כותב גם לשדות הלקוח עצמו (אימייל, טלפון, כתובת, עיר) לא חוזרים
// כאן - הם אותם נתונים, ומוצגים פעם אחת בראש העמוד ובכרטיס "כתובת".
// גם מספר הלקוח וסטטוס הפעילות לא חוזרים כאן: הם מוצגים בראש העמוד.
import React from "react";
import { FiCalendar, FiPercent, FiUser } from "react-icons/fi";

import { EditableField } from "@/components/common/EditableFields";
import { Panel, Stat } from "@/components/common/ReadOnlyFields";
import {
  formatDate,
  formatMoney,
  formatNumber,
  text,
} from "@/utils/displayFormat";

// המספרים שרוצים לראות במבט אחד, מעל כרטיסי הפירוט. בעריכה הם הופכים
// לשדות קלט באותם אריחים
export const CustomerErpStats = ({ customer, editing = false, register }) => {
  const erp = customer?.erp;
  if (!erp) return null;

  const stats = [
    // ⛔ "קנייה מצטברת" הוסרה מהתצוגה (31/08/26, בקשת הלקוחה). הערך עצמו
    // עדיין מיובא מאקסל ההנהח"ש ונשמר ב-erp.cumulativePurchase — רק אינו
    // מוצג ואינו ניתן לעריכה כאן. להחזרה: להסיר את ההערה מהשורה הבאה.
    // { label: "קנייה מצטברת", name: "erpCumulativePurchase", value: erp.cumulativePurchase, money: true },
    { label: "יתרת פתיחה", name: "erpOpeningBalance", value: erp.openingBalance, money: true },
    { label: "אשראי", name: "erpCredit", value: erp.credit, money: true },
    { label: "נקודות", name: "erpPoints", value: erp.points },
  ];

  // שלושה אריחים מאז שהקנייה המצטברת הוסרה — grid-cols-4 היה משאיר
  // משבצת ריקה בקצה
  return (
    <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-3">
      {stats.map((stat) =>
        editing ? (
          <div
            key={stat.name}
            className="rounded-lg bg-white p-4 text-right dark:bg-gray-800"
          >
            <EditableField
              editing
              label={stat.label}
              name={stat.name}
              type="number"
              register={register}
            />
          </div>
        ) : (
          <Stat
            key={stat.name}
            label={stat.label}
            value={stat.money ? formatMoney(stat.value) : formatNumber(stat.value)}
          />
        )
      )}
    </div>
  );
};

const CustomerErpPanel = ({ customer, editing = false, register }) => {
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
        <EditableField
          editing={editing}
          label="מספר זהות / ח.פ."
          value={text(erp.idNumber)}
          name="erpIdNumber"
          register={register}
        />
        <EditableField
          editing={editing}
          label="סוג לקוח"
          value={text(erp.customerType)}
          name="erpCustomerType"
          register={register}
        />
        <EditableField
          editing={editing}
          label="איש קשר"
          value={text(erp.contactPerson)}
          name="erpContactPerson"
          register={register}
        />
        <EditableField
          editing={editing}
          label="טלפון קווי"
          value={text(erp.landline)}
          name="erpLandline"
          register={register}
        />
        <EditableField
          editing={editing}
          label="סוכן"
          value={text(erp.agent)}
          name="erpAgent"
          register={register}
        />
        <EditableField
          editing={editing}
          label="תאריך לידה"
          value={formatDate(erp.birthDate)}
          name="erpBirthDate"
          type="date"
          register={register}
        />
      </Panel>

      <Panel title="תנאי מסחר" icon={<FiPercent />}>
        <EditableField
          editing={editing}
          label="רמת מחירון"
          value={formatNumber(erp.priceLevel)}
          name="erpPriceLevel"
          type="number"
          register={register}
        />
        <EditableField
          editing={editing}
          label="תנאי תשלום"
          value={formatNumber(erp.paymentTerms)}
          name="erpPaymentTerms"
          type="number"
          register={register}
        />
        <EditableField
          editing={editing}
          label="% הנחה"
          value={formatNumber(erp.discountPercent)}
          name="erpDiscountPercent"
          type="number"
          register={register}
        />
      </Panel>

      <Panel title="תאריכים" icon={<FiCalendar />}>
        <EditableField
          editing={editing}
          label="תאריך פתיחה"
          value={formatDate(erp.openDate)}
          name="erpOpenDate"
          type="date"
          register={register}
        />
        <EditableField
          editing={editing}
          label="קנייה אחרונה"
          value={formatDate(erp.lastPurchaseAt)}
          name="erpLastPurchaseAt"
          type="date"
          register={register}
        />
      </Panel>
    </>
  );
};

export default CustomerErpPanel;
