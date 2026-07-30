// src/components/product/ProductTable.jsx
import {
  Avatar,
  Badge,
  TableBody,
  TableCell,
  TableRow,
  Input
} from "@windmill/react-ui";
import { t } from "i18next";
import { FiZoomIn } from "react-icons/fi";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

// Internal import
import CheckBox from "@/components/form/others/CheckBox";
import DeleteModal from "@/components/modal/DeleteModal";
import EditDeleteButton from "@/components/table/EditDeleteButton";
import ShowHideButton from "@/components/table/ShowHideButton";
import Tooltip from "@/components/tooltip/Tooltip";
import useUtilsFunction from "@/hooks/useUtilsFunction";
import useAsync from "@/hooks/useAsync";
import ProductServices from "@/services/ProductServices";
import spinnerLoadingImage from "@/assets/img/spinner.gif";
import { notifySuccess } from "@/utils/toast";
import OfferServices from "@/services/OfferServices";

const ProductTable = ({
  products: initialProducts,
  isCheck,
  setIsCheck,
  title, serviceId, handleModalOpen, handleUpdate 
}) => {
  const { currency, showingTranslateValue, getNumberTwo } = useUtilsFunction();
  const { data: offers, loading, error } = useAsync(() => OfferServices.getAllOffers());
  const [products, setProducts] = useState(initialProducts);
  const [priceInputs, setPriceInputs] = useState(
    initialProducts.reduce((acc, product) => {
      acc[product._id] = getNumberTwo(product.prices.originalPrice);
      return acc;
    }, {})
  );

  // רענון הרשימה כל פעם שמגיעים מוצרים חדשים בפרופס
  useEffect(() => {
    setProducts(initialProducts);
    setPriceInputs(
      initialProducts.reduce((acc, product) => {
        acc[product._id] = getNumberTwo(product.prices.originalPrice);
        return acc;
      }, {})
    );
  }, [initialProducts]);

  // שינוי מחיר מוצר
  const handlePriceChange = (e, productId) => {
    const value = e.target.value;
    setPriceInputs((prev) => ({ ...prev, [productId]: value }));
  };

  // אישור שינוי מחיר
  const [isUpdatingPrice, setIsUpdatingPrice] = useState({ state: false, id: null });
  const handleSubmit = async (e, productId) => {
    e.preventDefault();
    const price = e.target[0].value;

    // Start updating price
    setIsUpdatingPrice({ state: true, id: productId });

    try {
      await ProductServices.updateProductPrice(productId, { price });

      // Update the product in the state with the new price
      setProducts((prevProducts) =>
        prevProducts.map((product) =>
          product._id === productId ? { ...product, prices: { ...product.prices, originalPrice: price } } : product
        )
      );
      notifySuccess(t("Price updated successfully"))
    } catch (error) {
      console.error("Error updating price:", error);
    }

    // Finish updating price
    setIsUpdatingPrice({ state: false, id: null });
  };

  // צ'קבוקס מוצר
  const handleClick = (e) => {
    const { id, checked } = e.target;
    // console.log("id", id, checked);

    setIsCheck([...isCheck, id]);
    if (!checked) {
      setIsCheck(isCheck.filter((item) => item !== id));
    }
  };

  return (
    <>
      {isCheck?.length < 1 && <DeleteModal id={serviceId} title={title} />}

      <TableBody>
        {products?.map((product, i) => (
          <TableRow key={i + 1}>
            {/* {console.log('product: ', product)} */}
            {/* checkbox */}
            <TableCell className='text-center'>
              <CheckBox
                type="checkbox"
                name={product?.title?.en}
                id={product._id}
                handleClick={handleClick}
                isChecked={isCheck?.includes(product._id)}
              />
            </TableCell>

            {/* status */}
            <TableCell className="text-center">
              <ShowHideButton id={product._id} status={product.status} />
              {/* {product.status} */}
            </TableCell>

            {/* image */}
            <TableCell className='text-center'>
              <div className="flex items-center">
                {product?.image[0] ? (
                  <Avatar
                    className="hidden p-1 ml-2 md:block bg-gray-50 shadow-none"
                    src={product?.image[0]}
                    alt="product"
                  />
                ) : (
                  <Avatar
                    src={`https://res.cloudinary.com/ahossain/image/upload/v1655097002/placeholder_kvepfp.png`}
                    alt="product"
                  />
                )}
                <div>
                  <h2
                    className={`text-sm font-medium ${product?.title.length > 30 ? "wrap-long-title" : ""
                      }`}
                  >
                    {showingTranslateValue(product?.title)?.substring(0, 28)}
                  </h2>
                </div>
              </div>
            </TableCell>

            {/* price */}
            <TableCell className='text-center'>
              <span className="text-sm font-semibold flex items-center justify-center">
                {currency}
                {product?.isCombination
                  ? getNumberTwo(product?.variants[0]?.originalPrice) :
                  isUpdatingPrice.state && isUpdatingPrice.id === product._id ? (
                    <img src={spinnerLoadingImage} alt="Loading..." className="h-6 w-6" />
                  ) : (
                    <form onSubmit={(e) => handleSubmit(e, product._id)}>
                      <Input
                        className='!w-20 h-fit mr-1 text-center'
                        type="number"
                        step="any"
                        value={priceInputs[product._id]}
                        onChange={(e) => handlePriceChange(e, product._id)}
                      />
                    </form>
                  )
                }
              </span>
            </TableCell>

            {/* offer */}
            <TableCell className='text-center'>
              <span className="text-sm">
                {offers.find((offer) => offer.products.some(prod => prod._id == product._id))?.name?.he || "-"}
              </span>
            </TableCell>

            {/* category */}
            <TableCell className='text-center'>
              <span className="text-sm">
                {showingTranslateValue(product?.category?.name)}
              </span>
            </TableCell>

            {/* serial order */}
            <TableCell className='text-center'>
              <span className="text-sm">
                {product?.barcode || "-"}
              </span>
            </TableCell>

            {/* stock - כמות שנשארה במלאי */}
            <TableCell className='text-center'>
              {product?.stock >= 1000000 ? (
                <span className="text-sm text-gray-400">מלאי בלתי מוגבל</span>
              ) : (
                <span className={`text-sm font-semibold ${product?.stock > 0 ? "" : "text-red-500"}`}>
                  {product?.stock ?? 0}
                </span>
              )}
            </TableCell>

            {/* <TableCell className='text-center'>
              <span className="text-sm font-semibold">
                {currency}
                {product?.isCombination
                  ? getNumberTwo(product?.variants[0]?.price)
                  : getNumberTwo(product?.prices?.price)}
              </span>
            </TableCell>

            <TableCell className='text-center'>
              <span className="text-sm">{product.stock}</span>
            </TableCell>
            <TableCell className='text-center'>
              {product.stock > 0 ? (
                <Badge type="success">{t("Selling")}</Badge>
              ) : (
                <Badge type="danger">{t("SoldOut")}</Badge>
              )}
            </TableCell> */}

            {/* zoom in */}
            <TableCell className='text-center'>
              <Link
                to={`/product/${product._id}`}
                className="flex justify-center text-gray-400 hover:text-customGreen-dark"
              >
                <Tooltip
                  id="view"
                  Icon={FiZoomIn}
                  title={t("DetailsTbl")}
                  bgColor="#10B981"
                />
              </Link>
            </TableCell>

            {/* edit & delete */}
            <TableCell className='text-center'>
              <EditDeleteButton
                id={product._id}
                product={product}
                isCheck={isCheck}
                handleUpdate={handleUpdate}
                handleModalOpen={handleModalOpen}
                title={showingTranslateValue(product?.title)}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </>
  );
};

export default ProductTable;
