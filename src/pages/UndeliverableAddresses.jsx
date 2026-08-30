import React from "react";
import {
  Card,
  CardBody,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHeader,
  TableRow,
} from "@windmill/react-ui";
import { useTranslation } from "react-i18next";
import * as XLSX from "xlsx";

import useAsync from "@/hooks/useAsync";
import DeliveryServices from "@/services/DeliveryServices";
import NotFound from "@/components/table/NotFound";
import PageTitle from "@/components/Typography/PageTitle";
import TableLoading from "@/components/preloader/TableLoading";

import TableHeaderCell from "@/components/table/TableHeaderCell";
function reasonLabel(t, reason) {
  if (reason === "no_delivery_days") return t("UndeliverableReasonNoDays");
  return t("UndeliverableReasonNoZone");
}

const UndeliverableAddresses = () => {
  const { t, i18n } = useTranslation();
  const { data, loading, error } = useAsync(() =>
    DeliveryServices.getUndeliverableAddressLogs({ limit: 1000 })
  );

  const rows = Array.isArray(data) ? data : [];

  const handleExcelDownload = () => {
    const sheetData = rows.map((row) => ({
      [t("UndeliverableLogDate")]: row.createdAt
        ? new Date(row.createdAt).toLocaleString(
            i18n.language === "he" ? "he-IL" : "en-US"
          )
        : "—",
      [t("UndeliverableCustomerName")]: row.customerName || "—",
      [t("UndeliverableCustomerPhone")]: row.customerPhone || "—",
      [t("UndeliverableCity")]: row.cityNameHe || "—",
      [t("UndeliverableReason")]: reasonLabel(t, row.reason),
    }));

    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, t("AddressesNotFound"));
    XLSX.writeFile(workbook, "כתובות_שלא_נמצאו.xlsx");
  };

  return (
    <>
      <div className="flex items-center justify-between my-6">
        <PageTitle style={{ margin: 0 }}>{t("AddressesNotFound")}</PageTitle>
        {rows.length > 0 && (
          <button
            onClick={handleExcelDownload}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            הורדה לאקסל
          </button>
        )}
      </div>

      <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
        <CardBody>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t("AddressesNotFoundDescription")}
          </p>
        </CardBody>
      </Card>

      {loading ? (
        <TableLoading row={12} col={5} width={160} height={20} />
      ) : error ? (
        <span className="text-center mx-auto text-red-500">{String(error)}</span>
      ) : rows.length > 0 ? (
        <TableContainer className="mb-8 rounded-b-lg">
          <Table className="w-full whitespace-nowrap admin-table">
            <TableHeader>
              <tr>
                <TableHeaderCell className="text-center">{t("UndeliverableLogDate")}</TableHeaderCell>
                <TableHeaderCell className="text-center">{t("UndeliverableCustomerName")}</TableHeaderCell>
                <TableHeaderCell className="text-center">{t("UndeliverableCustomerPhone")}</TableHeaderCell>
                <TableHeaderCell className="text-center">{t("UndeliverableCity")}</TableHeaderCell>
                <TableHeaderCell className="text-center">{t("UndeliverableReason")}</TableHeaderCell>
              </tr>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row._id}>
                  <TableCell className="text-xs text-center">
                    {row.createdAt
                      ? new Date(row.createdAt).toLocaleString(
                          i18n.language === "he" ? "he-IL" : "en-US"
                        )
                      : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-center font-medium">
                    {row.customerName || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-center font-medium" dir="ltr">
                    {row.customerPhone || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-center font-medium">
                    {row.cityNameHe}
                  </TableCell>
                  <TableCell className="text-xs text-center">
                    {reasonLabel(t, row.reason)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <NotFound title={t("AddressesNotFoundEmpty")} />
      )}
    </>
  );
};

export default UndeliverableAddresses;
