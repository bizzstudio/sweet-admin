// src/components/drawer/CustomerDrawer.jsx
// ⚠️ לא בשימוש: עריכת הלקוח עברה לעמוד "צפייה בלקוח" עצמו (CustomerDetails),
// שם השדות הופכים לשדות קלט במקומם בלי שנפתחת מגירה. הקובץ נשמר כרפרנס
// לטופס המלא; הלוגיקה עצמה חיה ב-useCustomerSubmit ומשותפת לשני המצבים.
import React from "react";
import Scrollbars from "react-custom-scrollbars-2";

// Internal import

import Title from "@/components/form/others/Title";
import Error from "@/components/form/others/Error";
import InputArea from "@/components/form/input/InputArea";
import LabelArea from "@/components/form/selectOption/LabelArea";
import useCustomerSubmit from "@/hooks/useCustomerSubmit";
import DrawerButton from "@/components/form/button/DrawerButton";

// שדה טופס בפריסה הקבועה של המגירה (תווית משמאל, קלט מימין)
const FormRow = ({ label, children }) => (
  <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
    <LabelArea label={label} />
    <div className="col-span-8 sm:col-span-4">{children}</div>
  </div>
);

const CustomerDrawer = ({ id }) => {
  const { register, handleSubmit, onSubmit, errors, isSubmitting } =
    useCustomerSubmit(id);

  return (
    <>
      <div className="w-full relative p-6 border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
        {id ? (
          <Title
            title={"Update Customer"}
            description={"Update your Customer necessary information from here"}
          />
        ) : (
          <Title
            title={"Add Customer"}
            description={"Add your Customer necessary information from here"}
          />
        )}
      </div>

      <Scrollbars className="w-full md:w-7/12 lg:w-8/12 xl:w-8/12 relative dark:bg-gray-700 dark:text-gray-200">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="px-6 pt-8 flex-grow scrollbar-hide w-full max-h-full pb-40">
            <FormRow label={"Name"}>
              <InputArea
                register={register}
                label="Name"
                name="name"
                type="text"
                placeholder={"Name"}
              />
              <Error errorName={errors.name} />
            </FormRow>

            <FormRow label={"Last Name"}>
              <InputArea
                register={register}
                label="Last Name"
                name="lastName"
                type="text"
                placeholder={"Last Name"}
              />
              <Error errorName={errors.lastName} />
            </FormRow>

            <FormRow label={"Email"}>
              <InputArea
                register={register}
                label="Email"
                name="email"
                type="email"
                placeholder={"Email"}
              />
              <Error errorName={errors.email} />
            </FormRow>

            <FormRow label={"Phone"}>
              <InputArea
                required
                register={register}
                label="Phone"
                name="phone"
                type="text"
                placeholder={"Phone"}
              />
              <Error errorName={errors.phone} />
            </FormRow>

            {/* העיר אינה מופיעה כאן: היא נשמרת כרשומה מלאה מנתוני הלמ"ס
                (city_code וכו') שעליה מסתמכים מחיר המשלוח וימי החלוקה, ושדה
                טקסט חופשי היה מייצר עיר בלי קוד ושובר אותם. השמירה מעבירה את
                אובייקט העיר הקיים כמו שהוא, והוא מוצג בעמוד "צפייה בלקוח" */}
            <div className="mb-4 border-t border-gray-100 pt-6 dark:border-gray-600">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                כתובת
              </h3>
            </div>

            <FormRow label={"רחוב"}>
              <InputArea
                required
                register={register}
                label="Street"
                name="street"
                type="text"
                placeholder={"רחוב"}
              />
              <Error errorName={errors.street} />
            </FormRow>

            <FormRow label={"מספר בית"}>
              <InputArea
                required
                register={register}
                label="House Number"
                name="houseNumber"
                type="text"
                placeholder={"מספר בית"}
              />
              <Error errorName={errors.houseNumber} />
            </FormRow>

            <FormRow label={"דירה"}>
              <InputArea
                required
                register={register}
                label="Apartment"
                name="apartmentNumber"
                type="text"
                placeholder={"דירה"}
              />
              <Error errorName={errors.apartmentNumber} />
            </FormRow>

            <FormRow label={"קומה"}>
              <InputArea
                required
                register={register}
                label="Floor"
                name="floor"
                type="text"
                placeholder={"קומה"}
              />
              <Error errorName={errors.floor} />
            </FormRow>

            <FormRow label={"קוד כניסה"}>
              <InputArea
                required
                register={register}
                label="Entry Code"
                name="entryCode"
                type="text"
                placeholder={"קוד כניסה"}
              />
              <Error errorName={errors.entryCode} />
            </FormRow>

            <FormRow label={"מיקוד"}>
              <InputArea
                required
                register={register}
                label="Postal Code"
                name="postalCode"
                type="text"
                placeholder={"מיקוד"}
              />
              <Error errorName={errors.postalCode} />
            </FormRow>
          </div>

          <DrawerButton id={id} title="Customer" isSubmitting={isSubmitting} />
        </form>
      </Scrollbars>
    </>
  );
};

export default CustomerDrawer;
