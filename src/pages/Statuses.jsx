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
import { FiPlus, FiTrash2 } from "react-icons/fi";
import { useTranslation } from "react-i18next";

// Internal import
import useAsync from "@/hooks/useAsync";
import useFilter from "@/hooks/useFilter";
import NotFound from "@/components/table/NotFound";
import PageTitle from "@/components/Typography/PageTitle";
import { SidebarContext } from "@/context/SidebarContext";
import TableLoading from "@/components/preloader/TableLoading";
import StatusServices from "@/services/StatusService";
import StatusTable from "@/components/status/StatusTable";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import DeleteModal from "@/components/modal/DeleteModal";
import BulkActionDrawer from "@/components/drawer/BulkActionDrawer";
import MainDrawer from "@/components/drawer/MainDrawer";
import StatusDrawer from "@/components/drawer/StatusDrawer";
import CheckBox from "@/components/form/others/CheckBox";

import TableHeaderCell from "@/components/table/TableHeaderCell";
const Statuses = () => {
  const {
    status,
    setStatus,
    currentPage,
    searchText,
    searchRef,
    setSearchText,
    handleChangePage,
    handleSubmitForAll,
    resultsPerPage,
    toggleDrawer,
  } = useContext(SidebarContext);
  const { title, allId, handleDeleteMany, handleUpdateMany } = useToggleDrawer();

  const { t } = useTranslation();

  const [loadingExport, setLoadingExport] = useState(false);

  const { data, loading, error } = useAsync(() =>
    StatusServices.getAllStatuses({ query: '?getAll=true' })
  );

  const [serviceId, setServiceId] = useState('');

  // const { dataTable, serviceData } = useFilter(data);

  const handleResetField = () => {
    setStatus("");
    setSearchText("");
    searchRef.current.value = "";
  };

  // const [isCheckAll, setIsCheckAll] = useState(false);
  // const [isCheck, setIsCheck] = useState([]);

  // const handleSelectAll = () => {
  //   setIsCheckAll(!isCheckAll);
  //   setIsCheck(data?.filter((li) => li.phone).map((li) => li._id));
  //   if (isCheckAll) {
  //     setIsCheck([]);
  //   }
  // };

  return (
    <>
      <PageTitle>{t("Statuses")}</PageTitle>

      {/* <DeleteModal ids={isCheck} title={title} setIsCheck={setIsCheck} /> */}

      <BulkActionDrawer ids={allId} title="Statuses" />

      <MainDrawer>
        <StatusDrawer id={serviceId} />
      </MainDrawer>

      <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
        <CardBody>
          <form onSubmit={handleSubmitForAll}>
            <div className="grid gap-4 lg:gap-4 xl:gap-6 md:gap-2 md:grid-cols-2 py-2">
              {/* <div>
                <Input
                  ref={searchRef}
                  type="search"
                  name="search"
                  placeholder={t("SearchbyStatusName")}
                />
              </div>

              <div>
                <Select onChange={(e) => setStatus(e.target.value)}>
                  <option value="" defaultValue hidden>
                    {t("Status")}
                  </option>
                  <option value="true">{t("Active")}</option>
                  <option value="false">{t("Inactive")}</option>
                </Select>
              </div> */}

              <div>
                <Button
                  onClick={toggleDrawer}
                  className="w-full max-w-[200px] rounded-md h-12"
                >
                  <span className="ml-2">
                    <FiPlus />
                  </span>
                  {t("AddStatus")}
                </Button>
              </div>

              {/* <div className="">
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
              </div> */}
            </div>
          </form>
        </CardBody>
      </Card>

      {loading ? (
        <TableLoading row={12} col={7} width={160} height={20} />
      ) : error ? (
        <span className="text-center mx-auto text-red-500">{error}</span>
      ) : data?.length !== 0 ? (
        <TableContainer className="mb-8 dark:bg-gray-900">
          <Table className="w-full whitespace-nowrap admin-table">
            <TableHeader>
              <tr>
                {/* <TableHeaderCell>
                  <CheckBox
                    type="checkbox"
                    name="selectAll"
                    id="selectAll"
                    handleClick={handleSelectAll}
                    isChecked={isCheckAll}
                  />
                </TableHeaderCell> */}
                <TableHeaderCell className='text-center'>{t("Name")}</TableHeaderCell>
                <TableHeaderCell className='text-center'>{t("heName")}</TableHeaderCell>
                <TableHeaderCell className='text-center'>{t("phone")}</TableHeaderCell>
                {/* <TableHeaderCell className='text-center'>{t("IsActive")}</TableHeaderCell> */}
                <TableHeaderCell className='text-center'>{t("CreatedAt")}</TableHeaderCell>
                <TableHeaderCell className='text-center'>{t("UpdatedAt")}</TableHeaderCell>
                <TableHeaderCell className='text-center'>{t("IsActive")}</TableHeaderCell>
                <TableHeaderCell className='text-center'>{t("Actions")}</TableHeaderCell>
              </tr>
            </TableHeader>

            <StatusTable statuses={data.sort((a, b) => {
              if (a.phone && !b.phone) return 1;
              if (!a.phone && b.phone) return -1;
              return 0;
            })}
              // isCheck={isCheck}
              // setIsCheck={setIsCheck}
              setServiceId={setServiceId}
            />
          </Table>

          {/* <TableFooter>
               <Pagination
              className="pagination-ltr"
              totalResults={data?.totalDoc}
              resultsPerPage={resultsPerPage}
              onChange={handleChangePage}
              label="Table navigation"
            />
          </TableFooter> */}
        </TableContainer>
      ) : (
        <NotFound title="Sorry, There are no statuses right now." />
      )}
    </>
  );
};

export default Statuses;
