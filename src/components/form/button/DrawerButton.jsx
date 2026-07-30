// src/components/form/button/DrawerButton.jsx
import React, { useContext } from "react";
import { Button } from "@windmill/react-ui";
import { useTranslation } from "react-i18next";

// Internal import
import { SidebarContext } from "@/context/SidebarContext";
import spinnerLoadingImage from "@/assets/img/spinner.gif";

const DrawerButton = ({ id, title, isSubmitting }) => {
  const { t } = useTranslation();
  const { toggleDrawer, isDrawerOpen } = useContext(SidebarContext);

  return (
    <>
      <div
        className="fixed z-10 bottom-0 right-0 w-full py-4 lg:py-8 px-6 grid gap-4 lg:gap-6 xl:gap-6 md:flex xl:flex bg-gray-50 border-t border-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        style={{ display: !isDrawerOpen && 'none' }}
      >
        <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
          <button
            type="button"
            onClick={toggleDrawer}
            className="h-12 w-full border border-red-200 rounded-lg bg-white text-red-600 font-medium align-bottom inline-flex items-center justify-center leading-5 transition-colors duration-150 focus:outline-none hover:bg-red-50 hover:border-red-300 dark:border-red-700 dark:bg-gray-700 dark:text-red-400 dark:hover:bg-red-800 dark:hover:border-red-600 dark:hover:text-gray-200"
           >
             {t("CancelBtn")}
           </button>
        </div>

        <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
          {isSubmitting ? (
            <Button disabled={true} type="button" className="w-full h-12">
              <img
                src={spinnerLoadingImage}
                alt="Loading"
                width={20}
                height={10}
              />{" "}
              <span className="font-serif ml-2 font-light">{t("Processing")}</span>
            </Button>
          ) : (
            <Button type="submit" className="w-full h-12">
              {id ? (
                <span>
                  {t("UpdateBtn")} {title}
                </span>
              ) : (
                <span>{t("Add")} {title}</span>
              )}
            </Button>
          )}
        </div>
      </div>
    </>
  );
};

export default DrawerButton;
