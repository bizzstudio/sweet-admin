import { Input } from "@windmill/react-ui";
import React, { useState } from "react";
import { Scrollbars } from "react-custom-scrollbars-2";
import { Modal } from "react-responsive-modal";
import "react-responsive-modal/styles.css";
import { useTranslation } from "react-i18next";
import { FiX } from "react-icons/fi";
import ReactQuill from "react-quill-new";
import 'react-quill-new/dist/quill.snow.css';

// Internal import
import Title from "@/components/form/others/Title";
import Error from "@/components/form/others/Error";
import DrawerButton from "@/components/form/button/DrawerButton";
import useMessageSubmit from "@/hooks/useMessageSubmit";
import LabelArea from "@/components/form/selectOption/LabelArea";

const MessageDrawer = ({ id }) => {
  const { t } = useTranslation();

  const {
    register,
    onSubmit,
    errors,
    openModal,
    handleSubmit,
    onCloseModal,
    isSubmitting,
    setValue,
    messageTemplate,
    setMessageTemplate,
    role,
    setRole,
  } = useMessageSubmit(id);

  const handleTemplateChange = (value) => {
    setMessageTemplate(value);
    setValue("messageTemplate", value); // Update the messageTemplate field in useForm
  };

  const modules = {
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }], // Dropdown for text size
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],          // Ordered and unordered lists
        ['bold', 'italic', 'underline', 'strike'],              // Text formatting
        [{ 'align': [] }],                                      // Alignment
        [{ 'direction': 'rtl' }],                               // RTL support
      ],
    },
  };

  return (
    <>
      <Modal
        open={openModal}
        onClose={onCloseModal}
        center
        closeIcon={
          <div className="absolute top-0 right-0 text-red-500 active:outline-none text-xl border-0">
            <FiX className="text-3xl" />
          </div>
        }
      >
      </Modal>

      <div className="w-full relative p-6 border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
        {id ? (
          <Title
            register={register}
            title={t("UpdateMessage")}
            description={t("UpdateMessageDescription")}
          />
        ) : (
          <Title
            register={register}
            title={t("DrawerAddMessage")}
            description={t("AddMessageDescription")}
          />
        )}
      </div>

      <Scrollbars className="w-full md:w-7/12 lg:w-8/12 xl:w-8/12 relative dark:bg-gray-700 dark:text-gray-200">
        <form onSubmit={handleSubmit(onSubmit)} id="block">
          <div className="px-6 pt-8 flex-grow scrollbar-hide w-full max-h-full pb-40">
            <div className="grid grid-cols-6 gap-1 mb-6">
              <LabelArea label={t("MessageTemplate")} />
              <div className="col-span-6" dir="ltr">
                <ReactQuill
                  value={messageTemplate}
                  onChange={handleTemplateChange}
                  className="text-black dark:text-white"
                  theme="snow"
                  modules={modules}
                />
                <Error errorName={errors.messageTemplate} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-1 mb-6">
              <LabelArea label={t("MessageRole")} />
              <div className="col-span-6">
                <Input
                  {...register("role", {
                    required: t("RoleRequired"),
                  })}
                  name="role"
                  type="text"
                  placeholder={t("MessageRole")}
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                />
                <Error errorName={errors.role} />
              </div>
            </div>
          </div>

          <DrawerButton id={id} title={t("Message")} isSubmitting={isSubmitting} />
        </form>
      </Scrollbars>
    </>
  );
};

export default React.memo(MessageDrawer);
