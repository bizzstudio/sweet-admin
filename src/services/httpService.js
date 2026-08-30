import axios from "axios";
import Cookies from "js-cookie";

const instance = axios.create({
  baseURL: `${import.meta.env.VITE_APP_API_BASE_URL}`,
  timeout: 50000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// Add a request interceptor
instance.interceptors.request.use(function (config) {
  // Do something before request is sent
  let adminInfo;
  if (Cookies.get("adminInfo")) {
    adminInfo = JSON.parse(Cookies.get("adminInfo"));
  }

  let company;

  if (Cookies.get("company")) {
    company = Cookies.get("company");
  }

  // console.log('Admin Http Services Cookie Read : ' + company);
  // let companyName = JSON.stringify(company);

  return {
    ...config,
    headers: {
      authorization: adminInfo ? `Bearer ${adminInfo.token}` : null,
      company: company ? company : null,
    },
  };
});

/*
 * פקיעת ההזדהות.
 *
 * עוגיית adminInfo תקפה יומיים והטוקן 21 יום, ואין רענון. עד כאן הייתה בדיקת
 * תוקף אחת בלבד — בטעינת האפליקציה (SidebarContext) — ולכן טוקן שפג באמצע
 * עבודה, או הפעלה מחדש של השרת, לא החזירו להתחברות: כל קריאה קיבלה 401,
 * והמסכים הציגו טבלאות ריקות או שגיאה כללית. זה נראה כמו "הנתונים נעלמו".
 *
 * מכאן כל 401 מנקה את העוגייה ומחזיר למסך ההתחברות.
 */

// אותו חישוב כמו ב-SidebarContext: הפאנל מוגש מתת-תיקייה (/sweet-admin/),
// ונתיב מוחלט "/login" היה יוצא מחוץ לה ומחזיר 404 מ-Apache.
const LOGIN_PATH = `${import.meta.env.BASE_URL}login`.replace(/\/{2,}/g, "/");

// נתיבי ההזדהות עצמם מחזירים 401 על סיסמה שגויה. הפניה עליהם הייתה בולעת את
// הודעת השגיאה במקום להציג אותה למשתמשת.
const AUTH_PATHS = ["/admin/login", "/admin/forget-password", "/admin/reset-password"];

const isAuthRequest = (url = "") => AUTH_PATHS.some((path) => url.includes(path));

// מסך טוען כמה בקשות במקביל, וכולן יחזירו 401 יחד. בלי הדגל הזה ההפניה הייתה
// מופעלת פעם לכל בקשה שנכשלה
let redirectingToLogin = false;

instance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";

    if (
      status === 401 &&
      !isAuthRequest(url) &&
      !redirectingToLogin &&
      typeof window !== "undefined" &&
      window.location.pathname !== LOGIN_PATH
    ) {
      redirectingToLogin = true;
      Cookies.remove("adminInfo");
      window.location.pathname = LOGIN_PATH;
    }

    return Promise.reject(error);
  }
);

const responseBody = (response) => response.data;

const requests = {
  get: (url, body, headers) =>
    instance.get(url, body, headers).then(responseBody),

  post: (url, body) => instance.post(url, body).then(responseBody),

  put: (url, body, headers) =>
    instance.put(url, body, headers).then(responseBody),

  patch: (url, body) => instance.patch(url, body).then(responseBody),

  delete: (url, body) => instance.delete(url, body).then(responseBody),
};

export default requests;
