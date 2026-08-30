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
      {/* ‎LabelArea מרנדר ‎<Label> ללא ‎htmlFor, ו-‎InputArea רינדר ‎<Input>
          ללא ‎id — כלומר בכל 260 השדות של הפאנל אף תווית לא הייתה מקושרת
          לשדה שלה. ויזואלית זה נראה תקין, אבל קורא מסך שנכנס לשדה הכריז
          "עריכת טקסט" בלי לומר איזה שדה זה.

          ‎id={name} מאפשר קישור אמיתי (‎LabelArea מקבל עכשיו ‎htmlFor), ו-
          ‎aria-label נותן שם גם ב-167 מקומות הקריאה שעדיין לא הועברו — כך
          שכל שדה מקבל שם מיידית בלי שינוי בכל אתר קריאה. */}
      <Input
        {...register(`${name}`, {
          required: required ? false : `${label} ${t("isRequired")}!`,
        })}
        id={name}
        aria-label={label}
        aria-required={!required || undefined}
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
