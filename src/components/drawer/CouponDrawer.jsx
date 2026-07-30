import { Input, Button } from "@windmill/react-ui";
import { t } from "i18next";
import { Scrollbars } from "react-custom-scrollbars-2";
import voucherCodes from 'voucher-code-generator';

// Internal import
import Title from "@/components/form/others/Title";
import Error from "@/components/form/others/Error";
import InputArea from "@/components/form/input/InputArea";
import InputValue from "@/components/form/input/InputValue";
import LabelArea from "@/components/form/selectOption/LabelArea";
import Uploader from "@/components/image-uploader/Uploader";
import useCouponSubmit from "@/hooks/useCouponSubmit";
import DrawerButton from "@/components/form/button/DrawerButton";
import SwitchToggle from "@/components/form/switch/SwitchToggle";
import SwitchToggleFour from "@/components/form/switch/SwitchToggleFour";

const CouponDrawer = ({ id }) => {
  const {
    register,
    handleSubmit,
    onSubmit,
    errors,
    setImageUrl,
    imageUrl,
    published,
    setPublished,
    currency,
    discountType,
    setDiscountType,
    isSubmitting,
    handleSelectLanguage,
    setValue,
  } = useCouponSubmit(id);

  // פונקציה ליצירת קוד קופון
  const generateCouponCode = () => {
    const code = voucherCodes.generate({
      length: 8,
      count: 1,
      charset: voucherCodes.charset("alphanumeric")
    })[0];
    setValue("couponCode", "MK" + code); // עדכון השדה עם הקוד החדש
  };

  return (
    <>
      <div className="w-full relative p-6 border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 ">
        {id ? (
          <Title
            register={register}
            handleSelectLanguage={handleSelectLanguage}
            title={t("UpdateCoupon")}
            description={t("UpdateCouponDescription")}
          />
        ) : (
          <Title
            register={register}
            handleSelectLanguage={handleSelectLanguage}
            title={t("AddCoupon")}
            description={t("AddCouponDescription")}
          />
        )}
      </div>

      <Scrollbars className="w-full md:w-7/12 lg:w-8/12 xl:w-8/12 relative dark:bg-gray-700 dark:text-gray-200">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="px-6 pt-8 flex-grow scrollbar-hide w-full max-h-full pb-40">
            {/* <div className="grid grid-cols-6 gap-1 mb-6">
              <LabelArea label={t("CouponBannerImage")} />
              <div className="col-span-6">
                <Uploader
                  imageUrl={imageUrl}
                  setImageUrl={setImageUrl}
                  folder="coupon"
                />
              </div>
            </div> */}

            {/* <div className="grid grid-cols-6 gap-1 mb-6">
              <LabelArea label={t("CampaignName")} />
              <div className="col-span-6">
                <InputArea
                  register={register}
                  label="Coupon title"
                  name="title"
                  type="text"
                  placeholder={t("CampaignName")}
                />
                <Error errorName={errors.title} />
              </div>
            </div> */}

            <div className="grid grid-cols-6 gap-1 mb-6">
              <LabelArea label={t("CampaignCode")} />
              <div className="col-span-6 flex gap-3">
                <div className="w-full relative">
                  <InputArea
                    register={register}
                    label="Coupon Code"
                    name="couponCode"
                    type="text"
                    placeholder={t("CampaignCode")}
                  />
                  <Error errorName={errors.couponCode} />
                </div>
                <Button onClick={generateCouponCode} className="whitespace-nowrap" >
                  {t("Generate")}
                </Button>
              </div>
            </div>

            {/* תוקף הקופון - כרגע מוגדר על 2100 */}
            {/* <div className="grid grid-cols-6 gap-1 mb-6">
              <LabelArea label={t("CouponValidityTime")} />
              <div className="col-span-6">
                <Input
                  {...register(`endTime`, {
                    required: "Coupon Validation End Time",
                  })}
                  label="Coupon Validation End Time"
                  name="endTime"
                  type="datetime-local"
                  placeholder={t("CouponValidityTime")}
                />

                <Error errorName={errors.endTime} />
              </div>
            </div> */}

            <div className="grid grid-cols-6 gap-1 mb-3.5">
              <LabelArea label={t("DiscountType")} />
              <div className="col-span-6">
                <SwitchToggleFour
                  handleProcess={setDiscountType}
                  processOption={discountType}
                />
                <Error errorName={errors.discountType} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-1 mb-6">
              <LabelArea label={t("Discount")} />
              <div className="col-span-6">
                <InputValue
                  product
                  register={register}
                  maxValue={discountType ? 99 : 1000}
                  minValue={1}
                  label="Discount"
                  name="discountPercentage"
                  type="number"
                  placeholder={discountType ? t("Percentage") : t("Fixed Amount")}
                  currency={discountType ? "%" : currency}
                />

                <Error errorName={errors.discountPercentage} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-1 mb-6">
              <LabelArea label={t("minimumAmount")} />
              <div className="col-span-6">
                <InputArea
                  register={register}
                  name="minimumAmount"
                  type="number"
                  placeholder={t("minimumAmount")}
                />
                <Error errorName={errors.minimumAmount} />
              </div>
            </div>

            {/* <div className="grid grid-cols-6 gap-1 mb-6">
              <LabelArea label={t("Published")} />
              <div className="col-span-6">
                <SwitchToggle
                  handleProcess={setPublished}
                  processOption={published}
                />
                <Error errorName={errors.productType} />
              </div>
            </div> */}

            <div className="grid grid-cols-6 gap-1 mb-6">
              <LabelArea label={t("oncePerCustomer")} />
              <div className="col-span-6">
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
              </div>
            </div>

            {id && <div className="grid grid-cols-6 gap-1 mb-6">
              <LabelArea label={t("Coupon Usage Count")} oneLine />
              <div className="col-span-6">
                <Input
                  {...register(`usageCount`, {})}
                  disabled={true}
                />
              </div>
            </div>}
          </div>

          <DrawerButton id={id} title={t("Coupon")} isSubmitting={isSubmitting} />
        </form>
      </Scrollbars>
    </>
  );
};

export default CouponDrawer;
