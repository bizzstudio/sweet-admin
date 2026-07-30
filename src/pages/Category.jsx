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
import { useTranslation } from "react-i18next";
import { FiEdit, FiPlus, FiTrash2 } from "react-icons/fi";
import { IoCloudDownloadOutline } from "react-icons/io5";
import exportFromJSON from "export-from-json";
import Papa from 'papaparse';

// Internal import
import useAsync from "@/hooks/useAsync";
import { SidebarContext } from "@/context/SidebarContext";
import CategoryServices from "@/services/CategoryServices";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import useFilter from "@/hooks/useFilter";
import DeleteModal from "@/components/modal/DeleteModal";
import BulkActionDrawer from "@/components/drawer/BulkActionDrawer";
import PageTitle from "@/components/Typography/PageTitle";
import MainDrawer from "@/components/drawer/MainDrawer";
import CategoryDrawer from "@/components/drawer/CategoryDrawer";
import UploadManyTwo from "@/components/common/UploadManyTwo";
import SwitchToggleChildCat from "@/components/form/switch/SwitchToggleChildCat";
import TableLoading from "@/components/preloader/TableLoading";
import CheckBox from "@/components/form/others/CheckBox";
import CategoryTable from "@/components/category/CategoryTable";
import NotFound from "@/components/table/NotFound";
import spinnerLoadingImage from "@/assets/img/spinner.gif";
import { notifyError } from "@/utils/toast";

const Category = () => {
  const { toggleDrawer, lang } = useContext(SidebarContext);

  const { data, loading, error } = useAsync(CategoryServices.getAllCategory);
  const { data: getAllCategories } = useAsync(
    CategoryServices.getAllCategories
  );

  const {
    handleDeleteMany,
    allId,
    handleUpdateMany,
    serviceId,
    title,
    handleModalOpen,
    handleUpdate,
  } = useToggleDrawer();

  const { t } = useTranslation();

  const {
    handleSubmitCategory,
    categoryRef,
    totalResults,
    resultsPerPage,
    dataTable,
    serviceData,
    handleChangePage,
    filename,
    isDisabled,
    setCategoryType,
    handleSelectFile,
    handleUploadMultiple,
    handleRemoveSelectFile,
  } = useFilter(data[0]?.children ? data[0]?.children : data);

  // react hooks
  const [isCheckAll, setIsCheckAll] = useState(false);
  const [isCheck, setIsCheck] = useState([]);
  const [showChild, setShowChild] = useState(false);
  const [loadingExport, setLoadingExport] = useState(false);

  const handleSelectAll = () => {
    setIsCheckAll(!isCheckAll);
    setIsCheck(data[0]?.children.map((li) => li._id));
    if (isCheckAll) {
      setIsCheck([]);
    }
  };

  // handle reset field function
  const handleResetField = () => {
    setCategoryType("");
    categoryRef.current.value = "";
  };

  // console.log("serviceData", serviceData, "tableData", dataTable);

  const handleDownloadCategories = async () => {
    try {
      setLoadingExport(true);
      const res = await CategoryServices.getAllCategories();

      // Format data dynamically - iterate over all keys
      const formattedData = res.map(category => {
        const formattedCategory = {};

        // Iterate over all keys in the category object
        Object.keys(category).forEach(key => {
          const value = category[key];

          // If the value is an object or array, stringify it
          if (value && typeof value === 'object') {
            formattedCategory[key] = JSON.stringify(value);
          } else {
            // For primitive values, use them as is (handle null/undefined)
            formattedCategory[key] = value || '';
          }
        });

        return formattedCategory;
      });

      // Create CSV with BOM for Hebrew support
      const csvContent = Papa.unparse(formattedData);
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

      // Create download link
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'categories.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setLoadingExport(false);
    } catch (err) {
      setLoadingExport(false);
      notifyError(err?.response?.data?.message || err?.message);
      console.error(err);
    }
  };

  return (
    <>
      <PageTitle>{t("Category")}</PageTitle>
      <DeleteModal ids={allId} setIsCheck={setIsCheck} />

      <BulkActionDrawer
        ids={allId}
        title="Categories"
        lang={lang}
        data={data}
        isCheck={isCheck}
      />

      <MainDrawer maxWidth="500px">
        <CategoryDrawer id={serviceId} data={data} lang={lang} />
      </MainDrawer>

      <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
        <CardBody className="">
          {/* <div className="flex md:flex-row flex-col gap-3 justify-end items-end"> */}
          <form
            onSubmit={handleSubmitCategory}
            className="py-3  grid gap-4 lg:gap-6 xl:gap-6 xl:flex"
          >
            {/* </div> */}
            <div className="flex justify-start w-1/2 xl:w-1/2 md:w-full">
              <UploadManyTwo
                title="Categories"
                exportData={getAllCategories}
                filename={filename}
                isDisabled={isDisabled}
                handleSelectFile={handleSelectFile}
                handleUploadMultiple={handleUploadMultiple}
                handleRemoveSelectFile={handleRemoveSelectFile}
              />
            </div>

            <div className="lg:flex  md:flex xl:justify-end xl:w-1/2  md:w-full md:justify-start flex-grow-0">
              {/* <div className="w-full md:w-40 lg:w-40 xl:w-40 mr-3 mb-3 lg:mb-0">
                <Button
                  disabled={isCheck.length < 1}
                  onClick={() => handleUpdateMany(isCheck)}
                  className="w-full rounded-md h-12 text-gray-600 btn-gray"
                >
                  <span className="ml-2">
                    <FiEdit />
                  </span>

                  {t("BulkAction")}
                </Button>
              </div> */}
              <div className="w-full md:w-fit lg:w-fit xl:w-fit me-3 mb-3 lg:mb-0">
                {loadingExport ? (
                  <Button disabled={true} type="button" className="w-full rounded-md h-12">
                    <img src={spinnerLoadingImage} alt="Loading" width={20} height={10} />{" "}
                    <span className="font-serif ml-2 font-light">Processing</span>
                  </Button>
                ) : (
                  <button
                    onClick={handleDownloadCategories}
                    disabled={getAllCategories?.length <= 0 || loadingExport}
                    type="button"
                    className={`${(getAllCategories?.length <= 0 || loadingExport) &&
                      "opacity-50 cursor-not-allowed bg-customGreen-dark"
                      } flex items-center justify-center text-sm leading-5 w-full h-12 text-center transition-colors duration-150 font-medium px-6 py-2 rounded-md text-white bg-customGreen border border-transparent active:bg-customGreen-dark hover:bg-customGreen-dark`}
                  >
                    {t("DownloadAllCategories")}
                    <span className="mr-2 text-base">
                      <IoCloudDownloadOutline />
                    </span>
                  </button>
                )}
              </div>
              <div className="w-full md:w-32 lg:w-32 xl:w-32  ml-3 mb-3 lg:mb-0">
                <Button
                  disabled={isCheck.length < 1}
                  onClick={() => handleDeleteMany(isCheck)}
                  className="w-full rounded-md h-12 bg-red-500 disabled  btn-red"
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
                  className="rounded-md h-12 w-full"
                >
                  <span className="ml-2">
                    <FiPlus />
                  </span>

                  {t("AddCategory")}
                </Button>
              </div>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 rounded-t-lg rounded-0 mb-4">
        <CardBody>
          <form
            onSubmit={handleSubmitCategory}
            className="py-3 grid gap-4 lg:gap-6 xl:gap-6 md:flex xl:flex"
          >
            <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
              <Input
                ref={categoryRef}
                type="search"
                placeholder={t("SearchCategory")}
              />
            </div>
            <div className="flex items-center gap-2 flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
              <div className="w-full mx-1">
                <Button type="submit" className="h-12 w-full bg-customGreen-dark">
                  {t("Filter")}
                </Button>
              </div>

              <div className="w-full mx-1">
                <Button
                  layout="outline"
                  onClick={handleResetField}
                  type="reset"
                  className="px-4 md:py-1 py-2 h-12 text-sm dark:bg-gray-700"
                >
                  <span className="text-black dark:text-gray-200">{t("Reset")}</span>
                </Button>
              </div>
            </div>
          </form>
        </CardBody>
      </Card>

      <SwitchToggleChildCat
        title=" "
        handleProcess={setShowChild}
        processOption={showChild}
        name={showChild}
      />
      {loading ? (
        <TableLoading row={12} col={6} width={190} height={20} />
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

                <TableCell className="text-center">{t("catIdTbl")}</TableCell>
                <TableCell className="text-center">{t("Slug")}</TableCell>
                <TableCell className="text-start">{t("catIconTbl")}</TableCell>
                <TableCell className="text-start">{t("CatTbName")}</TableCell>
                <TableCell className="text-start">{t("CatTbDescription")}</TableCell>
                <TableCell className="text-center">
                  {t("catPublishedTbl")}
                </TableCell>
                <TableCell className="text-center">
                  {t("catActionsTbl")}
                </TableCell>
              </tr>
            </TableHeader>

            <CategoryTable
              data={data}
              lang={lang}
              isCheck={isCheck}
              categories={dataTable}
              setIsCheck={setIsCheck}
              showChild={showChild}
              title={title}
              serviceId={serviceId}
              handleModalOpen={handleModalOpen}
              handleUpdate={handleUpdate}
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
        <NotFound title="Sorry, There are no categories right now." />
      )}
    </>
  );
};

export default Category;
