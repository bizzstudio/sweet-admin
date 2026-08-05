import { useContext, useEffect, useState } from "react";
import { useForm } from "react-hook-form";

// Internal import
import { SidebarContext } from "@/context/SidebarContext";
import { notifyError, notifySuccess } from "@/utils/toast";
import StatusServices from "@/services/StatusService";

// המלקטים יושבים במודל Status יחד עם סטטוסי ההזמנות, ולכן ה-hook הזה
// עובד מול StatusServices. השדה isMelaket מסמן את הרשומה כמלקט, כדי
// שהשרת לא יצטרך לנחש לפי טלפון בלבד (ראה getAllMelaketim בבקאנד).
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
  // ה-name הקיים של רשומה בעריכה. רשומת מלקט משמשת גם כסטטוס הזמנה,
  // וה-name שלה מוצג במסכים אחרים — שינוי שם המשתמש לא אמור לשנות אותו.
  const [existingName, setExistingName] = useState("");

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);

      const pickerData = {
        heName: data.heName,
        // המודל דורש name, ולמלקט אין שם אנגלי נפרד — ברשומה חדשה שם
        // המשתמש משמש כמזהה הפנימי.
        name: (id && existingName) || data.username || data.heName,
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
        // הודעת השרת אנגלית ("Status created successfully!") ולא מתאימה
        // לממשק העברי, ולכן הטקסט נקבע כאן.
        notifySuccess(id ? "המלקט עודכן בהצלחה" : "המלקט נוסף בהצלחה");
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
      setExistingName("");
      return;
    }

    if (!id) return;

    // דגל הביטול מונע תגובה מעופשת: אם פותחים מלקט אחד, סוגרים ופותחים
    // אחר לפני שהבקשה הראשונה חזרה, היא הייתה נוחתת אחרונה וממלאת את
    // הטופס בפרטים של המלקט הקודם — ושמירה הייתה כותבת אותם על הנוכחי.
    let cancelled = false;

    (async () => {
      try {
        const res = await StatusServices.getStatusById(id);
        if (cancelled || !res) return;

        setExistingName(res.name || "");
        setValue("heName", res.heName);
        setValue("username", res.username || "");
        setValue("password", res.password || "");
        setValue("phone", res.phone || "");
        setValue("color", res.color || "#0d9e6d");
        // רק false מכבה במפורש — ערך חסר משאיר את המלקט פעיל, כמו
        // ברירת המחדל במודל.
        setIsActive(res.isActive !== false);
      } catch (err) {
        if (cancelled) return;
        notifyError(err?.response?.data?.message || err?.message);
      }
    })();

    return () => {
      cancelled = true;
    };
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
