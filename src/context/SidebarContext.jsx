// src/context/SidebarContext.jsx
import AdminServices from "@/services/AdminServices";
import StatusServices from "@/services/StatusService";
import Cookies from "js-cookie";
import { createContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export const SidebarContext = createContext();

// ניווט דרך window.location הוא ניווט קשיח של הדפדפן — הוא עוקף את הראוטר
// ולכן לא מקבל את ה-basename. כשהאדמין מוגש מתת-תיקייה, "/login" מוביל
// לשורש הדומיין ומחזיר 404. BASE_URL מכיל את הקידומת ומסתיים ב-"/",
// וכשהאדמין יושב על דומיין ייעודי הוא פשוט "/" והתוצאה זהה.
const LOGIN_PATH = `${import.meta.env.BASE_URL}login`.replace(/\/{2,}/g, "/");

export const SidebarProvider = ({ children }) => {
  const resultsPerPage = 20;
  const searchRef = useRef("");
  const invoiceRef = useRef("");
  // const dispatch = useDispatch();

  const [limitData, setLimitData] = useState(20);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isBulkDrawerOpen, setIsBulkDrawerOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdate, setIsUpdate] = useState(false);
  const [lang, setLang] = useState("he");
  const [time, setTime] = useState("");
  const [sortedField, setSortedField] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchText, setSearchText] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [zone, setZone] = useState("");
  const [statuses, setStatuses] = useState([]);
  const [statusesData, setStatusesData] = useState([]);
  const [cities, setCities] = useState([]);
  const [category, setCategory] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [method, setMethod] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [windowDimension, setWindowDimension] = useState(window.innerWidth);
  const [loading, setLoading] = useState(false);
  const [navBar, setNavBar] = useState(true);
  const { i18n } = useTranslation();
  const [tabIndex, setTabIndex] = useState(0);
  const [serviceId, setServiceId] = useState("");

  // const { socket } = useNotification();

  const closeSidebar = () => setIsSidebarOpen(false);
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const closeDrawer = () => setIsDrawerOpen(false);
  const toggleDrawer = () => setIsDrawerOpen(!isDrawerOpen);

  const closeBulkDrawer = () => setIsBulkDrawerOpen(false);
  const toggleBulkDrawer = () => setIsBulkDrawerOpen(!isBulkDrawerOpen);

  const closeModal = () => setIsModalOpen(false);
  const toggleModal = () => setIsModalOpen(!isModalOpen);

  const handleLanguageChange = (lang) => {
    Cookies.set("i18next", lang, {
      sameSite: "None",
      secure: true,
    });
    i18n.changeLanguage(lang);
    setLang(lang);
  };

  const handleChangePage = (p) => {
    setCurrentPage(p);
  };

  const handleSubmitForAll = (e) => {
    e.preventDefault();
    if (!searchRef?.current?.value) return setSearchText(null);
    setSearchText(searchRef?.current?.value);
    setCategory(null);
  };

  useEffect(() => {
    const lang = Cookies.get("i18next");
    const removeRegion = (langCode) => {
      const updatedLang = langCode?.split("-")[0];
      return updatedLang;
    };

    const updatedLang = removeRegion(lang);
    setLang(updatedLang);
    Cookies.set("i18next", updatedLang, {
      sameSite: "None",
      secure: true,
    });
  }, [lang]);

  useEffect(() => {
    function handleResize() {
      setWindowDimension(window.innerWidth);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    // הגדרת הסטטוסים בעת עליית המערכת
    const facthStatusesData = async () => {
      try {
        const data = await StatusServices.getAllStatuses({ query: '' });
        setStatusesData(data || []);
      } catch (error) {
        console.error("Error fetching statuses:", error);
      }
    };
    facthStatusesData();
  }, []);

  // ווידוא שהטוקן עדיין תקין
  useEffect(() => {
    const validateToken = async () => {
      try {
        const adminInfoCookie = Cookies.get("adminInfo");
        if (!adminInfoCookie) {
          window.location.pathname = LOGIN_PATH;
          return;
        }

        const adminInfo = JSON.parse(adminInfoCookie);
        if (!adminInfo.token) {
          window.location.pathname = LOGIN_PATH;
          return;
        }

        const data = await AdminServices.validateToken();
        if (data !== true) {
          window.location.pathname = LOGIN_PATH;
        }
      } catch (error) {
        console.error("Error validating token:", error);
        window.location.pathname = LOGIN_PATH;
      }
    }

    // רק אם לא נמצאים בעמוד לוגין
    if (window.location.pathname !== LOGIN_PATH) {
      validateToken();
    }
  }, []);

  return (
    <SidebarContext.Provider
      value={{
        method,
        setMethod,
        isSidebarOpen,
        toggleSidebar,
        closeSidebar,
        isDrawerOpen,
        toggleDrawer,
        closeDrawer,
        setIsDrawerOpen,
        closeBulkDrawer,
        isBulkDrawerOpen,
        toggleBulkDrawer,
        isModalOpen,
        toggleModal,
        closeModal,
        isUpdate,
        setIsUpdate,
        lang,
        setLang,
        handleLanguageChange,
        currentPage,
        setCurrentPage,
        handleChangePage,
        searchText,
        setSearchText,
        category,
        setCategory,
        searchRef,
        handleSubmitForAll,
        zone,
        setZone,
        time,
        setTime,
        sortedField,
        setSortedField,
        resultsPerPage,
        limitData,
        setLimitData,
        windowDimension,
        modalOpen,
        setModalOpen,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        loading,
        setLoading,
        invoice,
        setInvoice,
        invoiceRef,
        setNavBar,
        navBar,
        tabIndex,
        setTabIndex,
        serviceId,
        setServiceId,
        statuses,
        setStatuses,
        statusesData,
        setCities,
        cities,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};
