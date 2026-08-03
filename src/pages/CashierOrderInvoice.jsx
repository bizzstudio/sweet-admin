// src/pages/CashierOrderInvoice.jsx
import dayjs from "dayjs";
import { useParams } from "react-router";
import ReactToPrint from "react-to-print";
import React, { useContext, useEffect, useRef } from "react";
import { FiPrinter } from "react-icons/fi";
import { IoCloudDownloadOutline } from "react-icons/io5";
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
import OrderServices from "@/services/OrderServices";
import Invoice from "@/components/invoice/Invoice";
import Loading from "@/components/preloader/Loading";
import PageTitle from "@/components/Typography/PageTitle";
import useUtilsFunction from "@/hooks/useUtilsFunction";
import InvoiceForDownload from "@/components/invoice/InvoiceForDownload";

const CashierOrderInvoice = () => {
    const { t } = useTranslation();
    const { mode } = useContext(WindmillContext);
    const { id } = useParams();
    const printRef = useRef();

    const { data, loading, error } = useAsync(() =>
        OrderServices.getCashierOrderById(id)
    );

    useEffect(() => {
        if (data) {
            data.cart = data.cart?.sort((a, b) => a.barcode - b.barcode)
        }
    }, [data])

    const {
        currency,
        globalSetting,
        showDateTimeFormat,
        showDateFormat,
        getNumberTwo,
        storeCustomizationSetting,
    } = useUtilsFunction();

    console.log('CASHIER ORDER INVOICE :>> ', data);

    return (
        <>
            {/* <PageTitle> {t("CashierOrderInvoice")} </PageTitle> */}

            <div
                ref={printRef}
                className="bg-white dark:bg-gray-800 mb-10 p-6 lg:p-8 rounded-xl shadow-sm overflow-hidden mt-10"
            >
                {!loading && (
                    <div className="">
                        <div className="flex lg:flex-row md:flex-row flex-col lg:items-center justify-between pb-4 border-b border-gray-50 dark:border-gray-700 dark:text-gray-300">
                            <h1 className="font-bold font-serif text-xl uppercase">
                                {t("CashierOrderInvoice")}
                                <p className="text-xs mt-1 text-gray-500">
                                    {t("CashierOrderNote", { name: data?.cashier?.name })}
                                </p>
                            </h1>
                            <div className="lg:text-right text-right">
                                <h2 className="lg:flex lg:justify-end text-lg font-serif font-semibold mt-4 lg:mt-0 lg:ml-0 md:mt-0">
                                    <img src={storeCustomizationSetting?.footer?.block4_logo} alt="המתוקים של בני" width="100" />
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
                            <div className="mb-3 md:mb-0 lg:mb-0 flex flex-col">
                                <span className="font-bold font-serif text-sm uppercase text-gray-600 dark:text-gray-500 block">
                                    {t("Cashier")}
                                </span>
                                <span className="text-sm text-gray-500 dark:text-gray-400 block">
                                    {data?.cashier?.name || 'לא זמין'}
                                </span>
                            </div>
                            <div className="flex flex-col lg:text-right text-right">
                                <span className="font-bold font-serif text-sm uppercase text-gray-600 dark:text-gray-500 block">
                                    {t("CustomerInfo")}
                                </span>
                                <span className="text-sm text-gray-500 dark:text-gray-400 block">
                                    {data?.user_info?.name || 'לא זמין'}<br />
                                    {data?.user_info?.phone}
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
                                    {t("InvoiceDicount")}
                                </span>
                                <span className="text-sm text-gray-500 dark:text-gray-400 font-semibold font-serif block">
                                    {currency}
                                    {getNumberTwo(data.discount)}
                                </span>
                            </div>
                            <div className="mb-3 md:mb-0 lg:mb-0  flex flex-col sm:flex-wrap">
                                <span className="mb-1 font-bold font-serif text-sm uppercase text-gray-600 dark:text-gray-500 block">
                                    {t("Coupon")}
                                </span>
                                <span className="text-sm text-gray-500 dark:text-gray-400 font-semibold font-serif block">
                                    {data?.coupon?.couponCode || '-'}
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
        </>
    );
};

export default CashierOrderInvoice; 