// src/components/drawer/ProductDrawer.jsx
import ReactTagInput from "@pathofdev/react-tag-input";
import {
  Button,
  Input,
  TableCell,
  TableContainer,
  TableHeader,
  Textarea,
  Table,
  Card,
  CardBody,
  Select,
} from "@windmill/react-ui";
import React from "react";
import { MultiSelect } from "react-multi-select-component";
import { Modal } from "react-responsive-modal";
import "react-responsive-modal/styles.css";
// ⛔ תכונות כבויות - להחזרה: import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiX } from "react-icons/fi";

// Internal import
import Title from "@/components/form/others/Title";
import Error from "@/components/form/others/Error";
import InputArea from "@/components/form/input/InputArea";
import useUtilsFunction from "@/hooks/useUtilsFunction";
import LabelArea from "@/components/form/selectOption/LabelArea";
import DrawerButton from "@/components/form/button/DrawerButton";
import InputValue from "@/components/form/input/InputValue";
import useProductSubmit from "@/hooks/useProductSubmit";
import ProductErpFields from "@/components/product/ProductErpFields";
import ActiveButton from "@/components/form/button/ActiveButton";
import InputValueFive from "@/components/form/input/InputValueFive";
import Uploader from "@/components/image-uploader/Uploader";
import ParentCategory from "@/components/category/ParentCategory";
import UploaderThree from "@/components/image-uploader/UploaderThree";
import AttributeOptionTwo from "@/components/attribute/AttributeOptionTwo";
import AttributeListTable from "@/components/attribute/AttributeListTable";
import SwitchToggleForCombination from "@/components/form/switch/SwitchToggleForCombination";
import SwitchToggle from "../form/switch/SwitchToggle";

const ProductDrawer = ({ id }) => {
  const { t } = useTranslation();

  const {
    tag,
    setTag,
    values,
    language,
    register,
    onSubmit,
    errors,
    slug,
    openModal,
    attribue,
    setValues,
    variants,
    imageUrl,
    setImageUrl,
    handleSubmit,
    isCombination,
    variantTitle,
    attributes,
    attTitle,
    handleAddAtt,
    // productId,
    onCloseModal,
    isBulkUpdate,
    globalSetting,
    isSubmitting,
    erpError,
    tapValue,
    setTapValue,
    resetRefTwo,
    handleSkuBarcode,
    handleProductTap,
    selectedCategory,
    setSelectedCategory,
    setDefaultCategory,
    defaultCategory,
    handleProductSlug,
    handleProductSlugIfEmpty,
    handleSelectLanguage,
    handleIsCombination,
    handleEditVariant,
    handleRemoveVariant,
    handleClearVariant,
    handleQuantityPrice,
    handleSelectImage,
    handleSelectInlineImage,
    handleGenerateCombination,
    specialOffers,
    setSpecialOffers,
    specialOffersComb,
    setSpecialOffersComb,
    isVatFree,
    setIsVatFree,
    isStoreProduct,
    setIsStoreProduct,
    isHiddenFromStore,
    setIsHiddenFromStore,
    isCartpprod,
    setIsCartpprod,
    isStockManagement,
    setIsStockManagement,
  } = useProductSubmit(id);


  const { currency, showingTranslateValue } = useUtilsFunction();

  return (
    <>
      <Modal
        open={openModal}
        onClose={onCloseModal}
        center
        closeIcon={
          <div className="absolute top-0 right-0 text-red-500  active:outline-none text-xl border-0">
            <FiX className="text-3xl" />
          </div>
        }
      >
        <div className="cursor-pointer">
          <UploaderThree
            imageUrl={imageUrl}
            setImageUrl={setImageUrl}
            handleSelectImage={handleSelectImage}
            folder='product'
          />
        </div>
      </Modal>

      <div className="w-full relative p-6 border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
        {id ? (
          <Title
            register={register}
            handleSelectLanguage={handleSelectLanguage}
            title={t("UpdateProduct")}
            description={t("UpdateProductDescription")}
          />
        ) : (
          <Title
            register={register}
            handleSelectLanguage={handleSelectLanguage}
            title={t("DrawerAddProduct")}
            description={t("AddProductDescription")}
          />
        )}
      </div>

      <div className="text-sm font-medium text-center text-gray-500 border-b border-gray-200 dark:text-gray-400 dark:border-gray-600 dark:bg-gray-700">
        <SwitchToggleForCombination
          product
          handleProcess={handleIsCombination}
          processOption={isCombination}
        />

        <ul className="flex flex-wrap -mb-px">
          <li className="me-2">
            <ActiveButton
              tapValue={tapValue}
              activeValue="Basic Info"
              handleProductTap={handleProductTap}
            />
          </li>

          {isCombination && (
            <li className="me-2">
              <ActiveButton
                tapValue={tapValue}
                activeValue="Combination"
                handleProductTap={handleProductTap}
              />
            </li>
          )}
        </ul>
      </div>

      <Card className="overflow-y-auto flex-grow w-full max-h-full px-3 py-1">
        <CardBody>
          <form onSubmit={handleSubmit(onSubmit)} id="block">
            {tapValue === "Basic Info" && (
              <div className="flex-grow scrollbar-hide w-full max-h-full pb-28 grid grid-cols-12 gap-5">
                {/* <div className="flex flex-col gap-1 md:col-span-6 col-span-12">
                <LabelArea label={t("ProductID")} />
                <div className="col-span-6">{productId}</div>
              </div> */}

                {/* שם המוצר */}
                <div className="flex flex-col gap-1 md:col-span-6 col-span-12">
                  <LabelArea label={t("ProductTitleName")} />
                  <div className="col-span-6">
                    <Input
                      {...register(`title`, {
                        required: "Title is required!",
                      })}
                      name="title"
                      type="text"
                      placeholder={t("ProductTitleName")}
                      onBlur={(e) => handleProductSlugIfEmpty(e.target.value)}
                    />
                    <Error errorName={errors.title} />
                  </div>
                </div>

                {/* מזהה מוצר */}
                <div className="flex flex-col gap-1 md:col-span-6 col-span-12">
                  <LabelArea label={t("ProductSKU")} />
                  <div className="col-span-6">
                    <InputArea
                      register={register}
                      required={false}
                      label={t("ProductSKU")}
                      name="sku"
                      type="text"
                      placeholder={t("ProductSKU")}
                    />
                    <Error errorName={errors.sku} />
                  </div>
                </div>

                {/* תיאור המוצר */}
                <div className="flex flex-col gap-1 md:col-span-6 col-span-12">
                  <LabelArea label={t("ProductDescription")} />
                  <div className="col-span-6">
                    <Textarea
                      className="border text-sm  block w-full bg-gray-100 border-gray-200"
                      {...register("description", {
                        required: false,
                      })}
                      name="description"
                      placeholder={t("ProductDescription")}
                      rows="4"
                      spellCheck="false"
                    />
                    <Error errorName={errors.description} />
                  </div>
                </div>

                {/* תמונה של המוצר */}
                <div className="flex flex-col gap-1 md:col-span-6 col-span-12">
                  <LabelArea label={t("ProductImage")} />
                  <div className="col-span-6">
                    <Uploader
                      product
                      folder="tomer-products"
                      imageUrl={imageUrl}
                      setImageUrl={setImageUrl}
                    />
                  </div>
                </div>

                {/* מספר סידורי - מוסתר זמנית (השדה נשאר רשום כדי לא לאפס את הערך בשמירה) */}
                <div className="hidden flex-col gap-1 md:col-span-6 col-span-12">
                  <LabelArea label={t("ProductSerialOrder")} />
                  <div className="col-span-6">
                    <InputArea
                      register={register}
                      required="false"
                      label={t("ProductSerialOrder")}
                      name="barcode"
                      type="number"
                      placeholder={t("ProductSerialOrder")}
                    />
                    <Error errorName={errors.barcode} />
                  </div>
                </div>

                {/* קטגוריית אב */}
                <div className="flex flex-col gap-1 md:col-span-6 col-span-12">
                  <LabelArea label={t("Category")} />
                  <div className="col-span-6">
                    <ParentCategory
                      lang={language}
                      selectedCategory={selectedCategory}
                      setSelectedCategory={setSelectedCategory}
                      setDefaultCategory={setDefaultCategory}
                    />
                  </div>
                </div>

                {/* קטגוריית מוצר */}
                <div className="flex flex-col gap-1 md:col-span-6 col-span-12">
                  <LabelArea label={t("DefaultCategory")} />
                  <div className="col-span-6">
                    <Select
                      value={defaultCategory?.[0]?._id || ""}
                      onChange={(e) => {
                        const selectedValue = e.target.value;
                        const foundCategory = selectedCategory.find(cat => cat._id === selectedValue);
                        if (foundCategory) {
                          setDefaultCategory([foundCategory]);
                        } else {
                          setDefaultCategory([]);
                        }
                      }}
                    >
                      <option value="" disabled>
                        {t("DefaultCategory")}
                      </option>
                      {selectedCategory?.map((category) => (
                        <option key={category._id} value={category._id}>
                          {category.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                {/* משקל המוצר (ק"ג) */}
                <div className="flex flex-col gap-1 md:col-span-6 col-span-12">
                  <LabelArea label={`${t("ProductWeight")} (ק\"ג)`} />
                  <div className="col-span-6">
                    <Input
                      {...register("weight", { required: false })}
                      name="weight"
                      type="text"
                      placeholder={`${t("ProductWeight")} (ק\"ג)`}
                    />
                  </div>
                </div>

                {/* מחיר מוצר באתר */}
                <div className="flex flex-col gap-1 md:col-span-6 col-span-12">
                  <LabelArea label={t("Product Site Price")} />
                  <div className="col-span-6">
                    <InputValue
                      disabled={isCombination}
                      register={register}
                      maxValue={2000}
                      minValue={1}
                      label={t("Product Site Price")}
                      name="originalPrice"
                      type="number"
                      placeholder="OriginalPrice"
                      defaultValue={0.0}
                      required="false"
                      product
                      currency={currency}
                    />
                    <Error errorName={errors.originalPrice} />
                  </div>
                </div>

                {/* מחיר מוצר בחנות */}
                <div className="flex flex-col gap-1 md:col-span-6 col-span-12">
                  <LabelArea label={t("Product Store Price")} />
                  <div className="col-span-6">
                    <InputValue
                      disabled={isCombination}
                      register={register}
                      maxValue={2000}
                      minValue={1}
                      label={t("Product Store Price")}
                      name="storePrice"
                      type="number"
                      placeholder={t("Product Store Price")}
                      defaultValue={0.0}
                      required="false"
                      product
                      currency={currency}
                    />
                    <Error errorName={errors.storePrice} />
                  </div>
                </div>

                <div className="flex flex-col gap-1 md:col-span-6 col-span-12">
                  <LabelArea label={t("SalePrice")} />
                  <div className="col-span-6">
                    <InputValue
                      disabled={isCombination}
                      product
                      register={register}
                      minValue={0}
                      defaultValue={0.0}
                      required="false"
                      label="Sale price"
                      name="price"
                      type="number"
                      placeholder="Sale price"
                      currency={currency}
                    />
                    <Error errorName={errors.price} />
                  </div>
                </div>

                {/* כמות מוצר במלאי */}
                <div className="flex gap-3 md:col-span-6 col-span-12 relative">
                  <div className="flex flex-col gap-1 w-full">
                    <LabelArea label={t("ProductQuantity")} />
                    <InputValueFive
                      disabled={isCombination || !isStockManagement}
                      register={register}
                      minValue={0}
                      defaultValue={0}
                      label="Quantity"
                      name="stock"
                      type="number"
                      placeholder={isStockManagement ? t("ProductQuantity") : "מלאי בלתי מוגבל"}
                    />
                    <Error errorName={errors.stock} />
                  </div>
                  <div className="w-fit flex flex-col gap-1 items-center">
                    <LabelArea label={t("Stock Management")} />
                    <SwitchToggle
                      id="isStockManagement"
                      handleProcess={(checked) => setIsStockManagement(checked)}
                      processOption={isStockManagement}
                    />
                  </div>
                </div>

                {/* הגבלת רכישה */}
                <div className="flex flex-col gap-1 md:col-span-6 col-span-12">
                  <LabelArea label={t("PurchaseLimit")} />
                  <div className="col-span-6">
                    <InputArea
                      register={register}
                      required="false"
                      label={t("PurchaseLimit")}
                      name="purchaseLimit"
                      type="number"
                      placeholder={t("PurchaseLimit")}
                    />
                    <Error errorName={errors.purchaseLimit} />
                  </div>
                </div>

                {/* קוד קישור מוצר */}
                <div className="flex flex-col gap-1 md:col-span-6 col-span-12" title={t("whatIsSlug")}>
                  <LabelArea label={t("ProductSlug")} />
                  <div className="col-span-6">
                    <Input
                      {...register(`slug`, {
                        required: "slug is required!",
                      })}
                      className=" me-2 p-2"
                      name="slug"
                      type="text"
                      defaultValue={slug}
                      placeholder={t("ProductSlug")}
                      onChange={(e) => handleProductSlug(e.target.value)}
                    />
                    <Error errorName={errors.slug} />
                  </div>
                </div>

                {/* שורת מתגים — רוחב מלא בשורה נפרדת */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-start col-span-12 mt-2">
                  {/* חייב במע"מ */}
                  <div className="flex flex-col gap-1">
                    <LabelArea label={t("isVatFree")} />
                    <div className="col-span-6">
                      <SwitchToggle
                        id="isVatFree"
                        handleProcess={(checked) => setIsVatFree(checked)} // עדכון הסטייט
                        processOption={isVatFree} // הערך הנוכחי של השדה
                      />
                      <Error errorName={errors.isVatFree} />
                    </div>
                  </div>

                  {/* מוצר חנות */}
                  <div className="flex flex-col gap-1" title={t("isStoreProductDesc")}>
                    <LabelArea label={t("isStoreProduct")} />
                    <div className="col-span-6">
                      <SwitchToggle
                        id="isStoreProduct"
                        handleProcess={(checked) => setIsStoreProduct(checked)} // עדכון הסטייט
                        processOption={isStoreProduct} // הערך הנוכחי של השדה
                      />
                      <Error errorName={errors.isStoreProduct} />
                    </div>
                  </div>

                  {/* הסרה מהחנות — דלוק = המוצר לא יוצג בחנות (status: hide) */}
                  <div className="flex flex-col gap-1" title="אם דלוק, המוצר לא יוצג בחנות (אפשר עדיין לתת אותו כמתנה במבצע)">
                    <LabelArea label="הסרה מהחנות" />
                    <div className="col-span-6">
                      <SwitchToggle
                        id="isHiddenFromStore"
                        handleProcess={(checked) => setIsHiddenFromStore(checked)}
                        processOption={isHiddenFromStore}
                      />
                    </div>
                  </div>

                  {/* מוצר עגלה */}
                  <div className="flex flex-col gap-1">
                    <LabelArea label={t("isCartProduct")} />
                    <div className="col-span-6">
                      <SwitchToggle
                        id="isCartpprod"
                        handleProcess={(checked) => setIsCartpprod(checked)}
                        processOption={isCartpprod}
                      />
                    </div>
                  </div>
                </div>

                {/* אופציה להוספת מבצעים מיוחדים רק למוצרים בלי אפשרויות בחירה */}
                {/* {!isCombination &&
                <div className="flex flex-col gap-1 md:col-span-6 col-span-12">
                  <LabelArea label={t("specialOffers")} />
                  <div className="col-span-6">
                    <SpecialOffers offers={specialOffers} currency={currency} setOffers={setSpecialOffers} />
                    <Error errorName={errors.slug} />
                  </div>
                </div>
              } */}

                {/* תגיות מוצר */}
                <div className="flex flex-col gap-1 md:col-span-6 col-span-12">
                  <LabelArea label={t("ProductTag")} />
                  <div className="col-span-6">
                    <ReactTagInput
                      placeholder={t("ProductTagPlaseholder")}
                      tags={tag}
                      onChange={(newTags) => setTag(newTags)}
                    />
                  </div>
                </div>

                {/* מק"טים, ספק ועלות. מוצגים רק בעריכת מוצר קיים: למוצר
                    חדש עוד אין נתונים מקבילים בקובץ ההנהח"ש */}
                {id && <ProductErpFields register={register} error={erpError} />}
              </div>
            )}

            {tapValue === "Combination" &&
              isCombination &&
              (attribue.length < 1 ? (
                <div
                  className="bg-teal-100 border border-teal-600 rounded-md text-teal-900 px-4 py-3 m-4"
                  role="alert"
                >
                  <div className="flex">
                    <div className="py-1">
                      <svg
                        className="fill-current h-6 w-6 text-teal-500 mr-4"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                      >
                        <path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zm12.73-1.41A8 8 0 1 0 4.34 4.34a8 8 0 0 0 11.32 11.32zM9 11V9h2v6H9v-4zm0-6h2v2H9V5z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm">
                        {t("AddCombinationsDiscription")}{" "}
                        {/* ⛔ תכונות כבויות - הקישור הוחלף בטקסט כדי לא להוביל ל-404.
                            להחזרה: <Link to="/attributes" className="font-bold"> ... </Link> */}
                        <span className="font-bold">
                          {t("AttributesFeatures")}
                        </span>
                        {t("AddCombinationsDiscriptionTwo")}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6">
                  {/* <h4 className="mb-4 font-semibold text-lg">Variants</h4> */}
                  <div className="grid md:grid-cols-4 sm:grid-cols-2 grid-cols-1 gap-3 md:gap-3 xl:gap-3 lg:gap-2 mb-3">
                    <MultiSelect
                      options={attTitle}
                      value={attributes}
                      onChange={(v) => handleAddAtt(v)}
                      labelledBy="Select"
                    />

                    {attributes?.map((attribute, i) => (
                      <div key={attribute._id}>
                        <div className="flex w-full h-10 justify-between font-sans rounded-tl rounded-tr bg-gray-200 px-4 py-3 text-right text-sm font-normal text-gray-700 hover:bg-gray-200">
                          {"Select"}
                          {showingTranslateValue(attribute?.title)}
                        </div>

                        <AttributeOptionTwo
                          id={i + 1}
                          values={values}
                          lang={language}
                          attributes={attribute}
                          setValues={setValues}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end mb-6">
                    {attributes?.length > 0 && (
                      <Button
                        onClick={handleGenerateCombination}
                        type="button"
                        className="mx-2"
                      >
                        <span className="text-xs">{t("GenerateVariants")}</span>
                      </Button>
                    )}

                    {variantTitle.length > 0 && (
                      <Button onClick={handleClearVariant} className="mx-2">
                        <span className="text-xs">{t("ClearVariants")}</span>
                      </Button>
                    )}
                  </div>
                </div>
              ))}

            {isCombination ? (
              <DrawerButton
                id={id}
                save
                title={t("Product")}
                isSubmitting={isSubmitting}
                handleProductTap={handleProductTap}
              />
            ) : (
              <DrawerButton id={id} title={t("Product")} isSubmitting={isSubmitting} />
            )}

            {tapValue === "Combination" && (
              <DrawerButton id={id} title={t("Product")} isSubmitting={isSubmitting} />
            )}
          </form>
        </CardBody>

        {tapValue === "Combination" &&
          isCombination &&
          variantTitle.length > 0 && (
            <div className="px-6 overflow-x-auto">
              {/* {variants?.length >= 0 && ( */}
              {isCombination && (
                <TableContainer className="md:mb-32 mb-40 rounded-b-lg">
                  <Table>
                    <TableHeader>
                      <tr>
                        <TableCell className='text-center'>{t("Image")}</TableCell>
                        <TableCell className='text-center'>{t("Combination")}</TableCell>
                        <TableCell className='text-center'>{t("Sku")}</TableCell>
                        <TableCell className='text-center'>{t("Barcode")}</TableCell>
                        <TableCell className='text-center'>{t("Price")}</TableCell>
                        <TableCell className='text-center'>{t("SalePrice")}</TableCell>
                        <TableCell className='text-center'>{t("QuantityTbl")}</TableCell>
                        <TableCell className="text-center">{t("Actions")}</TableCell>
                        <TableCell className="text-center">{t("specialOffers")}</TableCell>
                      </tr>
                    </TableHeader>

                    <AttributeListTable
                      lang={language}
                      variants={variants}
                      setTapValue={setTapValue}
                      variantTitle={variantTitle}
                      isBulkUpdate={isBulkUpdate}
                      handleSkuBarcode={handleSkuBarcode}
                      handleEditVariant={handleEditVariant}
                      handleRemoveVariant={handleRemoveVariant}
                      handleQuantityPrice={handleQuantityPrice}
                      handleSelectInlineImage={handleSelectInlineImage}
                      specialOffersComb={specialOffersComb}
                      setSpecialOffersComb={setSpecialOffersComb}
                    />
                  </Table>
                </TableContainer>
              )}
            </div>
          )}
      </Card>
      <CardBody>
      </CardBody>
    </>
  );
};

export default React.memo(ProductDrawer);
