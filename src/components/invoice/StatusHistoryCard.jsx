// admin/src/components/invoice/StatusHistoryCard.jsx
import React, { useContext } from 'react';
import { t } from 'i18next';
import { MdOutlineCancel, MdAddShoppingCart } from 'react-icons/md';
import { IoMdTime } from 'react-icons/io';
import { VscServerProcess } from "react-icons/vsc";
import { TbTruckDelivery, TbUserCheck } from "react-icons/tb";
import { SidebarContext } from '@/context/SidebarContext';

const statusIcons = {
    'Cancel': MdOutlineCancel,
    'Likut': MdAddShoppingCart,
    'Processing': VscServerProcess,
    'Pending': IoMdTime,
    'Delivered': TbTruckDelivery
};

const getStatusIcon = (status) => {
    const IconComponent = statusIcons[status] || TbUserCheck;
    return <IconComponent size={60} />;
};

const getStatusTranslation = (statusName, statusesData, isHebrew) => {
    if (statusName === 'No Status') {
        return isHebrew ? 'נוצר' : 'No Status';
    }
    const statusObj = statusesData?.find(status => status?.name === statusName);
    if (!statusObj) return statusName;
    return isHebrew ? statusObj?.heName || statusObj?.name : statusObj?.name;
};

const StatusHistoryCard = ({ index, from, to, changedAt, changedBy }) => {
    const { statusesData, lang } = useContext(SidebarContext);
    const isHebrew = lang === 'he';

    const fromTranslated = getStatusTranslation(from, statusesData, isHebrew);
    const toTranslated = getStatusTranslation(to, statusesData, isHebrew);

    return (
        <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg px-9 pt-2 pb-4 space-y-3 relative overflow-hidden">
            <div className="w-24 h-24 dark:bg-mainColor bg-mainColor-light rounded-full absolute -right-2 -top-2 flex items-center justify-center pt-4 pr-4">
                <p className="text-white text-3xl font-bold">{index}</p>
            </div>
            <div className="dark:text-mainColor text-mainColor-light ms-auto w-fit">
                {getStatusIcon(to)}
            </div>
            <h1 className="font-bold text-xl dark:text-white">
              {fromTranslated} ← {toTranslated}
            </h1>
            <p className="text-sm text-zinc-600 leading-6 dark:text-zinc-300">
                <span className="font-bold">{t("changedAt")}:</span> {changedAt}
                <br />
                <span className="font-bold">{t("changedBy")}:</span> {changedBy}
            </p>
        </div>
    );
}

export default StatusHistoryCard;