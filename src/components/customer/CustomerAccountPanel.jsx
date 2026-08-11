// src/components/customer/CustomerAccountPanel.jsx
// מצב החשבון וההטבות של הלקוח בחנות.
// השדות האלה נקבעים בדרך כלל על ידי החנות עצמה (הרשמה, מימוש מבצעים, קופון
// לקנייה הבאה), אבל במצב עריכה (editing) אפשר לשנות אותם ידנית מהעמוד -
// למשל כדי לשחרר ללקוח מתנת הצטרפות שנתקעה כ"נוצלה".
// מונים ותאריכי מערכת נשארים לקריאה: הם תוצאה של פעולות ולא הגדרה.
import React from "react";
import { FiGift } from "react-icons/fi";

import { BoolControl, EditableField } from "@/components/common/EditableFields";
import { Field, Panel } from "@/components/common/ReadOnlyFields";
import CustomerPasswordField from "@/components/customer/CustomerPasswordField";
import { formatBool, formatDateTime } from "@/utils/displayFormat";

const CustomerAccountPanel = ({
  customer,
  editing = false,
  form = {},
  register,
  errors = {},
}) => {
  if (!customer) return null;

  const {
    isRegistered,
    setIsRegistered,
    isCashier,
    setIsCashier,
    inBlackList,
    setInBlackList,
    welcomeGiftUsed,
    setWelcomeGiftUsed,
    shippingRewardIssued,
    setShippingRewardIssued,
    setValue,
  } = form;

  return (
    <Panel title="חשבון והטבות בחנות" icon={<FiGift />}>
      {/* הסיסמה ראשונה בכרטיס: זה השדה שבזכותו אפשר להיכנס לחנות בשם הלקוח,
          ולכן אין טעם לחפש אותו מתחת לדגלי ההטבות */}
      {register ? (
        <CustomerPasswordField
          customer={customer}
          editing={editing}
          register={register}
          setValue={setValue}
          error={errors.password}
        />
      ) : null}

      <EditableField
        editing={editing}
        label="רשום לאתר"
        value={formatBool(customer.isRegistered)}
        control={<BoolControl value={isRegistered} onChange={setIsRegistered} />}
      />
      <EditableField
        editing={editing}
        label="קופאי"
        value={formatBool(customer.isCashier)}
        control={<BoolControl value={isCashier} onChange={setIsCashier} />}
      />
      {/* inBlackList חוסם רק את הודעת הסקר אחרי הזמנה
          (orderController.js -> match: { inBlackList: { $ne: true } }),
          ולכן התווית מבהירה שאין מדובר בחסימת לקוח */}
      <EditableField
        editing={editing}
        label="ברשימה שחורה (לא מקבל סקר)"
        value={formatBool(customer.inBlackList)}
        control={<BoolControl value={inBlackList} onChange={setInBlackList} />}
      />
      <EditableField
        editing={editing}
        label="מתנת הצטרפות נוצלה"
        value={formatBool(customer?.welcomeGift?.isUsed)}
        control={
          <BoolControl value={welcomeGiftUsed} onChange={setWelcomeGiftUsed} />
        }
      />
      <EditableField
        editing={editing}
        label='קופון "לקנייה הבאה" הונפק'
        value={formatBool(customer.shippingRewardIssued)}
        control={
          <BoolControl
            value={shippingRewardIssued}
            onChange={setShippingRewardIssued}
          />
        }
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
