import { TableBody, TableCell, TableRow } from "@windmill/react-ui";
import { useTranslation } from "react-i18next";
import { FiEdit } from "react-icons/fi";

// Internal import
import Tooltip from "@/components/tooltip/Tooltip";
import useToggleDrawer from "@/hooks/useToggleDrawer";

const MessageTable = ({ messages, setServiceId }) => {
  const { t } = useTranslation();
  const { handleUpdate } = useToggleDrawer();

  return (
    <TableBody className="dark:bg-gray-900">
      {messages?.map((message, i) => (
        <TableRow key={i + 1}>
          {/* <TableCell className='text-center py-3'>
            <span className="font-semibold text-sm">
              {message?.messageTemplate}
            </span>
          </TableCell> */}

          <TableCell className='text-center'>
            <span className="font-semibold text-sm">
              {message?.role}
            </span>
          </TableCell>

          <TableCell className='flex justify-center'>
            <button
              onClick={() => { handleUpdate(message._id); setServiceId(message._id); }}
              className="p-2 cursor-pointer text-gray-400 hover:text-customGreen-dark focus:outline-none"
            >
              <Tooltip
                id="edit"
                Icon={FiEdit}
                title={t("Edit")}
                bgColor="#10B981"
              />
            </button>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
};

export default MessageTable;