// src/pages/Deliveries.jsx
import React from "react";
import {
  Button,
  Card,
  CardBody,
  Input,
  Label,
  Pagination,
  Select,
  Table,
  TableCell,
  TableContainer,
  TableFooter,
  TableHeader,
} from "@windmill/react-ui";
import { useContext, useState, useRef, useEffect } from "react";
import { FiPlus } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { FiEdit, FiTrash2 } from "react-icons/fi";

// Internal import
import useAsync from "@/hooks/useAsync";
import useFilter from "@/hooks/useFilter";
import NotFound from "@/components/table/NotFound";
import PageTitle from "@/components/Typography/PageTitle";
import TableLoading from "@/components/preloader/TableLoading";
import DeliveryServices from "@/services/DeliveryServices";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import DeleteModal from "@/components/modal/DeleteModal";
import BulkActionDrawer from "@/components/drawer/BulkActionDrawer";
import MainDrawer from "@/components/drawer/MainDrawer";
import DeliveryDrawer from "@/components/drawer/DeliveryDrawer";
import { SidebarContext } from "@/context/SidebarContext";
import DeliveryTable from "@/components/delivery/DeliveryTable";
import CheckBox from "@/components/form/others/CheckBox";

const Deliveries = () => {
  const {
    toggleDrawer,
  } = useContext(SidebarContext);

  const { title, allId, handleDeleteMany, handleUpdateMany } = useToggleDrawer();

  const { t } = useTranslation();

  const [loadingExport, setLoadingExport] = useState(false);

  const { data, loading, error } = useAsync(() =>
    DeliveryServices.getAllDeliveries()
  );

  const {
    dataTable,
    serviceData,
    deliveryRef,
    handleSubmitDelivery,
    setDelivery,
    totalResults,
    resultsPerPage,
    handleChangePage,
  } = useFilter(data);

  // react hooks
  const [isCheckAll, setIsCheckAll] = useState(false);
  const [isCheck, setIsCheck] = useState([]);

  const handleSelectAll = () => {
    setIsCheckAll(!isCheckAll);
    setIsCheck(dataTable?.map((li) => li._id) || []);
    if (isCheckAll) {
      setIsCheck([]);
    }
  };
  // handle reset field
  const handleResetField = () => {
    setDelivery("");
    if (deliveryRef.current) {
      deliveryRef.current.value = "";
    }
  };

  return (
    <>
      <PageTitle>{t("Deliveries")}</PageTitle>
      <DeleteModal
        ids={allId}
        setIsCheck={setIsCheck}
        title={title}
      />
      <BulkActionDrawer ids={allId} title={t("Deliveries")} />
      <MainDrawer>
        <DeliveryDrawer />
      </MainDrawer>

      <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
        <CardBody>
          <form
            onSubmit={handleSubmitDelivery}
            className="py-3 grid grid-cols-6 gap-5"
          >
            <div className="col-span-4 flex gap-2 w-full">
              {/* Search Input */}
              <div>
                <Input
                  ref={deliveryRef}
                  type="search"
                  placeholder={t("SearchDeliveryPlaceholder")}
                  className="h-12"
                />
              </div>

              {/* Filter Button */}
              <div>
                <Button type="submit" className="h-12 w-full bg-customGreen-dark">
                  {t("Filter")}
                </Button>
              </div>

              {/* Reset Button */}
              <div>
                <Button
                  layout="outline"
                  onClick={handleResetField}
                  type="reset"
                  className="h-12 w-full text-sm dark:bg-gray-700"
                >
                  <span className="text-black dark:text-gray-200">{t("Reset")}</span>
                </Button>
              </div>
            </div>

            <div className="col-span-2 flex gap-2 w-full">
              {/* Add Delivery Button */}
              <div className="w-full">
                <Button
                  onClick={toggleDrawer}
                  className="w-full rounded-md h-12"
                >
                  <span className="ml-2">
                    <FiPlus />
                  </span>
                  {t("AddDelivery")}
                </Button>
              </div>

              {/* Delete Button */}
              <div className="w-full">
                <Button
                  disabled={isCheck?.length < 1}
                  onClick={() => handleDeleteMany(isCheck, data.deliveries)}
                  className="w-full rounded-md h-12 bg-red-300 disabled btn-red"
                >
                  <span className="ml-2">
                    <FiTrash2 />
                  </span>
                  {t("Delete")}
                </Button>
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
        <TableContainer className="mb-8 rounded-b-lg">
          <Table>
            <TableHeader>
              <tr>
                <TableCell>
                  <CheckBox
                    type="checkbox"
                    name="selectAll"
                    id="selectAll"
                    isChecked={isCheckAll}
                    handleClick={handleSelectAll}
                  />
                </TableCell>
                <TableCell className="text-center">{t("City")}</TableCell>
                <TableCell className="text-center">{t("Price")}</TableCell>
                <TableCell className="text-center">{t("MinimumOrder")}</TableCell>
                <TableCell className="text-center">{t("Days")}</TableCell>
                <TableCell className="text-center">{t("BiweeklyDelivery")}</TableCell>
                <TableCell className="text-center">{t("Actions")}</TableCell>
              </tr>
            </TableHeader>
            <DeliveryTable
              deliveries={dataTable}
              isCheck={isCheck}
              setIsCheck={setIsCheck}
              isCheckAll={isCheckAll}
            />
          </Table>

          <TableFooter>
            <Pagination
              className="pagination-ltr"
              totalResults={totalResults}
              resultsPerPage={resultsPerPage}
              onChange={handleChangePage}
              label={t("Table navigation")}
            />
          </TableFooter>
        </TableContainer>
      ) : (
        <NotFound title={t("sorryDeliveryNotFound")} />
      )}
    </>
  );
};

export default Deliveries;