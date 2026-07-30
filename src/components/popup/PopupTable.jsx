import {
  TableBody,
  TableCell,
  TableRow,
} from "@windmill/react-ui";
import { useEffect, useState } from "react";

// Internal import
import useUtilsFunction from "@/hooks/useUtilsFunction";
import CheckBox from "@/components/form/others/CheckBox";
import useToggleDrawer from "@/hooks/useToggleDrawer";
import DeleteModal from "@/components/modal/DeleteModal";
import MainDrawer from "@/components/drawer/MainDrawer";
import PopupDrawer from "@/components/drawer/PopupDrawer";
import ShowHideButton from "@/components/table/ShowHideButton";
import EditDeleteButton from "@/components/table/EditDeleteButton";

const PopupTable = ({ isCheck, popups, setIsCheck }) => {
  const [updatedPopups, setUpdatedPopups] = useState([]);

  const { title, serviceId, handleModalOpen, handleUpdate } = useToggleDrawer();

  const { showDateTimeFormat, globalSetting, showingTranslateValue } = useUtilsFunction();

  const handleClick = (e) => {
    const { id, checked } = e.target;
    setIsCheck([...isCheck, id]);
    if (!checked) {
      setIsCheck(isCheck.filter((item) => item !== id));
    }
  };

  useEffect(() => {
    const result = popups?.map((el) => {
      const newDate = new Date(el?.updatedAt).toLocaleString("en-US", {
        timeZone: globalSetting?.default_time_zone,
      });
      const newObj = {
        ...el,
        updatedDate: newDate,
      };
      return newObj;
    });
    setUpdatedPopups(result);
  }, [popups, globalSetting?.default_time_zone]);

  return (
    <>
      {isCheck.length < 1 && <DeleteModal id={serviceId} title={title} />}

      {isCheck.length < 2 && (
        <MainDrawer maxWidth='570px'>
          <PopupDrawer id={serviceId} />
        </MainDrawer>
      )}

      <TableBody>
        {updatedPopups?.map((popup, i) => (
          <TableRow key={i + 1}>
            <TableCell className='text-center'>
              <CheckBox
                type="checkbox"
                name={popup?.title}
                id={popup._id}
                handleClick={handleClick}
                isChecked={isCheck?.includes(popup._id)}
              />
            </TableCell>

            <TableCell className='text-center text-sm'>
              {popup.title}
            </TableCell>

            <TableCell className='text-center text-sm'>
              {popup.pageToShow}
            </TableCell>

            <TableCell className="text-center">
              <ShowHideButton id={popup._id} status={popup.isActive ? "show" : "hide"} />
            </TableCell>

            <TableCell className='text-center'>
              <span className="text-sm">
                {showDateTimeFormat(popup.createdAt)}
              </span>
            </TableCell>

            <TableCell className='text-center'>
              <EditDeleteButton
                id={popup?._id}
                isCheck={isCheck}
                handleUpdate={handleUpdate}
                handleModalOpen={handleModalOpen}
                title={popup?.title}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </>
  );
};

export default PopupTable;