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

const Pickers = () => {
  const { toggleDrawer } = useContext(SidebarContext);
  const { t } = useTranslation();

  const [serviceId, setServiceId] = useState("");

  // נתיב ייעודי ולא רשימת הסטטוסים הכללית: הוא מסנן לפי מלקטים בלבד
  // ומחזיר את הסיסמאות (select:false במודל), והוא רשום רק מאחורי isAdmin.
  const { data, loading, error } = useAsync(() =>
    StatusServices.getAllMelaketim()
  );

  const pickers = Array.isArray(data) ? data : [];

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
