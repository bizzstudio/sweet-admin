// src/hooks/useQueryParam.js
//
// קריאה וכתיבה של פרמטר בכתובת. תחליף ל-useSearchParams, שאינו קיים
// ב-react-router v5 (הגרסה בפרויקט) אלא רק ב-v6.
//
// למה בכתובת ולא ב-state של הרכיב: סינון שמגיע מקישור (למשל "כל התעודות
// של הלקוח הזה" מכרטיס הלקוח) חייב לשרוד רענון, כפתור "אחורה", ושיתוף
// הקישור עם עובד אחר. state מקומי מאבד את שלושתם.

import { useCallback } from "react";
import { useHistory, useLocation } from "react-router-dom";

/**
 * @param {string} key - שם הפרמטר בכתובת
 * @returns {[string, (value: string|null) => void]}
 */
const useQueryParam = (key) => {
  const history = useHistory();
  const location = useLocation();

  const value = new URLSearchParams(location.search).get(key) || "";

  const setValue = useCallback(
    (next) => {
      // history.location ולא location מה-render: כשכמה פרמטרים משתנים באותה
      // לחיצה (למשל "נקה"), כל קריאה צריכה לראות את מה שהקודמת כבר כתבה —
      // אחרת רק האחרונה נשמרת
      const params = new URLSearchParams(history.location.search);
      // ערך ריק מסיר את הפרמטר במקום להשאיר "?customer=" בכתובת
      if (next) params.set(key, next);
      else params.delete(key);

      const search = params.toString();
      // replace ולא push: שינוי סינון אינו ניווט, ואסור שכל לחיצה על
      // "נקה" תוסיף שלב להיסטוריה שהמשתמשת תצטרך לחזור דרכו
      history.replace({
        pathname: history.location.pathname,
        search: search ? `?${search}` : "",
        state: history.location.state,
      });
    },
    [history, key]
  );

  return [value, setValue];
};

export default useQueryParam;
