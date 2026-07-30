// src/utils/notifyApiResponse.js
import { notifyError, notifySuccess } from "@/utils/toast";
import Cookies from "js-cookie";

const notifyApiResponse = (response, success = Boolean) => {
    // קבלת השפה מ-Cookies במקרה ואין context
    let lang = Cookies.get("i18next") || "en";
    if (lang === "he-IL") lang = "he";

    const message = response?.data?.message || response?.response?.data?.message || response?.message;

    if (success) {
        // הצלחה
        const successMessage = message?.[lang] || (lang === "he" ? "הפעולה הצליחה!" : "Action succeeded!");
        notifySuccess(successMessage);
    } else {
        // כישלון
        const errorMessage = message?.[lang] || message || (lang === "he" ? "התרחשה שגיאה!" : "An error occurred!");
        notifyError(errorMessage);
    }
};

export default notifyApiResponse;