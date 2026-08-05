import { TableBody, TableCell, TableRow } from "@windmill/react-ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FiEdit, FiEye, FiEyeOff } from "react-icons/fi";

// Internal import
import Tooltip from "@/components/tooltip/Tooltip";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import ActiveInActiveButtonStatus from "@/components/table/ActiveInActiveButtonStatus";

// תא הסיסמה: מוסתר כברירת מחדל ונחשף בלחיצה על העין, כדי שאפשר יהיה
// להקריא סיסמה למלקט בלי שכל הסיסמאות יהיו גלויות בטבלה בכל רגע.
const PasswordCell = ({ password }) => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  if (!password) {
    return <span className="text-xs text-gray-400">—</span>;
  }

  return (
    <div className="flex items-center justify-center gap-2">
      <span className="font-mono text-xs" dir="ltr">
        {visible ? password : "••••••••"}
      </span>
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        aria-label={visible ? t("HidePassword") : t("ShowPassword")}
        className="text-gray-400 hover:text-customGreen-dark focus:outline-none"
      >
        {visible ? <FiEyeOff /> : <FiEye />}
      </button>
    </div>
  );
};

const PickerTable = ({ pickers, setServiceId }) => {
  const { t } = useTranslation();
  const { handleUpdate } = useToggleDrawer();

  return (
    <TableBody className="dark:bg-gray-900">
      {pickers?.map((picker) => (
        <TableRow key={picker._id}>
          <TableCell className="text-center py-3">
            <span className="text-sm font-semibold">{picker?.heName}</span>
          </TableCell>

          <TableCell className="text-center">
            <span className="font-mono text-xs" dir="ltr">
              {picker?.username || (
                // מלקטים שנוצרו לפני שדה שם המשתמש מתחברים עדיין לפי טלפון.
                <span className="font-sans text-gray-400">{t("LoginByPhone")}</span>
              )}
            </span>
          </TableCell>

          <TableCell className="text-center">
            <PasswordCell password={picker?.password} />
          </TableCell>

          <TableCell className="text-center">
            <span className="text-xs" dir="ltr">{picker?.phone}</span>
          </TableCell>

          <TableCell className="text-center">
            <ActiveInActiveButtonStatus
              id={picker._id}
              status={picker.isActive ? "Active" : "Inactive"}
            />
          </TableCell>

          <TableCell className="flex justify-center">
            <button
              onClick={() => {
                handleUpdate(picker._id);
                setServiceId(picker._id);
              }}
              className="p-2 cursor-pointer text-gray-400 hover:text-customGreen-dark focus:outline-none"
            >
              <Tooltip id="edit" Icon={FiEdit} title={t("Edit")} bgColor="#10B981" />
            </button>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
};

export default PickerTable;
