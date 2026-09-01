import {
  Card,
  Button,
  CardBody,
  Input,
  Pagination,
  Table,
  TableCell,
  TableContainer,
  TableFooter,
  TableHeader,
} from "@windmill/react-ui";
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { FiDollarSign } from "react-icons/fi";

// Internal import
import UploadManyTwo from "@/components/common/UploadManyTwo";
import CustomerTable from "@/components/customer/CustomerTable";
import TableLoading from "@/components/preloader/TableLoading";
import NotFound from "@/components/table/NotFound";
import PageTitle from "@/components/Typography/PageTitle";
import useAsync from "@/hooks/useAsync";
import useFilter from "@/hooks/useFilter";
import CustomerServices from "@/services/CustomerServices";
import CustomerHistoryServices from "@/services/CustomerHistoryServices";
import CustomerPriceListServices from "@/services/CustomerPriceListServices";
import ImportCustomersExcelModal from "@/components/customer/ImportCustomersExcelModal";
import CustomerHistoryModal from "@/components/customer/CustomerHistoryModal";
import CustomerPriceListModal from "@/components/customer/CustomerPriceListModal";
import BulkCustomerPriceListModal from "@/components/customer/BulkCustomerPriceListModal";
import { SidebarContext } from "@/context/SidebarContext";

import TableHeaderCell from "@/components/table/TableHeaderCell";
const Customers = () => {
  const { data, loading, error } = useAsync(CustomerServices.getAllCustomers);
  const { setIsUpdate } = useContext(SidebarContext);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  // הלקוח שהמחירון שלו נערך כרגע (null = המודאל סגור)
  const [priceListCustomer, setPriceListCustomer] = useState(null);
  const [historyCustomer, setHistoryCustomer] = useState(null);
  // יבוא מרוכז: קובץ אחד עם המחירונים של כל הלקוחות
  const [isBulkPriceListOpen, setIsBulkPriceListOpen] = useState(false);

  // ── סיכום המחירונים בבקשה אחת ──
  //
  // הטבלה צריכה להראות לאילו לקוחות יש מחירון, וקריאה לכל שורה בנפרד הייתה
  // מייצרת עשרות בקשות בכל טעינת עמוד. הנתיב הזה מחזיר מטא-נתונים בלבד
  // (בלי שורות המחירון), ולכן התגובה קטנה גם כשלמאות לקוחות יש מחירון.
  const [priceLists, setPriceLists] = useState(new Map());

  const loadPriceLists = useCallback(async () => {
    try {
      const summary = await CustomerPriceListServices.getSummary();
      setPriceLists(
        new Map((summary || []).map((item) => [String(item.customer), item]))
      );
    } catch (err) {
      // כשל כאן אינו שובר את רשימת הלקוחות — רק התג של המחירון לא יוצג
      console.log("loadPriceLists error: ", err?.message);
    }
  }, []);

  // ── סיכום ההיסטוריות, באותה תבנית ומאותה סיבה ──
  //
  // הטבלה מראה לאילו לקוחות כבר יש היסטוריית רכישות, כי זה מה שמאפשר לראות
  // במבט אחד את מי עוד כדאי להשלים — ובקשה לכל שורה בנפרד הייתה מייצרת עשרות
  // בקשות בכל טעינת עמוד.
  const [histories, setHistories] = useState(new Map());

  const loadHistories = useCallback(async () => {
    try {
      const summary = await CustomerHistoryServices.getSummary();
      setHistories(
        new Map((summary || []).map((item) => [String(item.customer), item]))
      );
    } catch (err) {
      // כשל כאן אינו שובר את רשימת הלקוחות — רק התג של ההיסטוריה לא יוצג
      console.log("loadHistories error: ", err?.message);
    }
  }, []);

  useEffect(() => {
    loadPriceLists();
  }, [loadPriceLists]);

  useEffect(() => {
    loadHistories();
  }, [loadHistories]);

  // ── שורות הייצוא ──
  //
  // רשימת הלקוחות מהשרת מחזיקה את מספר הלקוח בתוך אובייקט erp מקונן, ו-
  // export-from-json כותב אובייקט לתא אחד כ-JSON. הייצוא מקבל לכן שורות
  // שטוחות, שבהן מספר הלקוח הוא עמודה משלו כמו שאר השדות
  const exportRows = useMemo(
    () =>
      Array.isArray(data)
        ? data.map(({ erp, ...rest }) => ({
            ...rest,
            customerNumber: erp?.customerNumber || "",
          }))
        : data,
    [data]
  );

  // console.log('customer',data)

  // יבוא ה-JSON הוסר מהעמוד לטובת יבוא האקסל, ולכן אין צורך בשדות הקובץ מההוק
  const {
    userRef,
    dataTable,
    serviceData,
    setSearchUser,
    totalResults,
    resultsPerPage,
    handleSubmitUser,
    handleChangePage,
  } = useFilter(data);

  const { t } = useTranslation();
  const handleResetField = () => {
    setSearchUser("");
    userRef.current.value = "";
  };

  return (
    <>
      <PageTitle>{t("CustomersPage")}</PageTitle>

      <ImportCustomersExcelModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        onImported={() => setIsUpdate(true)}
      />

      {/* מחירון פרטי ללקוח מסוים. נשאר מותקן גם כשהוא סגור, כדי שהמצב הפנימי
          שלו יתאפס לפי customerId ולא ישמור נתונים של הלקוח הקודם */}
      <CustomerPriceListModal
        isOpen={Boolean(priceListCustomer)}
        onClose={() => setPriceListCustomer(null)}
        customerId={priceListCustomer?._id}
        customerName={`${priceListCustomer?.name || ""} ${
          priceListCustomer?.lastName || ""
        }`.trim()}
        onChanged={loadPriceLists}
      />

      {/* היסטוריית הרכישות של לקוח מסוים. נשאר מותקן גם כשהוא סגור, כדי
          שהמצב הפנימי שלו יתאפס לפי customerId ולא ישמור נתונים של הקודם */}
      <CustomerHistoryModal
        isOpen={Boolean(historyCustomer)}
        onClose={() => setHistoryCustomer(null)}
        customerId={historyCustomer?._id}
        customerName={`${historyCustomer?.name || ""} ${
          historyCustomer?.lastName || ""
        }`.trim()}
        onChanged={loadHistories}
      />

      {/* מחירונים של כל הלקוחות מקובץ אחד. ההתאמה ללקוח לפי מספר לקוח */}
      <BulkCustomerPriceListModal
        isOpen={isBulkPriceListOpen}
        onClose={() => setIsBulkPriceListOpen(false)}
        onImported={loadPriceLists}
      />

      <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
        <CardBody>
          <form
            onSubmit={handleSubmitUser}
            className="py-3 grid gap-4 lg:gap-6 xl:gap-6 md:flex xl:flex"
          >
            <div className="items-center">
              {/* יבוא הלקוחות הוא מאקסל של ההנהח"ש (התאמה לפי מספר לקוח).
                  onExcelImport מחליף את יבוא ה-JSON שמחק את כל הלקוחות */}
              <UploadManyTwo
                title="Customers"
                exportData={exportRows}
                onExcelImport={() => setIsExcelModalOpen(true)}
              />
            </div>

            {/* המחירונים מגיעים מההנהח"ש בקובץ אחד לכל הלקוחות, ולכן הכפתור
                יושב כאן ולא בשורת הלקוח. העלאה ללקוח בודד נשארת בטבלה */}
            <div className="flex items-center">
              <Button
                type="button"
                layout="outline"
                onClick={() => setIsBulkPriceListOpen(true)}
                className="h-12 whitespace-nowrap"
              >
                <FiDollarSign className="ml-2" />
                העלאת מחירון לקוחות
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
        <CardBody>
          <form
            onSubmit={handleSubmitUser}
            className="py-3 grid gap-4 lg:gap-6 xl:gap-6 md:flex xl:flex"
          >
            <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
              <Input
                ref={userRef}
                type="search"
                name="search"
                placeholder={t("CustomersPageSearchPlaceholder")}
              />
              <button
                type="submit"
                className="absolute right-0 top-0 mt-5 mr-1"
              ></button>
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
        <TableLoading row={12} col={6} width={190} height={20} />
      ) : error ? (
        <span className="text-center mx-auto text-red-500">{error}</span>
      ) : serviceData?.length !== 0 ? (
        <TableContainer className="mb-8">
          <Table className="w-full whitespace-nowrap admin-table">
            <TableHeader>
              <tr>
                <TableHeaderCell>{t("CustomersId")}</TableHeaderCell>
                <TableHeaderCell>{t("CustomersJoiningDate")}</TableHeaderCell>
                <TableHeaderCell>{t("CustomersName")}</TableHeaderCell>
                <TableHeaderCell>{t("CustomersEmail")}</TableHeaderCell>
                <TableHeaderCell>{t("CustomersPhone")}</TableHeaderCell>
                <TableHeaderCell className="text-center">מחירון</TableHeaderCell>
                <TableHeaderCell className="text-center">היסטוריה</TableHeaderCell>
                <TableHeaderCell className="text-center">{t("CashierStatus")}</TableHeaderCell>
                <TableHeaderCell className="text-right">
                  {t("CustomersActions")}
                </TableHeaderCell>
              </tr>
            </TableHeader>
            <CustomerTable
              customers={dataTable}
              priceLists={priceLists}
              onOpenPriceList={setPriceListCustomer}
              histories={histories}
              onOpenHistory={setHistoryCustomer}
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
        <NotFound title="Sorry, There are no customers right now." />
      )}
    </>
  );
};

export default Customers;
