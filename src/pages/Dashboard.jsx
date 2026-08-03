import {
  Card,
  CardBody,
  Label,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHeader,
  TableRow,
  WindmillContext,
} from "@windmill/react-ui";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import isToday from "dayjs/plugin/isToday";
import isYesterday from "dayjs/plugin/isYesterday";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiCheck, FiTruck } from "react-icons/fi";
import { ImCreditCard } from "react-icons/im";
import { GiCardPickup } from "react-icons/gi";
import { MdOutlineCancel, MdOutlineToday } from "react-icons/md";
import { FaRegCalendarCheck } from "react-icons/fa6";
import { FaRegCalendarAlt } from "react-icons/fa";
import { TbCalendarRepeat } from "react-icons/tb";

// Internal import
import useAsync from "@/hooks/useAsync";
// import useFilter from "@/hooks/useFilter";
import LineChart from "@/components/chart/LineChart/LineChart";
import PieChart from "@/components/chart/Pie/PieChart";
import CardItem from "@/components/dashboard/CardItem";
import CardItemTwo from "@/components/dashboard/CardItemTwo";
import ChartCard from "@/components/chart/ChartCard";
import TableLoading from "@/components/preloader/TableLoading";
import NotFound from "@/components/table/NotFound";
import PageTitle from "@/components/Typography/PageTitle";
import OrderServices from "@/services/OrderServices";
import useUtilsFunction from "@/hooks/useUtilsFunction";
import { notifyError } from "@/utils/toast";



const Dashboard = () => {

  const { t } = useTranslation();

  const { mode } = useContext(WindmillContext);
  const { getNumber } = useUtilsFunction();

  dayjs.extend(isBetween);
  dayjs.extend(isToday);
  dayjs.extend(isYesterday);

  // react hook
  const [salesReport, setSalesReport] = useState([]);

  /*
   * מכירות לפי מוצר לפי יום:
   * selectedDate = התאריך שהמשתמש בחר (ברירת מחדל: היום). משמש לשליפת ההזמנות ולכיתוב בטבלה.
   * ordersForDate = רשימת ההזמנות שהתקבלו מהשרת עבור התאריך הנבחר (כולל cart בכל הזמנה).
   * loadingOrdersForDate = האם כרגע טוענים הזמנות (להצגת ספינר).
   */
  const [selectedDate, setSelectedDate] = useState(() => dayjs().subtract(1, "day").format("YYYY-MM-DD"));
  const [endDate, setEndDate] = useState("");
  const startDateInputRef = useRef(null);
  const endDateInputRef = useRef(null);
  const [ordersForDate, setOrdersForDate] = useState([]);
  const [loadingOrdersForDate, setLoadingOrdersForDate] = useState(false);
  const [fetchErrorForDate, setFetchErrorForDate] = useState(null);
  // const [todayCashPayment, setTodayCashPayment] = useState(0);
  // const [todayCardPayment, setTodayCardPayment] = useState(0);
  // const [todayCreditPayment, setTodayCreditPayment] = useState(0);
  // const [yesterdayCashPayment, setYesterdayCashPayment] = useState(0);
  // const [yesterdayCardPayment, setYesterdayCardPayment] = useState(0);
  // const [yesterdayCreditPayment, setYesterdayCreditPayment] = useState(0);
  // const [todayOrderAmount, setTodayOrderAmount] = useState(0);
  // const [yesterdayOrderAmount, setYesterdayOrderAmount] = useState(0);

  /*
   * שליפת הזמנות לפי תאריך (או טווח): מתאריך X עד תאריך Y.
   * אם "עד תאריך" ריק – רק היום הנבחר. אחרת טווח מתאריך עד תאריך.
   */
  useEffect(() => {
    if (!selectedDate) return;
    let cancelled = false;
    setFetchErrorForDate(null);
    setLoadingOrdersForDate(true);
    const start = dayjs(selectedDate).startOf("day");
    const end = endDate
      ? dayjs(endDate).endOf("day")
      : dayjs(selectedDate).endOf("day");
    const startFinal = start.isAfter(end) ? end.startOf("day") : start;
    const endFinal = start.isAfter(end) ? start.endOf("day") : end;
    OrderServices.getAllOrders({
      startDate: startFinal.toISOString(),
      endDate: endFinal.toISOString(),
      page: 1,
      limit: 5000,
      cacheBust: Date.now(),
    })
      .then((res) => {
        if (!cancelled) {
          setOrdersForDate(res?.orders ?? []);
          setFetchErrorForDate(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setOrdersForDate([]);
          setFetchErrorForDate(err?.response?.data?.message || err?.message || true);
          notifyError(err?.response?.data?.message || err?.message || t("ErrorLoadingSales"));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingOrdersForDate(false);
      });
    return () => { cancelled = true; };
  }, [selectedDate, endDate, t]);

  /*
   * פירוק ההזמנות לאגרגציה לפי מוצר.
   * cart יכול להכיל title כמחרוזת או כאובייקט { he, en }; מפתח איחוד = _id/id כדי לא למזג מוצרים שונים.
   */
  const productSalesList = useMemo(() => {
    const byProduct = new Map();
    const toStr = (v) => {
      if (v == null) return "";
      if (typeof v === "string") return v;
      if (typeof v === "object" && (v.he || v.en)) return v.he || v.en || "";
      return String(v);
    };
    ordersForDate.forEach((order) => {
      const cart = order.cart || [];
      cart.forEach((item, idx) => {
        const key = item._id?.toString?.() || item.id?.toString?.() || item.id || item._id || `item-${order._id}-${idx}`;
        const title = toStr(item.title) || toStr(item.name) || "מוצר ללא שם";
        const qty = Number(item.quantity) || 0;
        const unit = toStr(item.unit) || "";
        if (byProduct.has(key)) {
          const prev = byProduct.get(key);
          prev.quantity += qty;
          if (unit && !prev.unit) prev.unit = unit;
        } else {
          byProduct.set(key, { title, quantity: qty, unit });
        }
      });
    });
    return Array.from(byProduct.values()).sort((a, b) => b.quantity - a.quantity);
  }, [ordersForDate]);

  const {
    data: bestSellerProductChart,
    loading: loadingBestSellerProduct,
    error,
  } = useAsync(OrderServices.getBestSellerProductChart);

  // const { data: dashboardRecentOrder, loading: loadingRecentOrder } = useAsync(
  //   () => OrderServices.getDashboardRecentOrder({ page: currentPage, limit: 8 })
  // );

  const { data: dashboardOrderCount, loading: loadingOrderCount } = useAsync(
    OrderServices.getDashboardCount
  );

  const { data: dashboardOrderAmount, loading: loadingOrderAmount } = useAsync(
    OrderServices.getDashboardAmount
  );

  // const { dataTable, serviceData } = useFilter(dashboardRecentOrder?.orders);

  // חישוב הגרף הזמנות
  useEffect(() => {
    // today orders show
    // const todayOrder = dashboardOrderAmount?.ordersData?.filter((order) =>
    //   dayjs(order.updatedAt).isToday()
    // );
    // //  console.log('todayOrder',dashboardOrderAmount.ordersData)
    // const todayReport = todayOrder?.reduce((pre, acc) => pre + acc.total, 0);
    // setTodayOrderAmount(todayReport);

    // // yesterday orders
    // const yesterdayOrder = dashboardOrderAmount?.ordersData?.filter((order) =>
    //   dayjs(order.updatedAt).set(-1, "day").isYesterday()
    // );

    // const yesterdayReport = yesterdayOrder?.reduce(
    //   (pre, acc) => pre + acc.total,
    //   0
    // );
    // setYesterdayOrderAmount(yesterdayReport);

    // sales orders chart data
    const salesOrderChartData = dashboardOrderAmount?.ordersData?.filter(
      (order) =>
        dayjs(order.updatedAt).isBetween(
          new Date().setDate(new Date().getDate() - 7),
          new Date()
        )
    );

    salesOrderChartData?.reduce((res, value) => {
      let onlyDate = value.updatedAt.split("T")[0];

      if (!res[onlyDate]) {
        res[onlyDate] = { date: onlyDate, total: 0, order: 0 };
        salesReport.push(res[onlyDate]);
      }
      res[onlyDate].total += value.total;
      res[onlyDate].order += 1;
      return res;
    }, {});

    setSalesReport(salesReport);

    // const todayPaymentMethodData = [];
    // const yesterDayPaymentMethodData = [];

    // // today order payment method
    // dashboardOrderAmount?.ordersData?.filter((item, value) => {
    //   if (dayjs(item.updatedAt).isToday()) {
    //     if (item.paymentMethod === "Cash") {
    //       let cashMethod = {
    //         paymentMethod: "Cash",
    //         total: item.total,
    //       };
    //       todayPaymentMethodData.push(cashMethod);
    //     }

    //     if (item.paymentMethod === "Credit") {
    //       const cashMethod = {
    //         paymentMethod: "Credit",
    //         total: item.total,
    //       };

    //       todayPaymentMethodData.push(cashMethod);
    //     }

    //     if (item.paymentMethod === "Card") {
    //       const cashMethod = {
    //         paymentMethod: "Card",
    //         total: item.total,
    //       };

    //       todayPaymentMethodData.push(cashMethod);
    //     }
    //   }

    //   return item;
    // });
    // // yesterday order payment method
    // dashboardOrderAmount?.ordersData?.filter((item, value) => {
    //   if (dayjs(item.updatedAt).set(-1, "day").isYesterday()) {
    //     if (item.paymentMethod === "Cash") {
    //       let cashMethod = {
    //         paymentMethod: "Cash",
    //         total: item.total,
    //       };
    //       yesterDayPaymentMethodData.push(cashMethod);
    //     }

    //     if (item.paymentMethod === "Credit") {
    //       const cashMethod = {
    //         paymentMethod: "Credit",
    //         total: item?.total,
    //       };

    //       yesterDayPaymentMethodData.push(cashMethod);
    //     }

    //     if (item.paymentMethod === "Card") {
    //       const cashMethod = {
    //         paymentMethod: "Card",
    //         total: item?.total,
    //       };

    //       yesterDayPaymentMethodData.push(cashMethod);
    //     }
    //   }

    //   return item;
    // });

    // const todayCsCdCit = Object.values(
    //   todayPaymentMethodData.reduce((r, { paymentMethod, total }) => {
    //     if (!r[paymentMethod]) {
    //       r[paymentMethod] = { paymentMethod, total: 0 };
    //     }
    //     r[paymentMethod].total += total;

    //     return r;
    //   }, {})
    // );
    // const today_cash_payment = todayCsCdCit.find(
    //   (el) => el.paymentMethod === "Cash"
    // );
    // setTodayCashPayment(today_cash_payment?.total);
    // const today_card_payment = todayCsCdCit.find(
    //   (el) => el.paymentMethod === "Card"
    // );
    // setTodayCardPayment(today_card_payment?.total);
    // const today_credit_payment = todayCsCdCit.find(
    //   (el) => el.paymentMethod === "Credit"
    // );
    // setTodayCreditPayment(today_credit_payment?.total);

    // const yesterDayCsCdCit = Object.values(
    //   yesterDayPaymentMethodData.reduce((r, { paymentMethod, total }) => {
    //     if (!r[paymentMethod]) {
    //       r[paymentMethod] = { paymentMethod, total: 0 };
    //     }
    //     r[paymentMethod].total += total;

    //     return r;
    //   }, {})
    // );
    // const yesterday_cash_payment = yesterDayCsCdCit.find(
    //   (el) => el.paymentMethod === "Cash"
    // );
    // setYesterdayCashPayment(yesterday_cash_payment?.total);
    // const yesterday_card_payment = yesterDayCsCdCit.find(
    //   (el) => el.paymentMethod === "Card"
    // );
    // setYesterdayCardPayment(yesterday_card_payment?.total);
    // const yesterday_credit_payment = yesterDayCsCdCit.find(
    //   (el) => el.paymentMethod === "Credit"
    // );
    // setYesterdayCreditPayment(yesterday_credit_payment?.total);

    // // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardOrderAmount]);

  return (
    <>
      <PageTitle>{t("הכנסות")}</PageTitle>

      <div className="grid gap-2 mb-8 xl:grid-cols-5 md:grid-cols-2">
        <CardItemTwo
          mode={mode}
          title="Today Order"
          title2="TodayOrder"
          Icon={FaRegCalendarCheck}
          // cash={todayCashPayment || 0}
          // card={todayCardPayment || 0}
          // credit={todayCreditPayment || 0}
          price={dashboardOrderAmount?.todayAmount}
          className="text-white dark:text-customBrown-light bg-teal-600"
          loading={loadingOrderAmount}
        />

        <CardItemTwo
          mode={mode}
          title="Yesterday Order"
          title2="YesterdayOrder"
          Icon={MdOutlineToday}
          iconSize={35}
          // cash={yesterdayCashPayment || 0}
          // card={yesterdayCardPayment || 0}
          // credit={yesterdayCreditPayment || 0}
          price={dashboardOrderAmount?.yesterdayAmount || 0}
          className="text-white dark:text-customBrown-light bg-orange-400"
          loading={loadingOrderAmount}
        />

        <CardItemTwo
          mode={mode}
          title2="ThisMonth"
          Icon={FaRegCalendarAlt}
          price={dashboardOrderAmount?.thisMonthlyOrderAmount || 0}
          className="text-white dark:text-customBrown-light bg-blue-500"
          loading={loadingOrderAmount}
        />

        <CardItemTwo
          mode={mode}
          title2="LastMonth"
          Icon={TbCalendarRepeat}
          iconSize={35}
          price={dashboardOrderAmount?.lastMonthOrderAmount || 0}
          className="text-white dark:text-teal-100 bg-cyan-600"
          loading={loadingOrderAmount}
        />

        <CardItemTwo
          mode={mode}
          title2="AllTimeSales"
          Icon={ImCreditCard}
          price={dashboardOrderAmount?.totalAmount || 0}
          className="text-white dark:text-customBrown-light bg-emerald-500"
          loading={loadingOrderAmount}
        />
      </div>

      <h1 className="mt-6 mb-1 text-lg font-bold text-gray-700 dark:text-gray-300">{t("הזמנות היום")}</h1>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 ">
        <CardItem
          title={t("כל ההזמנות")}
          Icon={FiCheck}
          loading={loadingOrderCount}
          quantity={getNumber(dashboardOrderCount?.today?.totalOrders?.count)}
          className="text-customGreen-dark text-white dark:text-customBrown-light bbg-customGreen-dark"
        />
        <CardItem
          title={t("הזמנות עם משלוח")}
          Icon={FiTruck}
          loading={loadingOrderCount}
          quantity={dashboardOrderCount?.today?.totalShippingOrders?.count}
          className="text-white dark:text-customBrown-light bbg-customGreen-dark"
        />
        <CardItem
          title={t("איסוף עצמי")}
          Icon={GiCardPickup}
          loading={loadingOrderCount}
          quantity={dashboardOrderCount?.today?.totalPickupOrders?.count}
          className="text-white dark:text-customBrown-light bbg-customGreen-dark"
        />
        <CardItem
          title={t("הזמנות ממתינות לתשלום")}
          Icon={MdOutlineCancel}
          loading={loadingOrderCount}
          quantity={dashboardOrderCount?.today?.totalPendingOrders?.count}
          className="text-customGreen-dark text-white dark:text-customBrown-light bbg-customGreen-dark"
        />
      </div>

      <h1 className="mt-6 mb-1 text-lg font-bold text-gray-700 dark:text-gray-300">{t("הזמנות החודש")}</h1>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <CardItem
          title={t("כל ההזמנות")}
          Icon={FiCheck}
          loading={loadingOrderCount}
          quantity={dashboardOrderCount?.thisMonth?.totalOrders?.count}
          className="text-customGreen-dark text-white dark:text-customBrown-light bbg-customGreen-dark"
        />
        <CardItem
          title={t("הזמנות עם משלוח")}
          Icon={FiTruck}
          loading={loadingOrderCount}
          quantity={dashboardOrderCount?.thisMonth?.totalShippingOrders?.count}
          className="text-white dark:text-customBrown-light bbg-customGreen-dark"
        />
        <CardItem
          title={t("איסוף עצמי")}
          Icon={GiCardPickup}
          loading={loadingOrderCount}
          quantity={dashboardOrderCount?.thisMonth?.totalPickupOrders?.count}
          className="text-white dark:text-customBrown-light bbg-customGreen-dark"
        />
        <CardItem
          title={t("הזמנות ממתינות לתשלום")}
          Icon={MdOutlineCancel}
          loading={loadingOrderCount}
          quantity={dashboardOrderCount?.thisMonth?.totalPendingOrders?.count}
          className="text-customGreen-dark text-white dark:text-customBrown-light bbg-customGreen-dark"
        />
      </div>

      <h1 className="mt-6 mb-1 text-lg font-bold text-gray-700 dark:text-gray-300">{t("כל ההזמנות")}</h1>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <CardItem
          title={t("כל ההזמנות")}
          Icon={FiCheck}
          loading={loadingOrderCount}
          quantity={dashboardOrderCount?.allTime?.totalOrders?.count}
          className="text-customGreen-dark text-white dark:text-customBrown-light bbg-customGreen-dark"
        />
        <CardItem
          title={t("הזמנות עם משלוח")}
          Icon={FiTruck}
          loading={loadingOrderCount}
          quantity={dashboardOrderCount?.allTime?.totalShippingOrders?.count}
          className="text-white dark:text-customBrown-light bbg-customGreen-dark"
        />
        <CardItem
          title={t("איסוף עצמי")}
          Icon={GiCardPickup}
          loading={loadingOrderCount}
          quantity={dashboardOrderCount?.allTime?.totalPickupOrders?.count}
          className="text-white dark:text-customBrown-light bbg-customGreen-dark"
        />
        <CardItem
          title={t("הזמנות ממתינות לתשלום")}
          Icon={MdOutlineCancel}
          loading={loadingOrderCount}
          quantity={dashboardOrderCount?.allTime?.totalPendingOrders?.count}
          className="text-customGreen-dark text-white dark:text-customBrown-light bbg-customGreen-dark"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 my-8">
        <ChartCard
          mode={mode}
          loading={loadingOrderAmount}
          title={t("WeeklySales")}
        >
          <LineChart salesReport={salesReport} />
        </ChartCard>

        <ChartCard
          mode={mode}
          loading={loadingBestSellerProduct}
          title={t("BestSellingProducts")}
        >
          <PieChart data={bestSellerProductChart} />
        </ChartCard>
      </div>

      {/*
       * מכירות לפי מוצר לפי יום – בתחתית העמוד (כולל כפתורי היום ואתמול)
       */}
      <h1 className="mt-6 mb-2 text-lg font-bold text-gray-700 dark:text-gray-300">
        {t("DailySalesByProduct")}
      </h1>
      <Card className="min-w-0 shadow-xs bg-white dark:bg-gray-800 mb-6">
        <CardBody>
          <div className="flex flex-wrap items-end gap-4 mb-4" style={{ position: "relative", zIndex: 10 }}>
            <div className="w-full sm:w-auto max-w-[11rem] relative">
              <Label className="text-gray-700 dark:text-gray-300">{t("SelectDate")} / מתאריך</Label>
              <input
                ref={startDateInputRef}
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value || dayjs().format("YYYY-MM-DD"))}
                className="absolute opacity-0 w-0 h-0"
                aria-label={t("SelectDate")}
              />
              <button
                type="button"
                onClick={() => {
                  if (startDateInputRef.current) {
                    if (typeof startDateInputRef.current.showPicker === "function") {
                      startDateInputRef.current.showPicker();
                    } else {
                      startDateInputRef.current.focus();
                      startDateInputRef.current.click();
                    }
                  }
                }}
                className="mt-1 flex items-center justify-end gap-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
              >
                <span>{selectedDate ? dayjs(selectedDate).format("DD/MM/YYYY") : ""}</span>
                <FaRegCalendarAlt className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
              </button>
            </div>
            <div className="w-full sm:w-auto max-w-[11rem] relative">
              <Label className="text-gray-700 dark:text-gray-300">עד תאריך</Label>
              <input
                ref={endDateInputRef}
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value || "")}
                min={selectedDate}
                className="absolute opacity-0 w-0 h-0"
                aria-label="עד תאריך"
              />
              <button
                type="button"
                onClick={() => {
                  if (endDateInputRef.current) {
                    if (typeof endDateInputRef.current.showPicker === "function") {
                      endDateInputRef.current.showPicker();
                    } else {
                      endDateInputRef.current.focus();
                      endDateInputRef.current.click();
                    }
                  }
                }}
                className="mt-1 flex items-center justify-end gap-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
              >
                <span>{endDate ? dayjs(endDate).format("DD/MM/YYYY") : "—"}</span>
                <FaRegCalendarAlt className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedDate(dayjs().format("YYYY-MM-DD"));
                  setEndDate("");
                }}
                className="px-3 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600"
              >
                {t("TodayShort")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedDate(dayjs().subtract(1, "day").format("YYYY-MM-DD"));
                  setEndDate("");
                }}
                className="px-3 py-2 text-sm font-medium text-white bg-orange-400 rounded-lg hover:bg-orange-500 dark:bg-orange-500 dark:hover:bg-orange-600"
              >
                {t("YesterdayShort")}
              </button>
            </div>
          </div>

          {fetchErrorForDate && !loadingOrdersForDate && (
            <p className="mb-4 text-sm text-red-500 dark:text-red-400">
              {typeof fetchErrorForDate === "string" ? fetchErrorForDate : t("ErrorLoadingSales")}
            </p>
          )}

          {loadingOrdersForDate ? (
            <TableLoading row={8} col={2} />
          ) : productSalesList.length > 0 ? (
            <>
              <p className="mb-4 text-lg font-bold text-gray-700 dark:text-gray-200">
                {endDate
                  ? `סיכום מוצרים מ־${ordersForDate.length} הזמנות (${dayjs(selectedDate).format("DD/MM/YYYY")} – ${dayjs(endDate).format("DD/MM/YYYY")})`
                  : `סיכום מוצרים מ־${ordersForDate.length} הזמנות (${dayjs(selectedDate).format("DD/MM/YYYY")})`}
              </p>
              <div className="overflow-x-auto -mx-2 sm:mx-0">
                <TableContainer className="min-w-[280px]">
                  <Table>
                    <TableHeader>
                      <tr>
                        <TableCell className="text-center text-sm sm:text-base py-2 sm:py-3 px-2 sm:px-4">{t("ProductName")}</TableCell>
                        {productSalesList.some((r) => r.unit) && (
                          <TableCell className="text-center text-sm sm:text-base py-2 sm:py-3 px-2 sm:px-4">{t("Unit")}</TableCell>
                        )}
                        <TableCell className="text-center text-sm sm:text-base py-2 sm:py-3 px-2 sm:px-4">{t("QuantitySold")}</TableCell>
                      </tr>
                    </TableHeader>
                    <TableBody className="dark:bg-gray-900">
                      {productSalesList.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-center text-sm sm:text-base py-2 sm:py-3 px-2 sm:px-4 max-w-[120px] sm:max-w-none truncate sm:whitespace-normal sm:overflow-visible" title={row.title}>{row.title}</TableCell>
                          {productSalesList.some((r) => r.unit) && (
                            <TableCell className="text-center text-sm text-gray-600 dark:text-gray-400 py-2 sm:py-3 px-2 sm:px-4">{row.unit || "—"}</TableCell>
                          )}
                          <TableCell className="text-center text-sm sm:text-base font-semibold py-2 sm:py-3 px-2 sm:px-4">{row.quantity}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </div>
            </>
          ) : ordersForDate.length > 0 ? (
            <p className="py-6 text-center text-gray-600 dark:text-gray-400">
              {ordersForDate.length} {t("Orders")} – {t("NoSalesForDate")}
            </p>
          ) : (
            <>
              <NotFound title={t("NoSalesForDate")} />
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
                {t("NoSalesForDateHint")}
              </p>
            </>
          )}
        </CardBody>
      </Card>

      {/* <PageTitle>{t("RecentOrder")}</PageTitle>
      
      {loadingRecentOrder ? (
        <TableLoading row={5} col={4} />
      ) : error ? (
        <span className="text-center mx-auto text-red-500">{error}</span>
      ) : serviceData?.length !== 0 ? (
        <TableContainer className="mb-8">
          <Table>
            <TableHeader>
              <tr>
                <TableCell className="text-center">{t("InvoiceNo")}</TableCell>
                <TableCell className="text-center">{t("TimeTbl")}</TableCell>
                <TableCell className="text-center">{t("CustomerName")}</TableCell>
                <TableCell className="text-center">{t("MethodTbl")}</TableCell>
                <TableCell className="text-center">{t("AmountTbl")}</TableCell>
                <TableCell className="text-center">{t("OderStatusTbl")}</TableCell>
                <TableCell className="text-center">{t("ActionTbl")}</TableCell>
                <TableCell className="text-center">{t("InvoiceTbl")}</TableCell>
              </tr>
            </TableHeader>

            <OrderTable orders={dataTable} />
          </Table>
          <TableFooter>
            <Pagination
              className="pagination-ltr"
              totalResults={dashboardRecentOrder?.totalOrder}
              resultsPerPage={8}
              onChange={handleChangePage}
              label="Table navigation"
            />
          </TableFooter>
        </TableContainer>
      ) : (
        <NotFound title="Sorry, There are no orders right now." />
      )} */}
    </>
  );
};

export default Dashboard;
