// src/hooks/useOfferSubmit.js
import { useContext, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation } from "react-router-dom";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";

// Internal import
import { SidebarContext } from "@/context/SidebarContext";
import OfferServices from "@/services/OfferServices";
import { notifyError } from "@/utils/toast";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import notifyApiResponse from "@/utils/notifyApiResponse";

const useOfferSubmit = (id) => {
  const location = useLocation();
  const { t } = useTranslation();
  const { isDrawerOpen, closeDrawer, setIsUpdate, lang } = useContext(SidebarContext);
  const [language, setLanguage] = useState(lang);
  const [products, setProducts] = useState([]);
  const [rewardProducts, setRewardProducts] = useState([]);
  const [triggerProduct, setTriggerProduct] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { setServiceId } = useToggleDrawer();

  const {
    handleSubmit,
    register,
    setValue,
    setError,
    clearErrors,
    trigger,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      type: "BUNDLE_PRICE",
      isActive: true,
      oncePerCustomer: false,
      forNewCustomersOnly: false,
      allowStackingWithOtherOffers: true,
      rewardQuantity: 1,
      discountType: "percentage",
    }
  });

  const offerType = watch("type");

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);

      const {
        name,
        description,
        type,
        isActive,
        startsAt,
        endsAt,
        oncePerCustomer,
        forNewCustomersOnly,
        allowStackingWithOtherOffers,
        quantity,
        price,
        thresholdAmount,
        rewardPrice,
        rewardQuantity,
        triggerQuantity,
        discountType,
        discountValue
      } = data;

      // Clear previous errors
      clearErrors();

      // Track validation errors
      let validationErrors = false;

      // Base validation
      if (!name || name.trim() === "") {
        setError("name", { type: "manual", message: t("offerNameRequired") });
        validationErrors = true;
      }

      // Type-specific validation
      if (type === "BUNDLE_PRICE" || !type) {
        if (!quantity || quantity <= 0) {
          setError("quantity", { type: "manual", message: t("minimumQuantityIs1") });
          validationErrors = true;
        }
        if (!price || price <= 0) {
          setError("price", { type: "manual", message: t("minimumPriceIs1") });
          validationErrors = true;
        }
        // if (!products || products.length === 0) {
        //   setError("products", { type: "manual", message: t("pleaseSelectAtLeastOneProduct") });
        //   validationErrors = true;
        // }
      }
      else if (type === "THRESHOLD_GET_ITEM") {
        if (!thresholdAmount || thresholdAmount <= 0) {
          setError("thresholdAmount", { type: "manual", message: t("thresholdAmountMustBeGreaterThan0") });
          validationErrors = true;
        }
        if (!rewardProducts || rewardProducts.length === 0) {
          setError("rewardProduct", { type: "manual", message: t("pleaseSelectRewardProduct") });
          validationErrors = true;
        }
        if (rewardPrice === undefined || rewardPrice < 0) {
          setError("rewardPrice", { type: "manual", message: t("rewardPriceMustBe0OrGreater") });
          validationErrors = true;
        }
      }
      else if (type === "THRESHOLD_DISCOUNT") {
        if (!thresholdAmount || thresholdAmount <= 0) {
          setError("thresholdAmount", { type: "manual", message: t("thresholdAmountMustBeGreaterThan0") });
          validationErrors = true;
        }
        if (!discountType) {
          setError("discountType", { type: "manual", message: t("pleaseSelectDiscountType") });
          validationErrors = true;
        }
        if (discountValue === undefined || discountValue <= 0) {
          setError("discountValue", { type: "manual", message: t("discountValueMustBeGreaterThan0") });
          validationErrors = true;
        }
        if (discountType === "percentage" && discountValue > 100) {
          setError("discountValue", { type: "manual", message: t("percentageCannotExceed100") });
          validationErrors = true;
        }
      }
      else if (type === "BUY_X_GET_Y") {
        if (!triggerProduct) {
          setError("triggerProduct", { type: "manual", message: t("pleaseSelectTriggerProduct") });
          validationErrors = true;
        }
        if (!triggerQuantity || triggerQuantity <= 0) {
          setError("triggerQuantity", { type: "manual", message: t("triggerQuantityMustBeGreaterThan0") });
          validationErrors = true;
        }
        if (!rewardProducts || rewardProducts.length === 0) {
          setError("rewardProduct", { type: "manual", message: t("pleaseSelectRewardProduct") });
          validationErrors = true;
        }
        if (rewardPrice === undefined || rewardPrice < 0) {
          setError("rewardPrice", { type: "manual", message: t("rewardPriceMustBe0OrGreater") });
          validationErrors = true;
        }
      }
      else if (type === "WELCOME_GIFT") {
        if (!rewardProducts || rewardProducts.length === 0) {
          setError("rewardProduct", { type: "manual", message: t("pleaseSelectRewardProduct") });
          validationErrors = true;
        }
        if (!rewardQuantity || rewardQuantity <= 0) {
          setError("rewardQuantity", { type: "manual", message: t("minimumQuantityIs1") });
          validationErrors = true;
        }
      }

      // If there are validation errors, prevent submission
      if (validationErrors) {
        setIsSubmitting(false);
        return;
      }

      // Build base offer data
      const offerData = {
        name: { [language]: name },
        type: type || "BUNDLE_PRICE",
        isActive: isActive !== undefined ? isActive : true,
        oncePerCustomer: oncePerCustomer || false,
        forNewCustomersOnly: forNewCustomersOnly || false,
        allowStackingWithOtherOffers:
          allowStackingWithOtherOffers !== undefined
            ? Boolean(allowStackingWithOtherOffers)
            : true,
      };

      // Add optional fields
      if (description) offerData.description = { [language]: description };
      if (imageUrl) offerData.image = imageUrl;
      if (startsAt) offerData.startsAt = dayjs(startsAt).toISOString();
      if (endsAt) offerData.endsAt = dayjs(endsAt).toISOString();

      // Type-specific data
      if (type === "BUNDLE_PRICE" || !type) {
        offerData.quantity = quantity;
        offerData.price = price;
        offerData.products = products.map(p => p._id);
      }
      else if (type === "THRESHOLD_GET_ITEM") {
        offerData.thresholdAmount = thresholdAmount;
        offerData.rewardProducts = rewardProducts.map(p => p._id);
        offerData.rewardProduct = rewardProducts[0]._id;
        offerData.rewardPrice = rewardPrice;
        offerData.rewardQuantity = rewardQuantity || 1;
      }
      else if (type === "THRESHOLD_DISCOUNT") {
        offerData.thresholdAmount = thresholdAmount;
        offerData.discountType = discountType;
        offerData.discountValue = discountValue;
      }
      else if (type === "BUY_X_GET_Y") {
        offerData.triggerProduct = triggerProduct._id;
        offerData.triggerQuantity = triggerQuantity;
        offerData.rewardProducts = rewardProducts.map(p => p._id);
        offerData.rewardProduct = rewardProducts[0]._id;
        offerData.rewardPrice = rewardPrice;
        offerData.rewardQuantity = rewardQuantity || 1;
      }
      else if (type === "WELCOME_GIFT") {
        offerData.rewardProducts = rewardProducts.map(p => p._id);
        offerData.rewardProduct = rewardProducts[0]._id;
        offerData.rewardQuantity = rewardQuantity || 1;
        offerData.rewardPrice = 0;
        offerData.forNewCustomersOnly = true;
        offerData.oncePerCustomer = true;
      }

      if (id) {
        const res = await OfferServices.updateOffer(id, offerData);
        setIsUpdate(true);
        setIsSubmitting(false);
        notifyApiResponse(res, true);
        closeDrawer();
        setServiceId();
      } else {
        const res = await OfferServices.addOffer(offerData);
        setIsUpdate(true);
        setIsSubmitting(false);
        notifyApiResponse(res, true);
        closeDrawer();
        setServiceId();
      }
    } catch (err) {
      notifyApiResponse(err, false);
      setIsSubmitting(false);
      setServiceId();
    }
  };

  const handleSelectLanguage = (lang) => {
    setLanguage(lang);
    // if (Object.keys(resData).length > 0) {
    //   setValue("title", resData.title[lang ? lang : "en"]);
    //   setValue("name", resData.name[lang ? lang : "en"]);
    //   // console.log('change lang', lang);
    // }
  };

  useEffect(() => {
    // Reset form when drawer is closed
    if (!isDrawerOpen) {
      reset({
        name: "",
        description: "",
        type: "BUNDLE_PRICE",
        isActive: true,
        oncePerCustomer: false,
        forNewCustomersOnly: false,
        allowStackingWithOtherOffers: true,
        startsAt: "",
        endsAt: "",
        quantity: "",
        price: "",
        thresholdAmount: "",
        rewardPrice: "",
        rewardQuantity: 1,
        triggerQuantity: "",
        discountType: "percentage",
        discountValue: "",
      });
      setProducts([]);
      setRewardProducts([]);
      setTriggerProduct(null);
      setImageUrl("");
      setLanguage(lang);
      return;
    }

    // Load data when drawer opens with an id
    if (id && isDrawerOpen) {
      (async () => {
        try {
          const res = await OfferServices.getOfferById(id);
          if (res) {
            // Prepare data for reset
            const formData = {
              name: res.name[language] || "",
              description: res.description?.[language] || "",
              type: res.type || "BUNDLE_PRICE",
              isActive: res.isActive !== undefined ? res.isActive : true,
              oncePerCustomer: res.oncePerCustomer || false,
              forNewCustomersOnly: res.forNewCustomersOnly || false,
              allowStackingWithOtherOffers:
                res.allowStackingWithOtherOffers !== false,
              startsAt: res.startsAt ? dayjs(res.startsAt).format("YYYY-MM-DDTHH:mm") : "",
              endsAt: res.endsAt ? dayjs(res.endsAt).format("YYYY-MM-DDTHH:mm") : "",
            };
            setImageUrl(res.image || "");

            // Add type-specific fields
            if (res.type === "BUNDLE_PRICE" || !res.type) {
              formData.quantity = res.quantity || "";
              formData.price = res.price || "";
              setProducts(res.products || []);
            }
            else if (res.type === "THRESHOLD_GET_ITEM") {
              formData.thresholdAmount = res.thresholdAmount || "";
              formData.rewardPrice = res.rewardPrice || 0;
              formData.rewardQuantity = res.rewardQuantity || 1;
              setRewardProducts(
                res.rewardProducts?.length
                  ? res.rewardProducts
                  : res.rewardProduct
                    ? [res.rewardProduct]
                    : []
              );
            }
            else if (res.type === "THRESHOLD_DISCOUNT") {
              formData.thresholdAmount = res.thresholdAmount || "";
              formData.discountType = res.discountType || "percentage";
              formData.discountValue = res.discountValue || "";
            }
            else if (res.type === "BUY_X_GET_Y") {
              formData.triggerQuantity = res.triggerQuantity || "";
              formData.rewardPrice = res.rewardPrice || 0;
              formData.rewardQuantity = res.rewardQuantity || 1;
              setTriggerProduct(res.triggerProduct || null);
              setRewardProducts(
                res.rewardProducts?.length
                  ? res.rewardProducts
                  : res.rewardProduct
                    ? [res.rewardProduct]
                    : []
              );
            }
            else if (res.type === "WELCOME_GIFT") {
              formData.rewardQuantity = res.rewardQuantity || 1;
              setRewardProducts(
                res.rewardProducts?.length
                  ? res.rewardProducts
                  : res.rewardProduct
                    ? [res.rewardProduct]
                    : []
              );
            }

            reset(formData);
          }
        } catch (err) {
          notifyError(err?.response?.data?.message || err?.message);
        }
      })();
    }
  }, [id, isDrawerOpen, location, language, lang, reset]);

  return {
    handleSubmit,
    onSubmit,
    register,
    errors,
    products,
    setProducts,
    rewardProducts,
    setRewardProducts,
    triggerProduct,
    setTriggerProduct,
    imageUrl,
    setImageUrl,
    isSubmitting,
    handleSelectLanguage,
    offerType,
    setValue,
    watch,
  };
};

export default useOfferSubmit;
