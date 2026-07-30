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
        placeholder={placeholder}
        name={name}
        autoComplete={autoComplete}
        className={`ml-2 h-12 p-2 ${className}`}
      />
    </>
  );
};

export default InputArea;
