// src/hooks/useUtilsFunction.js
import dayjs from "dayjs";
import "dayjs/locale/he"; // ייבוא השפה העברית

dayjs.locale("he"); // הגדרת השפה העברית כברירת מחדל

import SettingServices from "@/services/SettingServices";
import { useDispatch, useSelector } from "react-redux";
import { addSetting, removeSetting } from "@/reduxStore/slice/settingSlice";
import { useContext, useEffect, useState } from "react";
import { SidebarContext } from "@/context/SidebarContext";

const useUtilsFunction = () => {
  const dispatch = useDispatch();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { lang } = useContext(SidebarContext);

  const settings = useSelector((state) => state.setting.settingItem);

  const globalSetting = settings.find(
    (value) => value.name === "globalSetting"
  );

  const storeCustomizationSetting = settings.find(
    (value) => value.name === "storeCustomizationSetting"
  );

  // console.log("globalSetting", globalSetting);
  //for date and time format
  const showTimeFormat = (data, timeFormat) => {
    return dayjs(data).format(timeFormat);
  };

  const showDateFormat = (data) => {
    return dayjs(data).format(globalSetting?.default_date_format);
  };

  const showDateTimeFormat = (data) => {
    // return dayjs(data).format(`${globalSetting?.default_date_format}  h:mm A`);
    return dayjs(data).format("HH:mm, DD MMM' YYYY");
  };

  //for formatting number

  const getNumber = (value = 0) => {
    return Number(parseFloat(value || 0).toFixed(2));
  };

  const getNumberTwo = (value = 0) => {
    return parseFloat(value || 0).toFixed(globalSetting?.floating_number || 2);
  };

  //for translation
  const showingTranslateValue = (data) => {
    return data !== undefined && Object?.keys(data).includes(lang)
      ? data[lang]
      : data?.en;
  };

  const showingImage = (data) => {
    return data !== undefined && data;
  };

  const showingUrl = (data) => {
    return data !== undefined ? data : "!#";
  };

  const currency = globalSetting?.default_currency || "$";

  useEffect(() => {
    // console.log("globalSetting", globalSetting);
    const fetchGlobalSetting = async () => {
      try {
        setLoading(true);
        console.log("globalSetting setting not available");
        const res = await SettingServices.getGlobalSetting();
        const globalSettingData = {
          ...res,
          name: "globalSetting",
        };

        dispatch(addSetting(globalSettingData));

        setLoading(false);
      } catch (err) {
        setError(err.message);
        console.log("Error on getting storeCustomizationSetting setting", err);
      }
    };

    const fetchStoreCustomizationSetting = async () => {
      try {
        setLoading(true);
        console.log("storeCustomizationSetting setting not available");
        const res = await SettingServices.getStoreCustomizationSetting();
        const storeCustomizationSettingData = {
          ...res,
          name: "storeCustomizationSetting",
        };

        dispatch(addSetting(storeCustomizationSettingData));

        setLoading(false);
      } catch (err) {
        setError(err.message);
        console.log("Error on getting storeCustomizationSetting setting", err);
      }
    };

    if (!globalSetting) {
      fetchGlobalSetting();
    }

    if (!storeCustomizationSetting) {
      fetchStoreCustomizationSetting();
    }
  }, [globalSetting, storeCustomizationSetting]);

  return {
    error,
    loading,
    currency,
    getNumber,
    getNumberTwo,
    showTimeFormat,
    showDateFormat,
    showingImage,
    showingUrl,
    globalSetting,
    storeCustomizationSetting,
    showDateTimeFormat,
    showingTranslateValue,
  };
};

export default useUtilsFunction;
