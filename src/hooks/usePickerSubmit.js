import { useContext, useEffect, useState } from "react";
import { useForm } from "react-hook-form";

// Internal import
import { SidebarContext } from "@/context/SidebarContext";
import { notifyError, notifySuccess } from "@/utils/toast";
import StatusServices from "@/services/StatusService";

// המלקטים יושבים במודל Status יחד עם סטטוסי ההזמנות, ולכן ה-hook הזה
// עובד מול StatusServices. השדה isMelaket מסמן את הרשומה כמלקט, כדי
// שדף המלקטים לא יצטרך לנחש לפי טלפון (ראה isPickerRecord ב-Pickers).
const usePickerSubmit = (id) => {
  const { isDrawerOpen, closeDrawer, setIsUpdate } = useContext(SidebarContext);

  const {
    register,
    handleSubmit,
    setValue,
    clearErrors,
    formState: { errors },
  } = useForm();

  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);

      const pickerData = {
        heName: data.heName,
        // המודל דורש name, ולמלקט אין שם אנגלי נפרד — שם המשתמש משמש
        // כמזהה הפנימי, בדיוק כפי שהשם שימש לפני שהשדה הזה נוסף.
        name: data.username || data.heName,
        username: data.username,
        phone: data.phone || "",
        password: data.password || "",
        isActive,
        isMelaket: true,
        // צבע נדרש במודל ומשמש לתגית הסטטוס בהזמנה. ברירת מחדל צבע המותג.
        color: data.color || "#0d9e6d",
      };

      const res = id
        ? await StatusServices.updateStatus(id, pickerData)
        : await StatusServices.addStatus(pickerData);

      if (res) {
        notifySuccess(res.message || "המלקט נשמר בהצלחה");
        setIsUpdate(true);
        closeDrawer();
      }
      setIsSubmitting(false);
    } catch (err) {
      setIsSubmitting(false);
      // 409 מגיע מהשרת כששם המשתמש כבר תפוס — מוצג כמו שהוא כדי שהמשתמש
      // יבין שצריך לבחור אחר, ולא הודעת שגיאה כללית.
      notifyError(err?.response?.data?.message || err?.message);
    }
  };

  useEffect(() => {
    if (!isDrawerOpen) {
      clearErrors();
      setValue("heName", "");
      setValue("username", "");
      setValue("password", "");
      setValue("phone", "");
      setValue("color", "#0d9e6d");
      setIsActive(true);
      return;
    }

    if (id) {
      (async () => {
        try {
          const res = await StatusServices.getStatusById(id);
          if (res) {
            setValue("heName", res.heName);
            setValue("username", res.username || "");
            setValue("password", res.password || "");
            setValue("phone", res.phone || "");
            setValue("color", res.color || "#0d9e6d");
            setIsActive(res.isActive);
          }
        } catch (err) {
          notifyError(err?.response?.data?.message || err?.message);
        }
      })();
    }
  }, [id, setValue, isDrawerOpen, clearErrors]);

  return {
    register,
    handleSubmit,
    onSubmit,
    errors,
    isActive,
    setIsActive,
    isSubmitting,
  };
};

export default usePickerSubmit;
