import {
  Button,
  Card,
  CardBody,
  Table,
  TableCell,
  TableContainer,
  TableHeader,
} from "@windmill/react-ui";
import { useContext, useState } from "react";
import { FiPlus } from "react-icons/fi";
import { useTranslation } from "react-i18next";

// Internal import
import useAsync from "@/hooks/useAsync";
import NotFound from "@/components/table/NotFound";
import PageTitle from "@/components/Typography/PageTitle";
import { SidebarContext } from "@/context/SidebarContext";
import TableLoading from "@/components/preloader/TableLoading";
import StatusServices from "@/services/StatusService";
import PickerTable from "@/components/picker/PickerTable";
import MainDrawer from "@/components/drawer/MainDrawer";
import PickerDrawer from "@/components/drawer/PickerDrawer";

// המלקטים חולקים collection עם סטטוסי ההזמנות (Pending, Delivered...).
// רשומות חדשות מסומנות ב-isMelaket, אבל מלקטים שנוצרו לפני שהשדה נוסף
// מזוהים לפי טלפון לא ריק — זו ההבחנה שהקוד הקיים כבר משתמש בה.
// סטטוסי ההזמנה נזרעים עם phone: "" ולכן נופלים מחוץ לסינון.
const isPickerRecord = (record) =>
  record?.isMelaket === true || Boolean(record?.phone?.trim());

const Pickers = () => {
  const { toggleDrawer } = useContext(SidebarContext);
  const { t } = useTranslation();

  const [serviceId, setServiceId] = useState("");

  // withPassword — הטבלה מציגה את הסיסמה מאחורי כפתור עין, והשדה מוגדר
  // select:false במודל ולכן לא חוזר בלי הבקשה המפורשת.
  const { data, loading, error } = useAsync(() =>
    StatusServices.getAllStatuses({ query: "?getAll=true&withPassword=true" })
  );

  const pickers = data?.filter(isPickerRecord) || [];

  return (
    <>
      <PageTitle>{t("Pickers")}</PageTitle>

      <MainDrawer>
        <PickerDrawer id={serviceId} />
      </MainDrawer>

      <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
        <CardBody>
          <div className="py-2">
            <Button
              onClick={() => {
                // בלי איפוס המזהה, לחיצה על "הוספה" אחרי עריכה הייתה
                // פותחת את המגירה עם הפרטים של המלקט הקודם.
                setServiceId("");
                toggleDrawer();
              }}
              className="w-full max-w-[200px] rounded-md h-12"
            >
              <span className="ml-2">
                <FiPlus />
              </span>
              {t("AddPicker")}
            </Button>
          </div>
        </CardBody>
      </Card>

      {loading ? (
        <TableLoading row={12} col={6} width={160} height={20} />
      ) : error ? (
        <span className="text-center mx-auto text-red-500">{error}</span>
      ) : pickers.length !== 0 ? (
        <TableContainer className="mb-8 dark:bg-gray-900">
          <Table>
            <TableHeader>
              <tr>
                <TableCell className="text-center">{t("PickerName")}</TableCell>
                <TableCell className="text-center">{t("Username")}</TableCell>
                <TableCell className="text-center">{t("Password")}</TableCell>
                <TableCell className="text-center">{t("phone")}</TableCell>
                <TableCell className="text-center">{t("IsActive")}</TableCell>
                <TableCell className="text-center">{t("Actions")}</TableCell>
              </tr>
            </TableHeader>

            <PickerTable pickers={pickers} setServiceId={setServiceId} />
          </Table>
        </TableContainer>
      ) : (
        <NotFound title={t("NoPickersYet")} />
      )}
    </>
  );
};

export default Pickers;
