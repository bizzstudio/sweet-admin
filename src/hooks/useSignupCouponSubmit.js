import { useContext, useEffect, useState } from "react";
import { useForm } from "react-hook-form";

// Internal import
import { SidebarContext } from "@/context/SidebarContext";
import CouponServices from "@/services/CouponServices";
import { notifyError, notifySuccess } from "@/utils/toast";

// הוק לטיפול בקופון הרשמה (קופון שנותן מוצר חינם).
// נפרד לחלוטין מהוק הקופון הרגיל כדי לא לגעת בטופס הקופון הקיים.
const useSignupCouponSubmit = (id, open, onClose) => {
  const { setIsUpdate, lang } = useContext(SidebarContext);

  const [published, setPublished] = useState(true);
  const [freeProduct, setFreeProduct] = useState(null); // אובייקט מוצר מלא (option של react-select)
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    clearErrors,
    setError,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    try {
      if (!freeProduct?._id) {
        setError("freeProduct", {
          type: "manual",
          message: "יש לבחור מוצר חינם לקופון",
        });
        return;
      }
      setIsSubmitting(true);

      const couponData = {
        title: { [lang || "he"]: data.title || "קופון הרשמה" },
        couponCode: data.couponCode,
        endTime: "2500-01-01T00:00",
        freeProduct: freeProduct._id,
        status: published ? "show" : "hide",
      };

      if (id) {
        const res = await CouponServices.updateCoupon(id, couponData);
        notifySuccess(res.message);
      } else {
        const res = await CouponServices.addCoupon(couponData);
        notifySuccess(res.message);
      }

      setIsUpdate(true);
      setIsSubmitting(false);
      onClose && onClose();
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!open) return;

    // איפוס הטופס בכל פתיחה
    setValue("couponCode", "");
    setValue("title", "");
    setPublished(true);
    setFreeProduct(null);
    clearErrors();

    // טעינת נתונים בעריכה
    if (id) {
      (async () => {
        try {
          const res = await CouponServices.getCouponById(id);
          if (res) {
            setValue("couponCode", res.couponCode);
            setValue("title", res.title?.[lang || "he"] || "");
            setPublished(res.status === "show");
            setFreeProduct(res.freeProduct || null);
          }
        } catch (err) {
          notifyError(err?.response?.data?.message || err?.message);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, open]);

  return {
    register,
    handleSubmit,
    onSubmit,
    errors,
    published,
    setPublished,
    freeProduct,
    setFreeProduct,
    isSubmitting,
    setValue,
  };
};

export default useSignupCouponSubmit;
