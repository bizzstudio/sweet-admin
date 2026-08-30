// src/components/tooltip/Tooltip.jsx
import React from "react";
import { Tooltip as ReactTooltip } from "react-tooltip";

const Tooltip = ({ id, Icon, title, bgColor, className = "" }) => {
  return (
    <>
      {/* ‎aria-hidden: ה-tooltip של react-tooltip מוצג בריחוף עכבר בלבד
          ואינו שם נגיש. השם האמיתי מגיע מ-‎aria-label של הכפתור העוטף
          (ראה components/table/EditDeleteButton.jsx), וללא ההסתרה כאן
          האייקון היה מוסיף רעש כפול לקורא המסך. */}
      <div
        aria-hidden="true"
        data-tooltip-id={id}
        className={`cursor-pointer text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 ${className}`}
      >
        <Icon className="text-lg" />
      </div>
      <ReactTooltip
        id={id}
        backgroundColor={bgColor}
        place="top"
        effect="solid"
      >
        <span className="text-sm font-medium text-white">{title}</span>
      </ReactTooltip>
    </>
  );
};

export default Tooltip;