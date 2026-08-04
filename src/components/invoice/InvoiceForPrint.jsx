// src/components/invoice/InvoiceForPrint.jsx
import {
  ModalBody,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHeader,
  TableRow,
} from "@windmill/react-ui";
import { forwardRef, Fragment } from "react";
import { useTranslation } from "react-i18next";
import AddressFormat from "../AddressFormat";
import useUtilsFunction from "@/hooks/useUtilsFunction";

const InvoiceForPrint = forwardRef(({ data, globalSetting }, ref) => {
  const { t } = useTranslation();

  const currency = globalSetting?.default_currency || "₪";

  const { showDateTimeFormat, storeCustomizationSetting } = useUtilsFunction();

  return (
    <div ref={ref} className="p-4" dir="rtl">
      {Array.isArray(data) ? (
        data?.map((or, i) => (
          <div className="mb-8" key={i + 1}>
            <div className="w-full flex justify-between gap-1">
              <div>
                <img
                  className="flex"
                  size="large"
                  // src={globalSetting?.logo}
                  src={storeCustomizationSetting?.footer?.block4_logo}
                  alt="logo"
                  width={100}
                />
                <div className="flex justify-center">
                  {globalSetting?.address},&nbsp;
                  {globalSetting?.contact}&nbsp;
                  {globalSetting?.web_site}
                </div>
              </div>
              <div className="flex flex-col items-start">
                <h1 className="text-lg font-bold underline">{t("addressee")}: </h1>
                <div>
                  <span>{t("name")}</span>:{" "}
                  <span className="font-semibold text-gray-900">
                    {or?.user_info?.name} {or?.user_info?.lastName}
                  </span>
                </div>
                <div>
                  <span>{t("email")}</span>:{" "}
                  <span className="font-semibold text-gray-900">
                    {or?.user_info?.email}
                  </span>
                </div>
                <div>
                  <span>{t("phone")}</span>:{" "}
                  <span className="font-semibold text-gray-900">
                    {or?.user_info?.contact}
                  </span>
                </div>
              </div>
              {or?.shippingOption && (
                <div className="flex flex-col items-start">
                  <h1 className="text-lg font-bold underline">{t("ShippingMethodLower")}: </h1>
                  <div>
                    <span>{t("ShippingMethodLower")}</span>:{" "}
                    <span className="font-semibold text-gray-900">
                      {or?.shippingOption == 2 ? t("shipping"): t("pickup")}
                    </span>
                  </div>
                  <div>
                    {or.shippingOption == 2 &&
                      <div>
                        <span>{t("address")}: </span>
                        <span className="font-semibold text-gray-900">
                          <AddressFormat userInfo={or?.user_info} />
                        </span>
                      </div>}
                  </div>
                </div>
              )}
            </div>

            {or.customer_note && <div className="mt-2">
              <b>{t("CustomerNote")}: </b>
              <span>
                {or.customer_note}
              </span>
            </div>}

            {/* הערת המערכת מודפסת על תעודת הליקוט: המלקט חייב לראות אזהרת
                כתובת חסרה או כמות שהמנוע הניח לפני שהוא יוצא לדרך. */}
            {or.systemNote && <div className="mt-2">
              <b>{t("SystemNote")}: </b>
              <span>
                {or.systemNote}
              </span>
            </div>}

            <TableContainer className="mt-2 mb-4 rounded-b-lg">
              <Table>
                <TableHeader>
                  <tr>
                    <TableCell className="bg-white w-fit text-center">
                      <span className="text-xs capitalize text-gray-700 mx-auto text-center">
                        {t("Number")}
                      </span>
                    </TableCell>
                    <TableCell className="bg-white text-right">
                      <span className="text-xs capitalize text-gray-700">
                        {t("Item")}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs bg-white capitalize text-center text-gray-700">
                      {t("QTY")}
                    </TableCell>
                    <TableCell className="text-xs bg-white capitalize text-right text-gray-700">
                      {t("Total")}
                    </TableCell>
                  </tr>
                </TableHeader>
                <TableBody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 text-serif text-sm">
                  {or?.cart?.map((item, i) => (
                    <TableRow
                      key={i}
                      className="dark:border-gray-700 dark:text-gray-400 bill"
                    >
                      <TableCell className="py-1 w-fit text-center">
                        <span className="font-normal text-gray-600 bill">
                          {item.sku}
                        </span>
                      </TableCell>
                      <TableCell className="py-1">
                        <span className="font-normal text-gray-600 bill">
                          {item.title.he}
                          {" | "}
                          {item.title.en}
                        </span>
                      </TableCell>
                      <TableCell className="text-center py-1">
                        <span className="font-bold text-center bill">
                          {" "}
                          {item.quantity}{" "}
                        </span>
                      </TableCell>

                      <TableCell className="text-right py-1">
                        <span className="text-right font-bold text-gray-700 bill">
                          {" "}
                          {currency}
                          {(item.discountedPrice ? item.discountedPrice : item.itemTotal).toFixed(2)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <ModalBody>
              <div className="flex justify-between -mt-3 mr-1 mb-4" dir="rtl">
                <div className="mt-2">
                  {or?.paymentMethod === "Combined" ? (
                    <p className="bill">
                      <span className="mb-1 font-semibold bill font-serif text-xs text-gray-700 dark:text-gray-500 block">
                        {t("Paymentmethod")}:{" "}
                        <span className="text-gray-600 bill">
                          {or.paymentMethod}
                        </span>
                      </span>
                      {or?.paymentDetails?.selectPaymentOption_Card !==
                        undefined && (
                          <span className="text-xs bill">
                            {or?.paymentDetails?.selectPaymentOption_Card}:{" "}
                            <span className="font-semibold text-gray-900">
                              {" "}
                              {currency}
                              {parseFloat(
                                or?.paymentDetails?.paymentAmount_Card
                              ).toFixed(2)}
                            </span>
                          </span>
                        )}
                      <br />
                      {or?.paymentDetails?.selectPaymentOption_Cash !==
                        undefined && (
                          <span className="text-xs bill">
                            {or?.paymentDetails?.selectPaymentOption_Cash}:{" "}
                            <span className="font-semibold text-gray-900">
                              {currency}
                              {parseFloat(
                                or?.paymentDetails?.paymentAmount_Cash
                              ).toFixed(2)}
                            </span>
                          </span>
                        )}
                      <br />
                      {or?.paymentDetails?.selectPaymentOption_Credit !==
                        undefined && (
                          <span className="text-xs bill">
                            {or?.paymentDetails?.selectPaymentOption_Credit}:{" "}
                            <span className="font-semibold text-gray-900">
                              {currency}
                              {parseFloat(
                                or?.paymentDetails?.paymentAmount_Credit
                              ).toFixed(2)}
                            </span>
                          </span>
                        )}
                    </p>
                  ) : (
                    <p className="bill">
                      <span className="text-gray-600">
                        {t("Paymentmethod")}:{" "}
                        <span className="font-semibold text-gray-900">
                          {or.paymentMethod}
                        </span>
                      </span>
                    </p>
                  )}

                  <div className="text-xs bill">
                    <span className="text-gray-600">
                      {t("NoofItems")}:{" "}
                      <span className="font-semibold text-gray-900">
                        {or?.cart?.length}
                      </span>{" "}
                    </span>{" "}
                    <br />
                    <span className="text-gray-600">
                      {t("BillNo")}:{" "}
                      <span className="font-semibold text-gray-900">
                        {" "}
                        {or?.invoice}
                      </span>{" "}
                    </span>{" "}
                    <br />
                    <br />
                    {globalSetting?.vat_number && (
                      <>
                        <span className="text-gray-600">
                          {t("VATNumber")}:{" "}
                          <span className="font-semibold text-gray-900">
                            {" "}
                            {globalSetting?.vat_number}
                          </span>{" "}
                        </span>
                        <br />
                      </>
                    )}
                    <span className="text-gray-600">
                      {t("Date")}:{" "}
                      <span className="font-semibold text-gray-700">
                        {" "}
                        {/* {dayjs(new Date()).format('MMMM D, YYYY h:mm A')} */}
                        {/* {dayjs(new Date()).format("MM/D/YYYY")} */}
                        {showDateTimeFormat(or?.createdAt)}
                      </span>{" "}
                    </span>
                  </div>
                </div>

                <div className="mt-2">
                  <h5 className="flex justify-between font-medium text-xs ">
                    <span>{t("GrossTotal")}: </span>{" "}
                    <span className="font-semibold ">
                      {currency}
                      {parseFloat(or?.subTotal).toFixed(2)}
                    </span>
                  </h5>

                  {or?.shippingCost > 0 && (
                    <h5 className="flex justify-between font-medium text-xs">
                      <span> {t("ShippingCostLower")}: </span>{" "}
                      <span className="font-semibold ">
                        {currency}
                        {parseFloat(or?.shippingCost).toFixed(2)}
                      </span>
                    </h5>
                  )}
                  {or?.discount > 0 && (
                    <h5 className="flex justify-between font-medium text-xs">
                      <span> {t("DiscountLower")}: </span>{" "}
                      <span className="font-semibold">
                        {currency}
                        {parseFloat(or?.discount).toFixed(2)}
                      </span>
                    </h5>
                  )}
                  <h3 className="flex justify-between font-medium text-xs border-t border-black mt-2">
                    <span> {t("Total")}: </span>
                    <span className="font-semibold ">
                      {currency}
                      {parseFloat(or?.total).toFixed(2)}
                    </span>
                  </h3>
                </div>
              </div>
            </ModalBody>

            <h2 className="mb-2 text-center font-medium text-sm">
              {t("ThankYouMsg")}
            </h2>
          </div>
        ))
      ) : (
        <Fragment>
          <div className="w-full flex justify-between gap-1">
            <div>
              <img
                className="flex"
                size="large"
                // src={globalSetting?.logo}
                src={storeCustomizationSetting?.footer?.block4_logo}
                alt="logo"
                width={100}
              />
              <div className="flex justify-center">
                {globalSetting?.address},&nbsp;
                {globalSetting?.contact}&nbsp;
                {globalSetting?.web_site}
              </div>
            </div>
            <div className="flex flex-col items-start">
              <h1 className="text-lg font-bold underline">{t("addressee")}: </h1>
              <div>
                <span>{t("name")}</span>:{" "}
                <span className="font-semibold text-gray-900">
                  {data?.user_info?.name} {data?.user_info?.lastName}
                </span>
              </div>
              <div>
                <span>{t("email")}</span>:{" "}
                <span className="font-semibold text-gray-900">
                  {data?.user_info?.email}
                </span>
              </div>
              <div>
                <span>{t("phone")}</span>:{" "}
                <span className="font-semibold text-gray-900">
                  {data?.user_info?.contact}
                </span>
              </div>
            </div>
            {data?.shippingOption && (
              <div className="flex flex-col items-start">
                <h1 className="text-lg font-bold underline">{t("ShippingMethodLower")}: </h1>
                <div>
                  <span>{t("ShippingMethodLower")}</span>:{" "}
                  <span className="font-semibold text-gray-900">
                    {data?.shippingOption == 2 ? t("shipping"): t("pickup")}
                  </span>
                </div>
                <div>
                  {data.shippingOption == 2 &&
                    <div>
                      <span>{t("address")}: </span>
                      <span className="font-semibold text-gray-900">
                        <AddressFormat userInfo={data?.user_info} />
                      </span>
                    </div>}
                </div>
              </div>
            )}
          </div>

          {data.customer_note && <div className="mt-2">
            <b>{t("CustomerNote")}: </b>
            <span>
              {data.customer_note}
            </span>
          </div>}

          {/* ראה ההערה בתעודה שמעל — הערת המערכת מיועדת למלקט */}
          {data.systemNote && <div className="mt-2">
            <b>{t("SystemNote")}: </b>
            <span>
              {data.systemNote}
            </span>
          </div>}

          <TableContainer className="mt-2 mb-4 rounded-b-lg">
            <Table>
              <TableHeader>
                <tr>
                  <TableCell className="bg-white w-fit text-center">
                    <span className="text-xs capitalize text-gray-700 mx-auto text-center">
                      {t("Number")}
                    </span>
                  </TableCell>
                  <TableCell className="bg-white text-right">
                    <span className="text-xs capitalize text-gray-700">
                      {t("Item")}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs bg-white capitalize text-center text-gray-700">
                    {t("QTY")}
                  </TableCell>
                  <TableCell className="text-xs bg-white capitalize text-right text-gray-700">
                    {t("Total")}
                  </TableCell>
                </tr>
              </TableHeader>
              <TableBody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 text-serif text-sm px-1">
                {data?.cart?.map((item, i) => (
                  <tr
                    key={i}
                    className="dark:border-gray-700 dark:text-gray-400 bill"
                  >
                    <td className="py-1 w-fit text-center">
                      <span className="font-normal text-gray-600 bill">
                        {item.sku}
                      </span>
                    </td>
                    <td className="py-1">
                      <span className="font-normal text-gray-600 bill">
                        {item.title.he}
                        {" | "}
                        {item.title.en}
                      </span>
                    </td>
                    <td className="text-center py-1">
                      <span className="font-bold text-center bill">
                        {" "}
                        {item.quantity}{" "}
                      </span>
                    </td>

                    <td className="text-right py-1">
                      <span className="text-right font-bold text-gray-700 bill">
                        {" "}
                        {currency}
                        {(item.discountedPrice ? item.discountedPrice : item.itemTotal).toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <ModalBody>
            <div className="flex justify-between -mt-3 mr-1 mb-4" dir="rtl">
              <div className="mt-2">
                {data?.paymentMethod === "Combined" ? (
                  <p className="bill">
                    <span className="mb-1 font-semibold bill font-serif text-xs text-gray-700 dark:text-gray-500 block">
                      {t("Paymentmethod")}:{" "}
                      <span className="text-gray-600 bill">
                        {data.paymentMethod}
                      </span>
                    </span>
                    {data?.paymentDetails?.selectPaymentOption_Card !==
                      undefined && (
                        <span className="text-xs bill">
                          {data?.paymentDetails?.selectPaymentOption_Card}:{" "}
                          <span className="font-semibold text-gray-900">
                            {" "}
                            {currency}
                            {parseFloat(
                              data?.paymentDetails?.paymentAmount_Card
                            ).toFixed(2)}
                          </span>
                        </span>
                      )}
                    <br />
                    {data?.paymentDetails?.selectPaymentOption_Cash !==
                      undefined && (
                        <span className="text-xs bill">
                          {data?.paymentDetails?.selectPaymentOption_Cash}:{" "}
                          <span className="font-semibold text-gray-900">
                            {currency}
                            {parseFloat(
                              data?.paymentDetails?.paymentAmount_Cash
                            ).toFixed(2)}
                          </span>
                        </span>
                      )}
                    <br />
                    {data?.paymentDetails?.selectPaymentOption_Credit !==
                      undefined && (
                        <span className="text-xs bill">
                          {data?.paymentDetails?.selectPaymentOption_Credit}:{" "}
                          <span className="font-semibold text-gray-900">
                            {currency}
                            {parseFloat(
                              data?.paymentDetails?.paymentAmount_Credit
                            ).toFixed(2)}
                          </span>
                        </span>
                      )}
                  </p>
                ) : (
                  <p className="bill">
                    <span className="text-gray-600">
                      {t("PaymentMethod")}:{" "}
                      <span className="font-semibold text-gray-900">
                        {t(data.paymentMethod)}
                      </span>
                    </span>
                  </p>
                )}

                <div className="text-xs bill">
                  <span className="text-gray-600">
                    {t("NoofItems")}:{" "}
                    <span className="font-semibold text-gray-900">
                      {data?.cart?.length}
                    </span>{" "}
                  </span>{" "}
                  <br />
                  <span className="text-gray-600">
                    {t("BillNo")}:{" "}
                    <span className="font-semibold text-gray-900">
                      {" "}
                      {data?.invoice}
                    </span>{" "}
                  </span>{" "}
                  <br />
                  <br />
                  {globalSetting?.vat_number && (
                    <>
                      <span className="text-gray-600">
                        {t("VATNumber")}:{" "}
                        <span className="font-semibold text-gray-900">
                          {" "}
                          {globalSetting?.vat_number}
                        </span>{" "}
                      </span>
                      <br />
                    </>
                  )}
                  <span className="text-gray-600">
                    {t("Date")}:{" "}
                    <span className="font-semibold text-gray-700">
                      {" "}
                      {/* {dayjs(new Date()).format('MMMM D, YYYY h:mm A')} */}
                      {/* {dayjs(new Date()).format("MM/D/YYYY")} */}
                      {showDateTimeFormat(data?.createdAt)}
                    </span>{" "}
                  </span>
                </div>
              </div>

              <div className="mt-2">
                <h5 className="flex justify-between font-medium text-xs ">
                  <span>{t("GrossTotal")}: </span>{" "}
                  <span className="font-semibold ">
                    {currency}
                    {parseFloat(data?.subTotal).toFixed(2)}
                  </span>
                </h5>

                {data?.shippingCost > 0 && (
                  <h5 className="flex justify-between font-medium text-xs">
                    <span> {t("ShippingCostLower")}: </span>{" "}
                    <span className="font-semibold ">
                      {currency}
                      {parseFloat(data?.shippingCost).toFixed(2)}
                    </span>
                  </h5>
                )}
                {data?.discount > 0 && (
                  <h5 className="flex justify-between font-medium text-xs">
                    <span> {t("DiscountLower")}: </span>{" "}
                    <span className="font-semibold">
                      {currency}
                      {parseFloat(data?.discount).toFixed(2)}
                    </span>
                  </h5>
                )}
                <h3 className="flex justify-between font-medium text-xs border-t border-black mt-2">
                  <span> {t("Total")}: </span>
                  <span className="font-semibold ">
                    {currency}
                    {parseFloat(data?.total).toFixed(2)}
                  </span>
                </h3>
              </div>
            </div>
          </ModalBody>

          <h2 className="mb-2 text-center font-medium text-sm">
            {t("ThankYouMsg")}
          </h2>
        </Fragment>
      )}
    </div>
  );
});

export default InvoiceForPrint;
