import { useTranslation } from 'react-i18next';
import Drawer from "rc-drawer";
import React, { useContext, useEffect, useState } from "react";
import { FiX } from "react-icons/fi";
import { useLocation } from "react-router-dom";

// Internal import
import { SidebarContext } from "@/context/SidebarContext";

const MainDrawer = ({ children, product, maxWidth }) => {
  const {
    toggleDrawer,
    isDrawerOpen,
    closeDrawer,
    windowDimension
  } = useContext(SidebarContext);

  return (
    <Drawer
      open={isDrawerOpen}
      onClose={closeDrawer}
      parent={null}
      level={null}
      placement={"right"}
      width={`${windowDimension <= 575 ? "100%" : maxWidth || "50%"}`}
    >
      <button
        onClick={toggleDrawer}
        className="absolute focus:outline-none z-10 text-red-500 hover:bg-red-100 hover:text-gray-700 transition-colors duration-150 bg-white shadow-md ml-6 mt-6 left-0 right-auto w-10 h-10 rounded-full block text-center"
      >
        <FiX className="mx-auto" />
      </button>

      <div className="flex flex-col w-full h-full justify-between">
        {children}
      </div>
    </Drawer>
  );
};

export default React.memo(MainDrawer);
