import React from 'react'
import { useTranslation } from "react-i18next";

export default function AddressFormat({ userInfo }) {
    const { t } = useTranslation();
    return (
        <>
            {userInfo?.address?.city?.city_name_he + ", " + userInfo?.address?.street + " " + userInfo?.address?.houseNumber + (userInfo?.address?.floor ? ", " + t("floor") + " " + userInfo?.address?.floor : '') + (userInfo?.address?.apartmentNumber ? ", " + t("apartment") + " " + userInfo?.address?.apartmentNumber : '') + (userInfo?.address?.entryCode ? ", " + t("entryCode") + ": " + userInfo?.address?.entryCode : '')}
        </>
    )
}
