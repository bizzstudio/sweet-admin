// components/common/DemoModeBanner.jsx
//
// הפס הצהוב שאומר "אתם מסתכלים על נתוני דמו".
//
// למה על כל מסך חיוב ולא רק על אחד: במצב דמו כל המסכים האלה מציגים את
// כיס הדמו של התעודה (billing.demo) ולא את הרישום האמיתי. מסך חשבוניות
// שנראה בדיוק אותו דבר בשני המצבים הוא איך שמישהו מסיק שחשבונית אמיתית
// כבר שולמה, או להפך.
//
// הרכיב שואל את השרת בעצמו ולא מקבל prop: מצב הדמו נקבע ב-.env של השרת,
// ומצב שמנוהל בצד הלקוח יכול להיות לא מסונכרן בדיוק כשזה מסוכן.

import React, { useEffect, useState } from "react";
import { Card, CardBody } from "@windmill/react-ui";
import { FiAlertTriangle } from "react-icons/fi";

import BillingServices from "@/services/BillingServices";

const DemoModeBanner = ({ children }) => {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    // getIcountMode ולא getIcountStatus: הראשון קורא משתנה סביבה, השני
    // מתחבר מחדש ל-iCount בכל קריאה. הבאנר יושב על כל מסכי החיוב, ואזהרה
    // אינה סיבה לפתוח session חדש בכל טעינת מסך.
    BillingServices.getIcountMode()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  if (status?.demo !== true) return null;

  return (
    <Card className="min-w-0 shadow-xs overflow-hidden mb-5 border-r-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
      <CardBody>
        <p className="font-semibold flex items-center gap-2 text-yellow-800 dark:text-yellow-300">
          <FiAlertTriangle /> מצב דמו — המסך מציג נתוני הדגמה
          {status?.cid && <span className="font-mono font-normal text-sm">({status.cid})</span>}
        </p>
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
          {children || (
            <>
              המסמכים נוצרים בחשבון הדמו ואינם נשלחים לאף לקוח. החיוב האמיתי
              נשמר בנפרד ואינו מושפע — כשחוזרים לחשבון האמיתי הכול חוזר למה
              שהיה.
            </>
          )}
        </p>
      </CardBody>
    </Card>
  );
};

export default DemoModeBanner;
