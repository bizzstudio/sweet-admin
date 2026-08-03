import { TableBody, TableCell, TableRow } from "@windmill/react-ui";

import { useTranslation } from "react-i18next";
import { FiZoomIn } from "react-icons/fi";
import { Link } from "react-router-dom";

// Internal import

import Tooltip from "@/components/tooltip/Tooltip";
import useUtilsFunction from "@/hooks/useUtilsFunction";
import PrintReceipt from "@/components/form/others/PrintReceipt";
import SelectStatus from "@/components/form/selectOption/SelectStatus";

const OrderTable = ({ orders, isCashierOrders = false }) => {
  // console.log('globalSetting',globalSetting)
  const { t } = useTranslation();
  const { showDateTimeFormat, currency, getNumberTwo } = useUtilsFunction();

  // תא הפעולות - מוצג בתחילת השורה בהזמנות רגילות ובסופה בהזמנות קופה
  const actionCell = (order) => (
    <TableCell className="text-center">
      <div className="flex justify-center items-center">
        <PrintReceipt orderId={order._id} isCashierOrder={isCashierOrders} />

        <span className="p-2 cursor-pointer text-gray-400 hover:text-customGreen-dark">
          <Link to={isCashierOrders ? `/cashier-order/${order._id}` : `/order/${order._id}`}>
            <Tooltip
              id="view"
              Icon={FiZoomIn}
              title={t("ViewInvoice")}
              bgColor="#059669"
            />
          </Link>
        </span>
      </div>
    </TableCell>
  );

  return (
    <>
      <TableBody className="dark:bg-gray-900">
        {orders?.map((order, i) => (
          <TableRow key={i + 1} className={isCashierOrders ? '' : order?.status?.name}>
            {!isCashierOrders && actionCell(order)}

            <TableCell className="text-center">
              <span className="font-semibold uppercase text-xs">
                {order?.invoice}
              </span>
            </TableCell>

            <TableCell className="text-center">
              <span className="text-sm">
                {showDateTimeFormat(order?.createdAt)}
              </span>
            </TableCell>

            <TableCell className="text-center">
              <span className="text-sm">
                {showDateTimeFormat(order?.updatedAt)}
              </span>
            </TableCell>

            {isCashierOrders ? (
              <>
                {/* קופאי */}
                <TableCell className="text-center max-w-[10vw] overflow-hidden truncate"
                  title={order?.cashier?.name || 'לא זמין'}>
                  <span className="text-sm">{order?.cashier?.name || 'לא זמין'}</span>
                </TableCell>

                {/* שם לקוח */}
                <TableCell className="text-center max-w-[10vw] overflow-hidden truncate"
                  title={order?.user_info?.name || 'לא זמין'}>
                  <span className="text-sm">{order?.user_info?.name || 'לא זמין'}</span>
                </TableCell>

                {/* טלפון לקוח */}
                <TableCell className="text-center">
                  <span className="text-sm">{order?.user_info?.phone || 'לא זמין'}</span>
                </TableCell>

                {/* כמות מוצרים */}
                <TableCell className="text-center">
                  <span className="text-sm">{order?.cart?.length || 'לא זמין'}</span>
                </TableCell>

                {/* הנחה */}
                <TableCell className="text-center">
                  <span className="text-sm font-semibold">
                    {currency}
                    {getNumberTwo(order?.discount || 0)}
                  </span>
                </TableCell>

                {/* סכום סופי */}
                <TableCell className="text-center">
                  <span className="text-sm font-semibold">
                    {currency}
                    {getNumberTwo(order?.total)}
                  </span>
                </TableCell>

                {/* קופון */}
                <TableCell className="text-center">
                  <span className="text-sm">
                    {order?.coupon?.couponCode || '-'}
                  </span>
                </TableCell>
              </>
            ) : (
              <>
                <TableCell className="text-xs text-center max-w-[8vw] overflow-hidden truncate"
                  title={`${order?.user_info?.name} ${order?.user_info?.lastName}`}>
                  <span className="text-sm">{order?.user_info?.name} {order?.user_info?.lastName}</span>{" "}
                </TableCell>

                <TableCell className="text-center">
                  <span className="text-sm font-semibold">
                    {currency}
                    {getNumberTwo(order?.total)}
                  </span>
                </TableCell>

                <TableCell className="text-center">
                  <SelectStatus id={order._id} order={order} />
                </TableCell>
              </>
            )}

            {isCashierOrders && actionCell(order)}
          </TableRow>
        ))}
      </TableBody>
    </>
  );
};

export default OrderTable;
