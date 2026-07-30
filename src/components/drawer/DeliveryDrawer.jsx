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

// Internal import
import Title from "@/components/form/others/Title";
import Error from "@/components/form/others/Error";
import LabelArea from "@/components/form/selectOption/LabelArea";
import DrawerButton from "@/components/form/button/DrawerButton";
import useDeliverySubmit from "@/hooks/useDeliverySubmit";
import DeliveryServices from "@/services/DeliveryServices";
import { notifyError, notifySuccess } from "@/utils/toast";
import { SidebarContext } from "@/context/SidebarContext";
import SelectCity from "../form/selectOption/SelectCity";
import DaysSelect from "../form/selectOption/DaysSelect";
import City from '@/components/select/City'

const DeliveryDrawer = ({ id }) => {
  const { t } = useTranslation();
  const [cityArray, setCityArray] = useState([]);

  // הבאת הערים בישראל
  useEffect(() => {
    (async () => {
      const response = await fetch(
        "https://data.gov.il/api/3/action/datastore_search?resource_id=8f714b6f-c35c-4b40-a0e7-547b675eee0e&limit=100000"
      );
      const data = await response.json();
      let tempcity = []
      data.result.records.forEach(record => {
        tempcity.push(record)
      })
      setCityArray(tempcity.sort((a, b) => a.city_name_he.localeCompare(b.city_name_he, 'he')))
    })();
  }, []);

  const {
    register,
    onSubmit,
    errors,
    openModal,
    handleSubmit,
    isSubmitting,
    city,
    setCity,
    days,
    setDays
  } = useDeliverySubmit(id);

  return (
    <>
      <div className="w-full relative p-6 border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
        {id ? (
          <Title
            register={register}
            title={t("UpdateDelivery")}
            description={t("UpdateDeliveryDescription")}
          />
        ) : (
          <Title
            register={register}
            title={t("DrawerAddDelivery")}
            description={t("AddDeliveryDescription")}
          />
        )}
      </div>

      <Scrollbars className="track-horizontal thumb-horizontal w-full md:w-7/12 lg:w-8/12 xl:w-8/12 relative dark:bg-gray-700 dark:text-gray-200">
        <form onSubmit={handleSubmit(onSubmit)} className="block" id="block">
          <div className="px-6 pt-8 flex-grow w-full h-full max-h-full pb-40 md:pb-32 lg:pb-32 xl:pb-32">
            {/* <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <LabelArea label={t("RegionName")} />
              <div className="col-span-8 sm:col-span-4">
                <Input
                  {...register(`name_of_region`, {
                    required: "Region name is required!",
                  })}
                  name="name_of_region"
                  type="text"
                  placeholder={t("RegionName")}
                />
                <Error errorName={errors.name_of_region} />
              </div>
            </div> */}

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <div className="flex justify-center items-center"><LabelArea label={t("City")} /></div>
              <div className="col-span-8 sm:col-span-4">
                <City setValue={setCity} value={city} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <div className="flex justify-center items-center"><LabelArea label={t("Price")} /></div>
              <div className="col-span-8 sm:col-span-4">
                <Input
                  {...register(`price`, {
                    required: "Price is required!",
                  })}
                  name="price"
                  type="number"
                  placeholder={t("Price")}
                // defaultValue={values.price}
                />
                <Error errorName={errors.price} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <div className="flex justify-center items-center"><LabelArea label={t("MinimumOrder")} /></div>
              <div className="col-span-8 sm:col-span-4">
                <Input
                  {...register("minimumOrder", {
                    min: { value: 0, message: t("MinimumOrderInvalid") },
                  })}
                  name="minimumOrder"
                  type="number"
                  min={0}
                  step={1}
                  placeholder={t("MinimumOrder")}
                />
                <Error errorName={errors.minimumOrder} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <div className="flex justify-center items-center"><LabelArea label={t("Days")} /></div>
              <div className="col-span-8 sm:col-span-4">
                {/* תמיד נשלח את כל הימים */}
                {<DaysSelect setSelectedDays={setDays} selectedDaysFromUser={days} />}
              </div>
            </div>

            <div className="grid grid-cols-6 gap-3 md:gap-5 xl:gap-6 lg:gap-6 mb-6">
              <div className="flex justify-center items-center"><LabelArea label={t("BiweeklyDelivery")} /></div>
              <div className="col-span-8 sm:col-span-4 flex items-center">
                <Input
                  {...register("biweekly")}
                  name="biweekly"
                  type="checkbox"
                  className="w-5 h-5"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-between px-6 pb-4">
            <DrawerButton id={id} title={t("Delivery")} isSubmitting={isSubmitting} />
          </div>
        </form>
      </Scrollbars>
    </>
  )
}

export default DeliveryDrawer;