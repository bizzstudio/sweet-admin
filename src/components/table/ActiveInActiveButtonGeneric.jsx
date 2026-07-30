// src/components/table/ActiveInActiveButtonGeneric.jsx
import React from "react";
import Switch from "react-switch";

const ActiveInActiveButtonGeneric = ({ id, status, handleChangeStatus }) => {
  return (
    <>
      <Switch
        onChange={() => handleChangeStatus(id, status)}
        checked={status ? true : false}
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

export default ActiveInActiveButtonGeneric;
