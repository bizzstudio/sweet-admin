import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { FiEdit, FiTrash2, FiZoomIn } from "react-icons/fi";

import Tooltip from "@/components/tooltip/Tooltip";

const EditDeleteButton = ({
  id,
  title,
  handleUpdate,
  handleModalOpen,
  isCheck,
  product,
  parent,
  children,
  // hideEdit: מסתיר את כפתור העריכה ומשאיר רק מחיקה. בשימוש בטבלת המוצרים,
  // שבה העריכה עברה לעמוד המוצר עצמו. ברירת המחדל false - כל שאר הטבלאות
  // ממשיכות להתנהג בדיוק כמו קודם
  hideEdit = false,
}) => {
  const { t } = useTranslation();
  // console.log('edite delet button')
  
  return (
    <>
      <div className="flex justify-center text-center">
        {hideEdit ? null : children?.length > 0 ? (
          <>
            <Link
              to={`/categories/${parent?._id}`}
              aria-label={`${t("View")}${title ? ` – ${title}` : ""}`}
              className="tap-target p-2 cursor-pointer text-gray-500 hover:text-customGreen-dark"
            >
              <Tooltip
                id="view"
                Icon={FiZoomIn}
                title={t("View")}
                bgColor="#10B981"
              />
            </Link>

            <button
              type="button"
              disabled={isCheck?.length > 0}
              onClick={() => handleUpdate(id)}
              aria-label={`${t("Edit")}${title ? ` – ${title}` : ""}`}
              className="tap-target p-2 cursor-pointer text-gray-500 hover:text-customGreen-dark disabled:opacity-40"
            >
              <Tooltip
                id="edit"
                Icon={FiEdit}
                title={t("Edit")}
                bgColor="#10B981"
              />
            </button>
          </>
        ) : (
          <>
          <div
            aria-hidden="true"
            className="opacity-0 p-2 text-gray-500"
          >
            <Tooltip
              id="view"
              Icon={FiZoomIn}
              title={t("View")}
              bgColor="#10B981"
            />
          </div>

          <button
            type="button"
            disabled={isCheck?.length > 0}
            onClick={() => handleUpdate(id)}
            aria-label={`${t("Edit")}${title ? ` – ${title}` : ""}`}
            className="tap-target p-2 cursor-pointer text-gray-500 hover:text-customGreen-dark disabled:opacity-40"
          >
            <Tooltip
              id="edit"
              Icon={FiEdit}
              title={t("Edit")}
              bgColor="#10B981"
            />
          </button>
          </>
        )}

        <button
          type="button"
          disabled={isCheck?.length > 0}
          onClick={() => handleModalOpen(id, title, product)}
          aria-label={`${t("Delete")}${title ? ` – ${title}` : ""}`}
          className="tap-target p-2 cursor-pointer text-gray-500 hover:text-red-600 disabled:opacity-40"
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

export default EditDeleteButton;
