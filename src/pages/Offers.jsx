// src/pages/Offers.jsx
import {
  Button,
  Card,
  CardBody,
  Input,
  Pagination,
  Table,
  TableCell,
  TableContainer,
  TableFooter,
  TableHeader,
} from "@windmill/react-ui";
import React, { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiPlus, FiTrash2 } from "react-icons/fi";

// Internal import
import OfferTable from "@/components/offer/OfferTable";
import OfferDrawer from "@/components/drawer/OfferDrawer";
import MainDrawer from "@/components/drawer/MainDrawer";
import CheckBox from "@/components/form/others/CheckBox";
import DeleteModal from "@/components/modal/DeleteModal";
import TableLoading from "@/components/preloader/TableLoading";
import NotFound from "@/components/table/NotFound";
import PageTitle from "@/components/Typography/PageTitle";
import { SidebarContext } from "@/context/SidebarContext";
import useAsync from "@/hooks/useAsync";
import useFilter from "@/hooks/useFilter";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import OfferServices from "@/services/OfferServices";

const Offers = () => {
  const { toggleDrawer, lang } = useContext(SidebarContext);
  const { data, loading, error } = useAsync(() => OfferServices.getAllOffers());

  const { handleDeleteMany, allId, serviceId } = useToggleDrawer();

  const { t } = useTranslation();

  const {
    dataTable,
    serviceData,
    totalResults,
    offerRef,
    resultsPerPage,
    handleChangePage,
    setOfferTitle,
    handleSubmitOffer,
  } = useFilter(data);

  // react hooks
  const [isCheckAll, setIsCheckAll] = useState(false);
  const [isCheck, setIsCheck] = useState([]);

  const handleSelectAll = () => {
    setIsCheckAll(!isCheckAll);
    setIsCheck(data.map((value) => value._id));
    if (isCheckAll) {
      setIsCheck([]);
    }
  };
  // handle reset field function
  const handleResetField = () => {
    setOfferTitle("");
    offerRef.current.value = "";
  };

  return (
    <>
      <PageTitle>{t("Offers")}</PageTitle>

      {isCheck?.length >= 1 && (
        <DeleteModal
          ids={allId}
          setIsCheck={setIsCheck}
          title={t("selectedOffers")}
        />
      )}

      <MainDrawer maxWidth="600px">
        <OfferDrawer id={serviceId} />
      </MainDrawer>

      <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
        <CardBody>
          <form
            onSubmit={handleSubmitOffer}
            className="py-3 grid gap-4 lg:gap-6 xl:gap-6 xl:flex xl:items-center"
          >
            {/* Search Section - Left Side */}
            <div className="flex flex-col sm:flex-row gap-3 xl:w-1/2 xl:flex-grow">
              <div className="flex-grow">
                <Input
                  ref={offerRef}
                  type="search"
                  placeholder={t("searchOfferPlaceholder")}
                  className="h-12"
                />
              </div>
              <div className="flex gap-2 sm:flex-shrink-0">
                <Button type="submit" className="h-12 px-6 bg-customGreen-dark">
                  {t("search")}
                </Button>
                <Button
                  layout="outline"
                  onClick={handleResetField}
                  type="reset"
                  className="h-12 px-6 text-sm dark:bg-gray-700"
                >
                  <span className="text-black dark:text-gray-200">{t("Reset")}</span>
                </Button>
              </div>
            </div>

            {/* Actions Section - Right Side */}
            <div className="flex flex-col sm:flex-row gap-3 xl:w-1/2 xl:justify-end">
              <div className="w-full sm:w-auto">
                <Button
                  disabled={isCheck.length < 1}
                  onClick={() => handleDeleteMany(isCheck)}
                  className={`w-full sm:w-32 rounded-md h-12 bg-red-500 btn-red ${isCheck.length < 1 ? "cursor-auto" : ""}`}
                >
                  <span className="ml-2">
                    <FiTrash2 />
                  </span>
                  {t("Delete")}
                </Button>
              </div>
              <div className="w-full sm:w-auto">
                <Button
                  onClick={toggleDrawer}
                  className="w-full sm:w-48 rounded-md h-12"
                >
                  <span className="ml-2">
                    <FiPlus />
                  </span>
                  {t("addOfferBtn")}
                </Button>
              </div>
            </div>
          </form>
        </CardBody>
      </Card>

      {loading ? (
        <TableLoading row={12} col={6} width={180} height={20} />
      ) : error ? (
        <span className="text-center mx-auto text-red-500">{error}</span>
      ) : serviceData?.length !== 0 ? (
        <TableContainer className="mb-8">
          <Table>
            <TableHeader>
              <tr>
                <TableCell>
                  <CheckBox
                    type="checkbox"
                    name="selectAll"
                    id="selectAll"
                    handleClick={handleSelectAll}
                    isChecked={isCheckAll}
                  />
                </TableCell>
                <TableCell className="text-center">{t("Id")}</TableCell>
                <TableCell className="text-center">{t("offerName")}</TableCell>
                <TableCell className="text-center">{t("offerDetails")}</TableCell>
                <TableCell className="text-center">{t("offerActive")}</TableCell>
                <TableCell className="text-center">{t("ActionsTbl")}</TableCell>
              </tr>
            </TableHeader>

            <OfferTable
              lang={lang}
              isCheck={isCheck}
              setIsCheck={setIsCheck}
              offers={dataTable}
            />
          </Table>
          <TableFooter>
            <Pagination
              className="pagination-ltr"
              totalResults={totalResults}
              resultsPerPage={resultsPerPage}
              onChange={handleChangePage}
              label="Table navigation"
            />
          </TableFooter>
        </TableContainer>
      ) : (
        <NotFound title="Sorry, There are no offers right now." />
      )}
    </>
  );
};

export default Offers;