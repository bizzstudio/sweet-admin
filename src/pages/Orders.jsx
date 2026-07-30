import React from "react";
import {
  Button,
  Card,
  CardBody,
  Input,
  Label,
  Pagination,
  Table,
  TableCell,
  TableContainer,
  TableFooter,
  TableHeader,
  Select as SelectReactSelect,
} from "@windmill/react-ui";
import { useContext, useState } from "react";
import { IoCloudDownloadOutline } from "react-icons/io5";
import { useTranslation } from "react-i18next";
import exportFromJSON from "export-from-json";
import Select, { components } from "react-select";

// Internal import
import { notifyError } from "@/utils/toast";
import useAsync from "@/hooks/useAsync";
import useFilter from "@/hooks/useFilter";
import OrderServices from "@/services/OrderServices";
import NotFound from "@/components/table/NotFound";
import PageTitle from "@/components/Typography/PageTitle";
import { SidebarContext } from "@/context/SidebarContext";
import OrderTable from "@/components/order/OrderTable";
import TableLoading from "@/components/preloader/TableLoading";
import spinnerLoadingImage from "@/assets/img/spinner.gif";
import useUtilsFunction from "@/hooks/useUtilsFunction";
import StatusServices from "@/services/StatusService";
import DeliveryServices from "@/services/DeliveryServices";
import CheckBox from "@/components/form/others/CheckBox";
import SelectWithCheckbox from "@/components/form/SelectWithCheckbox";

const Orders = () => {
  const {
    time,
    setTime,
    statuses,
    endDate,
    setStatuses,
    setEndDate,
    startDate,
    currentPage,
    searchText,
    searchRef,
    method,
    setMethod,
    setStartDate,
    setSearchText,
    handleChangePage,
    handleSubmitForAll,
    resultsPerPage,
    setCities,
    cities,
  } = useContext(SidebarContext);

  const { t } = useTranslation();

  const [loadingExport, setLoadingExport] = useState(false);

  const { data, loading, error } = useAsync(() =>
    OrderServices.getAllOrders({
      day: time,
      cities: cities,
      method: method,
      statuses: statuses,
      page: currentPage,
      endDate: endDate,
      startDate: startDate,
      limit: 100,
      customerName: searchText,
    })
  );
  // console.log('Orders :>> ', data);

  const { data: statusData } = useAsync(StatusServices.getAllStatuses);
  const { data: cityData } = useAsync(DeliveryServices.getAllDeliveries);

  const { currency, getNumber, getNumberTwo } = useUtilsFunction();
  const { dataTable, serviceData } = useFilter(data?.orders);

  const [startDateInput, setStartDateInput] = useState("");
  const [endDateInput, setEndDateInput] = useState("");

  const handleDownloadOrders = async () => {
    try {
      setLoadingExport(true);
      const res = await OrderServices.getAllOrders({
        page: 1,
        day: time,
        method: method,
        statuses: statuses,
        endDate: endDate,
        download: true,
        startDate: startDate,
        limit: data?.totalDoc,
        customerName: searchText,
      });

      const exportData = res?.orders?.map((order) => ({
        _id: order._id,
        invoice: order.invoice,
        subTotal: getNumberTwo(order.subTotal),
        shippingCost: getNumberTwo(order.shippingCost),
        discount: getNumberTwo(order?.discount),
        total: getNumberTwo(order.total),
        paymentMethod: order.paymentMethod,
        status: order.status,
        user_info: `${order?.user_info?.name} ${order?.user_info?.lastName}`,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      }));

      exportFromJSON({
        data: exportData,
        fileName: "orders",
        exportType: exportFromJSON.types.csv,
      });
      setLoadingExport(false);
    } catch (err) {
      setLoadingExport(false);
      notifyError(err?.response?.data?.message || err?.message);
    }
  };

  // handle reset field
  const handleResetField = () => {
    setTime("");
    setMethod("");
    setStatuses([]);
    setEndDate("");
    setStartDate("");
    setSearchText("");
    searchRef.current.value = "";
    setStartDateInput("");
    setEndDateInput("");
    setCities([]);
  };

  // handle limit change
  const handleLimitChange = (e) => {
    const value = e.target.value;
    let startDate, endDate;

    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    switch (value) {
      case "thisMonth":
        startDate = new Date(year, month, 1);
        endDate = today;
        break;
      case "lastMonth":
        if (month === 0) {
          // אם זה ינואר, החודש הקודם הוא דצמבר של השנה הקודמת
          startDate = new Date(year - 1, 11, 1);
          endDate = new Date(year - 1, 11, 31);
        } else {
          startDate = new Date(year, month - 1, 1);
          endDate = new Date(year, month, 0); // היום האחרון בחודש הקודם
        }
        break;
      case "thisYear":
        startDate = new Date(year, 0, 1);
        endDate = today;
        break;
      case "7":
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 6); // התחלת 7 ימים אחורה מהיום
        endDate = today;
        break;
      case "30":
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 30); // התחלת 30 ימים אחורה מהיום
        endDate = today;
        break;
      default:
        setTime(value);
        return;
    }

    // יצירת תאריך בפורמט מקומי לשדות התאריכים
    const formatDateToLocal = (date) => {
      const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
      return localDate.toISOString().split('T')[0];
    };

    setStartDate(startDate);
    setEndDate(endDate);
    setStartDateInput(formatDateToLocal(startDate));
    setEndDateInput(formatDateToLocal(endDate));
  };

  const handleStatusChange = (selectedOptions) => {
    const selectedStatuses = selectedOptions.map(option => option.value);
    setStatuses(selectedStatuses);
  };

  const handleCityChange = (selectedOptions) => {
    const selectedCities = selectedOptions.map(option => option.value);
    setCities(selectedCities);
  };

  const statusOptions = statusData.map(status => ({
    value: status.name,
    label: status.heName,
    isSelected: statuses.includes(status.name)
  }));

  const cityOptions = cityData.map(cityObj => ({
    value: cityObj?.city?._id,
    label: cityObj?.city?.city_name_he,
    isSelected: cities.includes(cityObj?.city?._id)
  }));


  return (
    <>
      <PageTitle>{t("Orders")}</PageTitle>

      <Card className="min-w-0 shadow-xs bg-white dark:bg-gray-800 mb-5">
        <CardBody>
          <form onSubmit={handleSubmitForAll}>
            <div className="grid gap-4 lg:gap-4 xl:gap-6 md:gap-2 md:grid-cols-6 py-2">
              {/* חיפוש */}
              <div title={t("SearchOrder")} className="col-span-2">
                <Input
                  ref={searchRef}
                  type="search"
                  name="search"
                  placeholder={t("SearchOrder")}
                />
              </div>

              <div className="flex flex-col">
                <SelectWithCheckbox
                  placeholder={t("selectStatus")}
                  options={statusOptions}
                  onChange={handleStatusChange}
                />
              </div>

              {/* סינון על פי ערים */}
              <div className="flex flex-col">
                <SelectWithCheckbox
                  placeholder={t("Delivery Destination")}
                  options={cityOptions}
                  onChange={handleCityChange}
                />
              </div>

              {/* סינון על פי זמן */}
              <div>
                <SelectReactSelect onChange={handleLimitChange}>
                  <option value="Order limits" defaultValue hidden>
                    {t("Orderlimits")}
                  </option>
                  <option value="thisMonth">{t("thisMonth")}</option>
                  <option value="lastMonth">{t("lastMonth")}</option>
                  <option value="thisYear">{t("thisYear")}</option>
                  <option value="7">{t("DaysOrders7")}</option>
                  <option value="30">{t("DaysOrders30")}</option>
                </SelectReactSelect>
              </div>

              {/* הורדת הזמנות */}
              <div>
                {loadingExport ? (
                  <Button disabled={true} type="button" className="h-12 w-full">
                    <img src={spinnerLoadingImage} alt="Loading" width={20} height={10} />{" "}
                    <span className="font-serif ml-2 font-light">Processing</span>
                  </Button>
                ) : (
                  <Button
                    onClick={handleDownloadOrders}
                    disabled={data?.orders?.length <= 0 || loadingExport}
                    type="button"
                    className={`${(data?.orders?.length <= 0 || loadingExport) &&
                      "opacity-50 cursor-not-allowed bg-customGreen-dark"
                      } flex items-center justify-center h-12 w-full`}
                  >
                    <IoCloudDownloadOutline className="me-1" />
                    {t("DownloadAllOrders")}
                  </Button>
                )}
              </div>
            </div>

            <div className="grid gap-4 lg:gap-6 xl:gap-6 lg:grid-cols-3 xl:grid-cols-3 md:grid-cols-3 sm:grid-cols-1 py-2">

              {/* סינון על פי תאריך התחלה */}
              <div>
                <Label>{t("StartDate")}</Label>
                <Input
                  type="date"
                  name="startDate"
                  value={startDateInput}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setStartDateInput(e.target.value);
                  }}
                />
              </div>

              {/* סינון על פי תאריך סיום */}
              <div>
                <Label>{t("EndDate")}</Label>
                <Input
                  type="date"
                  name="endDate"
                  value={endDateInput}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setEndDateInput(e.target.value);
                  }}
                />
              </div>

              {/* כפתורי סינון ואיפוס */}
              <div className="mt-2 md:mt-0 flex items-center xl:gap-x-4 gap-x-1 flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                <div className="w-full mx-1">
                  <Label style={{ visibility: "hidden" }}>{t("Filter")}</Label>
                  <Button type="submit" className="h-12 w-full bg-customGreen-dark">
                    {t("Filter")}
                  </Button>
                </div>

                <div className="w-full">
                  <Label style={{ visibility: "hidden" }}>{t("Reset")}</Label>
                  <Button
                    layout="outline"
                    onClick={handleResetField}
                    type="reset"
                    className="px-4 md:py-1 py-3 text-sm dark:bg-gray-700 w-full"
                  >
                    <span className="text-black dark:text-gray-200">{t("Reset")}</span>
                  </Button>
                </div>
              </div>

            </div>
          </form>
        </CardBody>
      </Card>

      {/* נתוני הזמנות */}
      {data && (
        <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 rounded-t-lg rounded-0 mb-4">
          <CardBody>
            <div className="flex justify-evenly">

              {/* סה"כ הזמנות */}
              <div className="dark:text-gray-300">
                <span className="font-medium"> {t("TotalOrder")}</span> :{" "}
                <span className="font-semibold">{getNumber(data?.totalDoc)}</span>
              </div>
              <span className="w-0.5 h-6 bg-gray-800 dark:bg-gray-300" />

              {/* סה"כ משלוחים */}
              <div className="dark:text-gray-300">
                <span className="font-medium"> {t("TotalShippingOrder")}</span> :{" "}
                <span className="font-semibold">{getNumber(data?.totalShippingOrders)}</span>
              </div>
              <span className="w-0.5 h-6 bg-gray-800 dark:bg-gray-300" />

              {/* סה"כ איסוף עצמי */}
              <div className="dark:text-gray-300">
                <span className="font-medium"> {t("TotalPickupOrder")}</span> :{" "}
                <span className="font-semibold">{getNumber(data?.totalPickupOrders)}</span>
              </div>
              <span className="w-0.5 h-6 bg-gray-800 dark:bg-gray-300" />

              {/* סה"כ בונוסים */}
              <div className="dark:text-gray-300">
                <span className="font-medium"> {t("TotalBonuses")}</span> :{" "}
                <span className="font-semibold">{currency}{getNumberTwo(data?.totalBonuses)}</span>
              </div>

              {data?.methodTotals?.length > 0 &&
                <>
                  <span className="w-0.5 h-6 bg-gray-800 dark:bg-gray-300"></span>
                  {/* סה"כ הכנסות */}
                  {data?.methodTotals?.map((el, i) => (
                    <div key={i + 1} className="dark:text-gray-300">
                      {el?.method && (
                        <>
                          <span className="font-medium"> {t("TotalIncome")}</span> :{" "}
                          <span className="font-semibold ml-2">
                            {currency}
                            {getNumberTwo(el.total)}
                          </span>
                        </>
                      )}
                    </div>
                  ))}
                </>}
            </div>
          </CardBody>
        </Card>
      )}

      {loading ? (
        <TableLoading row={12} col={7} width={160} height={20} />
      ) : error ? (
        <span className="text-center mx-auto text-red-500">{error}</span>
      ) : serviceData?.length !== 0 ? (
        <TableContainer className="mb-8 dark:bg-gray-900">
          <Table>
            <TableHeader>
              <tr>
                <TableCell className="text-center">{t("InvoiceNo")}</TableCell>
                <TableCell className="text-center">{t("orderCreation")}</TableCell>
                <TableCell className="text-center">{t("orderUpdate")}</TableCell>
                <TableCell className="text-center">{t("CustomerName")}</TableCell>
                <TableCell className="text-center">{t("ShippingMethod")}</TableCell>
                <TableCell className="text-center">{t("AmountTbl")}</TableCell>
                <TableCell className="text-center">{t("OderStatusTbl")}</TableCell>
                <TableCell className="text-center">{t("satisfaction&bonus")}</TableCell>
                <TableCell className="text-center">{t("ActionTbl")}</TableCell>
                {/* <TableCell className="text-right">{t("InvoiceTbl")}</TableCell> */}
              </tr>
            </TableHeader>

            <OrderTable orders={data?.orders} />
          </Table>

          <TableFooter>
            <Pagination
              className="pagination-ltr"
              totalResults={data?.totalDoc}
              resultsPerPage={100}
              onChange={handleChangePage}
              label="Table navigation"
            />
          </TableFooter>
        </TableContainer>
      ) : (
        <NotFound title="Sorry, There are no orders right now." />
      )}
    </>
  );
};

export default Orders;
