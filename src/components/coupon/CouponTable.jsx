import {
  Avatar,
  Badge,
  TableBody,
  TableCell,
  TableRow,
} from "@windmill/react-ui";
import dayjs from "dayjs";
import { useEffect, useState } from "react";

// Internal import
import useUtilsFunction from "@/hooks/useUtilsFunction";
import CheckBox from "@/components/form/others/CheckBox";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import DeleteModal from "@/components/modal/DeleteModal";
import MainDrawer from "@/components/drawer/MainDrawer";
import CouponDrawer from "@/components/drawer/CouponDrawer";
import ShowHideButton from "@/components/table/ShowHideButton";
import EditDeleteButton from "@/components/table/EditDeleteButton";

const CouponTable = ({ isCheck, coupons, setIsCheck, onEditSignup }) => {
  const [updatedCoupons, setUpdatedCoupons] = useState([]);

  const { title, serviceId, handleModalOpen, handleUpdate } = useToggleDrawer();

  const { currency, showDateFormat, globalSetting, showingTranslateValue } =
    useUtilsFunction();

  const handleClick = (e) => {
    const { id, checked } = e.target;
    setIsCheck([...isCheck, id]);
    if (!checked) {
      setIsCheck(isCheck.filter((item) => item !== id));
    }
  };

  useEffect(() => {
    const result = coupons?.map((el) => {
      const newDate = new Date(el?.updatedAt).toLocaleString("en-US", {
        timeZone: globalSetting?.default_time_zone,
      });
      const newObj = {
        ...el,
        updatedDate: newDate,
      };
      return newObj;
    });
    setUpdatedCoupons(result);
  }, [coupons, globalSetting?.default_time_zone]);

  return (
    <>
      {isCheck.length < 1 && <DeleteModal id={serviceId} title={title} />}

      {isCheck.length < 2 && (
        <MainDrawer maxWidth='385px'>
          <CouponDrawer id={serviceId} />
        </MainDrawer>
      )}

      <TableBody>
        {updatedCoupons?.map((coupon, i) => (
          <TableRow key={i + 1}>
            <TableCell className='text-center'>
              <CheckBox
                type="checkbox"
                name={coupon?.title?.en}
                id={coupon._id}
                handleClick={handleClick}
                isChecked={isCheck?.includes(coupon._id)}
              />
            </TableCell>

            {/* <TableCell className='text-center'>
              <div className="flex items-center">
                {coupon?.logo ? (
                  <Avatar
                    className="hidden p-1 ml-2 md:block bg-gray-50 shadow-none"
                    src={coupon?.logo}
                    alt="product"
                  />
                ) : (
                  <Avatar
                    src={`https://res.cloudinary.com/ahossain/image/upload/v1655097002/placeholder_kvepfp.png`}
                    alt="product"
                  />
                )}
                <div>
                  <span className="text-sm mr-3">
                    {showingTranslateValue(coupon?.title)}
                  </span>{" "}
                </div>
              </div>{" "}
            </TableCell> */}

            <TableCell className='text-center text-sm'>
              {coupon.couponCode}
            </TableCell>

            {coupon?.freeProduct ? (
              <TableCell className='text-center'>
                <span className="text-sm font-semibold text-green-600">
                  🎁 {showingTranslateValue(coupon?.freeProduct?.title) || "מוצר חינם"}
                </span>
              </TableCell>
            ) : coupon?.discountType?.type ? (
              <TableCell className='text-center'>
                {" "}
                <span className="text-sm font-semibold">
                  {" "}
                  {coupon?.discountType?.type === "percentage"
                    ? `${coupon?.discountType?.value}%`
                    : `${currency}${coupon?.discountType?.value}`}
                </span>{" "}
              </TableCell>
            ) : (
              <TableCell className='text-center'>
                {" "}
                <span className="text-sm font-semibold"> </span>{" "}
              </TableCell>
            )}

            <TableCell className={`text-center text-sm ${coupon.timesIsUsed > 0 && coupon?.discountType?.type === "fixed" ? 'text-red-500' : ''}`}>
              {coupon.timesIsUsed}
            </TableCell>

            <TableCell className="text-center">
              <ShowHideButton id={coupon._id} status={coupon.status} />
            </TableCell>

            <TableCell className='text-center'>
              <span className="text-sm">
                {showDateFormat(coupon.createdAt)}
              </span>
            </TableCell>

            {/* <TableCell className='text-center'>
              <span className="text-sm">
                {showDateFormat(coupon.endTime)}
              </span>
            </TableCell> */}

            {/* <TableCell className="align-middle ">
              {dayjs().isAfter(dayjs(coupon.endTime)) ? (
                <Badge type="danger">Expired</Badge>
              ) : (
                <Badge type="success">Active</Badge>
              )}
            </TableCell> */}

            <TableCell className='text-center'>
              <EditDeleteButton
                id={coupon?._id}
                isCheck={isCheck}
                handleUpdate={
                  coupon?.freeProduct && onEditSignup
                    ? () => onEditSignup(coupon._id)
                    : handleUpdate
                }
                handleModalOpen={handleModalOpen}
                title={showingTranslateValue(coupon?.title)}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </>
  );
};

export default CouponTable;
