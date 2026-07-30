// src/components/common/CollapsibleSection.jsx
import React, { useState } from "react";
import { FiChevronDown } from "react-icons/fi";

// קומפוננטה כללית להצגת כותרת עם אייקון (אופציונלי) ואזור תוכן נסגר/נפתח עם אנימציה.
export default function CollapsibleSection({
    title, // כותרת הסקשן
    icon, // אייקון להצגה לצד הכותרת (אופציונלי)
    defaultOpen = false, // האם לפתוח את הסקשן כברירת מחדל
    children, // תוכן פנימי שיוצג כאשר הסקשן פתוח
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    const toggleOpen = () => {
        setIsOpen((prev) => !prev);
    };

    return (
        <div className="mb-4">
            {/* כותרת + חץ */}
            <div
                className="flex justify-between items-center cursor-pointer mb-2"
                onClick={toggleOpen}
            >
                {/* כותרת עם אייקון (אופציונלי) */}
                <div className="inline-flex gap-1.5 text-xl text-gray-800 font-semibold dark:text-gray-400">
                    {icon}
                    {title}
                </div>

                {/* חץ */}
                <button
                    type="button"
                    className={`dark:text-gray-300 transform transition-transform duration-500 ${isOpen ? "rotate-180" : ""}`}
                >
                    <FiChevronDown size={24} />
                </button>
            </div>
            <hr className="mb-2.5 dark:border-gray-500" />

            {/* תוכן קורס/נפתח */}
            <div
                className={`overflow-hidden transition-all ease-in-out px-1 ${isOpen
                    ? "max-h-[150rem] overflow-y-auto scrollbar-none duration-700" // max-h גדול כדי להכיל תוכן ארוך + מעבר
                    : "max-h-0 duration-300"
                    }`}
            >
                {children}
            </div>
        </div>
    );
};