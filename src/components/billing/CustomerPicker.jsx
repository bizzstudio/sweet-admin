// src/components/billing/CustomerPicker.jsx
//
// בורר לקוח למסמך (הצעת מחיר / תעודת משלוח): מקלידים חלק מהשם או את מספר
// הלקוח, והרשימה מצטמצמת.
//
// למה לא <select> רגיל: יש כאן מאות לקוחות ברשימה אחת ממוינת, ומי שמכיר
// את הלקוח בשם או במספר נאלץ היה לגלול אליו. הקלדה של שתי אותיות או של
// מספר הלקוח מגיעה אליו ישירות.
//
// החיפוש עובד על שם, שם משפחה, מספר הלקוח בהנהח"ש (erp.customerNumber),
// טלפון ואימייל — אלה השדות שחוזרים מ-GET /customer, וכל אחד מהם הוא דרך
// לגיטימית שבה הלקוחה מזהה לקוח.
//
// הרשימה נטענת פעם אחת ומשותפת לכל הבוררים במסך, כמו הקטלוג ב-ProductPicker:
// בקשה אחת ולא אחת לכל שדה, ו"נסי שוב" אחרי כשל מרענן את כולם.

import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import Select, { components as rsComponents } from "react-select";
import { WindmillContext } from "@windmill/react-ui";

import CustomerServices from "@/services/CustomerServices";

const MAX_OPTIONS = 50;
// תוקף המטמון. הפאנל נשאר פתוח שעות, ובלי תפוגה לקוח שנוסף בינתיים לא
// היה מופיע בבורר עד לרענון הדף.
const CACHE_TTL_MS = 5 * 60 * 1000;

// --- מאגר לקוחות משותף ---
// loading מתחיל ב-true: הבורר הראשון שמורכב מיד מבקש את הרשימה, וכך אין
// פריים אחד שבו היא נראית ריקה במקום נטענת
let customerState = { customers: [], loading: true, failed: false, loadedAt: 0 };
let inflight = null;
const listeners = new Set();

const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const emit = () => listeners.forEach((fn) => fn());

const ensureCustomers = (force = false) => {
  if (inflight) return;
  const fresh = customerState.loadedAt > 0 && Date.now() - customerState.loadedAt < CACHE_TTL_MS;
  if (fresh && !force) return;

  customerState = { ...customerState, loading: true, failed: false };
  emit();

  inflight = CustomerServices.getAllCustomers({ searchText: "" })
    .then((res) => {
      const customers = Array.isArray(res) ? res : res?.customers || [];
      customerState = { customers, loading: false, failed: false, loadedAt: Date.now() };
    })
    .catch(() => {
      // הרשימה הקודמת נשמרת: רענון שנכשל לא ימחק את הלקוח שכבר נבחר.
      // loadedAt חוזר ל-0 כדי שהניסיון הבא באמת יפנה לשרת.
      customerState = { ...customerState, loading: false, failed: true, loadedAt: 0 };
    })
    .finally(() => {
      inflight = null;
      emit();
    });
};

/** מאגר הלקוחות המשותף, למי שצריך את הרשימה בלי הבורר. */
export const useCustomers = () => {
  const state = useSyncExternalStore(subscribe, () => customerState);
  useEffect(() => {
    ensureCustomers();
  }, []);
  return state;
};

/** מספר הלקוח בהנהח"ש, או ריק כשאין. */
export const customerNumberOf = (customer) =>
  String(customer?.erp?.customerNumber || "").trim();

/** שמו המלא של הלקוח כפי שהוא מוצג ומחופש. */
export const customerNameOf = (customer) =>
  [customer?.name, customer?.lastName].filter(Boolean).join(" ").trim();

// הערת קיצוץ בתחתית הרשימה. בלעדיה חיפוש רחב שנחתך ב-MAX_OPTIONS נראה
// כאילו הלקוח אינו קיים.
const MenuList = (props) => (
  <rsComponents.MenuList {...props}>
    {props.children}
    {props.selectProps.truncNote && (
      <div className="px-3 py-2 text-xs text-gray-500 border-t border-gray-200 dark:border-gray-700">
        {props.selectProps.truncNote}
      </div>
    )}
  </rsComponents.MenuList>
);

const SELECT_COMPONENTS = { MenuList };

/**
 * @param {string}   value    - מזהה הלקוח הנבחר
 * @param {function} onChange - נקרא עם המזהה החדש ("" כשמנקים)
 */
export default function CustomerPicker({
  value,
  onChange,
  placeholder = "חיפוש לפי שם או מספר לקוח...",
  className = "",
}) {
  const { mode } = useContext(WindmillContext);
  const { customers, loading, failed } = useSyncExternalStore(
    subscribe,
    () => customerState
  );
  const [inputValue, setInputValue] = useState("");
  // כשל שהשאיר אותנו בלי שום רשימה — רק אז אין במי לבחור
  const unusable = failed && customers.length === 0;

  useEffect(() => {
    ensureCustomers();
  }, []);

  const selected = useMemo(
    () => customers.find((c) => String(c._id) === String(value)) || null,
    [customers, value]
  );

  // סינון ידני, כמו בבורר המוצרים: react-select מרנדר את כל ההתאמות,
  // וברשימה בגודל הזה צריך לחתוך אותן. filterOption={null} מכבה את
  // הסינון הפנימי שלו.
  const options = useMemo(() => {
    const terms = inputValue.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return customers.slice(0, MAX_OPTIONS);

    const matches = [];
    for (const c of customers) {
      const haystack = `${customerNameOf(c)} ${customerNumberOf(c)} ${c.phone || ""} ${
        c.email || ""
      }`.toLowerCase();
      if (terms.every((t) => haystack.includes(t))) {
        matches.push(c);
        if (matches.length >= MAX_OPTIONS) break;
      }
    }
    return matches;
  }, [customers, inputValue]);

  const truncNote =
    options.length < MAX_OPTIONS
      ? null
      : inputValue.trim()
      ? `מוצגות ${MAX_OPTIONS} התוצאות הראשונות — כדאי לדייק את החיפוש`
      : `מוצגים ${MAX_OPTIONS} לקוחות מתוך ${customers.length} — יש להקליד שם או מספר לקוח`;

  const styles = useMemo(
    () => ({
      control: (provided, state) => ({
        ...provided,
        minHeight: "42px",
        backgroundColor: mode === "dark" ? "#374151" : "#f3f4f6",
        border: mode === "dark" ? "1px solid #4b5563" : "1px solid #e5e7eb",
        borderColor: state.isFocused ? "var(--main-color)" : provided.borderColor,
        boxShadow: state.isFocused ? "0 0 0 1px var(--main-color)" : "none",
      }),
      menuPortal: (base) => ({ ...base, zIndex: 100 }),
      menu: (provided) => ({
        ...provided,
        backgroundColor: mode === "dark" ? "#1F2937" : "#fff",
        border: mode === "dark" ? "1px solid #4b5563" : "1px solid #e5e7eb",
        zIndex: 100,
      }),
      menuList: (provided) => ({
        ...provided,
        backgroundColor: mode === "dark" ? "#1F2937" : "#fff",
        paddingTop: 0,
        paddingBottom: 0,
      }),
      option: (provided, state) => ({
        ...provided,
        padding: "6px 10px",
        backgroundColor:
          mode === "dark"
            ? state.isFocused
              ? "#334155"
              : "#1F2937"
            : state.isFocused
            ? "var(--main-color-super-light)"
            : provided.backgroundColor,
        color: mode === "dark" ? "#D1D5DB" : state.isFocused ? "#000" : provided.color,
      }),
      placeholder: (provided) => ({
        ...provided,
        fontSize: "14px",
        color: mode === "dark" ? "#9ca3af" : "#6b7280",
      }),
      input: (provided) => ({
        ...provided,
        color: mode === "dark" ? "#D1D5DB" : "#374151",
      }),
      singleValue: (provided) => ({
        ...provided,
        color: mode === "dark" ? "#D1D5DB" : "#374151",
      }),
      noOptionsMessage: (provided) => ({
        ...provided,
        backgroundColor: mode === "dark" ? "#1F2937" : "#fff",
        color: mode === "dark" ? "#D1D5DB" : "#374151",
      }),
    }),
    [mode]
  );

  const formatOptionLabel = useCallback((c, meta) => {
    const number = customerNumberOf(c);
    const name = customerNameOf(c) || "ללא שם";

    if (meta?.context === "value") {
      return (
        <span>
          {name}
          {number && (
            <span className="text-xs text-gray-500 font-mono"> · לקוח {number}</span>
          )}
        </span>
      );
    }

    return (
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate">{name}</span>
        <span className="text-xs shrink-0 font-mono text-gray-500">
          {number && (
            <span className="text-gray-700 dark:text-gray-300 font-semibold">
              לקוח {number}
            </span>
          )}
          {number && c.phone ? " · " : ""}
          {c.phone || ""}
        </span>
      </div>
    );
  }, []);

  return (
    <div className={className}>
      <Select
        value={selected}
        onChange={(opt) => onChange(opt ? String(opt._id) : "")}
        onInputChange={setInputValue}
        options={options}
        filterOption={null}
        getOptionValue={(c) => String(c._id)}
        // לקוראי מסך ולהודעות הנגישות של react-select; התצוגה עצמה מגיעה
        // מ-formatOptionLabel
        getOptionLabel={(c) =>
          `${customerNameOf(c) || "ללא שם"}${
            customerNumberOf(c) ? ` (לקוח ${customerNumberOf(c)})` : ""
          }`
        }
        formatOptionLabel={formatOptionLabel}
        components={SELECT_COMPONENTS}
        truncNote={truncNote}
        styles={styles}
        isLoading={loading}
        // כשל ברענון שאחריו נשארה רשימה קודמת עדיין מאפשר לעבוד
        isDisabled={unusable}
        isClearable
        placeholder={
          loading ? "טוען לקוחות..." : unusable ? "טעינת הלקוחות נכשלה" : placeholder
        }
        menuPortalTarget={document.body}
        menuPosition="fixed"
        menuPlacement="auto"
        noOptionsMessage={() =>
          inputValue ? "לא נמצא לקוח תואם" : "אין לקוחות ברשימה"
        }
        loadingMessage={() => "טוען..."}
      />

      {failed && (
        <p className="mt-1 text-xs text-red-600">
          {unusable
            ? "טעינת רשימת הלקוחות נכשלה."
            : "רענון רשימת הלקוחות נכשל — מוצגת הרשימה האחרונה."}{" "}
          <button type="button" className="underline" onClick={() => ensureCustomers(true)}>
            נסי שוב
          </button>
        </p>
      )}
    </div>
  );
}
