// src/pages/CustomerDetails.jsx
// "צפייה בלקוח" - עמוד מלא עם כל פרטי הלקוח, במבנה של עמוד פרטי המוצר.
// כולל את השדות שהגיעו מיבוא האקסל ("רשימת לקוחות"), שלא חוזרים
// מ-getCustomerById כי הם מוגדרים select:false במודל.
// כל שדה מוצג פעם אחת בלבד: אין הפרדה בין "מה שנערך" ל"מה שהגיע מהקובץ".
import { Badge } from "@windmill/react-ui";
import React from "react";
import { useTranslation } from "react-i18next";
import { FiEdit, FiShoppingBag } from "react-icons/fi";
import { Link, useParams } from "react-router-dom";

// Internal import
import { Field, Section } from "@/components/common/ReadOnlyFields";
import CustomerAccountPanel from "@/components/customer/CustomerAccountPanel";
import CustomerErpPanel from "@/components/customer/CustomerErpPanel";
import CustomerDrawer from "@/components/drawer/CustomerDrawer";
import MainDrawer from "@/components/drawer/MainDrawer";
import Loading from "@/components/preloader/Loading";
import PageTitle from "@/components/Typography/PageTitle";
import useAsync from "@/hooks/useAsync";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import CustomerServices from "@/services/CustomerServices";
import { isPlaceholderEmail } from "@/utils/customerFormat";
import { text } from "@/utils/displayFormat";

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
              <div>
                <h2 className="font-serif text-lg font-semibold text-heading dark:text-gray-300 md:text-xl lg:text-2xl">
                  {text(fullName)}
                </h2>
                <p className="font-serif text-sm font-medium text-gray-500 dark:text-gray-400">
                  מספר לקוח בהנהח"ש:{" "}
                  <span className="font-bold text-gray-500 dark:text-gray-500">
                    {text(customer?.erp?.customerNumber)}
                  </span>
                </p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {isPlaceholderEmail(customer.email) ? (
                    <>
                      {customer.email}{" "}
                      <Badge type="warning">מזהה פנימי — אין מייל בקובץ</Badge>
                    </>
                  ) : (
                    text(customer.email)
                  )}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {text(customer.phone)}
                </p>
                <div className="mt-3">
                  {customer?.erp?.active === false ? (
                    <Badge type="danger">
                      <span className="font-bold">לקוח לא פעיל בהנהח"ש</span>
                    </Badge>
                  ) : (
                    <Badge type="success">
                      <span className="font-bold">לקוח פעיל</span>
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex flex-shrink-0 flex-wrap gap-2">
                <button
                  onClick={() => handleUpdate(id)}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-transparent bg-customGreen px-5 py-2 text-sm font-medium leading-5 text-white transition-colors duration-150 hover:bg-customGreen-dark focus:outline-none active:bg-customGreen-dark"
                >
                  <FiEdit /> עריכת לקוח
                </button>
                <Link
                  to={`/customer-order/${customer._id}`}
                  className="flex items-center gap-2 rounded-md border border-gray-200 px-5 py-2 text-sm font-medium leading-5 text-gray-600 transition-colors duration-150 hover:text-customGreen-dark dark:border-gray-600 dark:text-gray-300"
                >
                  <FiShoppingBag /> {t("CustomerOrderList")}
                </Link>
              </div>
            </div>
          </div>

          <div className="mb-8 rounded-lg bg-white p-6 text-right dark:bg-gray-800">
            <CustomerErpPanel customer={customer} />

            <Section title="כתובת">
              <Field
                label="עיר"
                value={text(address?.city?.city_name_he || address?.city?.city_name_en)}
              />
              <Field label="רחוב" value={text(address.street)} wide />
              <Field label="מספר בית" value={text(address.houseNumber)} />
              <Field label="דירה" value={text(address.apartmentNumber)} />
              <Field label="קומה" value={text(address.floor)} />
              <Field label="קוד כניסה" value={text(address.entryCode)} />
              <Field label="מיקוד" value={text(address.postalCode)} />
            </Section>

            <CustomerAccountPanel customer={customer} />
          </div>
        </>
      )}
    </>
  );
};

export default CustomerDetails;
