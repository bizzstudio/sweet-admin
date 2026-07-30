// src/components/table/CashierToggleButton.jsx
import React, { useContext, useState } from "react";
import Switch from "react-switch";

// Internal import
import CustomerServices from "@/services/CustomerServices";
import { SidebarContext } from "@/context/SidebarContext";
import notifyApiResponse from "@/utils/notifyApiResponse";

const CashierToggleButton = ({ id, isCashier }) => {
    const { setIsUpdate } = useContext(SidebarContext);
    const [localCashierStatus, setLocalCashierStatus] = useState(isCashier);

    const handleToggleCashier = async (id) => {
        const newCashierStatus = !localCashierStatus;
        
        // עדכון מיידי של הUI (optimistic UI)
        setLocalCashierStatus(newCashierStatus);
        
        try {
            // שליחת בקשה לשרת ברקע
            const res = await CustomerServices.toggleCashier(id, {
                isCashier: newCashierStatus
            });
            
            notifyApiResponse(res, true);
        } catch (err) {
            // במקרה של שגיאה, החזרת המצב לקודם
            setLocalCashierStatus(localCashierStatus);
            notifyApiResponse(err, false);
        }
    };

    return (
        <>
            <Switch
                onChange={() => handleToggleCashier(id)}
                checked={localCashierStatus}
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
                offColor="#6B7280" // Gray for regular customer
                onColor={"#059669"} // Green for cashier
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

export default CashierToggleButton; 