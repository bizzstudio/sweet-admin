// src/hooks/useCategorySubmit.js
import { useContext, useEffect, useState } from "react";
import { useForm } from "react-hook-form";

// Internal import
import { SidebarContext } from "@/context/SidebarContext";
import CategoryServices from "@/services/CategoryServices";
import { notifyError, notifySuccess } from "@/utils/toast";
// import useTranslationValue from "./useTranslationValue";

const useCategorySubmit = (id, data) => {
  const { isDrawerOpen, closeDrawer, setIsUpdate, lang } =
    useContext(SidebarContext);
  const [resData, setResData] = useState({});
  const [checked, setChecked] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [coloredImageUrl, setColoredImageUrl] = useState("");
  const [children, setChildren] = useState([]);
  const [language, setLanguage] = useState(lang);
  const [published, setPublished] = useState(true);
  const [selectCategoryName, setSelectCategoryName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // const { handlerTextTranslateHandler } = useTranslationValue();

  const {
    register,
    handleSubmit,
    setValue,
    clearErrors,
    reset,
    formState: { errors },
  } = useForm();

  // console.log("lang", lang, language);

  // console.log("resData", resData);

  const onSubmit = async ({ name, description, slug }) => {
    try {
      setIsSubmitting(true);

      // const nameTranslates = await handlerTextTranslateHandler(name, language);
      // const descriptionTranslates = await handlerTextTranslateHandler(
      //   description,
      //   language
      // );

      const categoryData = {
        name: {
          [language]: name,

          // ...nameTranslates,
        },
        description: {
          [language]: description || "",

          // ...descriptionTranslates,
        },
        slug: slug,
        parentId: checked ? checked : undefined,
        parentName: selectCategoryName ? selectCategoryName : "Home",
        // parentName: selectCategoryName ? selectCategoryName : 'Home',

        icon: imageUrl,
        coloredIcon: coloredImageUrl,
        status: published ? "show" : "hide",
        lang: language,
      };

      // console.log("category submit", categoryData);
      setIsSubmitting(false);

      if (id) {
        const res = await CategoryServices.updateCategory(id, categoryData);
        setIsUpdate(true);
        setIsSubmitting(false);
        notifySuccess(res.message);
        closeDrawer();
        reset();
      } else {
        const res = await CategoryServices.addCategory(categoryData);
        setIsUpdate(true);
        setIsSubmitting(false);
        notifySuccess(res.message);
        closeDrawer();
      }
      return;

    } catch (err) {
      setIsSubmitting(false);
      notifyError(err ? err?.response?.data?.message : err?.message);
      closeDrawer();
    }
  };

  const handleSelectLanguage = (lang) => {
    setLanguage(lang);
    if (Object.keys(resData).length > 0) {
      setValue("name", resData.name[lang ? lang : "en"]);
      setValue("description", resData.description[lang ? lang : "en"]);
    }
  };

  useEffect(() => {
    if (!isDrawerOpen) {
      setResData({});
      setValue("name");
      setValue("slug");
      setValue("parentId");
      setValue("parentName");
      setValue("description");
      setValue("icon");
      setImageUrl("");
      setColoredImageUrl("");
      setPublished(true);
      clearErrors("name");
      clearErrors("slug");
      clearErrors("parentId");
      clearErrors("parentName");
      clearErrors("description");
      setSelectCategoryName("Home");
      setLanguage(lang);
      setValue("language", language);

      if (data !== undefined && data[0]?._id !== undefined) {
        setChecked(data[0]._id);
      }
      return;
    }
    if (id) {
      (async () => {
        try {
          const res = await CategoryServices.getCategoryById(id);
          // console.log("res category", res);

          if (res) {
            setResData(res);
            setValue("name", res.name[language ? language : "en"]);
            setValue("slug", res.slug);
            setValue(
              "description",
              res.description[language ? language : "en"]
            );
            setValue("language", language);
            setValue("parentId", res.parentId);
            setValue("parentName", res.parentName);
            setSelectCategoryName(res.parentName);
            setChecked(res.parentId);
            setImageUrl(res.icon);
            setColoredImageUrl(res.coloredIcon);
            setPublished(res.status === "show" ? true : false);
          }
        } catch (err) {
          notifyError(err ? err.response.data.message : err.message);
        }
      })();
    }
  }, [id, setValue, isDrawerOpen, language, clearErrors, data, lang]);

  return {
    register,
    handleSubmit,
    onSubmit,
    errors,
    imageUrl,
    setImageUrl,
    children,
    setChildren,
    published,
    setPublished,
    checked,
    setChecked,
    isSubmitting,
    selectCategoryName,
    setSelectCategoryName,
    handleSelectLanguage,
    coloredImageUrl,
    setColoredImageUrl
  };
};

export default useCategorySubmit;
