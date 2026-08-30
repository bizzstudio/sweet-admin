import React from "react";
import { useTranslation } from "react-i18next";
import SidebarContent from "@/components/sidebar/SidebarContent";

const DesktopSidebar = () => {
  const { t } = useTranslation();

  return (
    // ‎<nav> ולא ‎<aside>: זהו הניווט הראשי של הפאנל, לא תוכן משלים.
    // ‎aside מוכרז "משלים" ואינו מופיע ברשימת אזורי הניווט שקורא מסך מציע.
    <nav
      aria-label={t("mainNavigation")}
      className="z-30 flex-shrink-0 hidden shadow-sm w-64 overflow-y-auto bg-white dark:bg-gray-800 lg:block"
    >
      <SidebarContent />
    </nav>
  );
};

export default DesktopSidebar;
