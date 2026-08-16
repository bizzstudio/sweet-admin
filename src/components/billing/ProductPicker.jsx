// src/components/billing/ProductPicker.jsx
//
// בורר מוצר לשורת מסמך (הצעת מחיר וכו'): בחירה מתוך הקטלוג בלבד, לא
// הקלדה חופשית. מק"ט שהוקלד ידנית ואינו קיים בקטלוג חוזר מהשרת כשורה
// ללא מחיר וחוסם את ההפקה, ולכן עדיף שהמשתמש כלל לא יוכל להזין כזה.
//
// הקטלוג (4,320 מוצרים, ~320KB) נטען פעם אחת ומשותף לכל השורות במסך —
// בקשה אחת ולא אחת לכל שורה. הסינון מתבצע בדפדפן, ומוצגות עד MAX_OPTIONS
// תוצאות כדי שפתיחת הרשימה לא תרנדר אלפי שורות.

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

import ProductServices from "@/services/ProductServices";

const MAX_OPTIONS = 60;
// תוקף המטמון. פאנל הניהול הוא SPA שנשאר פתוח שעות, ובלי תפוגה מוצר שנוסף
// בינתיים לא היה מופיע בבורר עד לרענון הדף.
const CACHE_TTL_MS = 5 * 60 * 1000;

// --- מאגר קטלוג משותף ---
// כל הבוררים במסך קוראים מאותו מצב: בקשה אחת לכל השורות, וגם "נסי שוב"
// אחרי כשל מרענן את כולן ולא רק את השורה שנלחצה.
// loading מתחיל ב-true: הבורר הראשון שמורכב מיד מבקש את הקטלוג, וכך אין
// פריים אחד שבו הרשימה נראית ריקה במקום נטענת
let catalogState = { products: [], loading: true, failed: false, loadedAt: 0 };
let inflight = null;
const listeners = new Set();

const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const emit = () => listeners.forEach((fn) => fn());

const ensureCatalog = (force = false) => {
  if (inflight) return;
  const fresh = catalogState.loadedAt > 0 && Date.now() - catalogState.loadedAt < CACHE_TTL_MS;
  if (fresh && !force) return;

  catalogState = { ...catalogState, loading: true, failed: false };
  emit();

  inflight = ProductServices.getProductsLite()
    .then((res) => {
      const products = Array.isArray(res?.products) ? res.products : [];
      catalogState = { products, loading: false, failed: false, loadedAt: Date.now() };
    })
    .catch(() => {
      // הרשימה הקודמת נשמרת: רענון שנכשל (למשל כשנוספת שורה אחרי שפג
      // תוקף המטמון) לא ימחק מוצרים שכבר נבחרו בשורות הקיימות.
      // loadedAt חוזר ל-0 כדי שהניסיון הבא באמת יפנה לשרת.
      catalogState = { ...catalogState, loading: false, failed: true, loadedAt: 0 };
    })
    .finally(() => {
      inflight = null;
      emit();
    });
};

// הערת קיצוץ בתחתית הרשימה. בלעדיה חיפוש רחב שנחתך ב-MAX_OPTIONS נראה
// כאילו המוצר לא קיים בקטלוג.
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

const shekel = (n) =>
  Number(n || 0).toLocaleString("he-IL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function ProductPicker({
  value,
  onChange,
  placeholder = 'חיפוש מוצר לפי שם או מק"ט...',
  className = "",
}) {
  const { mode } = useContext(WindmillContext);
  const { products, loading, failed } = useSyncExternalStore(
    subscribe,
    () => catalogState
  );
  const [inputValue, setInputValue] = useState("");
  // כשל שהשאיר אותנו בלי שום רשימה — רק אז אין במה לבחור
  const unusable = failed && products.length === 0;

  useEffect(() => {
    ensureCatalog();
  }, []);

  const selected = useMemo(
    () => products.find((p) => String(p.sku) === String(value)) || null,
    [products, value]
  );

  // סינון ידני: react-select מרנדר את כל ההתאמות, ועם קטלוג בגודל הזה צריך
  // לחתוך אותן. filterOption={null} מכבה את הסינון הפנימי שלו.
  const options = useMemo(() => {
    const terms = inputValue.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return products.slice(0, MAX_OPTIONS);

    const matches = [];
    for (const p of products) {
      const haystack = `${p.name} ${p.sku}`.toLowerCase();
      if (terms.every((t) => haystack.includes(t))) {
        matches.push(p);
        if (matches.length >= MAX_OPTIONS) break;
      }
    }
    return matches;
  }, [products, inputValue]);

  const truncNote =
    options.length < MAX_OPTIONS
      ? null
      : inputValue.trim()
      ? `מוצגות ${MAX_OPTIONS} התוצאות הראשונות — כדאי לדייק את החיפוש`
      : `מוצגים ${MAX_OPTIONS} מוצרים מתוך ${products.length} — יש להקליד שם או מק"ט`;

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

  const formatOptionLabel = useCallback((p, meta) => {
    if (meta?.context === "value") {
      return (
        <span>
          {p.name} <span className="text-xs text-gray-500">({p.sku})</span>
        </span>
      );
    }
    return (
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate">{p.name}</span>
        <span className="text-xs text-gray-500 shrink-0 font-mono">
          {p.sku} · {p.price > 0 ? `${shekel(p.price)} ₪` : "ללא מחיר קטלוג"}
        </span>
      </div>
    );
  }, []);

  return (
    <div className={className}>
      <Select
        value={selected}
        onChange={(opt) => onChange(opt ? String(opt.sku) : "")}
        onInputChange={setInputValue}
        options={options}
        filterOption={null}
        getOptionValue={(p) => String(p.sku)}
        // לקוראי מסך ולהודעות הנגישות של react-select; התצוגה עצמה מגיעה
        // מ-formatOptionLabel
        getOptionLabel={(p) => `${p.name} (${p.sku})`}
        formatOptionLabel={formatOptionLabel}
        components={SELECT_COMPONENTS}
        truncNote={truncNote}
        styles={styles}
        isLoading={loading}
        // כשל ברענון שאחריו נשארה רשימה קודמת עדיין מאפשר לעבוד
        isDisabled={unusable}
        isClearable
        placeholder={
          loading ? "טוען קטלוג..." : unusable ? "טעינת הקטלוג נכשלה" : placeholder
        }
        menuPortalTarget={document.body}
        menuPosition="fixed"
        menuPlacement="auto"
        noOptionsMessage={() =>
          inputValue ? "לא נמצא מוצר תואם" : "אין מוצרים בקטלוג"
        }
        loadingMessage={() => "טוען..."}
      />

      {failed && (
        <p className="mt-1 text-xs text-red-600">
          {unusable ? "טעינת הקטלוג נכשלה." : "רענון הקטלוג נכשל — מוצגת הרשימה האחרונה."}{" "}
          <button
            type="button"
            className="underline"
            onClick={() => ensureCatalog(true)}
          >
            נסי שוב
          </button>
        </p>
      )}
    </div>
  );
}
