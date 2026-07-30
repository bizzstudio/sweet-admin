import React, { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";

// Internal imports
import useAsync from "@/hooks/useAsync";
import useFilter from "@/hooks/useFilter";
import useDeliverySubmit from "@/hooks/useDeliverySubmit";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import DeliveryServices from "@/services/DeliveryServices";
import useUtilsFunction from "@/hooks/useUtilsFunction";
import MainDrawer from "@/components/drawer/MainDrawer";
import DeliveryDrawer from "@/components/drawer/DeliveryDrawer";
import Loading from "@/components/preloader/Loading";
import PageTitle from "@/components/Typography/PageTitle";
import { SidebarContext } from "@/context/SidebarContext";

const DeliveryEdit = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const { handleUpdate } = useToggleDrawer();
  const { attribute } = useDeliverySubmit(id);
  const [variantTitle, setVariantTitle] = useState([]);
  const { lang } = useContext(SidebarContext);

  const { data, loading } = useAsync(() => DeliveryServices.getDeliveryById(id));

  const { currency, showingTranslateValue, getNumberTwo } = useUtilsFunction();


  useEffect(() => {
    if (!loading) {
      setVariantTitle(attribute);
    }
  }, [attribute, data?.cities, loading, lang]);


  return (
    <>
      <MainDrawer delivery>
        <DeliveryDrawer id={id} />
      </MainDrawer>

      <PageTitle>{t("DeliveryDetails")}</PageTitle>
      {loading ? (
        <Loading loading={loading} />
      ) : (
        <div className="inline-block overflow-y-auto h-full align-middle transition-all transform">
          <div className="flex flex-col lg:flex-row md:flex-row w-full overflow-hidden">
            <div className="w-full flex flex-col p-5 md:p-8 text-right">
              <div className="mb-5 block ">
                <div className="font-serif font-semibold py-1 text-sm">
                  <p className="text-sm text-gray-500 pr-4">
                    {t("Status")}:{" "}
                    {data.status === "active" ? (
                      <span className="text-emerald-400">
                        {t("ThisDeliveryActive")}
                      </span>
                    ) : (
                      <span className="text-red-400">
                        {t("ThisDeliveryInactive")}
                      </span>
                    )}
                  </p>
                </div>
                <h2 className="text-heading text-lg md:text-xl lg:text-2xl font-semibold font-serif dark:text-gray-400">
                  {data.name_of_region}
                </h2>
                <p className="uppercase font-serif font-medium text-gray-500 dark:text-gray-400 text-sm">
                  {t("Price")}:{" "}
                  <span className="font-bold text-gray-500 dark:text-gray-500">
                    {currency}{getNumberTwo(data.price)}
                  </span>
                </p>
                <p className="uppercase font-serif font-medium text-gray-500 dark:text-gray-400 text-sm">
                  {t("MinimumOrder")}:{" "}
                  <span className="font-bold text-gray-500 dark:text-gray-500">
                    {currency}
                    {getNumberTwo(
                      data.minimumOrder != null ? data.minimumOrder : 150
                    )}
                  </span>
                </p>
                <p className="uppercase font-serif font-medium text-gray-500 dark:text-gray-400 text-sm">
                  {t("DeliveryDays")}:{" "}
                  <span className="font-bold text-gray-500 dark:text-gray-500">
                    {data.days.map(day=>(day.name+', '))}
                  </span>
                </p>
              </div>
              <div className="font-serif product-price font-bold dark:text-gray-400">
                <span className="inline-block text-2xl">
                    {data.city}
                </span>
              </div>
              <div className="mt-6">
                <button
                  onClick={() => handleUpdate(id)}
                  className="cursor-pointer leading-5 transition-colors duration-150 font-medium text-sm focus:outline-none px-5 py-2 rounded-md text-white bg-customGreen border border-transparent active:bg-customGreen-dark hover:bg-customGreen-dark "
                >
                  {t("EditDelivery")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DeliveryEdit;
