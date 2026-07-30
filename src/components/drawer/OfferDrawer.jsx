// src/components/drawer/OfferDrawer.jsx
import React from "react";
import { useTranslation } from "react-i18next";
import { Label, Select, Textarea } from "@windmill/react-ui";

// Internal import
import Error from "@/components/form/others/Error";
import Title from "@/components/form/others/Title";
import LabelArea from "@/components/form/selectOption/LabelArea";
import InputArea from "@/components/form/input/InputArea";
import DrawerButton from "@/components/form/button/DrawerButton";
import useOfferSubmit from "@/hooks/useOfferSubmit";
import ProductsInOffer from "../offers/ProductsInOffer";
import SingleProductSelector from "../offers/SingleProductSelector";
import Uploader from "@/components/image-uploader/Uploader";

const OfferDrawer = ({ id }) => {
  const {
    handleSubmit,
    onSubmit,
    register,
    errors,
    isSubmitting,
    handleSelectLanguage,
    products,
    setProducts,
    rewardProducts,
    setRewardProducts,
    triggerProduct,
    setTriggerProduct,
    imageUrl,
    setImageUrl,
    offerType,
    watch,
  } = useOfferSubmit(id);

  const { t } = useTranslation();

  return (
    <>
      <div className="w-full relative p-6 border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
        {id ? (
          <Title
            register={register}
            handleSelectLanguage={handleSelectLanguage}
            title={t("UpdateOffer")}
            description={t("UpdateOfferDesc")}
          />
        ) : (
          <Title
            register={register}
            handleSelectLanguage={handleSelectLanguage}
            title={t("AddOffer")}
            description={t("AddOfferDesc")}
          />
        )}
      </div>

      <div className="w-full relative dark:bg-gray-700 dark:text-gray-200">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="px-6 pt-8 flex-grow scrollbar-hide w-full max-h-full pb-32">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {/* Offer Type Selector */}
              <div>
                <LabelArea label={t("offerType")} />
                <Select {...register("type")}>
                  <option value="BUNDLE_PRICE">{t("bundlePriceOffer")}</option>
                  <option value="THRESHOLD_GET_ITEM">{t("thresholdGetItemOffer")}</option>
                  <option value="THRESHOLD_DISCOUNT">{t("thresholdDiscountOffer")}</option>
                  <option value="BUY_X_GET_Y">{t("buyXGetYOffer")}</option>
                </Select>
                <Error errorName={errors.type} />
              </div>

              {/* Offer Title */}
              <div>
                <LabelArea label={t("offerTitle")} />
                <InputArea
                  label={t("offerTitle")}
                  register={register}
                  name="name"
                  type="text"
                  placeholder={t("offerTitle")}
                />
                <Error errorName={errors.name} />
              </div>

              {/* Description - Full Width */}
              <div className="sm:col-span-2">
                <LabelArea label={t("description")} />
                <Textarea
                  {...register("description")}
                  rows="3"
                  placeholder={t("offerDescription")}
                />
                <Error errorName={errors.description} />
              </div>

              {/* Image - Full Width */}
              <div className="sm:col-span-2">
                <LabelArea label={t("image")} />
                <Uploader
                  imageUrl={imageUrl}
                  setImageUrl={setImageUrl}
                  folder="offers"
                />
              </div>
            </div>

            {/* Divider */}
            <div className="my-6 border-t border-gray-200 dark:border-gray-600" />

            {/* Settings and Validity Period */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {/* Settings - Always 3 in a row */}
              <div className="sm:col-span-2">
                <LabelArea label={t("settings")} />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      {...register("isActive")}
                      className="form-checkbox h-5 w-5 text-green-500"
                    />
                    <span className="mr-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t("offerIsActive")}
                    </span>
                  </label>
                  {offerType !== "WELCOME_GIFT" && (
                    <>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      {...register("oncePerCustomer")}
                      className="form-checkbox h-5 w-5 text-green-500"
                    />
                    <span className="mr-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t("oncePerCustomer")}
                    </span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      {...register("forNewCustomersOnly")}
                      className="form-checkbox h-5 w-5 text-green-500"
                    />
                    <span className="mr-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t("forNewCustomersOnly")}
                    </span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      {...register("allowStackingWithOtherOffers")}
                      className="form-checkbox h-5 w-5 text-green-500"
                    />
                    <span className="mr-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t("allowStackingWithOtherOffers")}
                    </span>
                  </label>
                    </>
                  )}
                </div>
                {offerType !== "WELCOME_GIFT" && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {t("allowStackingWithOtherOffersHint")}
                </p>
                )}
                {offerType === "WELCOME_GIFT" && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {t("welcomeGiftOfferHint")}
                </p>
                )}
              </div>

              {/* Date Range */}
              <div className="sm:col-span-2">
                <LabelArea label={t("validityPeriod")} />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="mb-1">
                      <span className="text-xs">{t("startDateTime")}</span>
                    </Label>
                    <InputArea
                      register={register}
                      name="startsAt"
                      type="datetime-local"
                    />
                  </div>
                  <div>
                    <Label className="mb-1">
                      <span className="text-xs">{t("endDateTime")}</span>
                    </Label>
                    <InputArea
                      register={register}
                      name="endsAt"
                      type="datetime-local"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="my-6 border-t border-gray-200 dark:border-gray-600"></div>

            {/* Type-specific fields */}
            {offerType === "BUNDLE_PRICE" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2 mb-2">
                  <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      {t("bundlePriceDescription")}
                    </p>
                  </div>
                </div>

                <div>
                  <LabelArea label={t("quantity")} />
                  <InputArea
                    label={t("quantity")}
                    register={register}
                    name="quantity"
                    type="number"
                    placeholder={t("quantityPlaceholder")}
                  />
                  <Error errorName={errors.quantity} />
                </div>

                <div>
                  <LabelArea label={t("bundlePrice")} />
                  <InputArea
                    label={t("price")}
                    register={register}
                    name="price"
                    type="number"
                    step="0.01"
                    placeholder={t("pricePlaceholder")}
                  />
                  <Error errorName={errors.price} />
                </div>

                <div className="sm:col-span-2">
                  <LabelArea label={t("productsInOffer")} />
                  <ProductsInOffer
                    products={products}
                    setProducts={setProducts}
                    currency="₪"
                  />
                </div>
              </div>
            )}

            {offerType === "THRESHOLD_GET_ITEM" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2 mb-2">
                  <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg">
                    <p className="text-sm text-green-800 dark:text-green-200">
                      {t("thresholdGetItemDescription")}
                    </p>
                  </div>
                </div>

                <div>
                  <LabelArea label={t("thresholdAmount")} />
                  <InputArea
                    label={t("thresholdAmount")}
                    register={register}
                    name="thresholdAmount"
                    type="number"
                    step="0.01"
                    placeholder={t("thresholdAmountPlaceholder")}
                  />
                  <Error errorName={errors.thresholdAmount} />
                </div>

                <div className="sm:col-span-2">
                  <LabelArea label={t("rewardProducts")} />
                  <ProductsInOffer
                    products={rewardProducts}
                    setProducts={setRewardProducts}
                    currency="₪"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {t("rewardProductsHint")}
                  </p>
                  <Error errorName={errors.rewardProduct} />
                </div>

                <div>
                  <LabelArea label={t("rewardPrice")} />
                  <InputArea
                    label={t("rewardPrice")}
                    register={register}
                    name="rewardPrice"
                    type="number"
                    step="0.01"
                    placeholder={t("rewardPricePlaceholder")}
                  />
                  <Error errorName={errors.rewardPrice} />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {t("rewardPriceHint")}
                  </p>
                </div>

                <div>
                  <LabelArea label={t("rewardQuantity")} />
                  <InputArea
                    label={t("rewardQuantity")}
                    register={register}
                    name="rewardQuantity"
                    type="number"
                    placeholder={t("rewardQuantityPlaceholder")}
                  />
                  <Error errorName={errors.rewardQuantity} />
                </div>
              </div>
            )}

            {offerType === "THRESHOLD_DISCOUNT" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2 mb-2">
                  <div className="bg-orange-50 dark:bg-orange-900 p-4 rounded-lg">
                    <p className="text-sm text-orange-800 dark:text-orange-200">
                      {t("thresholdDiscountDescription")}
                    </p>
                  </div>
                </div>

                <div>
                  <LabelArea label={t("thresholdAmount")} />
                  <InputArea
                    label={t("thresholdAmount")}
                    register={register}
                    name="thresholdAmount"
                    type="number"
                    step="0.01"
                    placeholder={t("thresholdAmountPlaceholder")}
                  />
                  <Error errorName={errors.thresholdAmount} />
                </div>

                <div>
                  <LabelArea label={t("discountType")} />
                  <Select {...register("discountType")}>
                    <option value="percentage">{t("discountTypePercentage")}</option>
                    <option value="fixed">{t("discountTypeFixed")}</option>
                  </Select>
                  <Error errorName={errors.discountType} />
                </div>

                <div>
                  <LabelArea label={t("discountValue")} />
                  <InputArea
                    label={t("discountValue")}
                    register={register}
                    name="discountValue"
                    type="number"
                    step="0.01"
                    placeholder={t("discountValuePlaceholder")}
                  />
                  <Error errorName={errors.discountValue} />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {watch("discountType") === "percentage"
                      ? t("discountValuePercentageHint")
                      : t("discountValueFixedHint")}
                  </p>
                </div>
              </div>
            )}

            {offerType === "BUY_X_GET_Y" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2 mb-2">
                  <div className="bg-purple-50 dark:bg-purple-900 p-4 rounded-lg">
                    <p className="text-sm text-purple-800 dark:text-purple-200">
                      {t("buyXGetYDescription")}
                    </p>
                  </div>
                </div>

                <div>
                  <LabelArea label={t("triggerProduct")} />
                  <SingleProductSelector
                    selectedProduct={triggerProduct}
                    setSelectedProduct={setTriggerProduct}
                    placeholder={t("selectTriggerProduct")}
                    currency="₪"
                  />
                </div>

                <div>
                  <LabelArea label={t("triggerQuantity")} />
                  <InputArea
                    label={t("triggerQuantity")}
                    register={register}
                    name="triggerQuantity"
                    type="number"
                    placeholder={t("triggerQuantityPlaceholder")}
                  />
                  <Error errorName={errors.triggerQuantity} />
                </div>

                <div className="sm:col-span-2">
                  <LabelArea label={t("rewardProducts")} />
                  <ProductsInOffer
                    products={rewardProducts}
                    setProducts={setRewardProducts}
                    currency="₪"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {t("rewardProductsHint")}
                  </p>
                  <Error errorName={errors.rewardProduct} />
                </div>

                <div>
                  <LabelArea label={t("rewardPrice")} />
                  <InputArea
                    label={t("rewardPrice")}
                    register={register}
                    name="rewardPrice"
                    type="number"
                    step="0.01"
                    placeholder={t("rewardPricePlaceholder")}
                  />
                  <Error errorName={errors.rewardPrice} />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {t("rewardPriceHint")}
                  </p>
                </div>

                <div>
                  <LabelArea label={t("rewardQuantity")} />
                  <InputArea
                    label={t("rewardQuantity")}
                    register={register}
                    name="rewardQuantity"
                    type="number"
                    placeholder={t("rewardQuantityPlaceholder")}
                  />
                  <Error errorName={errors.rewardQuantity} />
                </div>
              </div>
            )}

            {offerType === "WELCOME_GIFT" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2 mb-2">
                  <div className="bg-pink-50 dark:bg-pink-900 p-4 rounded-lg">
                    <p className="text-sm text-pink-800 dark:text-pink-200">
                      {t("welcomeGiftOfferDescription")}
                    </p>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <LabelArea label={t("rewardProducts")} />
                  <ProductsInOffer
                    products={rewardProducts}
                    setProducts={setRewardProducts}
                    currency="₪"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {t("rewardProductsHint")}
                  </p>
                  <Error errorName={errors.rewardProduct} />
                </div>

                <div>
                  <LabelArea label={t("rewardQuantity")} />
                  <InputArea
                    label={t("rewardQuantity")}
                    register={register}
                    name="rewardQuantity"
                    type="number"
                    placeholder={t("rewardQuantityPlaceholder")}
                  />
                  <Error errorName={errors.rewardQuantity} />
                </div>
              </div>
            )}
          </div>

          <DrawerButton id={id} title={t("offer")} isSubmitting={isSubmitting} />
        </form>
      </div>
    </>
  );
};

export default OfferDrawer;