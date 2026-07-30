// usePopupSubmit.js
import { useContext, useEffect, useState } from "react";
import { useForm } from "react-hook-form";

// Internal import
import { SidebarContext } from "@/context/SidebarContext";
import PopupServices from "@/services/PopupServices";
import { notifyError, notifySuccess } from "@/utils/toast";

const usePopupSubmit = (id) => {
  const { isDrawerOpen, closeDrawer, setIsUpdate, lang } =
    useContext(SidebarContext);
  const [imageUrl, setImageUrl] = useState("");
  const [resData, setResData] = useState({});
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasLink, setHasLink] = useState(false);
  const [targetBlank, setTargetBlank] = useState(false);
  const [description, setDescription] = useState("");

  const { register, handleSubmit, setValue, clearErrors, formState: { errors }, watch } = useForm();

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);

      const popupData = {
        title: data.title || '',
        subTitle: data.subTitle || '',
        description: description || '',
        image: imageUrl,
        imageHeight: data.imageHeight || '',
        pageToShow: data.pageToShow || '',
        isActive,
        link: hasLink ? data.link || '' : '',
        linkName: hasLink ? data.linkName || '' : '',
        targetBlank: hasLink ? targetBlank : false,
      };

      if (id) {
        const res = await PopupServices.updatePopup(id, popupData);
        setIsUpdate(true);
        setIsSubmitting(false);
        notifySuccess(res.message);
        closeDrawer();
      } else {
        const res = await PopupServices.addPopup(popupData);
        setIsUpdate(true);
        setIsSubmitting(false);
        notifySuccess(res.message);
        closeDrawer();
      }
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!isDrawerOpen) {
      setResData({});
      setValue("title");
      setValue("subTitle");
      setValue("description");
      setValue("link");
      setValue("linkName");
      setValue("imageHeight");
      setValue("pageToShow");
      setDescription('');
      setImageUrl("");
      clearErrors("title");
      clearErrors("subTitle");
      clearErrors("description");
      clearErrors("link");
      clearErrors("linkName");
      clearErrors("imageHeight");
      clearErrors("pageToShow");
      setIsActive(true);
      setHasLink(false);
      setTargetBlank(false);
      return;
    }
    if (id) {
      (async () => {
        try {
          const res = await PopupServices.getPopupById(id);
          if (res) {
            setResData(res);
            setValue("title", res.title);
            setValue("subTitle", res.subTitle);
            setValue("description", res.description);
            setValue("link", res.link);
            setValue("linkName", res.linkName);
            setValue("imageHeight", res.imageHeight || "");
            setValue("pageToShow", res.pageToShow);
            setDescription(res.description);
            setIsActive(res.isActive);
            setImageUrl(res.image);
            setHasLink(Boolean(res.link));
            setTargetBlank(res.targetBlank || false);
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
    setImageUrl,
    imageUrl,
    isActive,
    setIsActive,
    isSubmitting,
    hasLink,
    setHasLink,
    targetBlank,
    setTargetBlank,
    setValue,
    watch,
    description,
    setDescription,
  };
};

export default usePopupSubmit;
