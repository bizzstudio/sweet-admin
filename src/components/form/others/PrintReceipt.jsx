import React, { useRef, useState } from "react";
import { FiPrinter } from "react-icons/fi";
import { useReactToPrint } from "react-to-print";
import { useTranslation } from "react-i18next";

// Internal import
import Tooltip from "../../tooltip/Tooltip";
import useAsync from "../../../hooks/useAsync";
import { notifyError } from "../../../utils/toast";
import OrderServices from "../../../services/OrderServices";
import SettingServices from "../../../services/SettingServices";
import InvoiceForPrint from "@/components/invoice/InvoiceForPrint";

const PrintReceipt = ({ orderId, isCashierOrder = false }) => {
  const printRefTwo =  useRef(null);
  const [orderData, setOrderData] = useState({});
  const { t } = useTranslation();

  const { data: globalSetting } = useAsync(SettingServices.getGlobalSetting);

  const pageStyle = `
    @media print {
      @page {
        size: ${
          globalSetting?.receipt_size === "A4"
            ? "8.5in 14in"
            : globalSetting?.receipt_size === "3-1/8"
            ? "9.8in 13.8in"
            : globalSetting?.receipt_size === "2-1/4"
            ? "3in 8in"
            : "3.5in 8.5in"
        };
        margin: 0;
        padding: 0;
        font-size: 10px !important;
      }
    
      @page: first {
        size: ${
          globalSetting?.receipt_size === "A4"
            ? "8.5in 14in"
            : globalSetting?.receipt_size === "3-1/8"
            ? "9.8in 13.8in"
            : globalSetting?.receipt_size === "2-1/4"
            ? "3in 8in"
            : "3.5in 8.5in"
        };
        margin: 0;
        font-size: 10px !important;
      }
    }
  `;

  const handlePrint = useReactToPrint({
    content: () => printRefTwo.current,
    pageStyle: pageStyle,
    documentTitle: t("Order"),
  });

  const handlePrintReceipt = async (id) => {
    try {
      // בחירת השירות המתאים בהתאם לסוג ההזמנה
      const res = isCashierOrder 
        ? await OrderServices.getCashierOrderById(id)  // נדרש להוסיף שירות זה
        : await OrderServices.getOrderById(id);
        
     // מיון המוצרים לפי SKU
     const sortedCart = res.cart.sort((a, b) => a?.sku - b?.sku);
    
     setOrderData({ ...res, cart: sortedCart });
      setTimeout(() => handlePrint(), 0);
    } catch (err) {
      // console.log("order by user id error", err);
      notifyError(err ? err?.response?.data?.message : err?.message);
    }
    // console.log('id', id);
  };

  return (
    <>
      <div style={{ display: "none" }}>
        {Object.keys(orderData).length > 0 && (
          <InvoiceForPrint
            data={orderData}
            ref={printRefTwo}
            globalSetting={globalSetting}
          />
        )}
      </div>
      <button
        onClick={() => handlePrintReceipt(orderId)}
        type="button"
        className="ml-2 p-2 cursor-pointer text-gray-500 hover:text-customGreen-dark focus:outline-none"
      >
        <Tooltip
          id="receipt"
          Icon={FiPrinter}
          title={t("PrintReceipt")}
          bgColor="#f59e0b"
        />
      </button>
    </>
  );
};

export default PrintReceipt;
