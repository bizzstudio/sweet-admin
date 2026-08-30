import React, { useContext, useEffect } from "react";
import { Transition, Backdrop } from "@windmill/react-ui";
import { useTranslation } from "react-i18next";

// Internal import
import SidebarContent from "@/components/sidebar/SidebarContent";
import { SidebarContext } from "@/context/SidebarContext";

function MobileSidebar() {
  const { t } = useTranslation();
  const { isSidebarOpen, closeSidebar } = useContext(SidebarContext);

  // Escape סוגר את התפריט. ‎Backdrop של Windmill מטפל רק בלחיצת עכבר, ולכן
  // משתמש מקלדת שפתח את התפריט לא היה יכול לסגור אותו בלי לעבור את כל
  // פריטיו — נקודת מלכודת פוקוס קלאסית.
  useEffect(() => {
    if (!isSidebarOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") closeSidebar();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isSidebarOpen, closeSidebar]);

  return (
    <Transition show={isSidebarOpen}>
      <>
        <Transition
          enter="transition ease-in-out duration-150"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition ease-in-out duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Backdrop onClick={closeSidebar} />
        </Transition>

        <Transition
          enter="transition ease-in-out duration-150"
          enterFrom="opacity-0 transform -translate-x-20"
          enterTo="opacity-100"
          leave="transition ease-in-out duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0 transform -translate-x-20"
        >
          <nav
            aria-label={t("mainNavigation")}
            className="fixed inset-y-0 z-50 flex-shrink-0 w-64 mt-16 overflow-y-auto bg-white dark:bg-gray-800 lg:hidden"
          >
            <SidebarContent />
          </nav>
        </Transition>
      </>
    </Transition>
  );
}

export default MobileSidebar;
