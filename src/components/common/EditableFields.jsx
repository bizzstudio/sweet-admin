// src/components/common/EditableFields.jsx
// שדות שמתחלפים במקום בין תצוגה לעריכה, לעמודי "צפייה בלקוח" ו"פרטי מוצר".
// העריכה נעשית באותו עמוד ובאותה פריסה - לא נפתחת מגירה ולא חלון - ולכן
// שדה בעריכה יושב בדיוק במקום שבו הוא מוצג בקריאה, באותה רשת שדות
// (Field ב-ReadOnlyFields), והמסך לא "קופץ" במעבר בין המצבים.
import React from "react";

import Error from "@/components/form/others/Error";
import spinnerLoadingImage from "@/assets/img/spinner.gif";

export const inputClass =
  "mt-1 block w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-mainColor focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200";

// editing=false מציג את value בדיוק כמו Field; editing=true מציג שדה קלט.
// control מאפשר להעביר פקד משלך (מתג, בורר קטגוריה, העלאת תמונה) במקום
// שדה הטקסט הרגיל
export const EditableField = ({
  editing = false,
  label,
  value,
  name,
  register,
  required = false,
  type = "text",
  // ל-type="number" הדפדפן חוסם ערך עשרוני בלי step="any", כי ברירת המחדל
  // של step היא 1 (אותה בעיה שקיימת ב-InputArea)
  step,
  rows,
  textarea = false,
  options,
  control,
  error,
  hint,
  disabled = false,
  wide = false,
  // רץ אחרי ה-onChange של react-hook-form, לשדות שדורשים נרמול תוך כדי
  // הקלדה (כמו ה-slug של המוצר, שמנורמל גם במגירה)
  onValueChange,
}) => {
  const renderControl = () => {
    if (control) return control;
    if (!register || !name) return null;

    const rules = { required: required ? `${label} הוא שדה חובה` : false };
    const disabledClass = disabled ? " cursor-not-allowed opacity-60" : "";

    if (options) {
      return (
        <select
          id={name}
          disabled={disabled}
          className={inputClass + disabledClass}
          {...register(name, rules)}
        >
          {options.map((option) => (
            <option key={String(option.value)} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    if (textarea) {
      return (
        <textarea
          id={name}
          rows={rows || 3}
          disabled={disabled}
          className={inputClass + disabledClass}
          {...register(name, rules)}
        />
      );
    }

    const registered = register(name, rules);

    return (
      <input
        id={name}
        type={type}
        step={step || (type === "number" ? "any" : undefined)}
        disabled={disabled}
        // גלגלת העכבר משנה ערך בשדה מספרי ממוקד בכרום ובפיירפוקס. בעמוד
        // ארוך עם מחירים, מלאי ויתרות זה שינוי שקט של נתונים תוך כדי גלילה,
        // ולכן השדה מאבד מיקוד במקום להשתנות
        onWheel={
          type === "number" ? (event) => event.currentTarget.blur() : undefined
        }
        className={inputClass + disabledClass}
        {...registered}
        onChange={(event) => {
          registered.onChange(event);
          onValueChange?.(event.target.value);
        }}
      />
    );
  };

  // כשיש שדה טופס אמיתי התווית מקושרת אליו, כדי שלחיצה עליה תמקד את השדה
  // וקוראי מסך יקריאו את השם הנכון. לפקד מותאם (control) אין מזהה כזה
  const labelFor = editing && name && !control ? name : undefined;
  const LabelTag = labelFor ? "label" : "div";

  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <LabelTag
        htmlFor={labelFor}
        className="block text-xs text-gray-500 dark:text-gray-400"
      >
        {label}
      </LabelTag>

      {editing ? (
        <>
          {renderControl()}
          {hint ? (
            <div className="mt-1 text-xs text-gray-400">{hint}</div>
          ) : null}
          <Error errorName={error} />
        </>
      ) : (
        <div className="text-sm font-medium text-gray-700 dark:text-gray-200 break-words whitespace-pre-wrap">
          {value}
        </div>
      )}
    </div>
  );
};

// בורר כן/לא לשדות בוליאניים שמנוהלים כסטייט ולא כשדה של הטופס
// (isVatFree וחבריו ב-useProductSubmit)
export const BoolControl = ({ value, onChange }) => (
  <select
    className={inputClass}
    value={value ? "yes" : "no"}
    onChange={(e) => onChange?.(e.target.value === "yes")}
  >
    <option value="yes">כן</option>
    <option value="no">לא</option>
  </select>
);

// עוטף את פונקציית השליחה של הטופס כך שרק כפתור השמירה של העמוד באמת שומר.
// טופס העריכה עוטף מסך שלם ובתוכו יושבים רכיבים מכל מיני מקורות (העלאת
// תמונות, בורר קטגוריות, כרטיס המחירון); כפתור פנימי שנשכח בלי type="button"
// היה נחשב לכפתור שליחה ושומר את הרשומה בטעות.
// שליחה במקש Enter, ודפדפן שאינו מדווח submitter, ממשיכים לשמור כרגיל
export const onlySaveButtonSubmits = (submitHandler) => (event) => {
  const submitter = event?.nativeEvent?.submitter;
  if (submitter && submitter.dataset?.pageSave !== "true") {
    event.preventDefault();
    return undefined;
  }
  return submitHandler(event);
};

// כפתורי מצב העריכה. השמירה היא type="submit" ולכן חייבת לשבת בתוך הטופס
// של העמוד - זה מה שמחליף את כפתור השמירה שהיה בתחתית המגירה
export const EditActions = ({
  editing,
  onEdit,
  onCancel,
  isSubmitting,
  // חוסם שמירה בלבד (למשל בזמן שהערכים עדיין נטענים לטופס). "ביטול" נשאר
  // פעיל כדי שתמיד אפשר לצאת ממצב העריכה
  saveDisabled = false,
  editLabel = "עריכה",
  saveLabel = "שמירה",
  icon = null,
}) => {
  // ה-key חובה כאן: בלעדיו React ממחזר את אותו צומת DOM בין "עריכה" לבין
  // "שמירה" ורק מחליף לו type ל-submit. הדפדפן מבצע את פעולת ברירת המחדל
  // של הקליק אחרי שהעדכון כבר הוחל, כלומר עצם הלחיצה על "עריכה" הייתה
  // שולחת את הטופס ושומרת מיד. key שונה מאלץ יצירת כפתור חדש
  if (!editing) {
    return (
      <button
        key="edit"
        type="button"
        onClick={onEdit}
        className="flex cursor-pointer items-center gap-2 rounded-md border border-transparent bg-mainColor px-5 py-2 text-sm font-medium leading-5 text-white transition-colors duration-150 hover:bg-mainColor-dark focus:outline-none active:bg-mainColor-dark"
      >
        {icon} {editLabel}
      </button>
    );
  }

  return (
    <>
      <button
        key="save"
        type="submit"
        data-page-save="true"
        disabled={isSubmitting || saveDisabled}
        className="flex cursor-pointer items-center gap-2 rounded-md border border-transparent bg-mainColor px-5 py-2 text-sm font-medium leading-5 text-white transition-colors duration-150 hover:bg-mainColor-dark focus:outline-none active:bg-mainColor-dark disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? (
          <img src={spinnerLoadingImage} alt="" width={18} height={18} />
        ) : null}
        {saveLabel}
      </button>

      <button
        key="cancel"
        type="button"
        onClick={onCancel}
        disabled={isSubmitting}
        className="flex items-center gap-2 rounded-md border border-gray-200 px-5 py-2 text-sm font-medium leading-5 text-gray-600 transition-colors duration-150 hover:text-mainColor-dark focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:text-gray-300"
      >
        ביטול
      </button>
    </>
  );
};
