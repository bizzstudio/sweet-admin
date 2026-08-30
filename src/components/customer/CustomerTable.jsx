import { Badge, TableBody, TableCell, TableRow } from "@windmill/react-ui";
import dayjs from "dayjs";
import { t } from "i18next";
import React from "react";
import { FiClock, FiZoomIn } from "react-icons/fi";
import { Link } from "react-router-dom";

// Internal import

import DeleteModal from "@/components/modal/DeleteModal";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import Tooltip from "@/components/tooltip/Tooltip";
import EditDeleteButton from "@/components/table/EditDeleteButton";
import CashierToggleButton from "@/components/table/CashierToggleButton";

const CustomerTable = ({
  customers,
  priceLists = new Map(),
  onOpenPriceList,
  histories = new Map(),
  onOpenHistory,
}) => {
  const { title, serviceId, handleModalOpen } = useToggleDrawer();

  // אין כאן מגירת עריכה: העריכה עברה לעמוד הלקוח (כניסה דרך שם הלקוח),
  // ובעמוד הלקוחות אין כפתור "הוספת לקוח" שיפתח אותה
  return (
    <>
      <DeleteModal id={serviceId} title={title} />

      <TableBody>
        {customers?.map((user) => {
          const priceList = priceLists.get(String(user._id));
          const history = histories.get(String(user._id));

          return (
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

              {/* המחירון הפרטי: מוצג כמצב ולא רק ככפתור, כדי שאפשר יהיה לראות
                  במבט אחד לאילו לקוחות יש מחירון ולאילו לא */}
              <TableCell className="text-center">
                <button
                  type="button"
                  onClick={() => onOpenPriceList?.(user)}
                  className="mx-auto flex items-center gap-1.5 rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 transition-colors duration-150 hover:text-mainColor-dark focus:outline-none dark:border-gray-600 dark:text-gray-300"
                  title="העלאת מחירון מאקסל"
                >
                  {priceList?.itemsCount > 0 ? (
                    <Badge type="success">
                      <span className="font-bold">{priceList.itemsCount}</span>
                    </Badge>
                  ) : (
                    <span className="text-gray-500">מחירון</span>
                  )}
                </button>
              </TableCell>

              {/* היסטוריית הרכישות: אותה תבנית כמו המחירון — מצב וכפתור
                  באותו אלמנט, כדי לראות במבט אחד את מי עוד צריך להשלים */}
              <TableCell className="text-center">
                <button
                  type="button"
                  onClick={() => onOpenHistory?.(user)}
                  className="mx-auto flex items-center gap-1.5 rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 transition-colors duration-150 hover:text-mainColor-dark focus:outline-none dark:border-gray-600 dark:text-gray-300"
                  title="העלאת היסטוריית רכישות מאקסל"
                >
                  <FiClock />
                  {history?.itemsCount > 0 ? (
                    <Badge type="success">
                      <span className="font-bold">{history.itemsCount}</span>
                    </Badge>
                  ) : (
                    <span className="text-gray-500">היסטוריה</span>
                  )}
                </button>
              </TableCell>

              <TableCell className="text-center">
                <CashierToggleButton
                  id={user._id}
                  isCashier={user.isCashier || false}
                />
              </TableCell>

              <TableCell>
                <div className="flex justify-right text-right">
                  <div className="p-2 cursor-pointer text-gray-500 hover:text-customGreen-dark">
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
          );
        })}
      </TableBody>
    </>
  );
};

export default CustomerTable;
