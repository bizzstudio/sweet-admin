// src/components/offer/OfferTable.jsx
import { TableBody, TableCell, TableRow } from "@windmill/react-ui";
import React, { useContext } from "react";
import { FiInfo, FiShoppingCart, FiGift, FiTrendingUp, FiPercent } from "react-icons/fi";
import { useTranslation } from "react-i18next";

// Internal import
import useUtilsFunction from "@/hooks/useUtilsFunction";
import DeleteModal from "@/components/modal/DeleteModal";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import CheckBox from "@/components/form/others/CheckBox";
import EditDeleteButton from "@/components/table/EditDeleteButton";
import ActiveInActiveButtonGeneric from "@/components/table/ActiveInActiveButtonGeneric";
import OfferServices from "@/services/OfferServices";
import { SidebarContext } from "@/context/SidebarContext";
import notifyApiResponse from "@/utils/notifyApiResponse";

const OfferTable = ({ isCheck, setIsCheck, offers }) => {
  const { title, serviceId, handleModalOpen, handleUpdate } = useToggleDrawer();
  const { showingTranslateValue } = useUtilsFunction();
  const { t } = useTranslation();
  const { setIsUpdate } = useContext(SidebarContext);

  const getRewardProductsLabel = (offer) => {
    const products = offer.rewardProducts?.length
      ? offer.rewardProducts
      : offer.rewardProduct
        ? [offer.rewardProduct]
        : [];
    if (products.length === 0) return "";
    if (products.length === 1) return showingTranslateValue(products[0]?.title);
    return t("rewardProductsCount", { count: products.length });
  };

  const handleClick = (e) => {
    const { id, checked } = e.target;
    setIsCheck([...isCheck, id]);
    if (!checked) {
      setIsCheck(isCheck.filter((item) => item !== id));
    }
  };

  const handleChangeStatus = async (id, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      const res = await OfferServices.updateOffer(id, {
        isActive: newStatus,
      });
      setIsUpdate(true);
      notifyApiResponse(res, true);
    } catch (err) {
      notifyApiResponse(err, false);
    }
  };

  const getOfferTypeIcon = (type) => {
    switch (type) {
      case "BUNDLE_PRICE":
        return <FiShoppingCart size={14} />;
      case "THRESHOLD_GET_ITEM":
        return <FiTrendingUp size={14} />;
      case "THRESHOLD_DISCOUNT":
        return <FiPercent size={14} />;
      case "BUY_X_GET_Y":
        return <FiGift size={14} />;
      case "WELCOME_GIFT":
        return <FiGift size={14} />;
      default:
        return <FiShoppingCart size={14} />;
    }
  };

  const getOfferTypeBadge = (type) => {
    const badges = {
      "BUNDLE_PRICE": { color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100", text: t("bundlePriceOffer") },
      "THRESHOLD_GET_ITEM": { color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100", text: t("thresholdGetItemOffer") },
      "THRESHOLD_DISCOUNT": { color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100", text: t("thresholdDiscountOffer") },
      "BUY_X_GET_Y": { color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100", text: t("buyXGetYOffer") },
      "WELCOME_GIFT": { color: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-100", text: t("welcomeGiftOffer") },
    };
    const badge = badges[type] || badges["BUNDLE_PRICE"];
    return (
      <span className={`w-fit flex items-center justify-center gap-1 px-2 py-1 mx-auto rounded-full text-xs font-semibold ${badge.color}`}>
        {getOfferTypeIcon(type)}{badge.text}
      </span>
    );
  };

  const getOfferDetails = (offer) => {
    switch (offer.type) {
      case "BUNDLE_PRICE":
        return (
          <div className="text-sm" title={offer?.products?.map(p => p?.title?.he).join(", ")}>
            <div className="font-semibold">{offer.quantity} {t("items")}</div>
            <div className="text-green-600 font-bold">{offer.price} ₪</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              <FiInfo className="inline me-0.5 mb-0.5" /> {offer?.products?.length} {t("products")}
            </div>
          </div>
        );
      case "THRESHOLD_GET_ITEM":
        return (
          <div className="text-sm">
            <div>{t("spend")} <span className="font-semibold">{offer.thresholdAmount} ₪</span></div>
            <div className="text-green-600">{t("get")} {getRewardProductsLabel(offer)}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{t("for")} {offer.rewardPrice} ₪</div>
          </div>
        );
      case "THRESHOLD_DISCOUNT":
        return (
          <div className="text-sm">
            <div>{t("spend")} <span className="font-semibold">{offer.thresholdAmount} ₪</span></div>
            <div className="text-orange-600 font-bold">
              {offer.discountType === "percentage"
                ? `${t("getDiscount")} ${offer.discountValue}%`
                : `${t("getDiscount")} ${offer.discountValue} ₪`}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {offer.discountType === "percentage" ? t("percentageDiscount") : t("fixedDiscount")}
            </div>
          </div>
        );
      case "BUY_X_GET_Y":
        return (
          <div className="text-sm">
            <div>{t("buy")} <span className="font-semibold">{offer.triggerQuantity}</span> {showingTranslateValue(offer.triggerProduct?.title)}</div>
            <div className="text-green-600">{t("get")} {getRewardProductsLabel(offer)}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{t("for")} {offer.rewardPrice} ₪</div>
          </div>
        );
      case "WELCOME_GIFT":
        return (
          <div className="text-sm">
            <div className="text-pink-600 font-semibold">{t("welcomeGiftOffer")}</div>
            <div className="text-green-600">{getRewardProductsLabel(offer)}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              x{offer.rewardQuantity || 1} · 0 ₪
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      {isCheck.length < 1 && <DeleteModal id={serviceId} title={title} />}

      <TableBody>
        {offers?.map((offer) => (
          <TableRow key={offer._id}>
            <TableCell>
              <CheckBox
                type="checkbox"
                name="offer"
                id={offer._id}
                handleClick={handleClick}
                isChecked={isCheck?.includes(offer._id)}
              />
            </TableCell>

            <TableCell className="font-semibold uppercase text-xs text-center">
              {offer?._id?.substring(20, 24)}
            </TableCell>

            <TableCell className="font-medium text-sm text-center">
              <div>{showingTranslateValue(offer.name)}</div>
              <div className="mt-1">{getOfferTypeBadge(offer.type)}</div>
            </TableCell>

            <TableCell className="text-center">
              {getOfferDetails(offer)}
            </TableCell>

            <TableCell className="text-center">
              <div className="flex flex-col items-center gap-2">
                <ActiveInActiveButtonGeneric
                  id={offer._id}
                  status={offer.isActive}
                  handleChangeStatus={handleChangeStatus}
                />
                <div className="flex flex-col items-center gap-[3px]">
                  {offer.oncePerCustomer && (
                    <span className="text-xs text-gray-500">{t("oncePerCustomer")}</span>
                  )}
                  {offer.forNewCustomersOnly && (
                    <span className="text-xs text-gray-500">{t("forNewCustomersOnly")}</span>
                  )}
                  {offer.allowStackingWithOtherOffers === false && (
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                      {t("offerExclusiveNoStacking")}
                    </span>
                  )}
                </div>
              </div>
            </TableCell>

            <TableCell>
              <EditDeleteButton
                id={offer._id}
                isCheck={isCheck}
                setIsCheck={setIsCheck}
                handleUpdate={handleUpdate}
                handleModalOpen={handleModalOpen}
                title={showingTranslateValue(offer.name)}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </>
  );
};

export default OfferTable;
