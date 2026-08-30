import { TableBody, TableCell, TableRow } from "@windmill/react-ui";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { FiEdit, FiZoomIn } from "react-icons/fi";

// Internal import
import Tooltip from "@/components/tooltip/Tooltip";
import useUtilsFunction from "@/hooks/useUtilsFunction";
import EditDeleteButton from "../table/EditDeleteButton";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import DeleteModal from "../modal/DeleteModal";
import MainDrawer from "../drawer/MainDrawer";
import StatusDrawer from "../drawer/StatusDrawer";
import CheckBox from "../form/others/CheckBox";
import ActiveInActiveButtonStatus from "../table/ActiveInActiveButtonStatus";

const StatusTable = ({ statuses, isCheck, setIsCheck, setServiceId }) => {
  const { t } = useTranslation();
  const { showDateTimeFormat } = useUtilsFunction();

  const { title, serviceId, handleModalOpen, handleUpdate } = useToggleDrawer();

  // const handleClick = (e) => {
  //   const { id, checked } = e.target;
  //   setIsCheck([...isCheck, id]);
  //   if (!checked) {
  //     setIsCheck(isCheck.filter((item) => item !== id));
  //   }
  // };

  return (
    <>

      {/* {isCheck.length < 1 && <DeleteModal id={serviceId} title={title} />}

      {isCheck.length < 2 && (
        <MainDrawer>
          <StatusDrawer id={serviceId} />
        </MainDrawer>
      )} */}

      <TableBody className="dark:bg-gray-900">
        {statuses?.map((status, i) => (
          <TableRow key={i + 1}>
            {/* <TableCell>
              {status.phone &&
                <CheckBox
                  type="checkbox"
                  name={status?.title?.en}
                  id={status._id}
                  handleClick={handleClick}
                  isChecked={isCheck?.includes(status._id)}
                />
              }
            </TableCell> */}


            <TableCell className='text-center py-3'>
              <span className="font-semibold uppercase text-xs">
                {status?.name}
              </span>
            </TableCell>

            <TableCell className='text-center'>
              <span className="font-semibold uppercase text-xs">
                {status?.heName}
              </span>
            </TableCell>

            <TableCell className='text-center'>
              <span className="font-semibold uppercase text-xs">
                {status?.phone}
              </span>
            </TableCell>

            {/* <TableCell className='text-center'>
              <span className="text-sm mx-auto text-center">
                {status?.isActive ? t("Active") : t("Inactive")}
              </span>
            </TableCell> */}

            <TableCell className='text-center'>
              <span className="text-sm mx-auto text-center">
                {showDateTimeFormat(status?.createdAt)}
              </span>
            </TableCell>

            <TableCell className='text-center'>
              <span className="text-sm mx-auto text-center">
                {showDateTimeFormat(status?.updatedAt)}
              </span>
            </TableCell>

            <TableCell className="text-center">
              {status.phone &&
                <ActiveInActiveButtonStatus
                  id={status._id}
                  status={status.isActive ? "Active" : "Inactive"} // מעביר את המצב הנוכחי של הסטטוס
                  staff={false} // אם מדובר בסטטוס של staff, תוכל לעדכן זאת בהתאם
                />}
            </TableCell>

            <TableCell className='flex justify-center'>
              {status.phone &&
                <button
                  onClick={() => { handleUpdate(status._id), setServiceId(status._id) }}
                  className="p-2 cursor-pointer text-gray-500 hover:text-customGreen-dark focus:outline-none"
                >
                  <Tooltip
                    id="edit"
                    Icon={FiEdit}
                    title={t("Edit")}
                    bgColor="#10B981"
                  />
                </button>
              }
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </>
  );
};

export default StatusTable;
