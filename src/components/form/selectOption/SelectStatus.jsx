import React, { useContext, useState, useEffect } from "react";
import { Select } from "@windmill/react-ui";
import { useTranslation } from "react-i18next";

// Internal import
import OrderServices from "@/services/OrderServices";
import { notifySuccess, notifyError } from "@/utils/toast";
import { SidebarContext } from "@/context/SidebarContext";
import useAsync from "@/hooks/useAsync";
import StatusServices from "@/services/StatusService";
import ChangStatusModal from "@/components/modal/ChangStatusModal";

const SelectStatus = ({ id, order }) => {
  const { setIsUpdate, statusesData: data } = useContext(SidebarContext);
  // const { data } = useAsync(StatusServices.getAllStatuses);

  const { t } = useTranslation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState(""); // שמור את הערך הנוכחי של הסטטוס
  const [tempStatus, setTempStatus] = useState({}); // שמור את האובייקט החדש של הסטטוס לפני אישור
  const [statusColor, setStatusColor] = useState(""); // שמירת צבע הרקע של הסטטוס

  // Use useEffect to update the status when the data or order changes
  useEffect(() => {
    if (order && data) {
      const currentStatus = data.find((status) => status?.name === order?.status?.name);
      setStatus(currentStatus ? currentStatus.name : "");
      setStatusColor(currentStatus ? currentStatus.color : ""); // שמירת צבע הסטטוס
    }
  }, [order, data]);

  const handleChangeStatus = async (id, status, password) => {
    try {
      // שליחת סטטוס וסיסמה לשרת
      await OrderServices.updateOrder(id, { status: status?.name, password });
      notifySuccess(t("Status updated successfully"));
      setStatus(tempStatus?.name); // עדכן את הערך לאחר הצלחה
      setStatusColor(tempStatus?.color); // עדכן את צבע הרקע של הסטטוס הנבחר
      setIsUpdate(true);
      setIsModalOpen(false);
    } catch (err) {
      notifyError(t("Invalid password"));
      setTempStatus(status); // החזר את הערך הישן במידה והיתה שגיאה
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {isModalOpen && (
        <ChangStatusModal
          yes={(password) => handleChangeStatus(id, tempStatus, password)}
          cancel={() => setIsModalOpen(false)}
          status={tempStatus?.heName} // הצג את השם העברי במודל
          isSubmitting={isSubmitting}
          setIsSubmitting={setIsSubmitting}
          userName={order?.user_info?.name + " " + order?.user_info?.lastName}
        />
      )}

      <Select
        value={status}
        onChange={(e) => {
          const selectedStatus = data.find((status) => status?.name === e.target.value);
          setTempStatus(selectedStatus);
          setIsModalOpen(true);
        }}
        className="h-8 text-white"
        style={{ backgroundColor: statusColor }} // הוספת צבע הרקע ל-Select
      >
        <option value="status" defaultValue hidden>
          {order?.status?.heName}
        </option>
        {data &&
          data.map((status) => (
            <option key={status?._id} value={status?.name}>
              {status?.heName} {order?.actualMelaket?.heName && order?.status?.name == 'Likut' ?
                `(${order.actualMelaket.heName})` : ''}
            </option>
          ))}
      </Select>
    </>
  );
};

export default SelectStatus;
