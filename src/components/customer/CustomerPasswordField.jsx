// src/components/customer/CustomerPasswordField.jsx
// הסיסמה של הלקוח לכניסה לחנות. בניגוד לרוב המערכות הסיסמה נשמרת כאן גם
// כטקסט גלוי (plainPassword במודל הלקוח) ולא רק מוצפנת, כדי שאפשר יהיה
// לראות אותה בכרטיס, למסור אותה ללקוח ולהיכנס איתה לחנות בשמו.
// בקריאה היא מוסתרת כברירת מחדל ונחשפת בלחיצה, כדי שלא תישאר גלויה על המסך.
import React, { useState } from "react";
import { FiCopy, FiEye, FiEyeOff, FiRefreshCw } from "react-icons/fi";

import { EditableField, inputClass } from "@/components/common/EditableFields";
import { notifyError, notifySuccess } from "@/utils/toast";

// תווים שקל לקרוא ולהכתיב בטלפון: בלי 0/O, 1/l/I ותווים מיוחדים, כי הסיסמה
// נמסרת ללקוח בעל פה או בהודעה ולא מודבקת ממנהל סיסמאות
const PASSWORD_CHARS = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const GENERATED_LENGTH = 8;
// חייב להתאים ל-MIN_PASSWORD_LENGTH בשרת (controller/customerController.js).
// הבדיקה כאן היא לנוחות בלבד - השרת דוחה סיסמה קצרה בכל מקרה
const MIN_LENGTH = 6;

const generatePassword = () => {
  const values = new Uint32Array(GENERATED_LENGTH);
  window.crypto.getRandomValues(values);
  return Array.from(
    values,
    (value) => PASSWORD_CHARS[value % PASSWORD_CHARS.length]
  ).join("");
};

// כפתור עזר קטן בשורת הסיסמה. type="button" חובה: הכפתורים יושבים בתוך טופס
// העריכה של העמוד, ובלעדיו לחיצה עליהם הייתה שולחת את הטופס
const IconButton = ({ title, onClick, children }) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    onClick={onClick}
    className="flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-500 transition-colors duration-150 hover:text-mainColor-dark dark:border-gray-600 dark:text-gray-400"
  >
    {children}
  </button>
);

const CustomerPasswordField = ({
  customer,
  editing = false,
  register,
  setValue,
  error,
}) => {
  const [revealed, setRevealed] = useState(false);

  const password = customer?.plainPassword || "";
  // סיסמה קיימת שאין לה ערך גלוי: או שהלקוח קבע אותה בעצמו בחנות לפני
  // שנוסף השדה הגלוי, או שלמשתמש הנוכחי אין תפקיד שרשאי לראות סיסמאות
  // (השרת מסנן אותה). בשני המקרים אפשר רק לקבוע סיסמה חדשה במקומה
  const hasHiddenPassword = !password && !!customer?.hasPassword;

  const copyPassword = async () => {
    try {
      // ‎navigator.clipboard כלל אינו קיים בעמוד שאינו מוגש ב-HTTPS, ולכן
      // גם הגישה לשדה עצמה נכללת ב-try ולא רק ההבטחה שהוא מחזיר
      await navigator.clipboard.writeText(password);
      notifySuccess("הסיסמה הועתקה");
    } catch {
      // בדפדפן שחסם את הכתיבה ללוח חושפים את הסיסמה, כדי שאפשר יהיה
      // לסמן ולהעתיק אותה ידנית
      setRevealed(true);
      notifyError("העתקה אוטומטית נחסמה בדפדפן. הסיסמה מוצגת להעתקה ידנית.");
    }
  };

  const readValue = hasHiddenPassword ? (
    <span className="text-gray-500">מוגדרת — אינה ניתנת לצפייה</span>
  ) : !password ? (
    <span className="text-gray-500">לא הוגדרה</span>
  ) : (
    <span className="flex flex-wrap items-center gap-2">
      <span className="font-mono tracking-wider">
        {revealed ? password : "•".repeat(password.length)}
      </span>
      <IconButton
        title={revealed ? "הסתרת הסיסמה" : "הצגת הסיסמה"}
        onClick={() => setRevealed((prev) => !prev)}
      >
        {revealed ? <FiEyeOff /> : <FiEye />}
      </IconButton>
      <IconButton title="העתקת הסיסמה" onClick={copyPassword}>
        <FiCopy />
      </IconButton>
    </span>
  );

  const registered = register("password", {
    validate: (value) =>
      !value ||
      value.trim().length >= MIN_LENGTH ||
      `הסיסמה חייבת להכיל לפחות ${MIN_LENGTH} תווים`,
  });

  const control = (
    <div>
      <div className="flex items-center gap-2">
        <input
          id="password"
          // התווית בכרטיס אינה אלמנט label (היא משותפת גם לשדות עם פקד
          // מותאם), ולכן שם השדה נמסר לקוראי מסך כאן
          aria-label="סיסמה לכניסה לחנות"
          // חשוב שלא יהיה type="password" קבוע: הסיסמה נועדה להיות מוקראת
          // ונמסרת, ולכן היא ניתנת לחשיפה גם בעריכה
          type={revealed ? "text" : "password"}
          // מונע ממנהל הסיסמאות של הדפדפן למלא כאן את סיסמת המשתמש של הפאנל
          autoComplete="new-password"
          className={inputClass}
          {...registered}
        />
        <IconButton
          title={revealed ? "הסתרת הסיסמה" : "הצגת הסיסמה"}
          onClick={() => setRevealed((prev) => !prev)}
        >
          {revealed ? <FiEyeOff /> : <FiEye />}
        </IconButton>
        <IconButton
          title="יצירת סיסמה אקראית"
          onClick={() => {
            setValue?.("password", generatePassword(), {
              shouldValidate: true,
            });
            setRevealed(true);
          }}
        >
          <FiRefreshCw />
        </IconButton>
      </div>
    </div>
  );

  return (
    <EditableField
      editing={editing}
      label="סיסמה לכניסה לחנות"
      value={readValue}
      control={control}
      error={error}
      wide
      hint={
        hasHiddenPassword
          ? "ללקוח יש סיסמה שאינה ניתנת לצפייה. סיסמה שתוקלד כאן תחליף אותה."
          : "הלקוח נכנס לחנות עם כתובת האימייל שלו והסיסמה הזו. שדה ריק מבטל את הכניסה עם סיסמה (הכניסה עם קוד ב-SMS נשארת)."
      }
    />
  );
};

export default CustomerPasswordField;
