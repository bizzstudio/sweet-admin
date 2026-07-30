// src/pages/Blogs.jsx
import {
    Button,
    Card,
    CardBody,
    Input,
    Table,
    TableHeader,
    TableCell,
    TableContainer,
    TableFooter,
    Pagination,
    Select,
} from "@windmill/react-ui";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import { useContext, useState } from "react";
import { useTranslation } from "react-i18next";

import PageTitle from "@/components/Typography/PageTitle";
import MainDrawer from "@/components/drawer/MainDrawer";
import BlogDrawer from "@/components/drawer/BlogDrawer";
import BlogTable from "@/components/blog/BlogTable";
import DeleteModal from "@/components/modal/DeleteModal";
import CheckBox from "@/components/form/others/CheckBox";
import TableLoading from "@/components/preloader/TableLoading";
import NotFound from "@/components/table/NotFound";

import BlogServices from "@/services/BlogServices";
import useAsync from "@/hooks/useAsync";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import useFilter from "@/hooks/useFilter";
import { SidebarContext } from "@/context/SidebarContext";

const Blogs = () => {
    const { t } = useTranslation();
    const { toggleDrawer } = useContext(SidebarContext);
    const {
        title,
        allId,
        serviceId,
        handleDeleteMany,
        handleModalOpen,
        handleUpdate,
    } = useToggleDrawer();

    const { data, loading, error } = useAsync(BlogServices.getAllBlogs);

    console.log('all blogs :>> ', data);

    // Filter functionality
    const {
        searchRef,
        totalResults,
        resultsPerPage,
        dataTable,
        serviceData,
        handleChangePage,
        handleSubmitForAll,
        setStatus,
    } = useFilter(data);

    const [isCheckAll, setIsCheckAll] = useState(false);
    const [isCheck, setIsCheck] = useState([]);
    const [blogStatus, setBlogStatus] = useState("");

    const handleSelectAll = () => {
        setIsCheckAll(!isCheckAll);
        setIsCheck(dataTable?.map((li) => li._id));
        if (isCheckAll) setIsCheck([]);
    };

    // Handle reset field
    const handleResetField = () => {
        setBlogStatus("");
        setStatus("");
        searchRef.current.value = "";
    };

    // Handle status change
    const handleStatusChange = (e) => {
        const selectedStatus = e.target.value;
        setBlogStatus(selectedStatus);
        setStatus(selectedStatus);
    };

    return (
        <>
            <PageTitle>{t("Blogs")}</PageTitle>

            <MainDrawer maxWidth='570px'>
                <BlogDrawer id={serviceId} />
            </MainDrawer>
            <DeleteModal ids={allId} setIsCheck={setIsCheck} title={t("SelectedBlogs")} />

            {/* --- Search, Filter and Actions Card --- */}
            <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
                <CardBody>
                    <form
                        onSubmit={handleSubmitForAll}
                        className="py-3 grid gap-4 xl:gap-4 md:flex xl:flex"
                    >
                        <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                            <Input
                                ref={searchRef}
                                type="search"
                                name="search"
                                placeholder={t("SearchBlogs")}
                            />
                            <button
                                type="submit"
                                className="absolute right-0 top-0 mt-5 mr-1"
                            ></button>
                        </div>

                        <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                            <Select onChange={handleStatusChange} value={blogStatus}>
                                <option value="" defaultValue>
                                    {t("AllStatuses")}
                                </option>
                                <option value="published">{t("Published")}</option>
                                <option value="draft">{t("Draft")}</option>
                                <option value="hidden">{t("Hidden")}</option>
                            </Select>
                        </div>

                        <div className="mt-2 md:mt-0 flex items-center xl:gap-x-4 gap-x-1 flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
                            <div className="w-full mx-1">
                                <Button type="submit" className="h-12 w-full bg-customGreen-dark">
                                    {t("Filter")}
                                </Button>
                            </div>

                            <div className="w-full">
                                <Button
                                    layout="outline"
                                    onClick={handleResetField}
                                    type="reset"
                                    className="px-4 md:py-1 py-3 text-sm dark:bg-gray-700"
                                >
                                    <span className="text-black dark:text-gray-200">{t("Reset")}</span>
                                </Button>
                            </div>
                        </div>

                        <div className="flex-grow-0">
                            <Button
                                disabled={isCheck.length < 1}
                                onClick={() => handleDeleteMany(isCheck)}
                                className="w-full rounded-md h-12 bg-red-300 disabled btn-red"
                            >
                                <span className="ml-2">
                                    <FiTrash2 />
                                </span>
                                {t("Delete")}
                            </Button>
                        </div>

                        <div className="flex-grow-0">
                            <Button onClick={toggleDrawer} className="w-full rounded-md h-12">
                                <span className="me-1">
                                    <FiPlus />
                                </span>
                                {t("AddBlog")}
                            </Button>
                        </div>
                    </form>
                </CardBody>
            </Card>

            {/* --- table --- */}
            {loading ? (
                <TableLoading row={12} col={7} width={170} height={20} />
            ) : error ? (
                <span className="text-red-500">{error}</span>
            ) : serviceData?.length ? (
                <TableContainer className="mb-8 rounded-b-lg">
                    <Table>
                        <TableHeader>
                            <tr>
                                <TableCell className="text-center">
                                    <CheckBox
                                        id="selectAll"
                                        type="checkbox"
                                        handleClick={handleSelectAll}
                                        isChecked={isCheckAll}
                                    />
                                </TableCell>
                                <TableCell className="text-center">{t("Image")}</TableCell>
                                <TableCell>{t("Title")}</TableCell>
                                <TableCell>{t("Author")}</TableCell>
                                <TableCell>{t("Category")}</TableCell>
                                <TableCell className="text-center">{t("Status")}</TableCell>
                                <TableCell className="text-center">{t("PublishDate")}</TableCell>
                                <TableCell className="text-center">{t("Actions")}</TableCell>
                            </tr>
                        </TableHeader>

                        <BlogTable
                            blogs={dataTable}
                            isCheck={isCheck}
                            setIsCheck={setIsCheck}
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
                            label="Blog Page Navigation"
                        />
                    </TableFooter>
                </TableContainer>
            ) : (
                <NotFound title={t("NoBlogsFound")} />
            )}
        </>
    );
};

export default Blogs; 