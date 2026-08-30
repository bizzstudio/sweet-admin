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

import TableHeaderCell from "@/components/table/TableHeaderCell";
const Orders = () => {
  const {
    time,
    setTime,
    endDate,
    setEndDate,
    startDate,
    currentPage,
    searchText,
    searchRef,
    setStartDate,
    setSearchText,
    handleChangePage,
    handleSubmitForAll,
  } = useContext(SidebarContext);

  const { t } = useTranslation();

  const [loadingExport, setLoadingExport] = useState(false);

  const { data, loading, error } = useAsync(() =>
    OrderServices.getAllOrders({
      day: time,
      page: currentPage,
      endDate: endDate,
      startDate: startDate,
      limit: 100,
      customerName: searchText,
    })
  );
  // console.log('Orders :>> ', data);

  const { getNumberTwo } = useUtilsFunction();
  const { serviceData } = useFilter(data?.orders);

  const [startDateInput, setStartDateInput] = useState("");
  const [endDateInput, setEndDateInput] = useState("");

  const handleDownloadOrders = async () => {
    try {
      setLoadingExport(true);
      const res = await OrderServices.getAllOrders({
        page: 1,
        day: time,
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
    setEndDate("");
    setStartDate("");
    setSearchText("");
    searchRef.current.value = "";
    setStartDateInput("");
    setEndDateInput("");
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

  return (
    <>
      <PageTitle>{t("Orders")}</PageTitle>

      <Card className="min-w-0 shadow-xs bg-white dark:bg-gray-800 mb-5">
        <CardBody>
          <form onSubmit={handleSubmitForAll}>
            <div className="grid gap-4 lg:gap-4 xl:gap-6 md:gap-2 md:grid-cols-4 py-2">
              {/* חיפוש */}
              <div title={t("SearchOrder")} className="col-span-2">
                <Input
                  ref={searchRef}
                  type="search"
                  name="search"
                  placeholder={t("SearchOrder")}
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

      {loading ? (
        <TableLoading row={12} col={7} width={160} height={20} />
      ) : error ? (
        <span className="text-center mx-auto text-red-500">{error}</span>
      ) : serviceData?.length !== 0 ? (
        <TableContainer className="mb-8 dark:bg-gray-900">
          <Table className="w-full whitespace-nowrap admin-table">
            <TableHeader>
              <tr>
                <TableHeaderCell className="text-center">{t("ActionTbl")}</TableHeaderCell>
                <TableHeaderCell className="text-center">{t("InvoiceNo")}</TableHeaderCell>
                <TableHeaderCell className="text-center">{t("orderCreation")}</TableHeaderCell>
                <TableHeaderCell className="text-center">{t("orderUpdate")}</TableHeaderCell>
                <TableHeaderCell className="text-center">{t("CustomerName")}</TableHeaderCell>
                <TableHeaderCell className="text-center">{t("AmountTbl")}</TableHeaderCell>
                <TableHeaderCell className="text-center">{t("OderStatusTbl")}</TableHeaderCell>
                {/* <TableHeaderCell className="text-right">{t("InvoiceTbl")}</TableHeaderCell> */}
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
