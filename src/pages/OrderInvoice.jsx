// src/pages/OrderInvoice.jsx
import dayjs from "dayjs";
import { useParams } from "react-router";
import ReactToPrint from "react-to-print";
import React, { useContext, useEffect, useRef } from "react";
import { FiPrinter } from "react-icons/fi";
import { IoCloudDownloadOutline } from "react-icons/io5";
import { FiClock } from "react-icons/fi";
import { FiRefreshCw } from "react-icons/fi";
import {
  TableCell,
  TableHeader,
  Table,
  TableContainer,
  WindmillContext,
} from "@windmill/react-ui";
import { useTranslation } from "react-i18next";
import { PDFDownloadLink } from "@react-pdf/renderer";

// Internal import
import useAsync from "@/hooks/useAsync";
import Status from "@/components/table/Status";
import OrderServices from "@/services/OrderServices";
import Invoice from "@/components/invoice/Invoice";
import Loading from "@/components/preloader/Loading";
import PageTitle from "@/components/Typography/PageTitle";
import useUtilsFunction from "@/hooks/useUtilsFunction";
import InvoiceForDownload from "@/components/invoice/InvoiceForDownload";
import AddressFormat from "@/components/AddressFormat";
import StatusHistoryCard from "@/components/invoice/StatusHistoryCard";
import CollapsibleSection from "@/components/common/CollapsibleSection";
import IngestionErrorBanner from "@/components/order/IngestionErrorBanner";
import { SidebarContext } from "@/context/SidebarContext";

const OrderInvoice = () => {
  const { t } = useTranslation();
  const { mode } = useContext(WindmillContext);
  const { setIsUpdate } = useContext(SidebarContext);
  const { id } = useParams();
  const printRef = useRef();

  const { data, loading, error } = useAsync(() =>
    OrderServices.getOrderById(id)
  );

  useEffect(() => {
    if (data) {
      data.cart = data.cart?.sort((a, b) => a.barcode - b.barcode)
    }
  }, [data])
  const {
    currency,
    globalSetting,
    storeCustomizationSetting,
    showDateTimeFormat,
    showDateFormat,
    getNumberTwo,
    showingTranslateValue,
  } = useUtilsFunction();

  console.log('ORDER INVOICE :>> ', data);

  return (
    <>
      <PageTitle> {t("InvoicePageTittle")} </PageTitle>

      {/* הזמנה שנקלטה מהמייל/ווצאפ ולא נקראה במלואה — בראש המסך בכוונה,
          זה הדבר הראשון שהעובד צריך לראות */}
      {!loading && data?.ingestionError?.code && (
        <IngestionErrorBanner order={data} onChanged={() => setIsUpdate(true)} />
      )}

      <div
        className="bg-white dark:bg-gray-800 mb-4 p-6 lg:p-8 rounded-xl shadow-sm overflow-hidden"
      >
        <CollapsibleSection
          title={t("Order History")}
          icon={<FiClock className="mt-1" />}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 justify-center overflow-x-auto">
            {data?.statusHistory?.map((status, index) => (
              <StatusHistoryCard
                key={status._id}
                index={index + 1}
                from={status.from}
                to={status.to}
                changedAt={showDateTimeFormat(status.changedAt)}
                changedBy={status.changedBy}
              />
            ))}
          </div>
        </CollapsibleSection>
      </div>

      {/* section החזר כספי — מוצג רק אם בוצעה בקשת Refund */}
      {!loading && data?.refund?.requested && (
        <div className="bg-white dark:bg-gray-800 mb-4 p-6 lg:p-8 rounded-xl shadow-sm overflow-hidden">
          <CollapsibleSection
            title="החזר כספי"
            icon={<FiRefreshCw className="mt-1" />}
            defaultOpen={true}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
              {/* בוצע החזר */}
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                  בוצע החזר
                </span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {data.refund.requested ? "כן" : "לא"}
                </span>
              </div>

              {/* סטטוס */}
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                  סטטוס ההחזר
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-sm font-semibold ${
                    data.refund.success
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-500 dark:text-red-400"
                  }`}
                >
                  {data.refund.success ? "✓ הצליח" : "✗ נכשל"}
                </span>
              </div>

              {/* תאריך */}
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                  תאריך ביצוע
                </span>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {data.refund.refundedAt
                    ? showDateTimeFormat(data.refund.refundedAt)
                    : "—"}
                </span>
              </div>

              {/* Response Code */}
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                  Response Code
                </span>
                <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
                  {data.refund.responseCode !== null && data.refund.responseCode !== undefined
                    ? data.refund.responseCode
                    : "—"}
                </span>
              </div>

              {/* הודעת שגיאה */}
              {data.refund.errorMessage && (
                <div className="flex flex-col md:col-span-2">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    הודעת שגיאה
                  </span>
                  <span className="text-sm text-red-500 dark:text-red-400">
                    {data.refund.errorMessage}
                  </span>
                </div>
              )}

              {/* תגובת Cardcom המלאה */}
              {data.refund.rawResponse && (
                <div className="flex flex-col col-span-full">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    תגובת Cardcom המלאה
                  </span>
                  <pre className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(data.refund.rawResponse, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </CollapsibleSection>
        </div>
      )}

      <div
        ref={printRef}
        className="bg-white dark:bg-gray-800 mb-4 p-6 lg:p-8 rounded-xl shadow-sm overflow-hidden"
      >
        {!loading && (
          <div className="">
            <div className="flex lg:flex-row md:flex-row flex-col lg:items-center justify-between pb-4 border-b border-gray-50 dark:border-gray-700 dark:text-gray-300">
              <h1 className="font-bold font-serif text-xl uppercase">
                {t("InvoicePageTittle")}
                <p className="text-xs mt-1 text-gray-500">
                  {t("InvoiceStatus")}
                  <span className="pl-2 font-medium text-xs capitalize">
                    {" "}
                    <Status status={data.status} />
                  </span>
                </p>
                {/* הערות הלקוח להזמנה — רק מה שהלקוח עצמו כתב */}
                {data?.customer_note && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    {t("CustomerNote")} : <span className="font-normal">{data?.customer_note}</span>
                  </p>
                )}
                {/* הערת המערכת — מקור הקליטה, אזהרות והנחות המנוע. מידע פנימי
                    לצוות בלבד; אינו נשלח ללקוח ואינו חלק מהערת הלקוח. */}
                {data?.systemNote && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    {t("SystemNote")} : <span className="font-normal">{data?.systemNote}</span>
                  </p>
                )}
              </h1>
              <div className="lg:text-right text-right">
                <h2 className="lg:flex lg:justify-end text-lg font-serif font-semibold mt-4 lg:mt-0 lg:ml-0 md:mt-0">
                  {mode === "dark" ? (
                    <img src={storeCustomizationSetting?.footer?.block4_logo} alt="המתוקים של בני" width="110" />
                  ) : (
                    <img src={storeCustomizationSetting?.footer?.block4_logo} alt="המתוקים של בני" width="110" />
                  )}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  {globalSetting?.address} <br />
                  {globalSetting?.contact} <br />{" "}
                  <span> {globalSetting?.email} </span> <br />
                  {globalSetting?.website}
                </p>
              </div>
            </div>
            <div className="flex lg:flex-row md:flex-row flex-col justify-between pt-4">
              <div className="mb-3 md:mb-0 lg:mb-0 flex flex-col">
                <span className="font-bold font-serif text-sm uppercase text-gray-600 dark:text-gray-500 block">
                  {t("InvoiceDate")}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 block">
                  {showDateFormat(data?.createdAt)}
                </span>
              </div>
              <div className="mb-3 md:mb-0 lg:mb-0 flex flex-col">
                <span className="font-bold font-serif text-sm uppercase text-gray-600 dark:text-gray-500 block">
                  {t("InvoiceNo")}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 block">
                  #{data?.invoice}
                </span>
              </div>
              <div className="flex flex-col lg:text-right text-right">
                <span className="font-bold font-serif text-sm uppercase text-gray-600 dark:text-gray-500 block">
                  {t("InvoiceTo")}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 block">
                  {data?.user_info?.name} {data?.user_info?.lastName}<br />
                  {data?.user_info?.email}{" "}
                  <span className="ml-2">{data?.user_info?.contact}</span>
                  <br />
                  <AddressFormat userInfo={data?.user_info} />
                  {/* <br />
                  {data?.user_info?.city}, {data?.user_info?.country},{" "}
                  {data?.user_info?.zipCode} */}
                </span>
              </div>
            </div>
          </div>
        )}
        <div>
          {loading ? (
            <Loading loading={loading} />
          ) : error ? (
            <span className="text-center mx-auto text-red-500">{error}</span>
          ) : (
            <TableContainer className="my-8">
              <Table>
                <TableHeader>
                  <tr>
                    <TableCell>{t("Sr")}</TableCell>
                    <TableCell>Product Title</TableCell>
                    <TableCell className="text-center">
                      {t("Quantity")}
                    </TableCell>
                    <TableCell className="text-center">
                      {t("ItemPrice")}
                    </TableCell>
                    <TableCell className="text-right">{t("Amount")}</TableCell>
                  </tr>
                </TableHeader>
                <Invoice
                  data={data}
                  currency={currency}
                  getNumberTwo={getNumberTwo}
                />
              </Table>
            </TableContainer>
          )}
        </div>

        {!loading && (
          <div className="border rounded-xl border-gray-100 p-8 py-6 bg-gray-50 dark:bg-gray-900 dark:border-gray-800">
            <div className="flex lg:flex-row md:flex-row flex-col justify-between">
              <div className="mb-3 md:mb-0 lg:mb-0  flex flex-col sm:flex-wrap">
                <span className="mb-1 font-bold font-serif text-sm uppercase text-gray-600 dark:text-gray-500 block">
                  {t("InvoicepaymentMethod")}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 font-semibold font-serif block">
                  {data.paymentMethod}
                </span>
              </div>
              <div className="mb-3 md:mb-0 lg:mb-0  flex flex-col sm:flex-wrap">
                <span className="mb-1 font-bold font-serif text-sm uppercase text-gray-600 dark:text-gray-500 block">
                  {t("ShippingCost")}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 font-semibold font-serif block">
                  {currency}
                  {getNumberTwo(data.shippingCost)}
                </span>
              </div>
              <div className="mb-3 md:mb-0 lg:mb-0  flex flex-col sm:flex-wrap">
                <span className="mb-1 font-bold font-serif text-sm uppercase text-gray-600 dark:text-gray-500 block">
                  {showingTranslateValue(
                    storeCustomizationSetting?.checkout?.discount
                  )}                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 font-semibold font-serif block">
                  {currency}
                  {getNumberTwo(data.discount)}
                </span>
              </div>
              <div className="mb-3 md:mb-0 lg:mb-0  flex flex-col sm:flex-wrap">
                <span className="mb-1 font-bold font-serif text-sm uppercase text-gray-600 dark:text-gray-500 block">
                  {t("InvoiceQuantityDiscount")}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 font-semibold font-serif block">
                  {currency}
                  {getNumberTwo(data.offerDiscount || 0)}
                </span>
              </div>
              <div className="flex flex-col sm:flex-wrap">
                <span className="mb-1 font-bold font-serif text-sm uppercase text-gray-600 dark:text-gray-500 block">
                  {t("InvoiceTotalAmount")}
                </span>
                <span className="text-xl font-serif font-bold text-red-500 dark:text-customGreen block">
                  {currency}
                  {getNumberTwo(data.total)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* {!loading && (
        <div className="mb-4 mt-3 flex justify-between">
          <PDFDownloadLink
            document={
              <InvoiceForDownload
                t={t}
                data={data}
                currency={currency}
                getNumberTwo={getNumberTwo}
                showDateFormat={showDateFormat}
              />
            }
            fileName="Invoice"
          >
            {({ blob, url, loading, error }) =>
              loading ? (
                "Loading..."
              ) : (
                <button className="flex items-center text-sm leading-5 transition-colors duration-150 font-medium focus:outline-none px-5 py-2 rounded-md text-white bg-customGreen border border-transparent active:bg-customGreen-dark hover:bg-customGreen-dark  w-auto cursor-pointer">
                  {t("DownloadInvoice")}
                  <span className="mr-2 text-base">
                    <IoCloudDownloadOutline />
                  </span>
                </button>
              )
            }
          </PDFDownloadLink>

          <ReactToPrint
            trigger={() => (
              <button className="flex mr-auto items-center text-sm leading-5 transition-colors duration-150 font-medium focus:outline-none px-5 py-2 rounded-md text-white bg-customGreen border border-transparent active:bg-customGreen-dark hover:bg-customGreen-dark  w-auto">
                {t("PrintInvoice")}
                <span className="mr-2">
                  <FiPrinter />
                </span>
              </button>
            )}
            content={() => printRef.current}
            documentTitle="Invoice"
          />
        </div>
      )} */}
    </>
  );
};

export default OrderInvoice;
