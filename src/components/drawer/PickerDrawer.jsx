import { Input } from "@windmill/react-ui";
import React, { useState } from "react";
import { Scrollbars } from "react-custom-scrollbars-2";
import { useTranslation } from "react-i18next";
import { FiEye, FiEyeOff } from "react-icons/fi";

// Internal import
import Title from "@/components/form/others/Title";
import Error from "@/components/form/others/Error";
import LabelArea from "@/components/form/selectOption/LabelArea";
import DrawerButton from "@/components/form/button/DrawerButton";
import usePickerSubmit from "@/hooks/usePickerSubmit";

const PickerDrawer = ({ id }) => {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    onSubmit,
    errors,
    isActive,
    setIsActive,
    isSubmitting,
  } = usePickerSubmit(id);

  // הסיסמה מוצגת בטקסט גלוי רק בלחיצה, כדי שאפשר יהיה להקריא אותה
  // למלקט בלי שהיא תישאר חשופה על המסך מול מי שעובר במקרה.
  const [showPassword, setShowPassword] = useState(false);

  return (
    <>
      <div className="w-full relative p-6 border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
        <Title
          register={register}
          title={id ? t("UpdatePicker") : t("AddPicker")}
          description={t("PickerDrawerDescription")}
        />
      </div>

      <Scrollbars className="w-full md:w-7/12 lg:w-8/12 xl:w-8/12 relative dark:bg-gray-700 dark:text-gray-200">
        <form onSubmit={handleSubmit(onSubmit)} className="block">
          <div className="px-6 pt-8 flex-grow scrollbar-hide w-full">
            <div className="grid grid-cols-6 gap-2 mb-6">
              <LabelArea label={t("PickerName")} />
              <div className="col-span-6">
                <Input
                  {...register("heName", {
                    required: t("PickerNameRequired"),
                  })}
                  name="heName"
                  type="text"
                  placeholder={t("PickerName")}
                />
                <Error errorName={errors.heName} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-2 mb-6">
              <LabelArea label={t("Username")} />
              <div className="col-span-6">
                <Input
                  {...register("username", {
                    required: t("UsernameRequired"),
                    // רווחים בשם משתמש הם מקור קבוע לתקלות התחברות
                    // ("למה זה לא עובד") — נחסמים כבר בטופס.
                    pattern: {
                      value: /^\S+$/,
                      message: t("UsernameNoSpaces"),
                    },
                  })}
                  name="username"
                  type="text"
                  autoComplete="off"
                  placeholder={t("Username")}
                />
                <Error errorName={errors.username} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-2 mb-6">
              <LabelArea label={t("Password")} />
              <div className="col-span-6 relative">
                <Input
                  {...register("password", {
                    required: t("PasswordRequired"),
                  })}
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder={t("Password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? t("HidePassword") : t("ShowPassword")}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-customGreen-dark focus:outline-none"
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
                <Error errorName={errors.password} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-2 mb-6">
              <LabelArea label={t("phone")} />
              <div className="col-span-6">
                <Input
                  {...register("phone")}
                  name="phone"
                  type="tel"
                  placeholder={t("PickerPhoneOptional")}
                />
                <Error errorName={errors.phone} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-1 mb-6">
              <LabelArea label={t("statusState")} />
              <div className="col-span-6">
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`w-full border border-gray-300 rounded px-4 md:py-1 py-3 text-sm ${isActive ? "bg-green-500 text-white" : "!bg-red-500 text-white"}`}
                >
                  {isActive ? t("Active") : t("Inactive")}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-6 gap-1 mb-6">
              <LabelArea label={t("statusColor")} oneLine={true} />
              <div className="col-span-6">
                <Input type="color" {...register("color")} name="color" />
              </div>
            </div>
          </div>

          <div className="flex justify-between px-6 pb-4">
            <DrawerButton id={id} title={t("Picker")} isSubmitting={isSubmitting} />
          </div>
        </form>
      </Scrollbars>
    </>
  );
};

export default React.memo(PickerDrawer);
