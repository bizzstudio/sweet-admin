import React, { useContext, useState } from "react";
import { Link, NavLink, Route } from "react-router-dom";
import Cookies from "js-cookie";
import { useTranslation } from "react-i18next";
import { Button, WindmillContext } from "@windmill/react-ui";
import { IoOpenOutline } from "react-icons/io5";

// Internal import
import sidebar from "@/routes/sidebar";
// import SidebarSubMenu from "SidebarSubMenu";
// לוגו על רקע שקוף: אותיות כהות למצב בהיר, אותיות בהירות למצב כהה.
import logoDark from "@/assets/img/logo/logo-color.png";
import logoLight from "@/assets/img/logo/logo-dark.png";
import { AdminContext } from "@/context/AdminContext";
import SidebarSubMenu from "@/components/sidebar/SidebarSubMenu";
import OUTSIDE_LINKS from "@/routes/outsideLinks";

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
      {/* ניווט דרך הראוטר ולא <a href="/dashboard"> — קישור מוחלט מתעלם
          מה-basename ומפיל את המשתמש ל-404 כשהאדמין יושב בתת-תיקייה.
          Link ולא NavLink: ללוגו אין מצב "פעיל", ו-NavLink היה מוסיף לו
          aria-current="page" כפול לצד פריט "לוח בקרה" בתפריט. */}
      <Link className="block px-6" to="/dashboard">
        <img
          src={mode === "dark" ? logoLight : logoDark}
          alt="מתוקיה של בני"
          className="w-full max-w-[190px] h-auto mx-auto"
        />
      </Link>
      {/* ‎<ul> עם תווית: קורא מסך מכריז "רשימה בת N פריטים" ומאפשר קפיצה */}
      <ul className="mt-6" aria-label={t("mainNavigation")}>
        {sidebar.map((route) =>
          route.routes ? (
            <SidebarSubMenu route={route} key={route.name} />
          ) : route.outside ? (
            <li className="relative" key={route.name}>
              <a
                href={OUTSIDE_LINKS[route.outside]}
                target="_blank"
                rel="noreferrer"
                className="px-6 py-4 inline-flex items-center w-full text-sm font-semibold transition-colors duration-150 hover:text-customGreen-dark dark:hover:text-gray-200"
              >
                <route.icon className="w-5 h-5" aria-hidden="true" />
                <span className="mr-4">{t(`${route.name}`)}</span>
                <span className="sr-only"> ({t("opensInNewWindow", "נפתח בחלון חדש")})</span>
              </a>
            </li>
          ) : (
            <li className="relative" key={route.name}>
              <NavLink
                exact
                to={route.path}
                target={`${route?.outside ? "_blank" : "_self"}`}
                className="px-6 py-4 inline-flex items-center w-full text-sm font-semibold transition-colors duration-150 hover:text-customGreen-dark dark:hover:text-gray-200"
                // הפריט הפעיל סומן קודם בצבע בלבד (‎#0d9e6d = 3.43:1 על לבן —
                // מתחת ל-4.5:1 שהתקן דורש), כלומר גם לא קריא מספיק וגם מידע
                // שנמסר בצבע בלבד. ‎.sidebar-link-active מוסיף משקל גופן ורקע,
                // ו-‎aria-current מוסר את המידע גם לקורא מסך.
                // ‎aria-current לא מועבר במפורש: ב-react-router v5 ברירת המחדל
                // של NavLink היא "page" והוא מוחל רק כשהקישור פעיל.
                activeClassName="sidebar-link-active"
                rel="noreferrer"
              >
                <Route path={route.path} exact={route.exact}>
                  <span
                    className="absolute inset-y-0 left-0 w-1 bg-customGreen rounded-tr-lg rounded-br-lg"
                    aria-hidden="true"
                  ></span>
                </Route>
                {typeof route.icon === "string" ? (
                  // האייקון מלווה תווית טקסט לצידו — ‎alt="X Icon" רק מכפיל
                  // את השם ומוסיף את המילה "Icon" באנגלית לכל פריט בתפריט.
                  <img src={route.icon} alt="" className="w-5 h-5 fill-slate-400 stroke-slate-100" />
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
