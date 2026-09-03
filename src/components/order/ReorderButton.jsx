// src/components/order/ReorderButton.jsx
//
// "הזמנה חוזרת" — כפתור בשורת ההזמנה שיוצר הזמנה חדשה מהעתק שלה.
//
// הפעולה יוצרת הזמנה אמיתית: היא נכנסת ב"טופלה", מקבלת מספר הזמנה ותעודת
// משלוח, והמלאי יורד. לכן היא עוברת דרך מודל אישור ולא נעשית בלחיצה אחת —
// לחיצה בטעות בטבלה צפופה היא בדיוק סוג הטעות שקורית.
//
// ── למה התוצאה מוצגת במודל ולא ב-toast ──
//
// השרת מדווח מה לא הועתק (מוצר שנמחק או שאינו זמין) ואילו מחירים השתנו מאז.
// ‏toast נסגר אחרי שלוש שניות, ורשימה של חמישה מוצרים בשלוש שניות היא
// היעלמות מידע — והמידע הזה הוא בדיוק מה שמחייב את המשתמשת לפעולה. לכן
// כשיש דיווח, המודל נשאר פתוח ומציג אותו עד סגירה יזומה.

import React, { useContext, useState } from "react";
import { Button, Modal, ModalBody, ModalFooter } from "@windmill/react-ui";
import { MdRestore } from "react-icons/md";
import { FiAlertTriangle, FiCheckCircle } from "react-icons/fi";
import { useTranslation } from "react-i18next";

// Internal import
import Tooltip from "@/components/tooltip/Tooltip";
import OrderServices from "@/services/OrderServices";
import { SidebarContext } from "@/context/SidebarContext";
import { notifySuccess, notifyError } from "@/utils/toast";
import spinnerLoadingImage from "@/assets/img/spinner.gif";

const ReorderButton = ({ order }) => {
  const { t } = useTranslation();
  const { setIsUpdate } = useContext(SidebarContext);

  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // תוצאת הפעולה כשיש בה מה לדווח; null = המודל עדיין במצב אישור
  const [result, setResult] = useState(null);

  const customerName =
    `${order?.user_info?.name || ""} ${order?.user_info?.lastName || ""}`.trim() ||
    "לא זמין";

  const closeModal = () => {
    setIsOpen(false);
    setResult(null);
  };

  const handleReorder = async () => {
    try {
      setIsSubmitting(true);
      const res = await OrderServices.duplicateOrder(order._id);

      const dropped = res?.dropped || [];
      const priceChanges = res?.priceChanges || [];
      const stockWarnings = res?.stockWarnings || [];

      notifySuccess(res?.message || t("ReorderCreated", { invoice: res?.invoice }));

      // הרענון נעשה בכל מקרה — גם כשהמודל נשאר פתוח כדי להציג את הדיווח,
      // ההזמנה החדשה כבר קיימת והטבלה חייבת להראות אותה
      setIsUpdate(true);

      if (dropped.length || priceChanges.length || stockWarnings.length) {
        setResult({ invoice: res?.invoice, dropped, priceChanges, stockWarnings });
      } else {
        closeModal();
      }
    } catch (err) {
      notifyError(err?.response?.data?.message || err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={`${t("Reorder")} – ${order?.invoice ?? ""}`}
        className="tap-target p-2 cursor-pointer text-gray-500 hover:text-customGreen-dark"
      >
        <Tooltip
          // מזהה ייחודי לשורה: ‏react-tooltip מקשר לפי id, ומזהה משותף לכל
          // השורות היה מציג את אותה תיבה במקום הלא נכון
          id={`reorder-${order?._id}`}
          Icon={MdRestore}
          title={t("Reorder")}
          bgColor="#10B981"
        />
      </button>

      {isOpen && (
        <Modal isOpen={true} onClose={closeModal}>
          {result ? (
            <ModalBody className="custom-modal px-8 pt-6 !mb-3">
              <span className="flex justify-center text-3xl mb-4 text-customGreen-dark">
                <FiCheckCircle size={40} />
              </span>
              <h2 className="text-xl font-medium mb-4 text-center">
                {t("ReorderCreated", { invoice: result.invoice })}
              </h2>

              {result.dropped.length > 0 && (
                <div className="mb-4 text-sm">
                  <p className="flex items-center gap-1 font-semibold text-red-600 mb-1">
                    <FiAlertTriangle /> {t("ReorderDropped")}
                  </p>
                  <ul className="list-disc ps-5 text-gray-700 dark:text-gray-300">
                    {result.dropped.map((d, i) => (
                      <li key={i}>
                        {d.name} — {d.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.stockWarnings.length > 0 && (
                <div className="mb-4 text-sm">
                  <p className="flex items-center gap-1 font-semibold text-yellow-600 mb-1">
                    <FiAlertTriangle /> {t("ReorderStockShort")}
                  </p>
                  <ul className="list-disc ps-5 text-gray-700 dark:text-gray-300">
                    {result.stockWarnings.map((w, i) => (
                      <li key={i}>
                        {t("ReorderStockShortLine", {
                          name: w.name,
                          requested: w.requested,
                          inStock: w.inStock,
                        })}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.priceChanges.length > 0 && (
                <div className="text-sm">
                  <p className="flex items-center gap-1 font-semibold text-yellow-600 mb-1">
                    <FiAlertTriangle /> {t("ReorderPriceChanged")}
                  </p>
                  <ul className="list-disc ps-5 text-gray-700 dark:text-gray-300">
                    {result.priceChanges.map((p, i) => (
                      <li key={i}>
                        {p.name}: {p.copiedPrice}₪ → {p.currentPrice}₪
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </ModalBody>
          ) : (
            <ModalBody className="text-center custom-modal px-8 pt-6 !mb-3">
              <span className="flex justify-center text-3xl mb-5 text-customGreen-dark">
                <MdRestore size={40} />
              </span>
              <h2 className="text-xl font-medium mb-2">
                {t("ReorderModalH2", { invoice: order?.invoice, userName: customerName })}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t("ReorderModalBody")}
              </p>
            </ModalBody>
          )}

          <ModalFooter className="justify-center gap-3">
            {result ? (
              <Button onClick={closeModal} className="w-full h-12 sm:w-auto">
                {t("Close")}
              </Button>
            ) : (
              <>
                <Button
                  className="w-full sm:w-auto hover:bg-white hover:border-gray-50"
                  layout="outline"
                  onClick={closeModal}
                  disabled={isSubmitting}
                >
                  {t("modalKeepBtn")}
                </Button>
                {isSubmitting ? (
                  <Button disabled={true} type="button" className="w-full h-12 sm:w-auto">
                    <img src={spinnerLoadingImage} alt="" width={20} height={10} />
                    <span className="font-serif mr-0.5 font-light">{t("Processing")}</span>
                  </Button>
                ) : (
                  <Button onClick={handleReorder} className="w-full h-12 sm:w-auto">
                    {t("ReorderConfirmBtn")}
                  </Button>
                )}
              </>
            )}
          </ModalFooter>
        </Modal>
      )}
    </>
  );
};

export default React.memo(ReorderButton);
