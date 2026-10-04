// src/components/customer/AddCustomerModal.jsx
// הוספת לקוח ידנית — לקוח שנפתח בהנהח"ש ועוד לא הגיע ביבוא האקסל.
//
// מספר הלקוח הוא חובה: לפיו יבוא האקסל הבא יזהה את הלקוח ויעדכן אותו
// במקום ליצור כפיל, והוא גם המפתח של כרטיס הלקוח ב-iCount — בלעדיו אי אפשר
// להפיק לו חשבונית. אחרי השמירה עוברים לכרטיס הלקוח, ושם משלימים מחירון,
// הגדרות חיוב וכל השאר.
import { Button, Input, Modal, ModalBody, ModalFooter } from "@windmill/react-ui";
import React, { useState } from "react";
import { FiUserPlus } from "react-icons/fi";
import { useHistory } from "react-router-dom";

// Internal import
import spinnerLoadingImage from "@/assets/img/spinner.gif";
import CustomerServices from "@/services/CustomerServices";
import { describeApiError } from "@/utils/apiError";
import { notifyError, notifySuccess } from "@/utils/toast";

const EMPTY_FORM = {
  name: "",
  customerNumber: "",
  idNumber: "",
  contactPerson: "",
  phone: "",
  landline: "",
  email: "",
  contactEmail: "",
  address: "",
  city: "",
  notes: "",
  password: "",
};

const FIELDS = [
  { key: "name", label: "שם הלקוח *" },
  { key: "customerNumber", label: "מספר לקוח (כמו בהנהח\"ש) *" },
  { key: "idNumber", label: "ח.פ / ת.ז" },
  { key: "contactPerson", label: "איש קשר" },
  { key: "phone", label: "נייד", type: "tel" },
  { key: "landline", label: "טלפון נוסף", type: "tel" },
  { key: "email", label: "מייל ראשי (חשבוניות וכניסה לחנות)", type: "email" },
  { key: "contactEmail", label: "מייל איש קשר", type: "email" },
  { key: "address", label: "כתובת" },
  { key: "city", label: "עיר" },
  { key: "password", label: "סיסמה לחנות (לא חובה)" },
  { key: "notes", label: "הערות", wide: true },
];

const AddCustomerModal = ({ isOpen, onClose, onCreated }) => {
  const history = useHistory();
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const handleClose = () => {
    if (isSaving) return;
    setForm(EMPTY_FORM);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      notifyError("יש להזין שם לקוח");
      return;
    }
    if (!form.customerNumber.trim()) {
      notifyError('יש להזין מספר לקוח (כמו בהנהח"ש)');
      return;
    }

    setIsSaving(true);
    try {
      const created = await CustomerServices.createCustomer(form);
      notifySuccess(created?.message || "הלקוח נוסף בהצלחה");
      setForm(EMPTY_FORM);
      onCreated?.();
      onClose();
      if (created?._id) history.push(`/customer/${created._id}`);
    } catch (err) {
      notifyError(describeApiError(err, "הוספת הלקוח נכשלה"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      className="w-full bg-white rounded-lg dark:bg-gray-800 sm:rounded-lg m-4 sm:max-w-3xl custom-modal"
    >
      <form onSubmit={handleSubmit}>
        <ModalBody className="text-sm text-gray-800 dark:text-gray-400 px-6 pt-6 pb-2 text-right max-h-[70vh] overflow-y-auto">
          <h2 className="text-xl font-medium mb-1 flex items-center gap-2 justify-end">
            הוספת לקוח
            <FiUserPlus className="text-customGreen" />
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {"מספר הלקוח חייב להיות זהה למספר בהנהח\"ש — כך יבוא האקסל הבא יעדכן את הלקוח הזה ולא ייצור כפיל, והחשבוניות ב-iCount ייצאו על הכרטיס הנכון. בלי מייל ראשי החשבוניות לא יישלחו ללקוח במייל. מחירון והגדרות חיוב משלימים בכרטיס הלקוח."}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FIELDS.map((field) => (
              <label
                key={field.key}
                className={`block ${field.wide ? "sm:col-span-2" : ""}`}
              >
                <span className="block mb-1 text-gray-700 dark:text-gray-300">
                  {field.label}
                </span>
                <Input
                  type={field.type || "text"}
                  value={form[field.key]}
                  disabled={isSaving}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                  className="h-10"
                />
              </label>
            ))}
          </div>
        </ModalBody>

        <ModalFooter className="flex items-center justify-center gap-3 px-6 py-3 flex-row bg-gray-50 dark:bg-gray-800 rounded-b-lg">
          <Button
            type="button"
            layout="outline"
            className="w-full sm:w-auto"
            disabled={isSaving}
            onClick={handleClose}
          >
            ביטול
          </Button>
          {isSaving ? (
            <Button disabled className="w-full h-12 sm:w-auto">
              <img src={spinnerLoadingImage} alt="Loading" width={20} height={10} />
              <span className="font-serif mr-1 font-light">שומר...</span>
            </Button>
          ) : (
            <Button type="submit" className="w-full h-12 sm:w-auto">
              הוספת הלקוח
            </Button>
          )}
        </ModalFooter>
      </form>
    </Modal>
  );
};

export default AddCustomerModal;
