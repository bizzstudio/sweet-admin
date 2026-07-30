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
import { useContext, useState } from "react";
import { FiEdit, FiPlus, FiTrash2 } from "react-icons/fi";
import { useTranslation } from "react-i18next";

// Internal import
import { SidebarContext } from "@/context/SidebarContext";
import PopupServices from "@/services/PopupServices";
import useAsync from "@/hooks/useAsync";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import useFilter from "@/hooks/useFilter";
import PageTitle from "@/components/Typography/PageTitle";
import DeleteModal from "@/components/modal/DeleteModal";
import BulkActionDrawer from "@/components/drawer/BulkActionDrawer";
import MainDrawer from "@/components/drawer/MainDrawer";
import TableLoading from "@/components/preloader/TableLoading";
import CheckBox from "@/components/form/others/CheckBox";
import PopupTable from "@/components/popup/PopupTable";
import NotFound from "@/components/table/NotFound";
import UploadManyTwo from "@/components/common/UploadManyTwo";
import PopupDrawer from "@/components/drawer/PopupDrawer";

const Popups = () => {
  const { t } = useTranslation();
  const { toggleDrawer, lang } = useContext(SidebarContext);
  const { data, loading, error } = useAsync(PopupServices.getAllPopups);
  const [isCheckAll, setIsCheckAll] = useState(false);
  const [isCheck, setIsCheck] = useState([]);

  const { allId, serviceId, handleDeleteMany, handleUpdateMany } = useToggleDrawer();

  const {
    dataTable,
    serviceData,
    totalResults,
    resultsPerPage,
    handleChangePage,
  } = useFilter(data);

  const handleSelectAll = () => {
    setIsCheckAll(!isCheckAll);
    setIsCheck(data?.map((li) => li._id));
    if (isCheckAll) {
      setIsCheck([]);
    }
  };

  return (
    <>
      <PageTitle>{t("PopupsPageTitle")}</PageTitle>
      <DeleteModal
        ids={allId}
        setIsCheck={setIsCheck}
        title={t("Selected Popup")}
      />
      <BulkActionDrawer ids={allId} title="Popups" />

      <MainDrawer maxWidth='570px'>
        <PopupDrawer id={serviceId} />
      </MainDrawer>

      <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
        <CardBody>
          <div className="flex justify-end">
            <div className="w-full md:w-32 lg:w-32 xl:w-32 ml-3 mb-3 lg:mb-0">
              <Button
                disabled={isCheck.length < 1}
                onClick={() => handleDeleteMany(isCheck)}
                className="w-full rounded-md h-12 bg-red-500 btn-red"
              >
                <span className="ml-2">
                  <FiTrash2 />
                </span>

                {t("Delete")}
              </Button>
            </div>

            <div className="w-full md:w-48 lg:w-48 xl:w-48">
              <Button
                onClick={toggleDrawer}
                className="w-full rounded-md h-12"
              >
                <span className="ml-2">
                  <FiPlus />
                </span>
                {t("AddPopupsBtn")}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
      {loading ? (
        <TableLoading row={12} col={8} width={140} height={20} />
      ) : error ? (
        <span className="text-center mx-auto text-red-500">{error}</span>
      ) : serviceData?.length !== 0 ? (
        <TableContainer className="mb-8">
          <Table>
            <TableHeader>
              <tr>
                <TableCell className="text-center">
                  <CheckBox
                    type="checkbox"
                    name="selectAll"
                    id="selectAll"
                    handleClick={handleSelectAll}
                    isChecked={isCheckAll}
                  />
                </TableCell>
                <TableCell className="text-center">{t("PopupTitle")}</TableCell>
                <TableCell className="text-center">{t("PopupPageToShow")}</TableCell>
                <TableCell className="text-center">{t("PopupPublished")}</TableCell>
                <TableCell className="text-center">{t("CreatedAt")}</TableCell>
                <TableCell className="text-center">{t("PopupActions")}</TableCell>
              </tr>
            </TableHeader>
            <PopupTable
              lang={lang}
              isCheck={isCheck}
              popups={dataTable}
              setIsCheck={setIsCheck}
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
        <NotFound title={t("SorryPopups")} />
      )}
    </>
  );
};

export default Popups;
