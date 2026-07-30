
// hooks/useDeliverySubmit.js
import { useState, useEffect, useContext } from "react";
import DeliveryServices from "@/services/DeliveryServices";
import { useForm } from "react-hook-form";
import { notifyError, notifySuccess } from "@/utils/toast";
import { SidebarContext } from "@/context/SidebarContext";
import notifyApiResponse from "@/utils/notifyApiResponse";

const DEFAULT_MINIMUM_ORDER = 150;

const useDeliverySubmit = (id) => {
  const { closeDrawer, setIsUpdate, isDrawerOpen } = useContext(SidebarContext);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    clearErrors,
    formState: { errors },
  } = useForm();

  const [openModal, setOpenModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [city, setCity] = useState('');
  // תמיד נקבע את כל הימים כברירת מחדל
  const [days, setDays] = useState([
    { name: "Sunday", value: 1 },
    { name: "Monday", value: 2 },
    { name: "Tuesday", value: 3 },
    { name: "Wednesday", value: 4 },
    { name: "Thursday", value: 5 },
    { name: "Friday", value: 6 },
    { name: "Saturday", value: 7 },
  ]);

  useEffect(() => {
    if (!isDrawerOpen) {
      // איפוס הטופס כשה-drawer נסגר
      setValue("city", "");
      setValue("price", "");
      setValue("minimumOrder", "");
      setValue("days", []);
      setValue("biweekly", false);
      setCity('');
      setDays([
        { name: "Sunday", value: 1 },
        { name: "Monday", value: 2 },
        { name: "Tuesday", value: 3 },
        { name: "Wednesday", value: 4 },
        { name: "Thursday", value: 5 },
        { name: "Friday", value: 6 },
        { name: "Saturday", value: 7 },
      ]);
      clearErrors("city");
      clearErrors("price");
      clearErrors("minimumOrder");
      clearErrors("days");
      setIsSubmitting(false);
      return;
    }
    
    if (id) {
      DeliveryServices.getDeliveryById(id)
        .then((res) => {
          const delivery = res;
          console.log('delivery', delivery)
          // setValue("name_of_region", delivery?.name_of_region);
          setValue("city", delivery?.city);
          setCity(delivery?.city)
          setValue("price", delivery?.price);
          setValue(
            "minimumOrder",
            delivery?.minimumOrder != null ? delivery.minimumOrder : DEFAULT_MINIMUM_ORDER
          );
          setValue("biweekly", !!delivery?.biweekly);
          // תמיד נקבע את כל הימים גם בעדכון
          setValue("days", [
            { name: "Sunday", value: 1 },
            { name: "Monday", value: 2 },
            { name: "Tuesday", value: 3 },
            { name: "Wednesday", value: 4 },
            { name: "Thursday", value: 5 },
            { name: "Friday", value: 6 },
            { name: "Saturday", value: 7 },
          ]);
          setDays([
            { name: "Sunday", value: 1 },
            { name: "Monday", value: 2 },
            { name: "Tuesday", value: 3 },
            { name: "Wednesday", value: 4 },
            { name: "Thursday", value: 5 },
            { name: "Friday", value: 6 },
            { name: "Saturday", value: 7 },
          ]);
        })
        .catch((err) => {
          notifyError(err?.response?.data?.message || err?.message);
        });
    } else {
      setValue("minimumOrder", DEFAULT_MINIMUM_ORDER);
    }
  }, [id, setValue, isDrawerOpen, clearErrors]);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    console.log('data', data)

    try {
      const verifyCity = () => {
        if (city) {
          return city;
        } else {
          throw { message: "Please select a city" };
        }
      };

      // תמיד נשלח את כל הימים
      const allDays = [
        { name: "Sunday", value: 1 },
        { name: "Monday", value: 2 },
        { name: "Tuesday", value: 3 },
        { name: "Wednesday", value: 4 },
        { name: "Thursday", value: 5 },
        { name: "Friday", value: 6 },
        { name: "Saturday", value: 7 },
      ];

      const minRaw = data.minimumOrder;
      const minimumOrderParsed = Number(minRaw);
      const minimumOrder =
        minRaw !== "" &&
        minRaw !== undefined &&
        minRaw !== null &&
        !Number.isNaN(minimumOrderParsed) &&
        minimumOrderParsed >= 0
          ? minimumOrderParsed
          : DEFAULT_MINIMUM_ORDER;

      const deliveryData = {
        city: verifyCity(),
        price: data.price,
        minimumOrder,
        days: allDays, // תמיד כל הימים
        biweekly: !!data.biweekly,
      };

      if (id) {
        console.log("deliveryData update: ", deliveryData);
        const res = await DeliveryServices.updateDelivery(id, deliveryData);
        notifyApiResponse(res, true);
      } else {
        const res = await DeliveryServices.addDelivery(deliveryData);
        notifyApiResponse(res, true);
      }
      
      setIsUpdate(true);
      closeDrawer();
    } catch (err) {
      notifyApiResponse(err, false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    register,
    handleSubmit,
    onSubmit,
    errors,
    openModal,
    isSubmitting,
    city,
    setCity,
    days,
    setDays
  };
};

export default useDeliverySubmit;
