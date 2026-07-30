import useToggleDrawer from "@/hooks/useToggleDrawer";
import { TableBody, TableCell, TableRow } from "@windmill/react-ui";
import { useTranslation } from "react-i18next";
import { FiEdit, FiTrash2 } from "react-icons/fi";
import { Link } from "react-router-dom";
import CheckBox from "../form/others/CheckBox";
import { useEffect } from "react";
import DeleteModal from "../modal/DeleteModal";
import MainDrawer from "../drawer/MainDrawer";
import DeliveryDrawer from "../drawer/DeliveryDrawer";
import EditDeleteButton from "../table/EditDeleteButton";
import useUtilsFunction from "@/hooks/useUtilsFunction";

const DEFAULT_MINIMUM_ORDER = 150;

const DeliveryTable = ({ deliveries, isCheck, setIsCheck, isCheckAll }) => {
  const { t } = useTranslation();
  const { handleUpdate, serviceId, title, handleModalOpen } = useToggleDrawer();
  const { getNumberTwo } = useUtilsFunction();

  const handleClick = (e, id) => {
    const { checked } = e.target;
    setIsCheck(
      checked ? [...isCheck, id] : isCheck.filter((item) => item !== id)
    );
  };

  return (
    <>
      {isCheck.length < 1 && <DeleteModal id={serviceId} title={title} />}

      {isCheck.length < 2 && (
        <MainDrawer>
          <DeliveryDrawer id={serviceId} />
        </MainDrawer>
      )}

      <TableBody>
        {deliveries.map((delivery) => (
          <TableRow key={delivery._id}>
            <TableCell>
              <CheckBox
                type="checkbox"
                name={delivery._id}
                id={delivery._id}
                isChecked={isCheck.includes(delivery._id)}
                handleClick={(e) => handleClick(e, delivery._id)}
              />
            </TableCell>
            <TableCell className="text-center">
              <span className="text-sm">{delivery.city.city_name_he}</span>
            </TableCell>
            <TableCell className="text-center">
              <span className="text-sm">{delivery.price}</span>
            </TableCell>
            <TableCell className="text-center">
              <span className="text-sm">
                {getNumberTwo(
                  delivery.minimumOrder != null ? delivery.minimumOrder : DEFAULT_MINIMUM_ORDER
                )}
              </span>
            </TableCell>
            <TableCell className="text-center">
              <span className="text-sm">
                {delivery.days.length === 7 
                  ? t("AllWeek")
                  : delivery.days.map((day, i, arr) => (
                      t(day.name) + (i !== arr.length - 1 ? ", " : "")
                    ))
                }
              </span>
            </TableCell>
            <TableCell className="text-center">
              <span className="text-sm">
                {delivery.biweekly ? "✓" : "-"}
              </span>
            </TableCell>
            <TableCell className="text-center flex justify-center">
              <EditDeleteButton
                id={delivery._id}
                isCheck={isCheck}
                setIsCheck={setIsCheck}
                handleUpdate={handleUpdate}
                handleModalOpen={handleModalOpen}
                title={delivery.city.city_name_he}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </>
  );
};

export default DeliveryTable;
