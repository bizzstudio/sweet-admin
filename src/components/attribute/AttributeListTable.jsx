import { useTranslation } from "react-i18next";
import { Avatar, TableBody, TableCell, TableRow } from "@windmill/react-ui";
import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io";

// Internal import
import useUtilsFunction from "@/hooks/useUtilsFunction";
import CombinationInput from "@/components/form/input/CombinationInput";
import SkuBarcodeInput from "@/components/form/selectOption/SkuBarcodeInput";
import EditDeleteButtonTwo from "@/components/table/EditDeleteButtonTwo";
import { Fragment, useState } from "react";
import Tooltip from "../tooltip/Tooltip";
import SpecialOffersComb from "../offers/SpecialOffersComb";

const AttributeListTable = ({
  variants,
  setTapValue,
  variantTitle,
  deleteModalShow,
  isBulkUpdate,
  handleSkuBarcode,
  handleEditVariant,
  handleRemoveVariant,
  handleQuantityPrice,
  handleSelectInlineImage,
  specialOffersComb,
  setSpecialOffersComb
}) => {
  const { t } = useTranslation();
  const { showingTranslateValue } = useUtilsFunction();

  const [isOpen, setIsOpen] = useState(variants.map(v => false))

  return (
    <>
      <TableBody>
        {variants?.map((variant, i) => (
          <Fragment key={i + 1}>
            <TableRow>
              <TableCell>
                {variant.image ? (
                  <span className='flex justify-center items-center gap-2'>
                    <Avatar
                      className="cursor-pointer hidden p-1 ml-2 md:block bg-gray-50 shadow-none"
                      src={variant.image}
                      alt="product"
                      onClick={() => handleSelectInlineImage(i)}
                    />
                    {/* <p
                      className="text-xs cursor-pointer"
                      onClick={() => handleSelectInlineImage(i)}
                    >
                      {t("Change")}
                    </p> */}
                  </span>
                ) : (
                  <span className='flex justify-center items-center gap-2'>
                    <Avatar
                      src="https://res.cloudinary.com/ahossain/image/upload/v1655097002/placeholder_kvepfp.png"
                      alt="product"
                      className="cursor-pointer hidden p-1 ml-2 md:block bg-gray-50 shadow-none"
                      onClick={() => handleSelectInlineImage(i)}
                    />
                    {/* <p
                      className="text-xs cursor-pointer"
                      onClick={() => handleSelectInlineImage(i)}
                    >
                      {t("Change")}
                    </p> */}
                  </span>
                )}
              </TableCell>

              <TableCell className='text-center'>
                <div className="flex flex-col text-sm items-center justify-center">
                  {variantTitle?.length > 0 && (
                    <span>
                      {variantTitle
                        ?.map((att) => {
                          const attributeData = att?.variants?.filter(
                            (val) => val?.name !== "All"
                          );

                          const attributeName = attributeData?.find(
                            (v) => v._id === variant[att?._id]
                          )?.name;
                          if (attributeName === undefined) {
                            return attributeName?.en;
                          } else {
                            return showingTranslateValue(attributeName);
                          }
                        })
                        ?.filter(Boolean)
                        .join(" ")}
                    </span>
                  )}

                  {variant.productId && (
                    <span className="text-xs productId text-gray-500">
                      ({variant.productId})
                    </span>
                  )}
                </div>
              </TableCell>

              <TableCell className='text-center'>
                <SkuBarcodeInput
                  id={i}
                  name="sku"
                  placeholder="Sku"
                  value={variant.sku}
                  handleSkuBarcode={handleSkuBarcode}
                />
              </TableCell>

              <TableCell className='text-center'>
                <SkuBarcodeInput
                  id={i}
                  name="barcode"
                  placeholder="Barcode"
                  value={variant.barcode}
                  handleSkuBarcode={handleSkuBarcode}
                />
              </TableCell>

              <TableCell className="font-medium text-sm">
                <CombinationInput
                  id={i}
                  // readOnly
                  name="originalPrice"
                  placeholder="Original Price"
                  variant={variant}
                  isBulkUpdate={isBulkUpdate}
                  value={variant.originalPrice || ""}
                  handleQuantityPrice={handleQuantityPrice}
                />
              </TableCell>

              <TableCell className="font-medium text-sm">
                <CombinationInput
                  id={i}
                  name="price"
                  placeholder="Sale price"
                  variant={variant}
                  isBulkUpdate={isBulkUpdate}
                  value={variant.price || ""}
                  handleQuantityPrice={handleQuantityPrice}
                />
              </TableCell>

              <TableCell className="font-medium text-sm">
                <CombinationInput
                  id={i}
                  name="quantity"
                  placeholder="Quantity"
                  variant={variant}
                  isBulkUpdate={isBulkUpdate}
                  handleQuantityPrice={handleQuantityPrice}
                  value={variant.quantity || 0}
                />
              </TableCell>

              <TableCell>
                <EditDeleteButtonTwo
                  attribute
                  variant={variant}
                  setTapValue={setTapValue}
                  deleteModalShow={deleteModalShow}
                  handleEditVariant={handleEditVariant}
                  handleRemoveVariant={handleRemoveVariant}
                />
              </TableCell>

              {/* מבצעים מיוחדים */}
              <TableCell className='flex items-center justify-center'>
                <button
                  type="button"
                  onClick={() => setIsOpen(prev => prev.map((v, index) => index === i ? !v : v))}
                  className="h-12 cursor-pointer text-gray-400 hover:text-green-600 focus:outline-none"
                >
                  {isOpen[i] ?
                    <Tooltip
                      id="close"
                      Icon={IoIosArrowUp}
                      title={t("closeOffers")}
                      bgColor="#10B981"
                    /> :
                    <Tooltip
                      id="open"
                      Icon={IoIosArrowDown}
                      title={t("openOffers")}
                      bgColor="#EF4444"
                    />
                  }
                </button>
              </TableCell>
            </TableRow>
            <tr>
              <TableCell colSpan={9}>
                {isOpen[i] && <SpecialOffersComb productId={variant.productId} setOffers={setSpecialOffersComb} offers={specialOffersComb} />}
              </TableCell>
            </tr>
          </Fragment>
        ))}
      </TableBody>
    </>
  );
};

export default AttributeListTable;
