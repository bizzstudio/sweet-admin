import { TableBody, TableCell, TableRow } from "@windmill/react-ui";
import dayjs from "dayjs";
import { t } from "i18next";
import React from "react";
import { FiZoomIn } from "react-icons/fi";
import { Link } from "react-router-dom";

// Internal import

import DeleteModal from "@/components/modal/DeleteModal";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import Tooltip from "@/components/tooltip/Tooltip";
import EditDeleteButton from "@/components/table/EditDeleteButton";
import CashierToggleButton from "@/components/table/CashierToggleButton";

const CustomerTable = ({ customers }) => {
  const { title, serviceId, handleModalOpen } = useToggleDrawer();

  // אין כאן מגירת עריכה: העריכה עברה לעמוד הלקוח (כניסה דרך שם הלקוח),
  // ובעמוד הלקוחות אין כפתור "הוספת לקוח" שיפתח אותה
  return (
    <>
      <DeleteModal id={serviceId} title={title} />

      <TableBody>
        {customers?.map((user) => (
          <TableRow key={user._id}>
            <TableCell>
              <span className="font-semibold uppercase text-xs">
                {user?._id?.substring(20, 24)}
              </span>
            </TableCell>

            <TableCell>
              <span className="text-sm">
                {dayjs(user.createdAt).format("MMM D, YYYY")}
              </span>
            </TableCell>

            <TableCell>
              <Link
                to={`/customer/${user._id}`}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                {user.name} {user.lastName}
              </Link>
            </TableCell>

            <TableCell>
              <span className="text-sm">{user.email}</span>{" "}
            </TableCell>

            <TableCell>
              <span className="text-sm font-medium">{user.phone}</span>
            </TableCell>

            <TableCell className="text-center">
              <CashierToggleButton
                id={user._id}
                isCashier={user.isCashier || false}
              />
            </TableCell>

            <TableCell>
              <div className="flex justify-right text-right">
                <div className="p-2 cursor-pointer text-gray-400 hover:text-customGreen-dark">
                  {" "}
                  <Link to={`/customer-order/${user._id}`}>
                    <Tooltip
                      id="view"
                      Icon={FiZoomIn}
                      title={t("ViewOrder")}
                      bgColor="#3c6d16"
                    />
                  </Link>
                </div>

                <EditDeleteButton
                  title={user.name + " " + user.lastName}
                  id={user._id}
                  hideEdit
                  handleModalOpen={handleModalOpen}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </>
  );
};

export default CustomerTable;