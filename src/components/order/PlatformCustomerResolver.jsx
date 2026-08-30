// src/components/order/PlatformCustomerResolver.jsx
//
// "איזה לקוח שלנו זה" — על הזמנה שהגיעה דרך פלטפורמה.
//
// ── למה המסך הזה קיים ──
//
// בהזמנה שהגיעה במייל רגיל, כתובת השולח היא הלקוח. בהזמנה שהגיעה דרך
// פלטפורמה השולח הוא no-reply@ שלה — אותה כתובת בדיוק שולחת את ההזמנות של
// **כל** המסעדות. הלקוח מזוהה רק לפי המזהה שלו אצלם, שמופיע בגוף ההודעה
// ("מס' 77521-942", "ROOMS בסר פתח תקווה").
//
// כאן הבחירה **נשמרת** על הפלטפורמה: פעם אחת אדם מכריע, ומאותו רגע כל
// ההזמנות של אותה מסעדה נקראות אוטומטית. בדיוק אותו רעיון כמו
// UnmatchedItemResolver, על לקוח במקום על מוצר.
//
// המזהים אינם מוקלדים ידנית: השרת מחלץ אותם מההודעה ומציע לקוחות שהשם שלהם
// דומה. מי שמכריע רואה מה נמצא בהודעה ולוחץ — ולא מחפש מספר בתוך מייל.

import React, { useEffect, useMemo, useState } from "react";
import { Input } from "@windmill/react-ui";
import { FiCheck, FiUserPlus } from "react-icons/fi";

import { notifyError, notifySuccess } from "@/utils/toast";
import OrderPlatformServices from "@/services/OrderPlatformServices";
import CustomerServices from "@/services/CustomerServices";

const PlatformCustomerResolver = ({ incomingOrder, onResolved }) => {
  const [suggestion, setSuggestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [saving, setSaving] = useState(false);

  const platformRef = incomingOrder.platform?.ref;

  useEffect(() => {
    let cancelled = false;

    OrderPlatformServices.getMappingSuggestion(incomingOrder._id)
      .then((res) => {
        if (cancelled) return;
        setSuggestion(res);
        // ── ברירת מחדל: כל המספרים, והשם הראשון ──
        //
        // מספר לקוח הוא המזהה היציב; השם משתנה אצלם (סניף שמשנה שם) ולכן הוא
        // תוספת ולא תחליף. סימון שניהם מראש חוסך את הקליק הנפוץ, ומי שרואה
        // מזהה שאינו שייך ללקוח יכול להוריד אותו.
        setSelectedKeys([...(res.refs || []), ...(res.names || []).slice(0, 1)]);
      })
      .catch((err) => !cancelled && notifyError(err?.response?.data?.message || err.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [incomingOrder._id]);

  // רשימת הלקוחות נטענת רק כשמישהו מחפש ידנית — ההצעות מכסות את רוב המקרים,
  // והרשימה המלאה היא בקשה כבדה (‏GET /customer מחזיר את כל הלקוחות).
  const loadCustomers = () => {
    if (customers.length || loadingCustomers) return;
    setLoadingCustomers(true);
    CustomerServices.getAllCustomers({ searchText: "" })
      .then((res) => setCustomers(Array.isArray(res) ? res : res?.customers || []))
      .catch((err) => notifyError(err?.response?.data?.message || err.message))
      .finally(() => setLoadingCustomers(false));
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (term.length < 2) return [];
    return customers
      .filter((customer) =>
        [customer.name, customer.lastName, customer.email, customer.phone]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(term))
      )
      .slice(0, 8);
  }, [customers, search]);

  const toggleKey = (key) =>
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );

  const attach = async (customer) => {
    if (!platformRef) {
      notifyError("להודעה אין פלטפורמה משויכת — יש לטפל בה במסך הפלטפורמות");
      return;
    }
    if (!selectedKeys.length) {
      notifyError("יש לסמן לפחות מזהה אחד של הלקוח בפלטפורמה");
      return;
    }

    setSaving(true);
    try {
      const res = await OrderPlatformServices.mapCustomer(platformRef, {
        customerId: customer._id,
        keys: selectedKeys,
        externalName: (suggestion?.names || [])[0],
        // מריץ מחדש את ההודעה הזו מיד — המיפוי אינו רק הגדרה לעתיד
        incomingOrderId: incomingOrder._id,
      });
      notifySuccess(res.message);
      onResolved?.();
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="mt-2 text-xs text-gray-500">טוען את המזהים מההודעה...</div>;
  }
  if (!suggestion) return null;

  const allKeys = [...(suggestion.refs || []), ...(suggestion.names || [])];

  return (
    <div className="mt-2 p-2 border border-gray-200 rounded bg-gray-50 dark:bg-gray-900 dark:border-gray-700 w-80">
      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
        המזהים שנמצאו בהודעה. מה שמסומן יישמר על{" "}
        {incomingOrder.platform?.name || "הפלטפורמה"}, וכל הזמנה הבאה עם אחד מהם
        תזוהה אוטומטית.
      </p>

      {allKeys.length ? (
        <div className="flex flex-wrap gap-1 mb-2">
          {allKeys.map((key) => {
            const active = selectedKeys.includes(key);
            return (
              <button
                key={key}
                onClick={() => toggleKey(key)}
                className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                  active
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-white text-gray-600 border-gray-300 dark:bg-gray-800"
                }`}
              >
                {active ? "✓ " : ""}
                {key}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-orange-600 mb-2">
          לא נמצאו מזהים בהודעה. אפשר למפות ידנית במסך "פלטפורמות הזמנות".
        </p>
      )}

      {suggestion.suggestions?.length > 0 && (
        <div className="space-y-1 mb-2">
          <div className="text-xs text-gray-500">לקוחות עם שם דומה:</div>
          {suggestion.suggestions.slice(0, 5).map((customer) => (
            <button
              key={customer._id}
              onClick={() => attach(customer)}
              disabled={saving || !selectedKeys.length}
              className="w-full text-right text-xs bg-white dark:bg-gray-800 hover:bg-green-50 rounded px-2 py-1.5 flex items-center justify-between disabled:opacity-40"
            >
              <span>
                {`${customer.name || ""} ${customer.lastName || ""}`.trim()}
                <span className="text-gray-500">
                  {" "}
                  · {customer.email || customer.phone || ""}
                </span>
              </span>
              <FiCheck className="w-3.5 h-3.5 text-green-600" />
            </button>
          ))}
        </div>
      )}

      <Input
        className="text-xs"
        placeholder={loadingCustomers ? "טוען לקוחות..." : "חיפוש לקוח אחר"}
        value={search}
        onFocus={loadCustomers}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filtered.length > 0 && (
        <div className="mt-1 space-y-1">
          {filtered.map((customer) => (
            <button
              key={customer._id}
              onClick={() => attach(customer)}
              disabled={saving || !selectedKeys.length}
              className="w-full text-right text-xs bg-white dark:bg-gray-800 hover:bg-green-50 rounded px-2 py-1.5 flex items-center justify-between disabled:opacity-40"
            >
              <span>{`${customer.name || ""} ${customer.lastName || ""}`.trim()}</span>
              <FiUserPlus className="w-3.5 h-3.5 text-green-600" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PlatformCustomerResolver;
