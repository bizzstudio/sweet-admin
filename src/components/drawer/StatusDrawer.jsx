import {
  Button,
  Input,
  TableCell,
  TableContainer,
  TableHeader,
  Textarea,
  Table,
} from "@windmill/react-ui";
import React, { useContext, useEffect, useState } from "react";
import { Scrollbars } from "react-custom-scrollbars-2";
import { Modal } from "react-responsive-modal";
import "react-responsive-modal/styles.css";
import { useTranslation } from "react-i18next";
import { FiX } from "react-icons/fi";
import { useHistory } from "react-router-dom";
import Color from "color";

// Internal import

import Title from "@/components/form/others/Title";
import Error from "@/components/form/others/Error";
import LabelArea from "@/components/form/selectOption/LabelArea";
import DrawerButton from "@/components/form/button/DrawerButton";
import useStatusSubmit from "@/hooks/useStatusSubmit";
import { notifyError, notifySuccess } from "@/utils/toast";
import StatusServices from "@/services/StatusService";
import { SidebarContext } from "@/context/SidebarContext";

// Internal import

const StatusDrawer = ({ id }) => {
  const { t } = useTranslation();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { closeDrawer } = useContext(SidebarContext);
  const {
    values,
    register,
    onSubmit,
    errors,
    openModal,
    handleSubmit,
    isSubmitting,
    tag,
    setTag,
    language,
    hue,
    setHue,
    setValue
  } = useStatusSubmit(id);

  const history = useHistory();

  const handleDeleteStatus = async () => {
    try {
      await StatusServices.deleteStatus(id);
      notifySuccess(t("StatusDeletedSuccessfully"));
      setConfirmDelete(false);
      closeDrawer();
      history.push("/statuses");
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    }
  };

  // const saturation = 39; // הרוויה קבועה
  // const lightness = 40; // הבהירות קבועה
  // // מעדכן את ה-value של statusColor בכל פעם שה-hue משתנה
  // useEffect(() => {
  //   const hexColor = Color({ h: hue, s: saturation, l: lightness }).hex();
  //   setValue("statusColor", hexColor); // עדכון הערך בשדה הנסתר
  // }, [hue, setValue, saturation, lightness]);

  return (
    <>
      <Modal
        open={openModal}
        onClose={() => { }}
        center
        closeIcon={
          <div className="absolute top-0 right-0 text-red-500 active:outline-none text-xl border-0">
            <FiX className="text-3xl" />
          </div>
        }
      >
        <div className="cursor-pointer"></div>
      </Modal>

      <div className="w-full relative p-6 border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
        {id ? (
          <Title
            register={register}
            title={t("UpdateStatus")}
            description={t("UpdateStatusDescription")}
          />
        ) : (
          <Title
            register={register}
            title={t("הוספת מלקטים")}
            description={t("נא להכניס את כל הפרטים")}
          />
        )}
      </div>

      <Scrollbars className="w-full md:w-7/12 lg:w-8/12 xl:w-8/12 relative dark:bg-gray-700 dark:text-gray-200">
        <form onSubmit={handleSubmit(onSubmit)} className="block" id="block">
          <div className="px-6 pt-8 flex-grow scrollbar-hide w-full">
            <div className="grid grid-cols-6 gap-2 mb-6">
              <LabelArea label={t("heName")} />
              <div className="col-span-6">
                <Input
                  {...register(`heName`, {
                    required: t("Hebrew name is required!"),
                  })}
                  name="heName"
                  type="text"
                  placeholder={t("heName")}
                />
                <Error errorName={errors.name} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-2 mb-6">
              <LabelArea label={t("enName")} />
              <div className="col-span-6">
                <Input
                  {...register(`name`, {
                    required: t("Name is required!"),
                  })}
                  name="name"
                  type="text"
                  placeholder={t("enName")}
                />
                <Error errorName={errors.heName} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-2 mb-6">
              <LabelArea label={t("phone")} />
              <div className="col-span-6">
                <Input
                  {...register(`phone`, {
                    required: t("Phone is required!"),
                  })}
                  name="phone"
                  type="tel"
                  placeholder={t("phone")}
                />
                <Error errorName={errors.phone} />
              </div>
            </div>
            
            <div className="grid grid-cols-6 gap-2 mb-6">
              <LabelArea label={t("Password")} oneLine={true} />
              <div className="col-span-6">
                <Input
                  {...register(`password`)}
                  name="password"
                  type="text"
                  placeholder={t("App Password")}
                />
                <Error errorName={errors.password} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-1 mb-6">
              <LabelArea label={t("statusState")} />
              <div className="col-span-6">
                <button
                  type="button"
                  layout="outline"
                  onClick={() => setTag(!tag)}
                  className={`w-full border border-gray-300 rounded px-4 md:py-1 py-3 text-sm ${tag ? "bg-green-500 text-white" : "!bg-red-500 text-white"}`}
                >
                  {tag ? t("Active") : t("Inactive")}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-6 gap-1 mb-6">
              <LabelArea label={t("statusColor")} oneLine={true} />
              <div className="col-span-6">
                <Input
                  type="color"
                  {...register("statusColor", {
                    required: t("Color is required!"),
                  })}
                  name="statusColor"
                />
                <Error errorName={errors.statusColor} />

                {/* <input
                  type="range"
                  min="0"
                  max="360"
                  value={hue}
                  onChange={(e) => setHue(e.target.value)}
                  className="w-full"
                />
                <div
                  style={{
                    backgroundColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
                    width: "100%",
                    height: "30px",
                    marginTop: "10px",
                    borderRadius: "4px",
                  }}
                ></div> */}
                {/* <input
                  type="hidden"
                  {...register("statusColor", {
                    required: "Color is required!",
                  })}
                  name="statusColor"
                /> */}
              </div>
            </div>
          </div>

          <div className="flex justify-between px-6 pb-4">
            <DrawerButton id={id} title={t("Collector")} isSubmitting={isSubmitting} />
          </div>
        </form>
      </Scrollbars>
    </>
  );
};

export default React.memo(StatusDrawer);
