import { FiEdit, FiTrash2 } from "react-icons/fi";
import { useTranslation } from "react-i18next";
// Internal import
import Tooltip from "@/components/tooltip/Tooltip";

const EditDeleteButtonTwo = ({
  extra,
  variant,
  handleRemoveVariant,
  attribute,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <div className="flex justify-center text-right">
        {!attribute && (
          // ‎onClick מנוטרל כאן, ולכן זו אינה פעולה כלל — ‎aria-hidden מונע
          // מקורא מסך להכריז כפתור שאינו עושה דבר.
          <div
            aria-hidden="true"
            className="p-2 text-gray-500"
          >
            <Tooltip id="edit" Icon={FiEdit} title={t("Edit")} bgColor="#14b8a6" />
          </div>
        )}

        {/* ‎<div onClick> אינו מקבל פוקוס ואינו מגיב ל-Enter — פעולת המחיקה
            הייתה בלתי נגישה במקלדת. */}
        <button
          type="button"
          onClick={() => handleRemoveVariant(variant, extra)}
          aria-label={t("Delete")}
          className="tap-target p-2 cursor-pointer text-gray-500 hover:text-red-600"
        >
          <Tooltip
            id="delete"
            Icon={FiTrash2}
            title={t("Delete")}
            bgColor="#EF4444"
          />
        </button>
      </div>
    </>
  );
};

export default EditDeleteButtonTwo;
