import React, { useContext } from "react";
import Switch from "react-switch";

// Internal import
import StatusServices from "@/services/StatusService";
import { SidebarContext } from "@/context/SidebarContext";
import { notifyError, notifySuccess } from "@/utils/toast";

const ActiveInActiveButtonStatus = ({ id, status }) => {
  const { setIsUpdate } = useContext(SidebarContext);

  const handleChangeStatus = async (id) => {
    try {
      let newStatus = status === "Active" ? "Inactive" : "Active";
      const res = await StatusServices.updateStatus(id, {
        isActive: newStatus === "Active", // כאן אנו מעדכנים את המצב לאקטיבי או לא
      });
      setIsUpdate(true);
      notifySuccess(res.message);
    } catch (err) {
      notifyError(err ? err?.response?.data?.message : err?.message);
    }
  };

  return (
    <>
      <Switch
        onChange={() => handleChangeStatus(id)}
        checked={status === "Active"}
        className="react-switch md:ml-0"
        uncheckedIcon={
          <div
            style={{
              display: "flex",
              alignItems: "center",
              height: "100%",
              width: 120,
              fontSize: 14,
              color: "white",
              paddingRight: 22,
              paddingTop: 1,
            }}
          ></div>
        }
        width={30}
        height={15}
        handleDiameter={13}
        offColor="#E53E3E"
        onColor={"#2F855A"}
        checkedIcon={
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              width: 73,
              height: "100%",
              fontSize: 14,
              color: "white",
              paddingLeft: 20,
              paddingTop: 1,
            }}
          ></div>
        }
      />
    </>
  );
};

export default ActiveInActiveButtonStatus;
