import React, { useState } from "react";
import { NavLink, Route } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  IoChevronDownOutline,
  IoChevronBackOutline,
  IoRemoveSharp,
} from "react-icons/io5";

const SidebarSubMenu = ({ route }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <li className="relative px-6 py-3" key={route.name}>
        {/* ‎focus:outline-none ביטל את סימון הפוקוס בלי תחליף — בסרגל שכולו
            ניווט זו העצירה הבודדת שמשתמש מקלדת מאבד. הוא מוסר, והשכבה
            הגלובלית ב-assets/css/custom.css מספקת טבעת ב-‎:focus-visible.
            ‎aria-haspopup="true" בלי ‎aria-expanded אמר לקורא המסך שיש כאן
            תפריט — אבל לא אם הוא פתוח כרגע או סגור. */}
        <button
          type="button"
          className="inline-flex items-center justify-between w-full text-sm font-semibold transition-colors duration-150 hover:text-customGreen-dark dark:hover:text-gray-200 min-h-[44px]"
          onClick={() => setOpen(!open)}
          aria-haspopup="true"
          aria-expanded={open}
          aria-controls={`submenu-${route.name}`}
        >
          <span className="inline-flex items-center">
            <route.icon className="w-5 h-5" aria-hidden="true" />
            <span className="mr-4 mt-1">{t(`${route.name}`)}</span>
            <span aria-hidden="true" className="pr-4 mt-1">
              {open ? <IoChevronDownOutline /> : <IoChevronBackOutline />}
            </span>
          </span>
        </button>
        {open && (
          <ul
            id={`submenu-${route.name}`}
            className="p-2 overflow-hidden text-sm font-medium text-gray-600 rounded-md bg-gray-100 dark:text-gray-300 dark:bg-gray-900"
            aria-label={t("subMenu")}
          >
            {route.routes.map((child, i) => (
              <li key={i + 1}>
                {child?.outside ? (
                  child?.outside == "store" ?
                    <a
                      href={import.meta.env.VITE_APP_STORE_DOMAIN}
                      target="_blank"
                      className="flex items-center font-serif py-2.5 min-h-[44px] text-sm text-gray-700 dark:text-gray-300 hover:text-customGreen-dark cursor-pointer"
                      // activeStyle={{
                      //   color: "#0d9e6d",
                      // }}
                      rel="noreferrer"
                    >
                      <Route path={child.path} exact={child.exact}>
                        <span
                          className="absolute inset-y-0 left-0 w-1 bg-customGreen rounded-tr-lg rounded-br-lg"
                          aria-hidden="true"
                        ></span>
                      </Route>
                      {/* <route.icon className="w-5 h-5" aria-hidden="true" /> */}
                      <span aria-hidden="true" className="text-xs text-gray-500 pl-1">
                        <IoRemoveSharp />
                      </span>
                      <span className="text-gray-700 dark:text-gray-300 hover:text-customGreen-dark dark:hover:text-gray-200">
                        {t(`${child.name}`)}
                      </span>
                      {/* <span className="mr-4">{route.name}</span> */}
                    </a> : <a
                      href={import.meta.env.VITE_APP_LIKUTAPP_DOMAIN}
                      target="_blank"
                      className="flex items-center font-serif py-2.5 min-h-[44px] text-sm text-gray-700 dark:text-gray-300 hover:text-customGreen-dark cursor-pointer"
                      // activeStyle={{
                      //   color: "#0d9e6d",
                      // }}
                      rel="noreferrer"
                    >
                      <Route path={child.path} exact={child.exact}>
                        <span
                          className="absolute inset-y-0 left-0 w-1 bg-customGreen rounded-tr-lg rounded-br-lg"
                          aria-hidden="true"
                        ></span>
                      </Route>
                      {/* <route.icon className="w-5 h-5" aria-hidden="true" /> */}
                      <span aria-hidden="true" className="text-xs text-gray-500 pl-1">
                        <IoRemoveSharp />
                      </span>
                      <span className="text-gray-700 dark:text-gray-300 hover:text-customGreen-dark dark:hover:text-gray-200">
                        {t(`${child.name}`)}
                      </span>
                      {/* <span className="mr-4">{route.name}</span> */}
                    </a>
                ) : (
                  <NavLink
                    to={child.path}
                    // target={`${child.name === 'Sell' ? '_blank' : '_self'}`}
                    className="flex items-center font-serif py-2.5 min-h-[44px] text-sm text-gray-700 dark:text-gray-300 hover:text-customGreen-dark cursor-pointer"
                    // activeStyle={{
                    //   color: "#0d9e6d",
                    // }}
                    rel="noreferrer"
                  >
                    <Route path={child.path} exact={route.exact}>
                      <span
                        className="absolute inset-y-0 left-0 w-1 bg-customGreen-dark rounded-tr-lg rounded-br-lg"
                        aria-hidden="true"
                      ></span>
                    </Route>
                    <span aria-hidden="true" className="text-xs text-gray-500 pl-1">
                      <IoRemoveSharp />
                    </span>
                    <span className="text-gray-700 dark:text-gray-300 hover:text-customGreen-dark dark:hover:text-gray-200">
                      {t(`${child.name}`)}
                    </span>
                  </NavLink>
                )}
              </li>
            ))}
          </ul>
        )}
      </li>
    </>
  );
};

export default SidebarSubMenu;
