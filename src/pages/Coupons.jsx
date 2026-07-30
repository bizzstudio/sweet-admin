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
import { FiEdit, FiPlus, FiTrash2, FiGift } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import Drawer from "rc-drawer";

// Internal import
import { SidebarContext } from "@/context/SidebarContext";
import CouponServices from "@/services/CouponServices";
import useAsync from "@/hooks/useAsync";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import useFilter from "@/hooks/useFilter";
import PageTitle from "@/components/Typography/PageTitle";
import DeleteModal from "@/components/modal/DeleteModal";
import BulkActionDrawer from "@/components/drawer/BulkActionDrawer";
import MainDrawer from "@/components/drawer/MainDrawer";
import CouponDrawer from "@/components/drawer/CouponDrawer";
import SignupCouponDrawer from "@/components/drawer/SignupCouponDrawer";
import TableLoading from "@/components/preloader/TableLoading";
import CheckBox from "@/components/form/others/CheckBox";
import CouponTable from "@/components/coupon/CouponTable";
import NotFound from "@/components/table/NotFound";
import UploadManyTwo from "@/components/common/UploadManyTwo";

const Coupons = () => {
  const { t } = useTranslation();
  const { toggleDrawer, lang, windowDimension } = useContext(SidebarContext);
  const { data, loading, error } = useAsync(CouponServices.getAllCoupons);
  // console.log('data',data)
  const [isCheckAll, setIsCheckAll] = useState(false);
  const [isCheck, setIsCheck] = useState([]);

  // דרואר עצמאי לקופון הרשמה (מוצר חינם) — נפרד מהדרואר המשותף של הקופון הרגיל
  const [signupOpen, setSignupOpen] = useState(false);
  const [signupId, setSignupId] = useState(null);
  const openSignupDrawer = (id = null) => {
    setSignupId(id);
    setSignupOpen(true);
  };
  const closeSignupDrawer = () => {
    setSignupOpen(false);
    setSignupId(null);
  };

  const { allId, serviceId, handleDeleteMany, handleUpdateMany } =
    useToggleDrawer();

  const {
    filename,
    isDisabled,
    couponRef,
    dataTable,
    serviceData,
    totalResults,
    resultsPerPage,
    handleChangePage,
    handleSelectFile,
    setSearchCoupon,
    handleSubmitCoupon,
    handleUploadMultiple,
    handleRemoveSelectFile,
  } = useFilter(data);

  const handleSelectAll = () => {
    setIsCheckAll(!isCheckAll);
    setIsCheck(data?.map((li) => li._id));
    if (isCheckAll) {
      setIsCheck([]);
    }
  };

  // handle reset field function
  const handleResetField = () => {
    setSearchCoupon("");
    couponRef.current.value = "";
  };

  return (
    <>
      <PageTitle>{t("CouponspageTitle")}</PageTitle>
      <DeleteModal
        ids={allId}
        setIsCheck={setIsCheck}
        title="Selected Coupon"
      />
      <BulkActionDrawer ids={allId} title="Coupons" />

      <MainDrawer maxWidth='385px'>
        <CouponDrawer id={serviceId} />
      </MainDrawer>

      {/* דרואר עצמאי לקופון הרשמה (מוצר חינם) */}
      <Drawer
        open={signupOpen}
        onClose={closeSignupDrawer}
        parent={null}
        level={null}
        placement={"right"}
        width={`${windowDimension <= 575 ? "100%" : "50%"}`}
      >
        <div className="flex flex-col w-full h-full justify-between">
          <SignupCouponDrawer
            id={signupId}
            open={signupOpen}
            onClose={closeSignupDrawer}
          />
        </div>
      </Drawer>

      <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
        <CardBody>
          <form
            onSubmit={handleSubmitCoupon}
            className="py-3 grid gap-4 lg:gap-6 xl:gap-6  xl:flex"
          >
            <div className="flex justify-start xl:w-1/2  md:w-full">
              <UploadManyTwo
                title="Coupon"
                exportData={data}
                filename={filename}
                isDisabled={isDisabled}
                handleSelectFile={handleSelectFile}
                handleUploadMultiple={handleUploadMultiple}
                handleRemoveSelectFile={handleRemoveSelectFile}
              />
            </div>

            <div className="lg:flex  md:flex xl:justify-end xl:w-1/2 md:w-full md:justify-start flex-grow-0">
              {/* <div className="w-full md:w-40 lg:w-40 xl:w-40 mr-3 mb-3 lg:mb-0">
                <Button
                  disabled={isCheck.length < 1}
                  onClick={() => handleUpdateMany(isCheck)}
                  className="w-full rounded-md h-12 btn-gray text-gray-600"
                >
                  <span className="ml-2">
                    <FiEdit />
                  </span>
                  {t("BulkAction")}
                </Button>
              </div> */}

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

              <div className="w-full md:w-48 lg:w-48 xl:w-48 ml-3 mb-3 lg:mb-0">
                <Button
                  onClick={() => openSignupDrawer(null)}
                  layout="outline"
                  className="w-full rounded-md h-12"
                >
                  <span className="ml-2">
                    <FiGift />
                  </span>
                  קופון הרשמה
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
                  {t("AddCouponsBtn")}
                </Button>
              </div>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
        <CardBody>
          <form
            onSubmit={handleSubmitCoupon}
            className="py-3 grid gap-4 lg:gap-6 xl:gap-6 md:flex xl:flex"
          >
            <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
              <Input
                ref={couponRef}
                type="search"
                placeholder={t("SearchCoupon")}
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

      {loading ? (
        // <Loading loading={loading} />
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
                {/* <TableCell className="text-center">{t("CoupTblCampaignsName")}</TableCell> */}
                <TableCell className="text-center">{t("CoupTblCode")}</TableCell>
                <TableCell className="text-center">{t("Discount")}</TableCell>
                <TableCell className="text-center">{t("Usage Count")}</TableCell>

                <TableCell className="text-center">{t("catPublishedTbl")}</TableCell>
                <TableCell className="text-center">{t("CoupTblStartDate")}</TableCell>
                {/* <TableCell className="text-center">{t("CoupTblEndDate")}</TableCell> */}
                {/* <TableCell className="text-center">{t("CoupTblStatus")}</TableCell> */}
                <TableCell className="text-center">{t("CoupTblActions")}</TableCell>
              </tr>
            </TableHeader>
            <CouponTable
              lang={lang}
              isCheck={isCheck}
              coupons={dataTable}
              setIsCheck={setIsCheck}
              onEditSignup={openSignupDrawer}
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
        <NotFound title={t("SorryCoupons")} />
      )}
    </>
  );
};

export default Coupons;
