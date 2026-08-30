import { Avatar, Badge, WindmillContext } from "@windmill/react-ui";
import Cookies from "js-cookie";
import React, { useContext, useEffect, useRef, useState } from "react";
import { Scrollbars } from "react-custom-scrollbars-2";
import {
  IoClose,
  IoGridOutline,
  IoLogOutOutline,
  IoMenu,
  IoMoonSharp,
  IoNotificationsSharp,
  IoSettingsOutline,
  IoSunny,
} from "react-icons/io5";
import { Link } from "react-router-dom";
import cookies from "js-cookie";
import { useTranslation } from "react-i18next";

// Internal import

import de from "@/assets/img/de.svg";
import en from "@/assets/img/us.svg";
import he from "@/assets/img/he.svg";
import { AdminContext } from "@/context/AdminContext";
import { SidebarContext } from "@/context/SidebarContext";
import NotificationServices from "@/services/NotificationServices";

const Header = () => {
  const { toggleSidebar, isSidebarOpen, handleLanguageChange, setNavBar, navBar } =
    useContext(SidebarContext);
  const { state, dispatch } = useContext(AdminContext);
  const { adminInfo } = state;
  const { mode, toggleMode } = useContext(WindmillContext);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const pRef = useRef();
  const nRef = useRef();

  // שליפת התראות מהשרת (כולל מספר ההתראות שלא נקראו)
  const fetchNotifications = async () => {
    try {
      const res = await NotificationServices.getAllNotification(1);
      setNotifications(res?.notifications || []);
      setUnreadCount(res?.totalUnreadDoc || 0);
    } catch (err) {
      console.log("fetchNotifications error:", err?.message);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // רענון אוטומטי כל דקה כדי לתפוס התראות מלאי נמוך חדשות
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // סימון התראה כנקראה
  const handleMarkRead = async (id, status) => {
    try {
      if (status === "unread") {
        await NotificationServices.updateStatus(id, { status: "read" });
        fetchNotifications();
      }
    } catch (err) {
      console.log("handleMarkRead error:", err?.message);
    }
  };

  // מחיקת התראה
  const handleDeleteNotification = async (e, id) => {
    e.stopPropagation();
    try {
      await NotificationServices.deleteNotification(id);
      fetchNotifications();
    } catch (err) {
      console.log("handleDeleteNotification error:", err?.message);
    }
  };

  // עיצוב תאריך בעברית
  const formatDate = (date) => {
    if (!date) return "";
    try {
      return new Date(date).toLocaleString("he-IL", {
        day: "numeric",
        month: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const currentLanguageCode = cookies.get("i18next") || "en";
  const { t } = useTranslation();

  // console.log("currentLanguageCode", currentLanguageCode);

  const handleLogOut = () => {
    dispatch({ type: "USER_LOGOUT" });
    Cookies.remove("adminInfo");
    window.location.replace(`${import.meta.env.VITE_APP_ADMIN_DOMAIN}/login`);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!pRef?.current?.contains(e.target)) {
        setProfileOpen(false);
      }
      if (!nRef?.current?.contains(e.target)) {
        setNotificationOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
  }, [pRef, nRef]);

  // עברית אוטומטית
  useEffect(() => {
    handleLanguageChange("he")
  }, [])
  
  const handleNotificationOpen = () => {
    setNotificationOpen(!notificationOpen);
    setProfileOpen(false);
  };
  const handleProfileOpen = () => {
    setProfileOpen(!profileOpen);
    setNotificationOpen(false);
  };

  // const onChange = (event) => {
  //     i18next.changeLanguage(event.target.value);
  // }

  return (
    <>
      <header className="z-30 py-4 bg-white shadow-sm dark:bg-gray-800">
        <div className="container flex items-center justify-between h-full px-6 mx-auto text-customGreen dark:text-customGreen">
          {/* הכפתור מכיל SVG בלבד ואין לו שם נגיש — קורא מסך הכריז "לחצן"
              ותו לא. ‎aria-expanded מוסר גם את המצב הנוכחי. */}
          <button
            type="button"
            onClick={() => setNavBar(!navBar)}
            aria-label={navBar ? t("closeSidebar") : t("openSidebar")}
            aria-expanded={navBar}
            className="tap-target hidden lg:block"
          >
            <svg
              aria-hidden="true"
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 18 18"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              ></path>
            </svg>
          </button>

          {/* <!-- Mobile hamburger --> */}
          <button
            type="button"
            className="tap-target p-1 mr-5 -ml-1 rounded-md lg:hidden"
            onClick={toggleSidebar}
            aria-label={t("openSidebar")}
            aria-expanded={isSidebarOpen}
          >
            <IoMenu className="w-6 h-6" aria-hidden="true" />
          </button>
          <span></span>

          <ul className="flex justify-end items-center flex-shrink-0 space-x-6">
            {/* <li className="changeLanguage">
              <div className="dropdown">
                <button className="dropbtn focus:outline-none">
                  {currentLanguageCode === "de" ? (
                    <img src={de} width={16} alt="lang" className="mx-2" />
                  ) : (
                    <img src={en} className="mx-2" alt="lang" width={16} />
                  )}
                  {currentLanguageCode === "de" ? (
                    <span className="text-gray-700 dark:text-gray-400">
                      GERMAN
                    </span>
                  ) : (
                    <span className="text-gray-700 dark:text-gray-400">
                      ENGLISH
                    </span>
                    
                  )}
                </button>

                <div className="dropdown-content">
                  <div
                    onClick={() => handleLanguageChange("en")}
                    className="focus:outline-none cursor-pointer"
                  >
                    <img src={en} width={16} alt="lang" /> English{" "}
                  </div>
                  <div
                    onClick={() => handleLanguageChange("de")}
                    className="focus:outline-none cursor-pointer"
                  >
                    <img src={de} width={16} alt="lang" /> German
                  </div>
                  <div
                    onClick={() => handleLanguageChange("he")}
                    className="focus:outline-none cursor-pointer"
                  >
                    <img src={he} width={16} alt="lang" /> Hebrew
                  </div>

                </div>
              </div>
            </li> */}

            {/* <!-- Theme toggler --> */}

            <li className="flex">
              <button
                type="button"
                className="tap-target rounded-md"
                onClick={toggleMode}
                aria-label={mode === "dark" ? t("lightMode") : t("darkMode")}
                aria-pressed={mode === "dark"}
              >
                {mode === "dark" ? (
                  <IoSunny className="w-5 h-5" aria-hidden="true" />
                ) : (
                  <IoMoonSharp className="w-5 h-5" aria-hidden="true" />
                )}
              </button>
            </li>

            {/* <!-- Notifications menu --> */}
            <li className="relative inline-block text-right" ref={nRef}>
              <button
                type="button"
                className="tap-target relative align-middle rounded-md"
                onClick={handleNotificationOpen}
                aria-haspopup="true"
                aria-expanded={notificationOpen}
                aria-label={
                  unreadCount > 0
                    ? `${t("Notifications")} – ${unreadCount}`
                    : t("Notifications")
                }
              >
                <IoNotificationsSharp className="w-5 h-5" aria-hidden="true" />
                {unreadCount > 0 && (
                  // ‎aria-hidden: המספר כבר נאמר ב-aria-label של הכפתור.
                  // ‎bg-red-600 ולא ‎red-500: לבן על ‎#ef4444 = 3.76:1 ונופל,
                  // לבן על ‎#dc2626 = 4.83:1 ועובר.
                  <span aria-hidden="true" className="absolute z-10 top-0 left-0 inline-flex items-center justify-center p-1 h-5 w-5 text-xs font-bold leading-none text-white transform -translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notificationOpen && (
                <div
                  className="origin-top-left absolute left-0 mt-2 rounded-md shadow-lg bg-white dark:bg-gray-800 focus:outline-none z-50"
                  style={{ width: 360, maxWidth: "90vw" }}
                >
                  <div
                    className="notification-box"
                    style={{ height: notifications.length ? 400 : "auto" }}
                  >
                    {notifications.length === 0 ? (
                      <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">
                        אין התראות חדשות
                      </p>
                    ) : (
                      <Scrollbars autoHide style={{ height: 400 }}>
                        <ul className="block text-sm border-t border-gray-100 dark:border-gray-700 rounded-md">
                          {notifications.map((n) => (
                            <li
                              key={n._id}
                              onClick={() => handleMarkRead(n._id, n.status)}
                              className={`flex justify-between items-center font-serif font-normal text-sm py-3 border-b border-gray-100 dark:border-gray-700 px-3 transition-colors duration-150 hover:bg-gray-50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-gray-100 cursor-pointer ${
                                n.status === "unread"
                                  ? "bg-red-50 dark:bg-gray-900"
                                  : ""
                              }`}
                            >
                              <div className="flex items-center">
                                {n.image ? (
                                  <Avatar
                                    className="p-1 ml-2 hidden md:block bg-gray-50 border border-gray-200"
                                    src={n.image}
                                    alt="image"
                                  />
                                ) : (
                                  <span className="p-2 ml-2 hidden md:flex items-center justify-center bg-gray-50 border border-gray-200 rounded-full">
                                    <IoNotificationsSharp className="w-5 h-5 text-gray-500" />
                                  </span>
                                )}

                                <div className="notification-content">
                                  <h6 className="font-medium text-gray-600 dark:text-gray-300">
                                    {n.message}
                                  </h6>

                                  <p className="flex items-center text-xs text-gray-500">
                                    {n.status === "unread" && (
                                      <Badge type="danger">חדש</Badge>
                                    )}
                                    <span className="mr-2">
                                      {formatDate(n.createdAt)}
                                    </span>
                                  </p>
                                </div>
                              </div>

                              <span
                                className="px-2"
                                onClick={(e) =>
                                  handleDeleteNotification(e, n._id)
                                }
                              >
                                <IoClose />
                              </span>
                            </li>
                          ))}
                        </ul>
                      </Scrollbars>
                    )}
                  </div>
                </div>
              )}
            </li>

              {/* {notificationOpen && (
                <div className="origin-top-left absolute left-0 mt-2 rounded-md shadow-lg bg-white dark:bg-gray-800 focus:outline-none">
                  <div className="notification-box">
                    <Scrollbars>
                      <ul className="block text-sm border-t border-gray-100 dark:border-gray-700 rounded-md">
                        <li className="flex justify-between items-center font-serif font-normal text-sm py-3 border-b border-gray-100 dark:border-gray-700 px-3 transition-colors duration-150 hover:bg-gray-50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-gray-100 cursor-pointer">
                          <div className="flex items-center">
                            <Avatar
                              className="p-1 ml-2 md:block bg-gray-50 border border-gray-200"
                              src="https://i.postimg.cc/tCsSNSxS/Yellow-Sweet-Corn-Bag-each.jpg"
                              alt="image"
                            />

                            <div className="notification-content">
                              <h6 className="font-medium text-gray-500">
                                Yellow Sweet Corn Stock out, please check!
                              </h6>

                              <p className="flex items-center text-xs text-gray-500">
                                <Badge type="danger">Stock Out</Badge>

                                <span className="ml-2">
                                  Dec 12 2021 - 12:40PM
                                </span>
                              </p>
                            </div>
                          </div>

                          <span className="px-2">
                            <IoClose />
                          </span>
                        </li>

                        <li className="flex justify-between items-center font-serif font-normal text-sm py-3 border-b border-gray-100 dark:border-gray-700 px-3 transition-colors duration-150 hover:bg-gray-50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-gray-100 cursor-pointer">
                          <div className="flex items-center">
                            <Avatar
                              className="ml-2 md:block bg-gray-50 border border-gray-200"
                              src="https://i.ibb.co/ZTWbx5z/team-1.jpg"
                              alt="image"
                            />

                            <div className="notification-content">
                              <h6 className="font-medium text-gray-500">
                                Sam L. Placed{" "}
                                <span className="font-bold">$300</span> USD
                                order!
                              </h6>

                              <p className="flex items-center text-xs text-gray-500">
                                <Badge type="success">New Order</Badge>

                                <span className="ml-2">
                                  Nov 30 2021 - 2:40PM
                                </span>
                              </p>
                            </div>
                          </div>

                          <span className="px-2">
                            <IoClose />
                          </span>
                        </li>

                        <li className="flex justify-between items-center font-serif font-normal text-sm py-3 border-b border-gray-100 dark:border-gray-700 px-3 transition-colors duration-150 hover:bg-gray-50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-gray-100 cursor-pointer">
                          <div className="flex items-center">
                            <Avatar
                              className="p-1 ml-2 md:block bg-gray-50 border border-gray-200"
                              src="https://i.postimg.cc/5y7rNDFv/Radicchio-12ct.jpg"
                              alt="image"
                            />

                            <div className="notification-content">
                              <h6 className="font-medium text-gray-500">
                                Radicchio Stock out, please check!
                              </h6>

                              <p className="flex items-center text-xs text-gray-500">
                                <Badge type="danger">Stock Out</Badge>

                                <span className="ml-2">
                                  Dec 15 2021 - 12:40PM
                                </span>
                              </p>
                            </div>
                          </div>

                          <span className="px-2">
                            <IoClose />
                          </span>
                        </li>

                        <li className="flex justify-between items-center font-serif font-normal text-sm py-3 border-b border-gray-100 dark:border-gray-700 px-3 transition-colors duration-150 hover:bg-gray-50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-gray-100 cursor-pointer">
                          <div className="flex items-center">
                            <Avatar
                              className="ml-2 md:block bg-gray-50 border border-gray-200"
                              src="https://i.postimg.cc/SNmQX9Yx/Organic-Baby-Carrot-1oz.jpg"
                              alt="image"
                            />

                            <div className="notification-content">
                              <h6 className="font-medium text-gray-500">
                                Organic Baby Carrot Stock out, please check!
                              </h6>

                              <p className="flex items-center text-xs text-gray-500">
                                <Badge type="danger">Stock Out</Badge>

                                <span className="ml-2">
                                  Dec 20 2021 - 12:40PM
                                </span>
                              </p>
                            </div>
                          </div>

                          <span className="px-2">
                            <IoClose />
                          </span>
                        </li>

                        <li className="flex justify-between items-center font-serif font-normal text-sm py-3 border-b border-gray-100 dark:border-gray-700 px-3 transition-colors duration-150 hover:bg-gray-50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-gray-100 cursor-pointer">
                          <div className="flex items-center">
                            <Avatar
                              className="ml-2 md:block bg-gray-50 border border-gray-200"
                              src="https://i.postimg.cc/nM8QfhcP/Orange-20ct.jpg"
                              alt="image"
                            />

                            <div className="notification-content">
                              <h6 className="font-medium text-gray-500">
                                Orange Stock out, please check!
                              </h6>

                              <p className="flex items-center text-xs text-gray-500">
                                <Badge type="danger">Stock Out</Badge>

                                <span className="ml-2">
                                  Dec 25 2021 - 12:40PM
                                </span>
                              </p>
                            </div>
                          </div>

                          <span className="px-2">
                            <IoClose />
                          </span>
                        </li>

                        <li className="flex justify-between items-center font-serif font-normal text-sm py-3 border-b border-gray-100 dark:border-gray-700 px-3 transition-colors duration-150 hover:bg-gray-50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-gray-100 cursor-pointer">
                          <div className="flex items-center">
                            <Avatar
                              className="ml-2 md:block bg-gray-50 border border-gray-200"
                              src="https://i.ibb.co/GWVWYNn/team-7.jpg"
                              alt="Josh"
                            />

                            <div className="notification-content">
                              <h6 className="font-medium text-gray-500">
                                John Doe Placed{" "}
                                <span className="font-bold">$513</span> USD
                                order!
                              </h6>

                              <p className="flex items-center text-xs text-gray-500">
                                <Badge type="success">New Order</Badge>

                                <span className="ml-2">
                                  Dec 18 2021 - 12:40PM
                                </span>
                              </p>
                            </div>
                          </div>

                          <span className="px-2">
                            <IoClose />
                          </span>
                        </li>
                      </ul>
                    </Scrollbars>
                  </div>
                </div>
              )}
            </li> */}

            {/* <!-- Profile menu --> */}
            <li className="relative pr-3 inline-block text-right" ref={pRef}>
              <button
                type="button"
                className="tap-target focus-ring-light rounded-full dark:bg-gray-500 bg-customGreen text-white h-8 w-8 font-medium mx-auto"
                onClick={handleProfileOpen}
                aria-haspopup="true"
                aria-expanded={profileOpen}
                aria-label={t("EditProfile")}
              >
                {adminInfo.image ? (
                  <Avatar
                    className="align-middle"
                    src={`${adminInfo.image}`}
                    aria-hidden="true"
                  />
                ) : (
                  <span>{adminInfo.email[0].toUpperCase()}</span>
                )}
              </button>

              {profileOpen && (
                <ul className="origin-top-left absolute left-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 focus:outline-none">
                  <li className="justify-between font-serif font-medium py-2 pr-4 transition-colors duration-150 hover:bg-gray-100 text-gray-700 hover:text-customGreen-dark dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-200">
                    <Link to="/dashboard">
                      <span className="flex items-center text-sm">
                        <IoGridOutline
                          className="w-4 h-4 ml-3"
                          aria-hidden="true"
                        />
                        <span>{t("Dashboard")}</span>
                      </span>
                    </Link>
                  </li>

                  <li className="justify-between font-serif font-medium py-2 pr-4 transition-colors duration-150 hover:bg-gray-100 text-gray-700 hover:text-customGreen-dark dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-200">
                    <Link to="/edit-profile">
                      <span className="flex items-center text-sm">
                        <IoSettingsOutline
                          className="w-4 h-4 ml-3"
                          aria-hidden="true"
                        />
                        <span>{t("EditProfile")}</span>
                      </span>
                    </Link>
                  </li>

                  {/* ‎<li onClick> אינו מקבל פוקוס ואינו מגיב ל-Enter — פעולת
                      ההתנתקות הייתה בלתי נגישה לחלוטין במקלדת. */}
                  <li className="justify-between font-serif font-medium transition-colors duration-150 hover:bg-gray-100 text-gray-600 hover:text-customGreen dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-200">
                    <button
                      type="button"
                      onClick={handleLogOut}
                      className="w-full text-right cursor-pointer py-2 pr-4"
                    >
                    <span className="flex items-center text-sm">
                      <IoLogOutOutline
                        className="w-4 h-4 ml-3"
                        aria-hidden="true"
                      />
                      <span>{t("LogOut")}</span>
                    </span>
                    </button>
                  </li>
                </ul>
              )}
            </li>
          </ul>
        </div>
      </header>
    </>
  );
};

export default Header;
