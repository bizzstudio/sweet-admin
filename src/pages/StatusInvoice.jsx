import {
  Button,
  Input,
  Textarea,
} from "@windmill/react-ui";
import React, { useContext, useEffect, useState } from "react";
import { useParams, useHistory } from "react-router-dom";
import { Scrollbars } from "react-custom-scrollbars-2";
import { Modal } from "react-responsive-modal";
import "react-responsive-modal/styles.css";
import { useTranslation } from "react-i18next";
import { FiX } from "react-icons/fi";
import { useForm } from "react-hook-form";

// Internal import
import Title from "@/components/form/others/Title";
import Error from "@/components/form/others/Error";
import LabelArea from "@/components/form/selectOption/LabelArea";
import DrawerButton from "@/components/form/button/DrawerButton";
import useAsync from "@/hooks/useAsync";
import DeliveryServices from "@/services/DeliveryServices";
import { notifyError, notifySuccess } from "@/utils/toast";
import PageTitle from "@/components/Typography/PageTitle";
import Loading from "@/components/preloader/Loading";
import { SidebarContext } from "@/context/SidebarContext";
import MainDrawer from "@/components/drawer/MainDrawer";
import DeliveryDrawer from "@/components/drawer/DeliveryDrawer"; // צור רכיב זה אם הוא לא קיים

const DeliveryEdit = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const history = useHistory();
  const { closeDrawer } = useContext(SidebarContext);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, setValue, formState: { errors } } = useForm();

  const { data, loading, error } = useAsync(() =>
    DeliveryServices.getDeliveryById(id)
  );

  useEffect(() => {
    if (data) {
      setValue("name_of_region", data.name_of_region);
      setValue("cities", data?.cities?.map(c => c.city_name_he).join(", "));
      setValue("price", data.price);
      setValue("days", data.days);
    }
  }, [data, setValue]);

  const handleDeleteDelivery = async () => {
    try {
      await DeliveryServices.deleteDelivery(id);
      notifySuccess(t("DeliveryDeletedSuccessfully"));
      setConfirmDelete(false);
      closeDrawer();
      history.push("/deliveries");
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    }
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      await DeliveryServices.updateDelivery(id, data);
      notifySuccess(t("DeliveryUpdatedSuccessfully"));
      closeDrawer();
      history.push("/deliveries");
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <MainDrawer>
        <DeliveryDrawer id={id} />
      </MainDrawer>

      <PageTitle>{t("EditDelivery")}</PageTitle>

      {loading ? (
        <Loading loading={loading} />
      ) : error ? (
        <span className="text-center mx-auto text-red-500">{error}</span>
      ) : (
        <div className="inline-block overflow-y-auto h-full align-middle transition-all transform bg-white dark:bg-gray-800 p-6 lg:p-8 rounded-xl shadow-sm">
          <div className="w-full relative p-6 border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
            <Title
              register={register}
              title={t("UpdateDelivery")}
              description={t("UpdateDeliveryDescription")}
            />
          </div>

          <Scrollbars className="w-full h-full max-h-full dark:bg-gray-700 dark:text-gray-200">
            <form onSubmit={handleSubmit(onSubmit)} className="w-full">
              <div className="px-6 pt-8 flex-grow w-full h-full max-h-full pb-40 md:pb-32 lg:pb-32 xl:pb-32">
                <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                  <LabelArea label={t("RegionName")} />
                  <div className="col-span-8 sm:col-span-4">
                    <Input
                      {...register("name_of_region", {
                        required: "Region name is required!",
                      })}
                      name="name_of_region"
                      type="text"
                      placeholder={t("RegionName")}
                    />
                    <Error errorName={errors.name_of_region} />
                  </div>
                </div>

                <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                  <LabelArea label={t("Cities")} />
                  <div className="col-span-8 sm:col-span-4">
                    <Textarea
                      {...register("cities", {
                        required: "Cities are required!",
                      })}
                      name="cities"
                      placeholder={t("CitiesPlaceholder")}
                    />
                    <Error errorName={errors.cities} />
                  </div>
                </div>

                <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                  <LabelArea label={t("Price")} />
                  <div className="col-span-8 sm:col-span-4">
                    <Input
                      {...register("price", {
                        required: "Price is required!",
                      })}
                      name="price"
                      type="number"
                      placeholder={t("Price")}
                    />
                    <Error errorName={errors.price} />
                  </div>
                </div>

                <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
                  <LabelArea label={t("Days")} />
                  <div className="col-span-8 sm:col-span-4">
                    <Input
                      {...register("days", {
                        required: "Days are required!",
                      })}
                      name="days"
                      type="number"
                      placeholder={t("Days")}
                    />
                    <Error errorName={errors.days} />
                  </div>
                </div>
              </div>

              <div className="flex justify-between px-6 pb-4">
                <DrawerButton id={id} title="Delivery" isSubmitting={isSubmitting} />
                <Button
                  layout="outline"
                  onClick={() => setConfirmDelete(true)}
                  className="px-4 md:py-1 py-3 text-sm dark:bg-gray-700 bg-red-500 text-white"
                >
                  {t("DeleteDelivery")}
                </Button>
              </div>
            </form>
          </Scrollbars>
        </div>
      )}

      {confirmDelete && (
        <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} center>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              {t("ConfirmDeleteTitle")}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("ConfirmDeleteMessage")}
            </p>
            <div className="flex justify-end mt-4">
              <Button
                layout="outline"
                onClick={() => setConfirmDelete(false)}
                className="ml-2"
              >
                {t("Cancel")}
              </Button>
              <Button
                layout="outline"
                onClick={handleDeleteDelivery}
                className="bg-red-500 text-white"
              >
                {t("Delete")}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default DeliveryEdit;
