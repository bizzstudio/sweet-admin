import React, { useContext, useState } from "react";
import { NavLink, Route } from "react-router-dom";
import Cookies from "js-cookie";
import { useTranslation } from "react-i18next";
import { Button, WindmillContext } from "@windmill/react-ui";
import { IoOpenOutline } from "react-icons/io5";

// Internal import
import sidebar from "@/routes/sidebar";
// import SidebarSubMenu from "SidebarSubMenu";
import logoDark from "@/assets/img/logo/logo-color.png";
import logoLight from "@/assets/img/logo/logo-dark.svg";
import { AdminContext } from "@/context/AdminContext";
import SidebarSubMenu from "@/components/sidebar/SidebarSubMenu";

const SidebarContent = () => {
  const { t } = useTranslation();
  const { mode } = useContext(WindmillContext);
  const { dispatch } = useContext(AdminContext);

  const handleLogOut = () => {
    dispatch({ type: "USER_LOGOUT" });
    Cookies.remove("adminInfo");
  };

  return (
    <div className="py-4 text-gray-500 dark:text-gray-400">
      {/* <a className=" text-gray-900 dark:text-gray-200" href="/dashboard">
        {mode === "dark" ? (
          <img src={logoLight} alt="תמרים בתומר" width="135" className="pl-6" />
        ) : (
          <img src={logoDark} alt="תמרים בתומר" width="135" className="pl-6" />
        )}
      </a> */}
      <ul className="mt-8">
        {sidebar.map((route) =>
          route.routes ? (
            <SidebarSubMenu route={route} key={route.name} />
          ) : (
            <li className="relative" key={route.name}>
              <NavLink
                exact
                to={route.path}
                target={`${route?.outside ? "_blank" : "_self"}`}
                className="px-6 py-4 inline-flex items-center w-full text-sm font-semibold transition-colors duration-150 hover:text-customGreen-dark dark:hover:text-gray-200"
                // activeClassName="text-customGreen dark:text-gray-100"
                activeStyle={{
                  color: "#0d9e6d",
                }}
                rel="noreferrer"
              >
                <Route path={route.path} exact={route.exact}>
                  <span
                    className="absolute inset-y-0 left-0 w-1 bg-customGreen rounded-tr-lg rounded-br-lg"
                    aria-hidden="true"
                  ></span>
                </Route>
                {typeof route.icon === "string" ? (
                  <img src={route.icon} alt={`${route.name} Icon`} className="w-5 h-5 fill-slate-400 stroke-slate-100" />
                ) : (
                  <route.icon className="w-5 h-5" aria-hidden="true" />
                )}
                <span className="mr-4">{t(`${route.name}`)}</span>
              </NavLink>
            </li>
          )
        )}
      </ul>
      <span className="fixed bottom-0 right-0 px-6 py-6 w-64 mx-auto block">
        <Button onClick={handleLogOut} size="large" className="w-full">
          <span className="flex items-center">
            <span className="text-sm">{t("LogOut")}</span>
            <IoOpenOutline className="mr-3 text-lg" />
          </span>
        </Button>
      </span>
    </div>
  );
};

export default SidebarContent;
