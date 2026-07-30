// src/pages/Scripts.jsx
import { useTranslation } from "react-i18next";
import { Button } from "@windmill/react-ui";
import { useState, useEffect } from "react";

// Internal import
import PageTitle from "@/components/Typography/PageTitle";
import useScriptsSubmit from "@/hooks/useScriptsSubmit";
import spinnerLoadingImage from "@/assets/img/spinner.gif";
import CodeEditor from "@/components/form/input/CodeEditor";

const Scripts = () => {
    const {
        register,
        handleSubmit,
        onSubmit,
        errors,
        isSave,
        isSubmitting,
        isLoading,
        watchedValues,
        setValue
    } = useScriptsSubmit();

    const { t } = useTranslation();

    // Local state for code editors
    const [headCode, setHeadCode] = useState("");
    const [bodyStartCode, setBodyStartCode] = useState("");
    const [bodyEndCode, setBodyEndCode] = useState("");

    // Update local state when watched values change
    useEffect(() => {
        setHeadCode(watchedValues.head || "");
        setBodyStartCode(watchedValues.bodyStart || "");
        setBodyEndCode(watchedValues.bodyEnd || "");
    }, [watchedValues]);

    // Update form values when local state changes
    const handleHeadChange = (value) => {
        setValue("head", value);
    };

    const handleBodyStartChange = (value) => {
        setValue("bodyStart", value);
    };

    const handleBodyEndChange = (value) => {
        setValue("bodyEnd", value);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="flex items-center space-x-2">
                    <img
                        src={spinnerLoadingImage}
                        alt="Loading"
                        width={20}
                        height={20}
                    />
                    <span className="text-gray-600 dark:text-gray-400">{t("LoadingScripts")}</span>
                </div>
            </div>
        );
    }

    return (
        <>
            <PageTitle>{t("Scripts")}</PageTitle>
            <div className="sm:container md:p-6 p-4 w-full mx-auto bg-white dark:bg-gray-800 dark:text-gray-200 rounded-lg relative mb-5">
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="grid grid-cols-12 font-sans">
                        <div className="col-span-12 md:col-span-12 lg:col-span-12 mr-3">
                            <div className="lg:px-6 pt-4 lg:pl-40 lg:pr-40 md:pl-5 md:pr-5 flex-grow scrollbar-hide w-full max-h-full">

                                {/* Header Scripts Section */}
                                <div className="mb-8">
                                    <div className="mb-4">
                                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                                            {t("HeaderScripts")}
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {t("HeaderScriptsDescription")}
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                        <CodeEditor
                                            value={headCode}
                                            onChange={handleHeadChange}
                                            placeholder={t("HeaderScriptsPlaceholder")}
                                            height="250px"
                                            language="markup"
                                        />
                                        <input
                                            type="hidden"
                                            {...register("head")}
                                        />
                                    </div>
                                </div>

                                {/* Body Start Scripts Section */}
                                <div className="mb-8">
                                    <div className="mb-4">
                                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                                            {t("BodyStartScripts")}
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {t("BodyStartScriptsDescription")}
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                        <CodeEditor
                                            value={bodyStartCode}
                                            onChange={handleBodyStartChange}
                                            placeholder={t("BodyStartScriptsPlaceholder")}
                                            height="250px"
                                            language="markup"
                                        />
                                        <input
                                            type="hidden"
                                            {...register("bodyStart")}
                                        />
                                    </div>
                                </div>

                                {/* Body End Scripts Section */}
                                <div className="mb-8">
                                    <div className="mb-4">
                                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                                            {t("BodyEndScripts")}
                                        </h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {t("BodyEndScriptsDescription")}
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                        <CodeEditor
                                            value={bodyEndCode}
                                            onChange={handleBodyEndChange}
                                            placeholder={t("BodyEndScriptsPlaceholder")}
                                            height="250px"
                                            language="markup"
                                        />
                                        <input
                                            type="hidden"
                                            {...register("bodyEnd")}
                                        />
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </form>
                {/* Sticky Update Button */}
                <div className="sticky bottom-1 w-full flex justify-end">
                    {isSubmitting ? (
                        <Button disabled={true} type="button" className="h-12 px-8">
                            <img
                                src={spinnerLoadingImage}
                                alt="Loading"
                                width={20}
                                height={10}
                            />
                            <span className="font-serif ml-2 font-light">
                                {t("ProcessingScripts")}
                            </span>
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            className="h-12 px-8 hover:bg-blue-700 text-white"
                            onClick={handleSubmit(onSubmit)}
                        >
                            {isSave ? t("SaveScripts") : t("UpdateScripts")}
                        </Button>
                    )}
                </div>
            </div>

        </>
    );
};

export default Scripts;