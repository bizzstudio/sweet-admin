// src/pages/CashierOrders.jsx
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
const CashierOrders = () => {
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
    resultsPerPage,
  } = useContext(SidebarContext);

  const { t } = useTranslation();

  const [loadingExport, setLoadingExport] = useState(false);

  const { data, loading, error } = useAsync(() =>
    OrderServices.getAllCashierOrders({
      day: time,
      page: currentPage,
      endDate: endDate,
      startDate: startDate,
      limit: 100,
      customerName: searchText,
    })
  );
  console.log('CashierOrders :>> ', data);

  const { currency, getNumber, getNumberTwo } = useUtilsFunction();
  const { dataTable, serviceData } = useFilter(data?.orders);

  const [startDateInput, setStartDateInput] = useState("");
  const [endDateInput, setEndDateInput] = useState("");

  const handleDownloadOrders = async () => {
    try {
      setLoadingExport(true);
      const res = await OrderServices.getAllCashierOrders({
        page: 1,
        day: time,
        endDate: endDate,
        startDate: startDate,
        limit: data?.totalDoc,
        customerName: searchText,
      });

      const exportData = res?.orders?.map((order) => ({
        _id: order._id,
        invoice: order.invoice,
        subTotal: getNumberTwo(order.subTotal),
        discount: getNumberTwo(order.discount),
        total: getNumberTwo(order.total),
        cashier_name: order?.cashier?.name || 'לא זמין',
        customer_name: order?.user_info?.name || 'לא זמין',
        customer_phone: order?.user_info?.phone || 'לא זמין',
        coupon_code: order?.coupon?.couponCode || '',
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      }));

      exportFromJSON({
        data: exportData,
        fileName: "cashier-orders",
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
      <PageTitle>{t("CashierOrders")}</PageTitle>

      <Card className="min-w-0 shadow-xs bg-white dark:bg-gray-800 mb-5">
        <CardBody>
          <form onSubmit={handleSubmitForAll}>
            <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 py-2">

              {/* חיפוש */}
              <div title={t("SearchOrder")} className="md:col-span-2 xl:col-span-1">
                <Label>{t("SearchOrderLabel")}</Label>
                <Input
                  ref={searchRef}
                  type="search"
                  name="search"
                  placeholder={t("SearchOrder")}
                />
              </div>

              {/* סינון על פי זמן */}
              <div className="md:col-span-1 xl:col-span-1">
                <Label>{t("Orderlimits")}</Label>
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

              {/* תאריך התחלה */}
              <div className="md:col-span-1 xl:col-span-1">
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

              {/* תאריך סיום */}
              <div className="md:col-span-1 xl:col-span-1">
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

              {/* כפתורים */}
              <div className="md:col-span-2 lg:col-span-2 xl:col-span-2 flex justify-center items-end gap-2">
                {/* כפתורי סינון ואיפוס */}
                <Button type="submit" className="h-12 w-full bg-customGreen-dark text-xs">
                  {t("Filter")}
                </Button>
                <Button
                  layout="outline"
                  onClick={handleResetField}
                  type="reset"
                  className="!h-12 w-full px-3 text-xs dark:bg-gray-700"
                >
                  <span className="text-black dark:text-gray-200">{t("Reset")}</span>
                </Button>
                
                {/* כפתור הורדה */}
                <div>
                  {loadingExport ? (
                    <Button disabled={true} type="button" className="h-10 w-full text-xs">
                      <img src={spinnerLoadingImage} alt="Loading" width={16} height={8} />{" "}
                      {/* <span className="font-serif ml-1 font-light">Processing</span> */}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleDownloadOrders}
                      disabled={data?.orders?.length <= 0 || loadingExport}
                      type="button"
                      className={`${(data?.orders?.length <= 0 || loadingExport) &&
                        "opacity-50 cursor-not-allowed bg-customGreen-dark"
                        } flex items-center justify-center text-xs leading-4 w-full h-12 text-center transition-colors duration-150 font-medium px-3 py-2 rounded-md text-white bg-customGreen border border-transparent active:bg-customGreen-dark hover:bg-customGreen-dark `}
                    >
                      {/* {t("DownloadAllOrders")} */}
                      <span className="text-sm">
                        <IoCloudDownloadOutline />
                      </span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* נתוני הזמנות קופה */}
      {data && (
        <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 rounded-t-lg rounded-0 mb-4">
          <CardBody>
            <div className="flex flex-col md:flex-row justify-evenly gap-2">
              {/* סה"כ הזמנות */}
              <div className="dark:text-gray-300">
                <span className="font-medium">{t("TotalOrder")}</span> :{" "}
                <span className="font-semibold">{getNumber(data?.totalDoc)}</span>
              </div>
              <span className="md:w-0.5 w-full md:h-6 h-0.5 bg-gray-800 dark:bg-gray-300" />

              {/* סה"כ הכנסות */}
              <div className="dark:text-gray-300">
                <span className="font-medium">{t("TotalIncome")}</span> :{" "}
                <span className="font-semibold">{currency}{data?.totalAmount || 0}</span>
              </div>
              <span className="md:w-0.5 w-full md:h-6 h-0.5 bg-gray-800 dark:bg-gray-300" />

              {/* סה"כ הנחות */}
              <div className="dark:text-gray-300">
                <span className="font-medium">{t("TotalDiscount")}</span> :{" "}
                <span className="font-semibold">{currency}{data?.totalDiscount || 0}</span>
              </div>
              <span className="md:w-0.5 w-full md:h-6 h-0.5 bg-gray-800 dark:bg-gray-300" />

              {/* סה"כ לפני הנחה */}
              <div className="dark:text-gray-300">
                <span className="font-medium">{t("TotalBeforeDiscount")}</span> :{" "}
                <span className="font-semibold">{currency}{data?.totalSubTotal || 0}</span>
              </div>

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
          <Table className="w-full whitespace-nowrap admin-table">
            <TableHeader>
              <tr>
                <TableHeaderCell className="text-center">{t("InvoiceNo")}</TableHeaderCell>
                <TableHeaderCell className="text-center">{t("orderCreation")}</TableHeaderCell>
                <TableHeaderCell className="text-center">{t("orderUpdate")}</TableHeaderCell>
                <TableHeaderCell className="text-center">{t("Cashier")}</TableHeaderCell>
                <TableHeaderCell className="text-center">{t("CustomerName")}</TableHeaderCell>
                <TableHeaderCell className="text-center">{t("CustomerPhone")}</TableHeaderCell>
                <TableHeaderCell className="text-center">{t("ProductCount")}</TableHeaderCell>
                <TableHeaderCell className="text-center">{t("Discount")}</TableHeaderCell>
                <TableHeaderCell className="text-center">{t("Total")}</TableHeaderCell>
                <TableHeaderCell className="text-center">{t("Coupon")}</TableHeaderCell>
                <TableHeaderCell className="text-center">{t("ActionTbl")}</TableHeaderCell>
              </tr>
            </TableHeader>

            <OrderTable orders={data?.orders} isCashierOrders={true} />
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
        <NotFound title="Sorry, There are no cashier orders right now." />
      )}
    </>
  );
};

export default CashierOrders;
