import React from "react";
import { Input } from "@windmill/react-ui";
import { useTranslation } from "react-i18next";

const InputArea = ({
  register,
  defaultValue,
  required,
  name,
  label,
  type,
  // ל-type="number" הדפדפן מאמת שהערך הוא כפולה של step, שברירת המחדל שלו 1.
  // בלי step="any" שדה עם ערך עשרוני (12.75) נחשב לא תקין והדפדפן חוסם את
  // שליחת הטופס. מועבר רק כשצריך, כדי לא לשנות אף שדה קיים
  step,
  autoComplete,
  placeholder,
  className = '',
}) => {

  const { t } = useTranslation();

  return (
    <>
      <Input
        {...register(`${name}`, {
          required: required ? false : `${label} ${t("isRequired")}!`,
        })}
        defaultValue={defaultValue}
        type={type}
        step={step}
        placeholder={placeholder}
        name={name}
        autoComplete={autoComplete}
        className={`ml-2 h-12 p-2 ${className}`}
      />
    </>
  );
};

export default InputArea;
