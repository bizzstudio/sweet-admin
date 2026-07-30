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
import InputArea from "@/components/form/input/InputArea";
import DrawerButton from "@/components/form/button/DrawerButton";
import Uploader from "@/components/image-uploader/Uploader";
import SwitchToggle from "@/components/form/switch/SwitchToggle";
import usePopupSubmit from "@/hooks/usePopupSubmit";
import LabelArea from "../form/selectOption/LabelArea";

const PopupDrawer = ({ id }) => {
  const { t } = useTranslation();

  const {
    register,
    onSubmit,
    errors,
    openModal,
    imageUrl,
    setImageUrl,
    handleSubmit,
    onCloseModal,
    isSubmitting,
    handleSelectImage,
    isActive,
    setIsActive,
    hasLink,
    setHasLink,
    targetBlank,
    setTargetBlank,
    setValue,
    description,
    setDescription,
  } = usePopupSubmit(id);


  const handleDescriptionChange = (value) => {
    setDescription(value);
    setValue("description", value); // Update the description field in useForm
  };

  const modules = {
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }], // Dropdown for text size
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],          // Ordered and unordered lists
        ['bold', 'italic', 'underline', 'strike'],              // Text formatting
        [{ 'color': [] }],                // Color and background
        [{ 'align': [] }],                                      // Alignment
        ['link'],                             // Link, image and video options
        [{ 'indent': '-1' }, { 'indent': '+1' }],               // Indent buttons
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
        <div className="cursor-pointer">
          <Uploader
            imageUrl={imageUrl}
            setImageUrl={setImageUrl}
            handleSelectImage={handleSelectImage}
            folder='popup'
          />
        </div>
      </Modal>

      <div className="w-full relative p-6 border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
        {id ? (
          <Title
            register={register}
            title={t("UpdatePopup")}
            description={t("UpdatePopupDescription")}
          />
        ) : (
          <Title
            register={register}
            title={t("DrawerAddPopup")}
            description={t("AddPopupDescription")}
          />
        )}
      </div>

      <Scrollbars className="w-full md:w-7/12 lg:w-8/12 xl:w-8/12 relative dark:bg-gray-700 dark:text-gray-200">
        <form onSubmit={handleSubmit(onSubmit)} id="block">
          <div className="px-6 pt-8 flex-grow scrollbar-hide w-full max-h-full pb-40">
            <div className="grid grid-cols-6 gap-1 mb-6">
              <LabelArea label={t("PopupImage")} />
              <div className="col-span-6">
                <Uploader
                  imageUrl={imageUrl}
                  setImageUrl={setImageUrl}
                  handleSelectImage={handleSelectImage}
                  folder='popup'
                />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-1 mb-6">
              <LabelArea label={t("ImageHeight")} />
              <div className="col-span-6">
                <Input
                  {...register("imageHeight", {
                    required: imageUrl ? t("ImageHeightRequired") : false,
                  })}
                  name="imageHeight"
                  type="number"
                  placeholder={t("ImageHeight")}
                />
                <Error errorName={errors.imageHeight} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-1 mb-6">
              <LabelArea label={t("PopupTitle")} />
              <div className="col-span-6">
                <Input
                  {...register("title")}
                  name="title"
                  type="text"
                  placeholder={t("PopupTitle")}
                />
                <Error errorName={errors.title} />
              </div>
            </div>

            {/* <div className="grid grid-cols-6 gap-1 mb-6">
              <LabelArea label={t("PopupSubTitle")} />
              <div className="col-span-6">
                <InputArea
                  register={register}
                  required={true}
                  label={t("PopupSubTitle")}
                  name="subTitle"
                  type="text"
                  placeholder={t("PopupSubTitle")}
                />
                <Error errorName={errors.subTitle} />
              </div>
            </div> */}

            <div className="grid grid-cols-6 gap-1 mb-6">
              <LabelArea label={t("PopupDescription")} />
              <div className="col-span-6" dir="ltr">
                <ReactQuill
                  value={description}
                  onChange={handleDescriptionChange}
                  className="text-black dark:text-white"
                  theme="snow"
                  modules={modules}
                />
                <Error errorName={errors.description} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-1 mb-6">
              <LabelArea label={t("HasLink")} />
              <div className="col-span-6">
                <SwitchToggle
                  id="hasLink"
                  handleProcess={(checked) => setHasLink(checked)}
                  processOption={hasLink}
                />
              </div>
            </div>

            {hasLink && (
              <>
                <div className="grid grid-cols-6 gap-1 mb-6">
                  <div className="col-span-6 flex gap-5">
                    <div className="flex-grow">
                      <LabelArea label={t("PopupLink")} />
                      <Input
                        className='mt-1'
                        {...register("link", {
                          required: hasLink ? t("LinkRequired") : false,
                        })}
                        label={t("PopupLink")}
                        name="link"
                        type="text"
                        placeholder={t("PopupLink")}
                      />
                      <Error errorName={errors.link} />
                    </div>
                    <div className="flex-grow">
                      <LabelArea label={t("PopupLinkName")} />
                      <Input
                        className='mt-1'
                        {...register("linkName", {
                          required: hasLink ? t("LinkRequired") : false,
                        })}
                        label={t("PopupLinkName")}
                        name="linkName"
                        type="text"
                        placeholder={t("PopupLinkName")}
                      />
                      <Error errorName={errors.linkName} />
                    </div>

                    <div className="h-full">
                      <LabelArea label={t("OpenInNewTab")} />
                      <div className="mt-3 flex justify-center">
                        <SwitchToggle
                          id="targetBlank"
                          handleProcess={(checked) => setTargetBlank(checked)}
                          processOption={targetBlank}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="grid grid-cols-6 gap-1 mb-6">
              <LabelArea label={t("PopupPageToShow")} />
              <div className="col-span-6">
                <InputArea
                  register={register}
                  label={t("PopupPageToShow")}
                  name="pageToShow"
                  type="text"
                  placeholder={t("Paste link here")}
                />
                <Error errorName={errors.pageToShow} />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-1 mb-6">
              <LabelArea label={t("PopupPublished")} />
              <div className="col-span-6">
                <SwitchToggle
                  id="isActive"
                  handleProcess={(checked) => setIsActive(checked)}
                  processOption={isActive}
                />
                <Error errorName={errors.isActive} />
              </div>
            </div>
          </div>

          <DrawerButton id={id} title={t("Popup")} isSubmitting={isSubmitting} />
        </form>
      </Scrollbars>
    </>
  );
};

export default React.memo(PopupDrawer);
