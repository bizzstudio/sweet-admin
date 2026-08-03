import {
  Button,
  Card,
  CardBody,
  Pagination,
  Table,
  TableCell,
  TableContainer,
  TableFooter,
  TableHeader,
} from "@windmill/react-ui";
import { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiChevronRight, FiEdit, FiPlus, FiTrash2 } from "react-icons/fi";
import { Link, useParams } from "react-router-dom";

// Internal import
import CategoryTable from "@/components/category/CategoryTable";
import BulkActionDrawer from "@/components/drawer/BulkActionDrawer";
import CheckBox from "@/components/form/others/CheckBox";
import DeleteModal from "@/components/modal/DeleteModal";
import Loading from "@/components/preloader/Loading";
import NotFound from "@/components/table/NotFound";
import PageTitle from "@/components/Typography/PageTitle";
import { SidebarContext } from "@/context/SidebarContext";
import useAsync from "@/hooks/useAsync";
import useFilter from "@/hooks/useFilter";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import CategoryServices from "@/services/CategoryServices";
import useUtilsFunction from "@/hooks/useUtilsFunction";
import MainDrawer from "@/components/drawer/MainDrawer";
import CategoryDrawer from "@/components/drawer/CategoryDrawer";

const ChildCategory = () => {
  const { id } = useParams();
  const [childCategory, setChildCategory] = useState([]);
  const [selectedObj, setSelectObj] = useState([]);
  const [isCheckAll, setIsCheckAll] = useState(false);
  const [isCheck, setIsCheck] = useState([]);

  const { toggleDrawer, lang } = useContext(SidebarContext);
  const {
    handleDeleteMany,
    allId,
    handleUpdateMany,
    handleModalOpen,
    handleUpdate,
    serviceId,
    title,
  } = useToggleDrawer();
  const { data, loading, error } = useAsync(CategoryServices.getAllCategory);

  const { showingTranslateValue } = useUtilsFunction();

  const { t } = useTranslation();

  useEffect(() => {
    const getAncestors = (target, children, ancestors = []) => {
      for (let node of children) {
        if (node._id === target) {
          return ancestors.concat(node);
        }
        const found = getAncestors(
          target,
          node?.children,
          ancestors?.concat(node)
        );
        if (found) {
          return found;
        }
      }
      return undefined;
    };

    const findChildArray = (obj, target) => {
      // console.log('obj', obj);
      return obj._id === target
        ? obj
        : obj?.children?.reduce(
          (acc, obj) => acc ?? findChildArray(obj, target),
          undefined
        );
    };

    if (!loading) {
      const result = findChildArray(data[0], id);
      const res = getAncestors(id, data[0]?.children);

      if (result?.children?.length > 0) {
        setChildCategory(result?.children);
        setSelectObj(res);
      }
      // console.log("result", result, "res", res);
    }
  }, [id, loading, data, childCategory]);

  const {
    totalResults,
    resultsPerPage,
    dataTable,
    serviceData,
    handleChangePage,
  } = useFilter(childCategory);

  const handleSelectAll = () => {
    setIsCheckAll(!isCheckAll);
    setIsCheck(childCategory?.map((li) => li._id));
    if (isCheckAll) {
      setIsCheck([]);
    }
  };

  return (
    <>
      <PageTitle>{t("CategoryPageTitle")}</PageTitle>

      <DeleteModal ids={allId} setIsCheck={setIsCheck} category />

      {/* <BulkActionDrawer
        ids={allId}
        title="Child Categories"
        lang={lang}
        data={data}
        childId={id}
      /> */}

      <MainDrawer maxWidth="500px">
        <CategoryDrawer id={serviceId} data={data} lang={lang} />
      </MainDrawer>

      <div className="flex items-center pb-4">
        <ol className="flex items-center w-full overflow-hidden font-serif">
          <li className="text-sm pr-1 transition duration-200 ease-in cursor-pointer hover:text-customGreen font-semibold dark:text-gray-300">
            <Link to={`/categories`}>{t("Categories")}</Link>
          </li>
          {selectedObj?.map((child, i) => (
            <span key={i + 1} className="flex items-center font-serif">
              <li className="text-sm mt-[1px]">
                {" "}
                <FiChevronRight className={`text-gray-600 dark:text-gray-500 ${lang === 'he' ? 'rotate-180' : ''}`} />{" "}
              </li>
              <li className="text-sm pl-1 transition duration-200 ease-in cursor-pointer text-gray-700 dark:text-gray-300 underline hover:text-customGreen font-semibold ">
                <Link to={`/categories/${child._id}`}>
                  {showingTranslateValue(child?.name)}
                </Link>
              </li>
            </span>
          ))}
        </ol>
      </div>

      <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
        <CardBody>
          <div className="flex justify-end items-end gap-3">
            <Button onClick={toggleDrawer} className="rounded-md h-12">
              <span className="me-1.5">
                <FiPlus />
              </span>
              {t("AddCategory")}
            </Button>

            {/* <div className="sm:w-fit w-full">
              <Button
                disabled={isCheck.length < 1}
                onClick={() => handleUpdateMany(isCheck)}
                className="w-full rounded-md h-12"
              >
                <span className="me-1.5">
                  <FiEdit />
                </span>
                {t("BulkAction")}
              </Button>
            </div> */}

            <Button
              disabled={isCheck.length < 1}
              onClick={() => handleDeleteMany(isCheck)}
              className="rounded-md h-12 bg-red-500"
            >
              <span className="me-1.5">
                <FiTrash2 />
              </span>
              {t("Delete")}
            </Button>
          </div>
        </CardBody>
      </Card>

      {loading ? (
        <Loading loading={loading} />
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
                <TableCell>{t("catIconTbl")}</TableCell>
                <TableCell>{t("Name")}</TableCell>
                <TableCell>{t("Description")}</TableCell>
                <TableCell className="text-center">{t("catActionsTbl")}</TableCell>
              </tr>
            </TableHeader>

            <CategoryTable
              categories={dataTable}
              data={data}
              lang={lang}
              isCheck={isCheck}
              setIsCheck={setIsCheck}
              useParamId={id}
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

export default ChildCategory;
