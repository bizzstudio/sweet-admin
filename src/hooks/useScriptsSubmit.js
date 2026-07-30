// src/hooks/useScriptsSubmit.js
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import notifyApiResponse from "@/utils/notifyApiResponse";
import SettingServices from "@/services/SettingServices";

const useScriptsSubmit = () => {
    const [isSave, setIsSave] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm({
        defaultValues: {
            head: "",
            bodyStart: "",
            bodyEnd: "",
        },
    });

    // Watch form values
    const watchedValues = watch();

    // Load existing scripts data
    useEffect(() => {
        const loadScripts = async () => {
            try {
                setIsLoading(true);
                const response = await SettingServices.getStoreScriptsSetting();

                if (response) {
                    const { head = "", bodyStart = "", bodyEnd = "" } = response;
                    setValue("head", head);
                    setValue("bodyStart", bodyStart);
                    setValue("bodyEnd", bodyEnd);
                    setIsSave(false); // If data exists, it's an update
                }
            } catch (error) {
                console.error("Error loading scripts:", error);
                notifyApiResponse(error, false);
            } finally {
                setIsLoading(false);
            }
        };

        loadScripts();
    }, [setValue]);

    const onSubmit = async (data) => {
        try {
            setIsSubmitting(true);

            const response = await SettingServices.updateStoreScriptsSetting({
                setting: {
                    head: data.head || "",
                    bodyStart: data.bodyStart || "",
                    bodyEnd: data.bodyEnd || "",
                },
            });

            notifyApiResponse(response, true);
            setIsSave(false); // After successful update, it's no longer a save operation
        } catch (error) {
            console.error("Error updating scripts:", error);
            notifyApiResponse(error, false);
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        register,
        handleSubmit,
        onSubmit,
        errors,
        isSave,
        isSubmitting,
        isLoading,
        watchedValues,
        setValue,
    };
};

export default useScriptsSubmit;
