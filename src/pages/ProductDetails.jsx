// src/pages/ProductDetails.jsx
// עמוד פרטי המוצר. העריכה נעשית באותו עמוד: לחיצה על "עריכת מוצר" הופכת
// את השדות עצמם לשדות קלט במקומם, בלי מגירה ובלי חלון שנפתחים מעל העמוד.
// הטופס הוא אותו useProductSubmit שמשמש את מגירת הוספת המוצר, ולכן השמירה,
// הוולידציות ושדות ההנהח"ש מתנהגים בדיוק אותו דבר.
import ReactTagInput from "@pathofdev/react-tag-input";
import {
  Badge,
  Pagination,
  Select,
  Table,
  TableCell,
  TableContainer,
  TableFooter,
  TableHeader,
} from "@windmill/react-ui";
import React, { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiEdit } from "react-icons/fi";
import { useParams } from "react-router";
// Internal import

import useAsync from "@/hooks/useAsync";
import useFilter from "@/hooks/useFilter";
import useProductSubmit from "@/hooks/useProductSubmit";
import ProductServices from "@/services/ProductServices";
import useUtilsFunction from "@/hooks/useUtilsFunction";
import ProductErpPanel from "@/components/product/ProductErpPanel";
import ProductStorePanel from "@/components/product/ProductStorePanel";
import { parseTag } from "@/utils/productFormat";
import AttributeList from "@/components/attribute/AttributeList";
import ParentCategory from "@/components/category/ParentCategory";
import Uploader from "@/components/image-uploader/Uploader";
import {
  BoolControl,
  EditableField,
  EditActions,
  onlySaveButtonSubmits,
} from "@/components/common/EditableFields";
import Loading from "@/components/preloader/Loading";
import PageTitle from "@/components/Typography/PageTitle";
import { SidebarContext } from "@/context/SidebarContext";

const ProductDetails = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [variantTitle, setVariantTitle] = useState([]);
  const { lang } = useContext(SidebarContext);

  // אותו הוק של טופס המוצר, רק שהוא נפתח על ידי מצב העריכה של העמוד
  // ולא על ידי המגירה, ובסיום השמירה חוזרים למצב קריאה
  const {
    attribue,
    register,
    handleSubmit,
    onSubmit,
    errors,
    isSubmitting,
    isFormLoading,
    erpError,
    tag,
    setTag,
    imageUrl,
    setImageUrl,
    language,
    selectedCategory,
    setSelectedCategory,
    defaultCategory,
    setDefaultCategory,
    handleProductSlug,
    isCombination,
    isStockManagement,
    setIsStockManagement,
    isVatFree,
    setIsVatFree,
    isStoreProduct,
    setIsStoreProduct,
    isHiddenFromStore,
    setIsHiddenFromStore,
    isCartpprod,
    setIsCartpprod,
  } = useProductSubmit(id, {
    inline: true,
    isOpen: editing,
    onDone: () => setEditing(false),
  });

  // getProductDetails ולא getProductById: רק הוא מחזיר את erp (מוגדר
  // select:false במודל). מקור נתונים אחד לכל הדף - כך יש בקשה אחת במקום
  // שתיים, וגם הפאנלים מתרעננים אחרי שמירה (useAsync טוען מחדש
  // כש-isUpdate משתנה)
  const { data, loading, error } = useAsync(() =>
    ProductServices.getProductDetails(id)
  );

  // useAsync מאתחל ל-[] ומחזיר [] גם בשגיאה. בלי הבדיקה הזו השורה
  // data?.image[0] למטה קורסת על undefined
  const product = data && data._id ? data : null;

  const { currency, showingTranslateValue, getNumberTwo } = useUtilsFunction();

  const { handleChangePage, totalResults, resultsPerPage, dataTable } =
    useFilter(product?.variants);

  useEffect(() => {
    // בלי הבדיקה על variants, פריסה של undefined (מוצר שלא נטען או שגיאה)
    // זורקת TypeError ומפילה את כל הדף
    if (loading || !product?.variants) return;

    const res = Object.keys(Object.assign({}, ...product.variants));

    const varTitle = attribue?.filter((att) => res.includes(att._id));

    setVariantTitle(varTitle);
  }, [attribue, product?.variants, loading, lang]);

  // מצב הטופס שהפאנלים למטה צריכים כדי להציג מתגים ולנעול שדות
  const formState = {
    isCombination,
    isStockManagement,
    setIsStockManagement,
    isVatFree,
    setIsVatFree,
    isStoreProduct,
    setIsStoreProduct,
    isCartpprod,
    setIsCartpprod,
  };

  return (
    <>
      <PageTitle>{t("ProductDetails")}</PageTitle>
      {loading ? (
        <Loading loading={loading} />
      ) : !product ? (
        <div className="w-full rounded-md bg-white p-8 text-center dark:bg-gray-800">
          <h2 className="text-base font-medium text-gray-600 dark:text-gray-400">
            {error ? "טעינת המוצר נכשלה" : "המוצר לא נמצא"}
          </h2>
          {error ? <p className="mt-2 text-sm text-gray-400">{error}</p> : null}
        </div>
      ) : (
        <form
          autoComplete="off"
          onSubmit={onlySaveButtonSubmits(handleSubmit(onSubmit))}
        >
          <div className="inline-block h-full w-full overflow-y-auto align-middle transition-all transform">
            <div className="flex w-full flex-col overflow-hidden md:flex-row lg:flex-row">
              <div className="flex h-auto w-full flex-shrink-0 items-center justify-center md:w-80">
                {editing ? (
                  <Uploader
                    product
                    folder="tomer-products"
                    imageUrl={imageUrl}
                    setImageUrl={setImageUrl}
                  />
                ) : product?.image?.[0] ? (
                  <img src={product?.image?.[0]} alt="product" className="h-64 w-64" />
                ) : (
                  <img
                    src="https://res.cloudinary.com/ahossain/image/upload/v1655097002/placeholder_kvepfp.png"
                    alt="product"
                  />
                )}
              </div>

              <div className="flex w-full flex-col p-5 text-right md:p-8">
                {editing ? (
                  // בעריכה הכרטיס העליון מחזיק את השדות ה"תיאוריים" של המוצר.
                  // המחירים, המלאי והמזהים נערכים למטה בכרטיס "מאפייני מוצר
                  // בחנות", כדי שכל שדה יופיע בטופס פעם אחת בלבד
                  <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                    {isFormLoading ? (
                      <p className="sm:col-span-2 text-sm text-gray-400">
                        טוען את פרטי המוצר לעריכה...
                      </p>
                    ) : null}

                    <EditableField
                      editing
                      label={t("ProductTitleName")}
                      name="title"
                      required
                      register={register}
                      error={errors.title}
                      wide
                    />

                    <EditableField
                      editing
                      label={t("ProductDescription")}
                      name="description"
                      textarea
                      rows={4}
                      register={register}
                      wide
                    />

                    <EditableField
                      editing
                      label="הסרה מהחנות"
                      control={
                        <BoolControl
                          value={isHiddenFromStore}
                          onChange={setIsHiddenFromStore}
                        />
                      }
                      hint='"כן" = המוצר לא יוצג בחנות'
                    />

                    <EditableField
                      editing
                      label={t("DefaultCategory")}
                      control={
                        <Select
                          className="mt-1"
                          value={defaultCategory?.[0]?._id || ""}
                          onChange={(e) => {
                            const found = selectedCategory.find(
                              (cat) => cat._id === e.target.value
                            );
                            setDefaultCategory(found ? [found] : []);
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
                      }
                    />

                    <EditableField
                      editing
                      label={t("ProductTag")}
                      control={
                        <div className="mt-1">
                          <ReactTagInput
                            placeholder={t("ProductTagPlaseholder")}
                            tags={tag}
                            onChange={(newTags) => setTag(newTags)}
                          />
                        </div>
                      }
                      wide
                    />

                    <div className="sm:col-span-2">
                      <div className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                        {t("Category")}
                      </div>
                      <ParentCategory
                        lang={language}
                        selectedCategory={selectedCategory}
                        setSelectedCategory={setSelectedCategory}
                        setDefaultCategory={setDefaultCategory}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-5 block">
                      <div className="py-1 font-serif text-sm font-semibold">
                        <p className="text-sm text-gray-500">
                          {t("Status")}:{" "}
                          {product.status === "show" ? (
                            <span className="text-emerald-400">
                              {t("ThisProductShowing")}
                            </span>
                          ) : (
                            <span className="text-red-400">
                              {t("ThisProductHidden")}
                            </span>
                          )}
                        </p>
                      </div>
                      <h2 className="text-heading font-serif text-lg font-semibold dark:text-gray-400 md:text-xl lg:text-2xl">
                        {showingTranslateValue(product?.title)}
                      </h2>
                      <p className="font-serif text-sm font-medium uppercase text-gray-500 dark:text-gray-400">
                        {t("Sku")} :{" "}
                        <span className="font-bold text-gray-500 dark:text-gray-500">
                          {product?.sku}
                        </span>
                      </p>
                    </div>
                    <div className="product-price font-serif font-bold dark:text-gray-400">
                      <span className="inline-block text-2xl">
                        {currency}
                        {getNumberTwo(product?.prices?.price)}
                        {product?.prices?.discount >= 1 && (
                          <del className="pl-2 text-lg text-gray-400 dark:text-gray-500">
                            {currency}
                            {getNumberTwo(product?.prices?.originalPrice)}
                          </del>
                        )}
                      </span>
                    </div>
                    <div className="mb-3">
                      {product?.stock <= 0 ? (
                        <Badge type="danger">
                          <span className="font-bold">{t("StockOut")}</span>{" "}
                        </Badge>
                      ) : (
                        <Badge type="success">
                          {" "}
                          <span className="font-bold">{t("InStock")}</span>
                        </Badge>
                      )}
                      <span className="ps-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                        {t("Quantity")}: {product?.stock}
                      </span>
                    </div>
                    {product?.purchaseLimit && (
                      <div className="mb-3">
                        <Badge type="warning">
                          <span className="font-bold">{t("PurchaseLimit")}</span>
                        </Badge>
                        <span className="ps-2 text-sm font-medium text-gray-500 dark:text-gray-400">
                          {product?.purchaseLimit} {t("UnitsPerOrder")}
                        </span>
                      </div>
                    )}
                    <p className="text-sm leading-6 text-gray-500 dark:text-gray-400 md:leading-7">
                      {showingTranslateValue(product?.description)}
                    </p>
                    <div className="mt-4 flex flex-col">
                      <p className="py-1 font-serif text-sm font-semibold text-gray-500">
                        <span className="text-gray-700 dark:text-gray-400">
                          {t("Category")}:{" "}
                        </span>{" "}
                        {showingTranslateValue(product?.category?.name)}
                      </p>
                      <div className="flex flex-row">
                        {parseTag(product?.tag).map((tagValue, i) => (
                          <span
                            key={i + 1}
                            className="mt-2 ml-2 inline-flex items-center justify-center rounded-full border-0 bg-gray-200 px-2 py-1 font-serif text-xs font-semibold text-gray-500 dark:bg-gray-700 dark:text-gray-300"
                          >
                            {tagValue}
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div className="mt-6 flex flex-wrap gap-2">
                  {/* mainColor ולא customGreen: הצבע customGreen אינו מוגדר
                      ב-tailwind.config.js ולכן הכיתה לא מייצרת שום רקע,
                      והכפתור יצא טקסט לבן על רקע לבן */}
                  <EditActions
                    editing={editing}
                    onEdit={() => setEditing(true)}
                    onCancel={() => setEditing(false)}
                    isSubmitting={isSubmitting}
                    saveDisabled={isFormLoading}
                    editLabel={t("EditProduct")}
                    icon={<FiEdit />}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mb-8 rounded-lg bg-white p-6 text-right dark:bg-gray-800">
            <ProductStorePanel
              product={product}
              currency={currency}
              showingTranslateValue={showingTranslateValue}
              editing={editing}
              register={register}
              errors={errors}
              form={formState}
              onSlugChange={handleProductSlug}
            />
            <ProductErpPanel
              product={product}
              editing={editing}
              register={register}
              error={erpError}
            />
          </div>
        </form>
      )}

      {product?.isCombination && variantTitle?.length > 0 && !loading && (
        <>
          <PageTitle>{t("ProductVariantList")}</PageTitle>
          <TableContainer className="mb-8 rounded-b-lg">
            <Table>
              <TableHeader>
                <tr>
                  <TableCell>{t("SR")}</TableCell>
                  <TableCell>{t("Image")}</TableCell>
                  <TableCell>{t("Combination")}</TableCell>
                  <TableCell>{t("Sku")}</TableCell>
                  <TableCell>{t("Barcode")}</TableCell>
                  <TableCell>{t("OrginalPrice")}</TableCell>
                  <TableCell>{t("SalePrice")}</TableCell>
                  <TableCell>{t("Quantity")}</TableCell>
                </tr>
              </TableHeader>
              <AttributeList
                lang={lang}
                variants={dataTable}
                currency={currency}
                variantTitle={variantTitle}
              />
            </Table>
            <TableFooter>
              <Pagination
                className="pagination-ltr"
                totalResults={totalResults}
                resultsPerPage={resultsPerPage}
                onChange={handleChangePage}
                label="Product Page Navigation"
              />
            </TableFooter>
          </TableContainer>
        </>
      )}
    </>
  );
};

export default ProductDetails;
