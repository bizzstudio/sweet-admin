import { Button } from "@windmill/react-ui";
import { Scrollbars } from "react-custom-scrollbars-2";
import voucherCodes from "voucher-code-generator";

// Internal import
import Error from "@/components/form/others/Error";
import InputArea from "@/components/form/input/InputArea";
import LabelArea from "@/components/form/selectOption/LabelArea";
import SwitchToggle from "@/components/form/switch/SwitchToggle";
import SingleProductSelector from "@/components/offers/SingleProductSelector";
import useSignupCouponSubmit from "@/hooks/useSignupCouponSubmit";
import spinnerLoadingImage from "@/assets/img/spinner.gif";

// דרואר עצמאי לקופון הרשמה (מוצר חינם) — אינו תלוי בדרואר המשותף של הקופון הרגיל.
const SignupCouponDrawer = ({ id, open, onClose }) => {
  const {
    register,
    handleSubmit,
    onSubmit,
    errors,
    published,
    setPublished,
    freeProduct,
    setFreeProduct,
    isSubmitting,
    setValue,
  } = useSignupCouponSubmit(id, open, onClose);

  const generateCouponCode = () => {
    const code = voucherCodes.generate({
      length: 8,
      count: 1,
      charset: voucherCodes.charset("alphanumeric"),
    })[0];
    setValue("couponCode", "REG" + code);
  };

  return (
    <>
      <div className="w-full relative p-6 border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
        <h4 className="text-xl font-semibold dark:text-gray-300">
          {id ? "עריכת קופון הרשמה" : "הוספת קופון הרשמה"}
        </h4>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          קופון שנותן מוצר חינם, פעם אחת לכל לקוח. הלקוח מזין את הקוד בקופה והמוצר מתווסף לעגלה בחינם.
        </p>
      </div>

      <Scrollbars className="w-full relative dark:bg-gray-700 dark:text-gray-200">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="px-6 pt-8 flex-grow scrollbar-hide w-full max-h-full pb-40">
            {/* קוד הקופון */}
            <div className="grid grid-cols-6 gap-1 mb-6">
              <LabelArea label="קוד הקופון" />
              <div className="col-span-6 flex gap-3">
                <div className="w-full relative">
                  <InputArea
                    register={register}
                    label="קוד הקופון"
                    name="couponCode"
                    type="text"
                    placeholder="קוד הקופון"
                  />
                  <Error errorName={errors.couponCode} />
                </div>
                <Button
                  type="button"
                  onClick={generateCouponCode}
                  className="whitespace-nowrap"
                >
                  צור קוד
                </Button>
              </div>
            </div>

            {/* מוצר חינם */}
            <div className="grid grid-cols-6 gap-1 mb-6">
              <LabelArea label="מוצר חינם" />
              <div className="col-span-6">
                <SingleProductSelector
                  selectedProduct={freeProduct}
                  setSelectedProduct={setFreeProduct}
                  placeholder="בחר מוצר שיינתן בחינם"
                  currency="₪"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  המוצר שייבחר יתווסף לעגלת הלקוח במחיר ₪0 בעת הזנת הקוד.
                </p>
                <Error errorName={errors.freeProduct} />
              </div>
            </div>

            {/* פעיל */}
            <div className="grid grid-cols-6 gap-1 mb-6">
              <LabelArea label="פעיל" />
              <div className="col-span-6">
                <SwitchToggle
                  handleProcess={setPublished}
                  processOption={published}
                />
              </div>
            </div>
          </div>

          {/* כפתורי פעולה — עצמאיים (לא תלויים בדרואר המשותף) */}
          <div className="fixed z-10 bottom-0 w-full right-0 py-4 lg:py-8 px-6 grid gap-4 lg:gap-6 xl:gap-6 md:flex xl:flex bg-gray-50 border-t border-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
            <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
              <button
                type="button"
                onClick={onClose}
                className="h-12 w-full border border-red-200 rounded-lg bg-white text-red-600 font-medium inline-flex items-center justify-center leading-5 transition-colors duration-150 focus:outline-none hover:bg-red-50 hover:border-red-300 dark:border-red-700 dark:bg-gray-700 dark:text-red-400 dark:hover:bg-red-800"
              >
                ביטול
              </button>
            </div>
            <div className="flex-grow-0 md:flex-grow lg:flex-grow xl:flex-grow">
              {isSubmitting ? (
                <Button disabled={true} type="button" className="w-full h-12">
                  <img src={spinnerLoadingImage} alt="Loading" width={20} height={10} />
                  <span className="font-serif ml-2 font-light">מעבד...</span>
                </Button>
              ) : (
                <Button type="submit" className="w-full h-12">
                  {id ? "עדכן קופון הרשמה" : "הוסף קופון הרשמה"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </Scrollbars>
    </>
  );
};

export default SignupCouponDrawer;
