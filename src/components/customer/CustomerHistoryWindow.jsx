// src/components/customer/CustomerHistoryWindow.jsx
//
// חלון ההיסטוריה של הלקוח — אותו חלון שנפתח מרשימת הלקוחות.
//
// רכיב נפרד כדי שרשימת הלקוחות תימשך רק כשהחלון נפתח: כשמגיעים מהזמנה
// הטופס אינו טוען אותה, והיא נחוצה כאן רק לשם שבכותרת. בלי השם אין מה
// שיאשר שההיסטוריה שמוצגת היא של הלקוח הנכון.

import React, { useMemo } from "react";

import { customerNameOf, useCustomers } from "@/components/billing/CustomerPicker";
import CustomerHistoryModal from "@/components/customer/CustomerHistoryModal";

const CustomerHistoryWindow = ({ customerId, ...modalProps }) => {
  const { customers } = useCustomers();
  const customerName = useMemo(
    () => customerNameOf(customers.find((c) => String(c._id) === String(customerId))),
    [customers, customerId]
  );

  return <CustomerHistoryModal {...modalProps} customerId={customerId} customerName={customerName} />;
};

export default CustomerHistoryWindow;
