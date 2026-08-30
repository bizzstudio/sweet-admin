// src/pages/CustomerDetails.jsx
// "צפייה בלקוח" - עמוד מלא עם כל פרטי הלקוח.
// כולל את השדות שהגיעו מיבוא האקסל ("רשימת לקוחות"), שלא חוזרים
// מ-getCustomerById כי הם מוגדרים select:false במודל.
// כל שדה מוצג פעם אחת בלבד: אין הפרדה בין "מה שנערך" ל"מה שהגיע מהקובץ".
// המבנה: כותרת עם הזהות ודרכי הקשר, אריחי מספרים, ואז כרטיסים נפרדים לפי
// נושא - במקום רשימה אחת ארוכה של עשרות שדות.
// העריכה נעשית באותו עמוד: לחיצה על "עריכת לקוח" הופכת את השדות הניתנים
// לעריכה לשדות קלט במקומם, בלי מגירה ובלי חלון שנפתחים מעל העמוד.
import { Badge } from "@windmill/react-ui";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FiCreditCard,
  FiEdit,
  FiFileText,
  FiMail,
  FiMapPin,
  FiPhone,
  FiShoppingBag,
} from "react-icons/fi";
import { Link, useParams } from "react-router-dom";

// Internal import
import City from "@/components/select/City";
import {
  BoolControl,
  EditableField,
  EditActions,
  onlySaveButtonSubmits,
} from "@/components/common/EditableFields";
import { Panel } from "@/components/common/ReadOnlyFields";
import CustomerAccountPanel from "@/components/customer/CustomerAccountPanel";
import CustomerErpPanel, {
  CustomerErpStats,
} from "@/components/customer/CustomerErpPanel";
import CustomerHistoryPanel from "@/components/customer/CustomerHistoryPanel";
import CustomerPriceListPanel from "@/components/customer/CustomerPriceListPanel";
import CustomerBillingPanel from "@/components/billing/CustomerBillingPanel";
import Loading from "@/components/preloader/Loading";
import PageTitle from "@/components/Typography/PageTitle";
import useAsync from "@/hooks/useAsync";
import useCustomerSubmit from "@/hooks/useCustomerSubmit";
import CustomerServices from "@/services/CustomerServices";
import { isPlaceholderEmail } from "@/utils/customerFormat";
import { text } from "@/utils/displayFormat";

// שורת דרך קשר בכותרת: אייקון + ערך. min-w-0 ושבירת מילים כדי שמייל ארוך
// (במיוחד המייל הפנימי של היבוא) לא יגלוש מחוץ לכרטיס
const Contact = ({ icon, children }) => (
  <span className="flex min-w-0 items-center gap-1.5 break-words">
    <span className="flex-shrink-0 text-gray-500 dark:text-gray-500">{icon}</span>
    {children}
  </span>
);

const CustomerDetails = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);

  // useAsync נטען מחדש כש-isUpdate משתנה, כלומר מיד אחרי שמירה
  const { data, loading, error } = useAsync(() =>
    CustomerServices.getCustomerDetails(id)
  );

  const customer = data && data._id ? data : null;

  // הטופס יושב בעמוד עצמו: initialData חוסך בקשה שנייה לאותו לקוח, ו-onDone
  // מחזיר את העמוד למצב קריאה אחרי שמירה מוצלחת
  const {
    register,
    handleSubmit,
    onSubmit,
    errors,
    isSubmitting,
    isFormLoading,
    city,
    setCity,
    erpActive,
    setErpActive,
    ...accountForm
  } = useCustomerSubmit(id, {
    inline: true,
    isOpen: editing,
    onDone: () => setEditing(false),
    initialData: customer,
  });

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
      <PageTitle>צפייה בלקוח</PageTitle>

      {loading ? (
        <Loading loading={loading} />
      ) : !customer ? (
        <div className="w-full rounded-md bg-white p-8 text-center dark:bg-gray-800">
          <h2 className="text-base font-medium text-gray-600 dark:text-gray-400">
            {error ? "טעינת הלקוח נכשלה" : "הלקוח לא נמצא"}
          </h2>
          {error ? (
            <p className="mt-2 text-sm text-gray-500">{error}</p>
          ) : null}
        </div>
      ) : (
        <form
          autoComplete="off"
          onSubmit={onlySaveButtonSubmits(handleSubmit(onSubmit))}
        >
          <div className="mb-5 rounded-lg bg-white p-6 text-right dark:bg-gray-800">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 flex-grow">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h2 className="font-serif text-lg font-semibold text-gray-700 dark:text-gray-200 md:text-xl lg:text-2xl">
                    {text(fullName)}
                  </h2>
                  {/* סטטוס הפעילות מגיע מקובץ ההנהח"ש בלבד. ללקוח שנרשם בחנות
                      אין סטטוס כזה, ולכן הוא מסומן כלקוח חנות ולא כ"פעיל" */}
                  {/* בעריכה הסטטוס מוצג כשדה ("פעיל בהנהח״ש") ולא כתגית,
                      כדי שלא יופיעו על המסך שני ערכים שונים לאותו נתון */}
                  {!customer.erp ? (
                    <Badge type="neutral">
                      <span className="font-bold">לקוח חנות</span>
                    </Badge>
                  ) : editing ? null : customer.erp.active === false ? (
                    <Badge type="danger">
                      <span className="font-bold">לא פעיל בהנהח״ש</span>
                    </Badge>
                  ) : (
                    <Badge type="success">
                      <span className="font-bold">פעיל</span>
                    </Badge>
                  )}
                </div>

                {customer.erp && !editing ? (
                  <p className="font-serif text-sm text-gray-500 dark:text-gray-400">
                    מספר לקוח בהנהח״ש:{" "}
                    <span className="font-bold">
                      {text(customer.erp.customerNumber)}
                    </span>
                  </p>
                ) : null}

                {editing && isFormLoading ? (
                  <p className="mt-3 text-sm text-gray-500">
                    מרענן את פרטי הלקוח...
                  </p>
                ) : null}

                {editing ? (
                  // בעריכה שדות הזהות ודרכי הקשר מחליפים את שורת הסיכום
                  // שמעליהם, באותו מקום בכרטיס
                  <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
                    {/* שם ואימייל חובה במודל הלקוח (האימייל גם ייחודי), ולכן
                        הם נחסמים כאן ולא בשגיאת שרת אחרי שליחה */}
                    <EditableField
                      editing
                      label="שם פרטי"
                      name="name"
                      required
                      register={register}
                      error={errors.name}
                    />
                    <EditableField
                      editing
                      label="שם משפחה"
                      name="lastName"
                      register={register}
                      error={errors.lastName}
                    />
                    <EditableField
                      editing
                      label="אימייל"
                      name="email"
                      type="email"
                      required
                      register={register}
                      error={errors.email}
                    />
                    <EditableField
                      editing
                      label="טלפון"
                      name="phone"
                      register={register}
                      error={errors.phone}
                    />

                    {/* מספר הלקוח בהנהח"ש וסטטוס הפעילות קיימים רק ללקוח
                        שהגיע מיבוא האקסל, ולכן הם נערכים רק עבורו */}
                    {customer.erp ? (
                      <>
                        <EditableField
                          editing
                          label="מספר לקוח בהנהח״ש"
                          name="erpCustomerNumber"
                          register={register}
                          hint="לפי המספר הזה היבוא מזהה את הלקוח בקובץ"
                        />
                        <EditableField
                          editing
                          label="פעיל בהנהח״ש"
                          control={
                            <BoolControl
                              value={erpActive}
                              onChange={setErpActive}
                            />
                          }
                        />
                      </>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-3 flex flex-col gap-1.5 text-sm text-gray-600 dark:text-gray-400 sm:flex-row sm:flex-wrap sm:gap-x-6">
                    <Contact icon={<FiMail />}>
                      {isPlaceholderEmail(customer.email) ? (
                        <>
                          <span className="text-gray-500">{customer.email}</span>{" "}
                          <Badge type="warning">
                            מזהה פנימי — אין מייל בקובץ
                          </Badge>
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
                )}
              </div>

              <div className="flex flex-shrink-0 flex-wrap gap-2">
                {/* mainColor ולא customGreen: הצבע customGreen אינו מוגדר
                    ב-tailwind.config.js ולכן הכיתה לא מייצרת שום רקע, והכפתור
                    יצא טקסט לבן על רקע לבן */}
                <EditActions
                  editing={editing}
                  onEdit={() => setEditing(true)}
                  onCancel={() => setEditing(false)}
                  isSubmitting={isSubmitting}
                  saveDisabled={isFormLoading}
                  editLabel="עריכת לקוח"
                  icon={<FiEdit />}
                />
                {!editing ? (
                  <>
                    <Link
                      to={`/customer-order/${customer._id}`}
                      className="flex items-center gap-2 rounded-md border border-gray-200 px-5 py-2 text-sm font-medium leading-5 text-gray-600 transition-colors duration-150 hover:text-mainColor-dark dark:border-gray-600 dark:text-gray-300"
                    >
                      <FiShoppingBag /> {t("CustomerOrderList")}
                    </Link>
                    {/* המסמכים עצמם יושבים בעמוד נפרד ולא בכרטיס: הם נטענים
                        בקריאה נפרדת ויכולים להיות מאות שורות */}
                    <Link
                      to={`/customer-documents/${customer._id}`}
                      className="flex items-center gap-2 rounded-md border border-gray-200 px-5 py-2 text-sm font-medium leading-5 text-gray-600 transition-colors duration-150 hover:text-mainColor-dark dark:border-gray-600 dark:text-gray-300"
                    >
                      <FiFileText /> מסמכי לקוח
                    </Link>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <CustomerErpStats
            customer={customer}
            editing={editing}
            register={register}
          />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <CustomerErpPanel
              customer={customer}
              editing={editing}
              register={register}
            />

            <Panel title="כתובת" icon={<FiMapPin />}>
              {/* העיר נבחרת מרשימת היישובים של הלמ"ס ולא כטקסט חופשי: היא
                  נשמרת כרשומה מלאה (city_code וכו') שעליה מסתמכים מחיר
                  המשלוח וימי החלוקה, ועיר בלי קוד שוברת אותם */}
              <EditableField
                editing={editing}
                label="עיר"
                value={text(cityName)}
                wide
                control={<City value={city} setValue={setCity} />}
              />
              <EditableField
                editing={editing}
                label="רחוב"
                value={text(address.street)}
                name="street"
                register={register}
                error={errors.street}
              />
              <EditableField
                editing={editing}
                label="מספר בית"
                value={text(address.houseNumber)}
                name="houseNumber"
                register={register}
                error={errors.houseNumber}
              />
              <EditableField
                editing={editing}
                label="דירה"
                value={text(address.apartmentNumber)}
                name="apartmentNumber"
                register={register}
                error={errors.apartmentNumber}
              />
              <EditableField
                editing={editing}
                label="קומה"
                value={text(address.floor)}
                name="floor"
                register={register}
                error={errors.floor}
              />
              <EditableField
                editing={editing}
                label="קוד כניסה"
                value={text(address.entryCode)}
                name="entryCode"
                register={register}
                error={errors.entryCode}
              />
              <EditableField
                editing={editing}
                label="מיקוד"
                value={text(address.postalCode)}
                name="postalCode"
                register={register}
                error={errors.postalCode}
              />
            </Panel>

            <CustomerAccountPanel
              customer={customer}
              editing={editing}
              form={accountForm}
              register={register}
              errors={errors}
            />

            {/* המחירון הפרטי. פורש על כל הרוחב כי הוא כולל טבלת שורות ולא
                רשימת שדות כמו שאר הכרטיסים */}
            <CustomerPriceListPanel
              customerId={customer._id}
              customerName={fullName}
            />

            {/* היסטוריית הרכישות. יושבת ליד המחירון כי שתיהן נתונים שמגיעים
                מאותו ייצוא של ההנהח"ש ומשפיעות על מה שקורה בהזמנה — המחירון
                על המחיר, וההיסטוריה על איזה מוצר נבחר כשהשם עמום */}
            <CustomerHistoryPanel
              customerId={customer._id}
              customerName={fullName}
            />

            <Panel title="הגדרות חיוב" icon={<FiCreditCard />} span>
              <CustomerBillingPanel
                customerId={customer._id}
                billing={customer.billing}
                editing={editing}
                // הכתובת שאליה יישלחו החשבוניות כשאין כתובת ייעודית —
                // הפאנל מציג אותה כדי שברור לאן הן הולכות בפועל
                fallbackEmail={customer.email}
                // אחוז ההנחה שהגיע בייבוא של מנוע. משמש כברירת מחדל כשלא
                // נקבע אחוז אצלנו, ומוצג בפאנל כדי שיהיה ברור מאיפה הוא בא
                erpDiscountPercent={customer.erp?.discountPercent}
              />
            </Panel>

            {/* בעריכה הכרטיס מוצג גם כשאין הערות, כדי שאפשר יהיה להוסיף
                אותן; בקריאה הוא נעלם ולא תופס מקום ריק */}
            {notes || (editing && customer.erp) ? (
              <Panel title="הערות" icon={<FiFileText />} span>
                {editing && customer.erp ? (
                  <EditableField
                    editing
                    label="הערות"
                    name="erpNotes"
                    textarea
                    rows={4}
                    register={register}
                    wide
                  />
                ) : (
                  <p className="sm:col-span-2 whitespace-pre-wrap break-words text-sm text-gray-700 dark:text-gray-200">
                    {notes}
                  </p>
                )}
              </Panel>
            ) : null}
          </div>

          <p className="mb-8 mt-4 text-right text-xs text-gray-500 dark:text-gray-500">
            מזהה במערכת: {text(customer._id)}
          </p>
        </form>
      )}
    </>
  );
};

export default CustomerDetails;
