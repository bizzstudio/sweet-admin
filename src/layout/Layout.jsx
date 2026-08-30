import React, { useContext, Suspense, useEffect, lazy } from "react";
import { Switch, Route, Redirect, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

// Internal import
import Main from "@/layout/Main";
import routes from "@/routes/index";
import Header from "@/components/header/Header";
import Sidebar from "@/components/sidebar/Sidebar";
import { SidebarContext } from "@/context/SidebarContext";
import ThemeSuspense from "@/components/theme/ThemeSuspense";
const Page404 = lazy(() => import("@/pages/404"));

const Layout = () => {
  const { t } = useTranslation();
  const { isSidebarOpen, closeSidebar, navBar } = useContext(SidebarContext);
  let location = useLocation();

  const isOnline = navigator.onLine;

  // console.log('routes',routes)

  useEffect(() => {
    closeSidebar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  return (
    <>
      {/* דילוג על סרגל הצד — הרכיב הראשון בסדר ה-Tab. סרגל הניווט של הפאנל
          מונה עשרות פריטים, והוא מרונדר מחדש בכל מעבר עמוד; בלי הדילוג כל
          ניווט פנימי מתחיל בעשרות עצירות Tab לפני התוכן. */}
      <a href="#admin-main-content" className="skip-to-content">
        {t("skipToContent")}
      </a>
      {!isOnline && (
        <div className="flex justify-center bg-red-600 text-white">
          You are in offline mode!{" "}
        </div>
      )}
      <div
        className={`flex h-screen bg-gray-50 dark:bg-gray-900 ${
          isSidebarOpen && "overflow-hidden"
        }`}
      >
        {navBar && <Sidebar />}

        <div className="flex flex-col flex-1 w-full">
          <Header />
          <Main>
            <Suspense fallback={<ThemeSuspense />}>
              <Switch>
                {routes.map((route, i) => {
                  return route.component ? (
                    <Route
                      key={i}
                      exact={true}
                      path={`${route.path}`}
                      render={(props) => <route.component {...props} />}
                    />
                  ) : null;
                })}
                <Redirect exact from="/" to="/dashboard" />
                <Route component={Page404} />
              </Switch>
            </Suspense>
          </Main>
        </div>
      </div>
    </>
  );
};

export default Layout;
