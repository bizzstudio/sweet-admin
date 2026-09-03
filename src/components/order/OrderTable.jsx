import { TableBody, TableCell, TableRow } from "@windmill/react-ui";

import { Link } from "react-router-dom";

// Internal import

import useUtilsFunction from "@/hooks/useUtilsFunction";
import PrintReceipt from "@/components/form/others/PrintReceipt";
import SelectStatus from "@/components/form/selectOption/SelectStatus";
import ReorderButton from "@/components/order/ReorderButton";

const OrderTable = ({ orders, isCashierOrders = false }) => {
  // console.log('globalSetting',globalSetting)
  const { showDateTimeFormat, currency, getNumberTwo } = useUtilsFunction();

  // קישור לחשבונית ההזמנה - החליף את אייקון העין
  const orderLink = (order) =>
    isCashierOrders ? `/cashier-order/${order._id}` : `/order/${order._id}`;

  // user_info אינו חובה במודל ההזמנה (הזמנות מיובאות), ולכן השם עלול להיות ריק.
  // בלי ברירת המחדל התא היה נשאר ריק וה-title היה מציג "undefined undefined"
  const customerName = (order) =>
    `${order?.user_info?.name || ""} ${order?.user_info?.lastName || ""}`.trim() ||
    "לא זמין";

  // תא הפעולות - מוצג בתחילת השורה בהזמנות רגילות ובסופה בהזמנות קופה.
  //
  // "הזמנה חוזרת" מוצגת בהזמנות רגילות בלבד: הזמנת קופה היא מסמך של מכירה
  // שכבר נגבתה בקופה (מודל ומסלול נפרדים), ואין לה מסלול יצירה חוזר.
  const actionCell = (order) => (
    <TableCell className="text-center">
      <div className="flex justify-center items-center">
        <PrintReceipt orderId={order._id} isCashierOrder={isCashierOrders} />
        {!isCashierOrders && <ReorderButton order={order} />}
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
              <Link
                to={orderLink(order)}
                className="font-semibold uppercase text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {order?.invoice ?? "—"}
              </Link>
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
                  title={customerName(order)}>
                  <span className="text-sm">{customerName(order)}</span>
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
