// src/components/tooltip/Tooltip.jsx
import React from "react";
import { Tooltip as ReactTooltip } from "react-tooltip";

const Tooltip = ({ id, Icon, title, bgColor, className = "" }) => {
  return (
    <>
      <div
        data-tooltip-id={id}
        className={`cursor-pointer text-gray-400 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 ${className}`}
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