// src/pages/CustomerDocumentsPage.jsx
// "מסמכי לקוח" - כל המסמכים של לקוח אחד: חשבוניות, תעודות משלוח והצעות
// מחיר.
//
// המסמכים ישבו בעבר כפאנל בתחתית כרטיס הלקוח. הם נשלפים בקריאה נפרדת
// ויכולים להיות מאות שורות, ולכן הם קיבלו עמוד משלהם - בדיוק כמו
// "הזמנות לקוח" - והכניסה אליהם היא מכפתור בכרטיס.
//
// הטעינה יושבת כאן ולא ברכיב: אותה קריאה מחזירה גם את שם הלקוח לכותרת,
// וכך המסך כולו הוא בקשה אחת עם מצב טעינה אחד.
import React, { useCallback, useEffect, useState } from "react";
import { FiArrowRight } from "react-icons/fi";
import { Link, useParams } from "react-router-dom";

// Internal import
import CustomerDocuments from "@/components/billing/CustomerDocuments";
import Loading from "@/components/preloader/Loading";
import PageTitle from "@/components/Typography/PageTitle";
import BillingServices from "@/services/BillingServices";
import { describeApiError } from "@/utils/apiError";

// תשובה עם סטטוס 200 אבל בלי המבנה הצפוי (שרת ישן, פרוקסי שהחזיר HTML)
// הייתה מפילה את הרכיב על קריאה לשדה של undefined ומשאירה מסך לבן.
// עדיף לזהות אותה כאן ולהציג שגיאה.
const hasDocumentShape = (d) =>
  Boolean(d) &&
  Array.isArray(d.deliveryNotes?.items) &&
  Array.isArray(d.invoices?.items) &&
  Array.isArray(d.quotes?.items);

const CustomerDocumentsPage = () => {
  const { id } = useParams();

  const [docs, setDocs] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    // stale מסמן שהעמוד כבר עזב את הלקוח הזה: תשובה שמגיעה באיחור אחרי
    // ניווט אסור לה לדרוס את המסך החדש
    async (isStale) => {
      setLoading(true);
      try {
        const res = await BillingServices.getCustomerDocuments(id);
        if (isStale()) return;

        if (!hasDocumentShape(res)) {
          setDocs(null);
          setError("התקבלה תשובה לא צפויה מהשרת. ייתכן שהוא מריץ גרסה קודמת.");
        } else {
          setDocs(res);
          setError("");
        }
      } catch (err) {
        if (isStale()) return;
        setDocs(null);
        // describeApiError מבדיל בין נתיב שאינו קיים בשרת (שדורש פריסה
        // מחדש) לבין תקלת רשת - שתיהן נראות אחרת למי שצריך לתקן
        setError(describeApiError(err, "טעינת המסמכים נכשלה"));
      } finally {
        if (!isStale()) setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    let cancelled = false;
    load(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [load]);

  const customer = docs?.customer || null;
  const fullName = `${customer?.name || ""} ${customer?.lastName || ""}`.trim();

  // customer:null פירושו "מזהה תקין שאין לו לקוח". שדה שחסר לגמרי פירושו
  // שרת שעדיין לא מחזיר אותו - ואז אסור להכריז "הלקוח לא נמצא" ולהסתיר
  // מסמכים שנטענו כשורה, רק בגלל שהאדמין חדש יותר מה-API
  const customerMissing =
    Boolean(docs) &&
    Object.prototype.hasOwnProperty.call(docs, "customer") &&
    customer === null;

  return (
    <>
      <PageTitle>מסמכי לקוח</PageTitle>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white p-5 text-right dark:bg-gray-800">
        <div className="min-w-0">
          <h2 className="font-serif text-lg font-semibold text-gray-700 dark:text-gray-200">
            {loading ? "טוען..." : fullName || "לקוח"}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            חשבוניות, קבלות, תעודות משלוח והצעות מחיר
          </p>
        </div>

        <Link
          to={`/customer/${id}`}
          className="flex items-center gap-2 rounded-md border border-gray-200 px-5 py-2 text-sm font-medium leading-5 text-gray-600 transition-colors duration-150 hover:text-mainColor-dark dark:border-gray-600 dark:text-gray-300"
        >
          <FiArrowRight /> חזרה לכרטיס הלקוח
        </Link>
      </div>

      {loading ? (
        <Loading loading={loading} />
      ) : error ? (
        <div className="mb-8 w-full rounded-md bg-white p-8 text-center dark:bg-gray-800">
          <h2 className="text-base font-medium text-gray-600 dark:text-gray-400">
            טעינת המסמכים נכשלה
          </h2>
          <p className="mt-2 text-sm text-gray-500">{error}</p>
        </div>
      ) : customerMissing ? (
        // לקוח שאינו קיים מחזיר מסמכים ריקים, ובלי ההבחנה הזו המסך היה
        // אומר "טרם הופקו מסמכים" על מזהה שגוי לגמרי
        <div className="mb-8 w-full rounded-md bg-white p-8 text-center dark:bg-gray-800">
          <h2 className="text-base font-medium text-gray-600 dark:text-gray-400">
            הלקוח לא נמצא
          </h2>
        </div>
      ) : (
        <div className="mb-8 rounded-lg bg-white p-5 text-right dark:bg-gray-800">
          {/* key לפי הלקוח: מעבר בין שני לקוחות באותו מסלול (חזור/קדימה
              בדפדפן) לא מותיר את הטאב שנבחר אצל הקודם, וכל לקוח נפתח שוב
              על הטאב הראשון שיש בו מסמכים */}
          <CustomerDocuments key={id} docs={docs} customerId={id} />
        </div>
      )}
    </>
  );
};

export default CustomerDocumentsPage;
