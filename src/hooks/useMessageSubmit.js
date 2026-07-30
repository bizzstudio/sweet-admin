import { useContext, useEffect, useState } from "react";
import { useForm } from "react-hook-form";

// Internal import
import { SidebarContext } from "@/context/SidebarContext";
import MessageServices from "@/services/MessageServices";
import { notifyError, notifySuccess } from "@/utils/toast";

const useMessageSubmit = (id) => {
  const { isDrawerOpen, closeDrawer, setIsUpdate } = useContext(SidebarContext);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messageTemplate, setMessageTemplate] = useState("");
  const [role, setRole] = useState("");

  const { register, handleSubmit, setValue, clearErrors, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);

      const messageData = {
        messageTemplate: messageTemplate || '',
        role: data.role || '',
      };

      if (id) {
        const res = await MessageServices.updateMessage(id, messageData);
        setIsUpdate(true);
        setIsSubmitting(false);
        notifySuccess(res.message);
        closeDrawer();
      } else {
        const res = await MessageServices.addMessage(messageData);
        setIsUpdate(true);
        setIsSubmitting(false);
        notifySuccess(res.message);
        closeDrawer();
      }
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
      setIsSubmitting(false);
      closeDrawer();
    }
  };

  useEffect(() => {
    if (!isDrawerOpen) {
      setValue("messageTemplate", "");
      setValue("role", "");
      setMessageTemplate('');
      setRole('');
      clearErrors("messageTemplate");
      clearErrors("role");
      return;
    }
    if (id) {
      (async () => {
        try {
          const res = await MessageServices.getMessageById(id);
          if (res) {
            setValue("messageTemplate", res.messageTemplate);
            setValue("role", res.role);
            setMessageTemplate(res.messageTemplate);
            setRole(res.role);
          }
        } catch (err) {
          notifyError(err?.response?.data?.message || err?.message);
        }
      })();
    }
  }, [id, setValue, isDrawerOpen, clearErrors]);

  return {
    register,
    handleSubmit,
    onSubmit,
    errors,
    isSubmitting,
    setValue,
    messageTemplate,
    setMessageTemplate,
    role,
    setRole,
  };
};

export default useMessageSubmit;
