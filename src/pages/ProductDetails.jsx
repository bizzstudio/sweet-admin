import {
  Badge,
  Pagination,
  Table,
  TableCell,
  TableContainer,
  TableFooter,
  TableHeader,
} from "@windmill/react-ui";
import React, { useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
// Internal import

import useAsync from "@/hooks/useAsync";
import useFilter from "@/hooks/useFilter";
import useProductSubmit from "@/hooks/useProductSubmit";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import ProductServices from "@/services/ProductServices";
import useUtilsFunction from "@/hooks/useUtilsFunction";
import ProductErpPanel from "@/components/product/ProductErpPanel";
import ProductStorePanel from "@/components/product/ProductStorePanel";
import { parseTag } from "@/utils/productFormat";
import AttributeList from "@/components/attribute/AttributeList";
import MainDrawer from "@/components/drawer/MainDrawer";
import ProductDrawer from "@/components/drawer/ProductDrawer";
import Loading from "@/components/preloader/Loading";
import PageTitle from "@/components/Typography/PageTitle";
import { SidebarContext } from "@/context/SidebarContext";

const ProductDetails = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const { handleUpdate } = useToggleDrawer();
  const { attribue } = useProductSubmit(id);
  const [variantTitle, setVariantTitle] = useState([]);
  const { lang } = useContext(SidebarContext);

  // getProductDetails ולא getProductById: רק הוא מחזיר את erp (מוגדר
  // select:false במודל). מקור נתונים אחד לכל הדף - כך יש בקשה אחת במקום
  // שתיים, וגם הפאנלים מתרעננים אחרי שמירה במגירת העריכה (useAsync טוען
  // מחדש כש-isUpdate משתנה)
  const { data, loading, error } = useAsync(() =>
    ProductServices.getProductDetails(id)
  );

  // useAsync מאתחל ל-[] ומחזיר [] גם בשגיאה. בלי הבדיקה הזו השורה
  // data?.image[0] למטה קורסת על undefined
  const product = data && data._id ? data : null;

  const { currency, showingTranslateValue, getNumberTwo } = useUtilsFunction();

  const { handleChangePage, totalResults, resultsPerPage, dataTable } =
    useFilter(product?.variants);
  // console.log('data',data)

  useEffect(() => {
    // בלי הבדיקה על variants, פריסה של undefined (מוצר שלא נטען או שגיאה)
    // זורקת TypeError ומפילה את כל הדף
    if (loading || !product?.variants) return;

    const res = Object.keys(Object.assign({}, ...product.variants));

    const varTitle = attribue?.filter((att) =>
      // res.includes(att.title.replace(/[^a-zA-Z0-9]/g, ''))
      res.includes(att._id)
    );

    setVariantTitle(varTitle);
  }, [attribue, product?.variants, loading, lang]);

  // console.log("product", data);

  return (
    <>
      <MainDrawer product>
        <ProductDrawer id={id} />
      </MainDrawer>

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
        <div className="inline-block overflow-y-auto h-full align-middle transition-all transform">
          <div className="flex flex-col lg:flex-row md:flex-row w-full overflow-hidden">
            <div className="flex-shrink-0 flex items-center justify-center h-auto">
              {product?.image?.[0] ? (
                <img src={product?.image?.[0]} alt="product" className="h-64 w-64" />
              ) : (
                <img
                  src="https://res.cloudinary.com/ahossain/image/upload/v1655097002/placeholder_kvepfp.png"
                  alt="product"
                />
              )}
            </div>
            <div className="w-full flex flex-col p-5 md:p-8 text-right">
              <div className="mb-5 block ">
                <div className="font-serif font-semibold py-1 text-sm">
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
                <h2 className="text-heading text-lg md:text-xl lg:text-2xl font-semibold font-serif dark:text-gray-400">
                  {showingTranslateValue(product?.title)}
                </h2>
                <p className="uppercase font-serif font-medium text-gray-500 dark:text-gray-400 text-sm">
                  {t("Sku")} :{" "}
                  <span className="font-bold text-gray-500 dark:text-gray-500">
                    {/* {product?._id !== undefined && product?._id.substring(18, 24)} */}
                    {product?.sku}
                  </span>
                </p>
              </div>
              <div className="font-serif product-price font-bold dark:text-gray-400">
                <span className="inline-block text-2xl">
                  {currency}
                  {getNumberTwo(product?.prices?.price)}
                  {product?.prices?.discount >= 1 && (
                    <del className="text-gray-400 dark:text-gray-500 text-lg pl-2">
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
                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium ps-2">
                  {t("Quantity")}: {product?.stock}
                </span>
              </div>
              {product?.purchaseLimit && (
                <div className="mb-3">
                  <Badge type="warning">
                    <span className="font-bold">{t("PurchaseLimit")}</span>
                  </Badge>
                  <span className="text-sm text-gray-500 dark:text-gray-400 font-medium ps-2">
                    {product?.purchaseLimit} {t("UnitsPerOrder")}
                  </span>
                </div>
              )}
              <p className="text-sm leading-6 text-gray-500 dark:text-gray-400 md:leading-7">
                {showingTranslateValue(product?.description)}
              </p>
              <div className="flex flex-col mt-4">
                <p className="font-serif font-semibold py-1 text-gray-500 text-sm">
                  <span className="text-gray-700 dark:text-gray-400">
                    {t("Category")}:{" "}
                  </span>{" "}
                  {showingTranslateValue(product?.category?.name)}
                </p>
                <div className="flex flex-row">
                  {parseTag(product?.tag).map((t, i) => (
                    <span
                      key={i + 1}
                      className="bg-gray-200 ml-2 border-0 text-gray-500 rounded-full inline-flex items-center justify-center px-2 py-1 text-xs font-semibold font-serif mt-2 dark:bg-gray-700 dark:text-gray-300"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-6">
                <button
                  onClick={() => handleUpdate(id)}
                  className="cursor-pointer leading-5 transition-colors duration-150 font-medium text-sm focus:outline-none px-5 py-2 rounded-md text-white bg-customGreen border border-transparent active:bg-customGreen-dark hover:bg-customGreen-dark "
                >
                  {t("EditProduct")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {!loading && product && (
        <div className="mb-8 rounded-lg bg-white p-6 text-right dark:bg-gray-800">
          <ProductStorePanel
            product={product}
            currency={currency}
            showingTranslateValue={showingTranslateValue}
          />
          <ProductErpPanel product={product} />
        </div>
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
