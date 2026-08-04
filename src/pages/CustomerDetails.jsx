// src/pages/CustomerDetails.jsx
// "צפייה בלקוח" - עמוד מלא עם כל פרטי הלקוח.
// כולל את השדות שהגיעו מיבוא האקסל ("רשימת לקוחות"), שלא חוזרים
// מ-getCustomerById כי הם מוגדרים select:false במודל.
// כל שדה מוצג פעם אחת בלבד: אין הפרדה בין "מה שנערך" ל"מה שהגיע מהקובץ".
// המבנה: כותרת עם הזהות ודרכי הקשר, אריחי מספרים, ואז כרטיסים נפרדים לפי
// נושא - במקום רשימה אחת ארוכה של עשרות שדות.
import { Badge } from "@windmill/react-ui";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  FiEdit,
  FiFileText,
  FiMail,
  FiMapPin,
  FiPhone,
  FiShoppingBag,
} from "react-icons/fi";
import { Link, useParams } from "react-router-dom";

// Internal import
import { Field, Panel } from "@/components/common/ReadOnlyFields";
import CustomerAccountPanel from "@/components/customer/CustomerAccountPanel";
import CustomerErpPanel, {
  CustomerErpStats,
} from "@/components/customer/CustomerErpPanel";
import CustomerDrawer from "@/components/drawer/CustomerDrawer";
import MainDrawer from "@/components/drawer/MainDrawer";
import Loading from "@/components/preloader/Loading";
import PageTitle from "@/components/Typography/PageTitle";
import useAsync from "@/hooks/useAsync";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import CustomerServices from "@/services/CustomerServices";
import { isPlaceholderEmail } from "@/utils/customerFormat";
import { text } from "@/utils/displayFormat";

// שורת דרך קשר בכותרת: אייקון + ערך. min-w-0 ושבירת מילים כדי שמייל ארוך
// (במיוחד המייל הפנימי של היבוא) לא יגלוש מחוץ לכרטיס
const Contact = ({ icon, children }) => (
  <span className="flex min-w-0 items-center gap-1.5 break-words">
    <span className="flex-shrink-0 text-gray-400 dark:text-gray-500">{icon}</span>
    {children}
  </span>
);

const CustomerDetails = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const { handleUpdate } = useToggleDrawer();

  // useAsync נטען מחדש כש-isUpdate משתנה, כלומר מיד אחרי שמירה במגירת העריכה
  const { data, loading, error } = useAsync(() =>
    CustomerServices.getCustomerDetails(id)
  );

  const customer = data && data._id ? data : null;
  const address = customer?.address || {};
  const fullName = `${customer?.name || ""} ${customer?.lastName || ""}`.trim();
  const cityName = address?.city?.city_name_he || address?.city?.city_name_en;
  // היבוא כותב מחרוזת ריקה כשאין הערות בקובץ, ולכן לא מספיק לבדוק קיום
  const notes = String(customer?.erp?.notes || "").trim();

  // תקציר הכתובת בכותרת: מה שיש, בסדר קריא, בלי פסיקים ריקים
  const addressLine = [
    [address.street, address.houseNumber].filter(Boolean).join(" "),
    cityName,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <MainDrawer>
        <CustomerDrawer id={id} />
      </MainDrawer>

      <PageTitle>צפייה בלקוח</PageTitle>

      {loading ? (
        <Loading loading={loading} />
      ) : !customer ? (
        <div className="w-full rounded-md bg-white p-8 text-center dark:bg-gray-800">
          <h2 className="text-base font-medium text-gray-600 dark:text-gray-400">
            {error ? "טעינת הלקוח נכשלה" : "הלקוח לא נמצא"}
          </h2>
          {error ? (
            <p className="mt-2 text-sm text-gray-400">{error}</p>
          ) : null}
        </div>
      ) : (
        <>
          <div className="mb-5 rounded-lg bg-white p-6 text-right dark:bg-gray-800">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h2 className="font-serif text-lg font-semibold text-gray-700 dark:text-gray-200 md:text-xl lg:text-2xl">
                    {text(fullName)}
                  </h2>
                  {/* סטטוס הפעילות מגיע מקובץ ההנהח"ש בלבד. ללקוח שנרשם בחנות
                      אין סטטוס כזה, ולכן הוא מסומן כלקוח חנות ולא כ"פעיל" */}
                  {!customer.erp ? (
                    <Badge type="neutral">
                      <span className="font-bold">לקוח חנות</span>
                    </Badge>
                  ) : customer.erp.active === false ? (
                    <Badge type="danger">
                      <span className="font-bold">לא פעיל בהנהח״ש</span>
                    </Badge>
                  ) : (
                    <Badge type="success">
                      <span className="font-bold">פעיל</span>
                    </Badge>
                  )}
                </div>

                {customer.erp ? (
                  <p className="font-serif text-sm text-gray-500 dark:text-gray-400">
                    מספר לקוח בהנהח״ש:{" "}
                    <span className="font-bold">
                      {text(customer.erp.customerNumber)}
                    </span>
                  </p>
                ) : null}

                <div className="mt-3 flex flex-col gap-1.5 text-sm text-gray-600 dark:text-gray-400 sm:flex-row sm:flex-wrap sm:gap-x-6">
                  <Contact icon={<FiMail />}>
                    {isPlaceholderEmail(customer.email) ? (
                      <>
                        <span className="text-gray-400">{customer.email}</span>{" "}
                        <Badge type="warning">מזהה פנימי — אין מייל בקובץ</Badge>
                      </>
                    ) : (
                      text(customer.email)
                    )}
                  </Contact>
                  <Contact icon={<FiPhone />}>{text(customer.phone)}</Contact>
                  {addressLine ? (
                    <Contact icon={<FiMapPin />}>{addressLine}</Contact>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-shrink-0 flex-wrap gap-2">
                {/* mainColor ולא customGreen: הצבע customGreen אינו מוגדר
                    ב-tailwind.config.js ולכן הכיתה לא מייצרת שום רקע, והכפתור
                    יצא טקסט לבן על רקע לבן */}
                <button
                  onClick={() => handleUpdate(id)}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-transparent bg-mainColor px-5 py-2 text-sm font-medium leading-5 text-white transition-colors duration-150 hover:bg-mainColor-dark focus:outline-none active:bg-mainColor-dark"
                >
                  <FiEdit /> עריכת לקוח
                </button>
                <Link
                  to={`/customer-order/${customer._id}`}
                  className="flex items-center gap-2 rounded-md border border-gray-200 px-5 py-2 text-sm font-medium leading-5 text-gray-600 transition-colors duration-150 hover:text-mainColor-dark dark:border-gray-600 dark:text-gray-300"
                >
                  <FiShoppingBag /> {t("CustomerOrderList")}
                </Link>
              </div>
            </div>
          </div>

          <CustomerErpStats customer={customer} />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <CustomerErpPanel customer={customer} />

            <Panel title="כתובת" icon={<FiMapPin />}>
              <Field label="עיר" value={text(cityName)} />
              <Field label="רחוב" value={text(address.street)} />
              <Field label="מספר בית" value={text(address.houseNumber)} />
              <Field label="דירה" value={text(address.apartmentNumber)} />
              <Field label="קומה" value={text(address.floor)} />
              <Field label="קוד כניסה" value={text(address.entryCode)} />
              <Field label="מיקוד" value={text(address.postalCode)} />
            </Panel>

            <CustomerAccountPanel customer={customer} />

            {notes ? (
              <Panel title="הערות" icon={<FiFileText />} span>
                <p className="sm:col-span-2 whitespace-pre-wrap break-words text-sm text-gray-700 dark:text-gray-200">
                  {notes}
                </p>
              </Panel>
            ) : null}
          </div>

          <p className="mb-8 mt-4 text-right text-xs text-gray-400 dark:text-gray-500">
            מזהה במערכת: {text(customer._id)}
          </p>
        </>
      )}
    </>
  );
};

export default CustomerDetails;
