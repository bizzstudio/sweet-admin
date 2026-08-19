import React, { useEffect, useMemo, useState } from "react";
import CreatableSelect from "react-select/creatable";
import { useTranslation } from "react-i18next";

const toCityOption = (city) => {
  if (!city || typeof city !== "object" || !city.city_name_he) {
    return null;
  }
  return {
    value: city,
    label: city.city_name_he,
  };
};

const City = ({ setValue, placeholder, value: cityValue }) => {
  const { t } = useTranslation();
  const [cities, setCities] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);

  useEffect(() => {
    (async () => {
      const response = await fetch(
        `${import.meta.env.VITE_APP_API_BASE_URL || "/api"}/cities`
      );
      const data = await response.json();
      const tempCities = data.result.records.sort((a, b) =>
        a.city_name_he.localeCompare(b.city_name_he, "he")
      );
      setCities(tempCities);
    })();
  }, []);

  const resolvedCity = useMemo(() => {
    if (cityValue && typeof cityValue === "object" && cityValue.city_name_he) {
      return cityValue;
    }
    if (placeholder) {
      try {
        const parsed = JSON.parse(placeholder);
        if (parsed && typeof parsed === "object" && parsed.city_name_he) {
          return parsed;
        }
      } catch {
        // placeholder is not JSON
      }
    }
    return null;
  }, [cityValue, placeholder]);

  useEffect(() => {
    setSelectedOption(toCityOption(resolvedCity));
  }, [resolvedCity]);

  const options = cities.map((city) => ({
    value: city,
    label: city.city_name_he,
  }));

  const customStyles = {
    control: (provided, state) => ({
      ...provided,
      borderColor: state.isFocused ? "#57ad57" : provided.borderColor,
      boxShadow: state.isFocused ? "0 0 0 1px #57ad57" : provided.boxShadow,
      "&:hover": {
        borderColor: state.isFocused ? "#57ad57" : provided.borderColor,
      },
      padding: "2px",
      direction: "rtl",
      textAlign: "right",
      minHeight: "46px",
    }),
    menu: (provided) => ({
      ...provided,
      direction: "rtl",
      textAlign: "right",
      zIndex: 9999,
    }),
    option: (provided, state) => ({
      ...provided,
      textAlign: "right",
      backgroundColor: state.isSelected
        ? "#57ad57"
        : state.isFocused
          ? "#f0fdf0"
          : provided.backgroundColor,
    }),
    placeholder: (provided) => ({
      ...provided,
      textAlign: "right",
    }),
    input: (provided) => ({
      ...provided,
      textAlign: "right",
    }),
    singleValue: (provided) => ({
      ...provided,
      textAlign: "right",
    }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  };

  const handleChange = (option) => {
    setSelectedOption(option);
    setValue(option ? option.value : null);
  };

  const handleCreate = (inputValue) => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      return;
    }
    const newCity = { city_name_he: trimmed };
    const option = toCityOption(newCity);
    setSelectedOption(option);
    setValue(newCity);
  };

  return (
    <CreatableSelect
      options={options}
      value={selectedOption}
      onChange={handleChange}
      onCreateOption={handleCreate}
      placeholder={t("SelectOrTypeCity")}
      formatCreateLabel={(inputValue) => `${t("AddCity")}: "${inputValue.trim()}"`}
      noOptionsMessage={() => t("NoCityFound")}
      styles={customStyles}
      isRtl
      isClearable
      menuPortalTarget={typeof window !== "undefined" ? document.body : null}
      menuPosition="absolute"
    />
  );
};

export default City;
