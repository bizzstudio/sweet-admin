// src/components/billing/BarcodeInput.jsx
//
// הקלדת ברקוד לשורת מסמך — במקום לחפש את המוצר לפי שם.
//
// זו הדרך המהירה למלא תעודה או חשבונית: מקלידים (או סורקים) את הברקוד
// שעל האריזה, לוחצים Enter, והשורה נוספת. סורק ברקוד מתנהג כמו מקלדת
// שמקלידה מהר ומסיימת ב-Enter, ולכן אותו שדה משרת את שניהם.
//
// ההתאמה נעשית מול הקטלוג שכבר בזיכרון (ProductPicker מחזיק אותו לכל
// המסך), ולכן היא מיידית ולא ממתינה לשרת. פנייה לשרת נעשית רק כשלא
// נמצאה התאמה מקומית — הקטלוג נשמר במטמון לחמש דקות, ומוצר שנוסף אחריו
// לא יימצא בו.
//
// ⚠️ הברקוד אינו ייחודי במסד: יש 7 קבוצות של ברקוד כפול. כשיש יותר
//    מהתאמה אחת מוצגת בחירה במקום להכניס בשקט את הראשון — שורה שגויה
//    בתעודה היא חיוב על המוצר הלא נכון.

import React, { useCallback, useRef, useState } from "react";
import { Button, Input } from "@windmill/react-ui";
import { FiSearch, FiX } from "react-icons/fi";
import { MdQrCodeScanner } from "react-icons/md";

import { useCatalog, lookupBarcode } from "@/components/billing/ProductPicker";
import ProductServices from "@/services/ProductServices";

const shekel = (n) =>
  Number(n || 0).toLocaleString("he-IL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/**
 * @param {function} onPick    - נקרא עם המוצר שנבחר ({sku, barcode, name, price})
 * @param {string}   [label]
 * @param {boolean}  [autoFocus]
 */
const BarcodeInput = ({
  onPick,
  label = "הקלדת ברקוד",
  hint = "סריקה או הקלדה, ואז Enter",
  autoFocus = false,
  className = "",
}) => {
  const { products, loading } = useCatalog();
  const [code, setCode] = useState("");
  const [choices, setChoices] = useState(null);
  const [error, setError] = useState("");
  const [searching, setSearching] = useState(false);
  const inputRef = useRef(null);

  const accept = useCallback(
    (product) => {
      onPick?.(product);
      setCode("");
      setChoices(null);
      setError("");
      // המיקוד חוזר לשדה כדי שאפשר יהיה לסרוק את הפריט הבא בלי לגעת בעכבר
      inputRef.current?.focus();
    },
    [onPick]
  );

  const submit = async () => {
    const text = code.trim();
    if (!text) return;

    setError("");
    setChoices(null);

    const local = lookupBarcode(products, text);
    if (local.length === 1) return accept(local[0]);
    if (local.length > 1) return setChoices(local);

    // לא נמצא מקומית — ייתכן שהקטלוג במטמון ישן ממוצר שנוסף היום
    setSearching(true);
    try {
      const res = await ProductServices.getProductByBarcode(text);
      const found = res?.products || [];
      if (found.length === 1) return accept(found[0]);
      if (found.length > 1) return setChoices(found);
      setError(`לא נמצא מוצר עם ברקוד ${text}`);
    } catch (err) {
      setError(err?.response?.data?.message || `לא נמצא מוצר עם ברקוד ${text}`);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className={className}>
      <div className="flex items-end gap-2">
        <label className="flex-1">
          <span className="text-sm text-gray-700 dark:text-gray-400 flex items-center gap-1">
            <MdQrCodeScanner /> {label}
          </span>
          <Input
            ref={inputRef}
            className="mt-1 font-mono"
            dir="ltr"
            inputMode="numeric"
            autoFocus={autoFocus}
            value={code}
            placeholder={loading ? "טוען קטלוג..." : "1071"}
            onChange={(e) => {
              setCode(e.target.value);
              setError("");
            }}
            // Enter ולא onChange: סורק ברקוד "מקליד" תו-תו, וחיפוש בכל תו
            // היה מוצא מוצר שגוי באמצע הרצף
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              // הטופס שמסביב לא אמור להישלח בגלל Enter בשדה ברקוד
              e.preventDefault();
              submit();
            }}
          />
        </label>
        <Button
          layout="outline"
          onClick={submit}
          disabled={!code.trim() || searching}
          title="חיפוש הברקוד"
        >
          <FiSearch />
        </Button>
      </div>

      <p className="mt-1 text-xs text-gray-500">{hint}</p>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {/* יותר ממוצר אחד עם אותו ברקוד — הכרעה ידנית ולא ניחוש */}
      {choices && (
        <div className="mt-2 border border-yellow-400 rounded p-2 bg-yellow-50 dark:bg-yellow-900/20">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-yellow-800 dark:text-yellow-300">
              {choices.length} מוצרים נושאים את הברקוד {code.trim()} — יש לבחור
            </p>
            <button
              type="button"
              className="text-gray-500"
              onClick={() => setChoices(null)}
              title="סגירה"
            >
              <FiX />
            </button>
          </div>
          {choices.map((p) => (
            <button
              key={p.sku}
              type="button"
              onClick={() => accept(p)}
              className="block w-full text-right px-2 py-1 text-sm rounded hover:bg-yellow-100 dark:hover:bg-yellow-900/40"
            >
              {p.name}{" "}
              <span className="text-xs text-gray-500 font-mono">
                מק"ט {p.sku} · {p.price > 0 ? `${shekel(p.price)} ₪` : "ללא מחיר"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default BarcodeInput;
