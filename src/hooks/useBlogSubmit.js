// src/hooks/useBlogSubmit.js
import { useContext, useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { SidebarContext } from "@/context/SidebarContext";
import BlogServices from "@/services/BlogServices";
import { notifyError, notifySuccess } from "@/utils/toast";
import useUtilsFunction from "./useUtilsFunction";
import { t } from "i18next";

const useBlogSubmit = (id) => {
    const { isDrawerOpen, closeDrawer, setIsUpdate, lang } =
        useContext(SidebarContext);
    const { showingTranslateValue } = useUtilsFunction();

    // ---- local state ----
    const [mainImage, setMainImage] = useState("");
    const [authorImage, setAuthorImage] = useState("");
    const [tags, setTags] = useState([]);
    const [language, setLanguage] = useState(lang);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [resData, setResData] = useState({});
    const [openModal, setOpenModal] = useState(false);
    const [content, setContent] = useState("");

    // ---- react-hook-form ----
    const {
        register,
        handleSubmit,
        setValue,
        clearErrors,
        formState: { errors },
    } = useForm();

    // ---- modal handlers ----
    const onCloseModal = () => setOpenModal(false);
    const handleSelectImage = (img) => {
        setMainImage(img);
        setOpenModal(false);
    };

    // פונקציה עוזרת לעדכון שדות מתורגמים
    const updateTranslatedField = (existingData, newValue, language) => {
        // בדיקה אם יש ערך חדש ולא ריק
        if (newValue !== undefined && newValue !== null) {
            // יש ערך חדש - נוסיף/נעדכן אותו
            return {
                ...existingData,
                [language]: newValue
            };
        } else {
            // אין ערך חדש או הוא ריק - נמחק את השפה הנוכחית אם היא קיימת
            if (existingData && existingData[language]) {
                const updated = { ...existingData };
                delete updated[language];
                return Object.keys(updated).length > 0 ? updated : undefined;
            }
            return existingData;
        }
    };

    // ---- submit handler ----
    const onSubmit = async (data) => {
        try {
            console.log('onSubmit data :>> ', data);
            setIsSubmitting(true);

            // בדיקת שדות חובה
            if (!content || content.trim() === '') {
                notifyError(t("Content is required!"));
                setIsSubmitting(false);
                return;
            }

            const blogData = {
                title: updateTranslatedField(resData?.title, data.title, language),
                preview: updateTranslatedField(resData?.preview, data.preview, language),
                publishDate: data.publishDate,
                author: data.author || undefined,
                content: updateTranslatedField(resData?.content, content, language),
                mainImage: mainImage || undefined,
                authorImage: authorImage || undefined,
                category: data.category || undefined,
                slug: data.slug
                    ? data.slug
                    : data.title.toLowerCase().replace(/[^A-Z0-9]+/gi, "-"),
                status: data.status,
                tags,
            };

            if (id) {
                const res = await BlogServices.updateBlog(id, blogData);
                notifySuccess(res.message);
            } else {
                const res = await BlogServices.addBlog(blogData);
                notifySuccess(res.message);
            }
            setIsUpdate(true);
            closeDrawer();
        } catch (err) {
            notifyError(err?.response?.data?.message || err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // ---- load blog for edit ----
    useEffect(() => {
        if (!isDrawerOpen) {
            // reset local state when drawer closes
            setResData({});
            setMainImage("");
            setAuthorImage("");
            setTags([]);
            setContent("");
            setLanguage(lang);

            // איפוס שדות הטופס
            setValue("title", "");
            setValue("preview", "");
            setValue("publishDate", "");
            setValue("author", "");
            setValue("category", "");
            setValue("slug", "");
            setValue("status", "draft");

            // איפוס שגיאות
            clearErrors("title");
            clearErrors("preview");
            clearErrors("publishDate");
            clearErrors("author");
            clearErrors("category");
            clearErrors("slug");
            clearErrors("status");
            clearErrors("content");
            clearErrors();

            return;
        }
        if (id) {
            (async () => {
                try {
                    const res = await BlogServices.getBlogById(id);
                    console.log('getBlogById res :>> ', res);
                    setResData(res);

                    setValue("title", res?.title?.[language] || "");
                    setValue("preview", res?.preview?.[language] || "");
                    setContent(res?.content?.[language] || "");
                    setValue("publishDate", res?.publishDate?.slice(0, 10));
                    setValue("author", res?.author);
                    setValue("category", res?.category);
                    setValue("slug", res?.slug);
                    setValue("status", res?.status);

                    setMainImage(res?.mainImage);
                    setAuthorImage(res?.authorImage);
                    setTags(res?.tags);
                } catch (err) {
                    notifyError(err?.response?.data?.message || err.message);
                }
            })();
        }
    }, [id, isDrawerOpen, language]);

    // ---- helpers ----
    const handleSelectLanguage = (lng) => {
        setLanguage(lng);
        if (Object.keys(resData).length > 0) {
            setValue("title", resData?.title?.[lng] || "");
            setValue("preview", resData?.preview?.[lng] || "");
            setContent(resData?.content?.[lng] || "");
        }
    };

    const handleBlogSlug = (value) => {
        const slug = value
            .toLowerCase()
            .replace(/[()]+/g, "")
            .replace(/\s+/g, "-");
        setValue("slug", slug);
    };

    return {
        register,
        handleSubmit,
        onSubmit,
        errors,
        mainImage,
        setMainImage,
        authorImage,
        setAuthorImage,
        tags,
        setTags,
        isSubmitting,
        handleSelectLanguage,
        handleBlogSlug,
        openModal,
        onCloseModal,
        handleSelectImage,
        content,
        setContent,
        setValue,
    };
};

export default useBlogSubmit; 