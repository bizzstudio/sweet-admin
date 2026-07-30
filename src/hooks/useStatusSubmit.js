import { useContext, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation } from "react-router-dom";
import swal from "sweetalert";
import Color from 'color';

// Internal import
import useAsync from "@/hooks/useAsync";
import { SidebarContext } from "@/context/SidebarContext";
import { notifyError, notifySuccess } from "@/utils/toast";
import StatusServices from "@/services/StatusService";

const useStatusSubmit = (id) => {
  const location = useLocation();
  const { isDrawerOpen, closeDrawer, setIsUpdate, lang } =
    useContext(SidebarContext);

  // react hook
  const { register, handleSubmit, setValue, clearErrors, formState: { errors } } = useForm();

  // react state
  const [tag, setTag] = useState(true); // assuming status is active by default
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [language, setLanguage] = useState(lang);
  const [slug, setSlug] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [hue, setHue] = useState(0); // הערך המתחלף של Hue

  // handle click
  const onCloseModal = () => setOpenModal(false);

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      const statusData = {
        name: data.name,
        heName: data.heName,
        phone: data.phone,
        isActive: tag,
        color: data.statusColor,
        password: data.password || '',
      };

      if (id) {
        const res = await StatusServices.updateStatus(id, statusData);
        if (res) {
          notifySuccess(res.message);
          setIsUpdate(true);
          closeDrawer();
        }
      } else {
        const res = await StatusServices.addStatus(statusData);
        if (res) {
          notifySuccess("Status Added Successfully!");
          setIsUpdate(true);
          closeDrawer();
        }
      }
      setIsSubmitting(false);
    } catch (err) {
      setIsSubmitting(false);
      notifyError(err?.response?.data?.message || err?.message);
      closeDrawer();
    }
  };

  useEffect(() => {
    if (!isDrawerOpen) {
      setSlug("");
      setLanguage(lang);
      setValue("language", language);
      setTag(true); // reset to default active status
      clearErrors("name");
      setValue("name", "");
      setValue("heName", "");
      setValue("phone", "");
      setValue("password", "");
      setValue("statusColor", "#000000");
      setHue(0);
    } else {
      if (id) {
        (async () => {
          try {
            const res = await StatusServices.getStatusById(id);
            if (res) {
              setValue("name", res.name);
              setValue("heName", res.heName);
              setValue("phone", res.phone);
              setValue("statusColor", res.color);
              setValue("password", res.password);

              // const color = Color(res.color);
              // const { h } = color.hsl().object();
              // setHue(h);

              setTag(res.isActive);
            }
          } catch (err) {
            notifyError(err?.response?.data?.message || err?.message);
          }
        })();
      }
    }
  }, [id, setValue, isDrawerOpen, clearErrors, lang]);

  //for change language in status drawer
  const handleSelectLanguage = (lang) => {
    setLanguage(lang);
  };

  return {
    tag,
    setTag,
    register,
    onSubmit,
    errors,
    slug,
    openModal,
    isSubmitting,
    onCloseModal,
    handleSubmit,
    handleSelectLanguage,
    hue,
    setHue,
    setValue
  };
};

export default useStatusSubmit;
