// ChangStatusModal.jsx
import React, { useState } from "react";
import { Button, Input, Modal, ModalBody, ModalFooter } from "@windmill/react-ui";
import { RiExchangeLine } from "react-icons/ri";
import { useTranslation } from "react-i18next";
import spinnerLoadingImage from "@/assets/img/spinner.gif";
import { notifyError } from "@/utils/toast";

const ChangStatusModal = ({ yes, cancel, status, isSubmitting, setIsSubmitting, userName = '' }) => {
  const [password, setPassword] = useState("");
  const { t } = useTranslation();

  const handleChangeStatus = async () => {
    try {
      if (!password) {
        notifyError(t("Enter password"));
        return;
      };

      setIsSubmitting(true);
      // העברת הסיסמה שהוזנה
      await yes(password);
    } catch (err) {
      notifyError(err ? err?.response?.data?.message : err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={cancel}>
      <ModalBody className="text-center custom-modal px-8 pt-6 !mb-3">
        <span className="flex justify-center text-3xl mb-5 text-red-500">
          <RiExchangeLine size={40} />
        </span>
        <h2 className="text-xl font-medium">
          {t("ChangStatusModalH2", { userName })}<span className="text-red-500">"{status}"</span>?
        </h2>
        {/* שדה להזנת הסיסמה */}
        <Input
          type="password"
          placeholder={t("Enter password")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-4 border rounded p-2 w-full"
        />
      </ModalBody>

      <ModalFooter className="justify-center gap-3">
        <Button
          className="w-full sm:w-auto hover:bg-white hover:border-gray-50"
          layout="outline"
          onClick={cancel}
        >
          {t("modalKeepBtn")}
        </Button>
        <div className="flex justify-end">
          {isSubmitting ? (
            <Button disabled={true} type="button" className="w-full h-12 sm:w-auto">
              <img src={spinnerLoadingImage} alt="Loading" width={20} height={10} />
              <span className="font-serif mr-0.5 font-light">
                {t("Processing")}
              </span>
            </Button>
          ) : (
            <Button onClick={handleChangeStatus} className="w-full h-12 sm:w-auto">
              {t("changeStatusTo")}"{status}"
            </Button>
          )}
        </div>
      </ModalFooter>
    </Modal>
  );
};

export default React.memo(ChangStatusModal);
