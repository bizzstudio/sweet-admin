// src/components/category/CategoryTable.jsx
import { Avatar, TableBody, TableCell, TableRow } from "@windmill/react-ui";
import { Link } from "react-router-dom";
import { IoRemoveSharp } from "react-icons/io5";

// Internal import
import CheckBox from "@/components/form/others/CheckBox";
import DeleteModal from "@/components/modal/DeleteModal";
import ShowHideButton from "@/components/table/ShowHideButton";
import EditDeleteButton from "@/components/table/EditDeleteButton";
import useUtilsFunction from "@/hooks/useUtilsFunction";

const CategoryTable = ({
  data,
  lang,
  isCheck,
  categories,
  setIsCheck,
  useParamId,
  showChild,
  title,
  serviceId,
  handleModalOpen,
  handleUpdate,
}) => {
  const { showingTranslateValue } = useUtilsFunction();

  const handleClick = (e) => {
    const { id, checked } = e.target;
    setIsCheck([...isCheck, id]);
    if (!checked) {
      setIsCheck(isCheck.filter((item) => item !== id));
    }
  };

  return (
    <>
      {isCheck?.length < 1 && (
        <DeleteModal useParamId={useParamId} id={serviceId} title={title} />
      )}

      <TableBody>
        {categories?.map((category) => (
          <TableRow key={category._id}>
            <TableCell>
              <CheckBox
                type="checkbox"
                name="category"
                id={category._id}
                handleClick={handleClick}
                isChecked={isCheck?.includes(category._id)}
              />
            </TableCell>

            <TableCell title={category?._id} className="font-semibold uppercase text-center text-sm max-w-[15vw] overflow-hidden truncate">
              {category?._id?.substring(20, 24)}
            </TableCell>

            <TableCell title={category?.slug} className="text-center text-sm max-w-[15vw] overflow-hidden truncate">
              {category?.slug}
            </TableCell>

            <TableCell>
              {category?.icon ? (
                <Avatar
                  className=" md:block bg-gray-50 p-1"
                  src={category?.icon}
                  alt={category?.parent}
                />
              ) : (
                <Avatar
                  src="https://res.cloudinary.com/ahossain/image/upload/v1655097002/placeholder_kvepfp.png"
                  alt="product"
                  className="hidden p-1 ml-2 md:block bg-gray-50 shadow-none"
                />
              )}
            </TableCell>

            <TableCell title={showingTranslateValue(category?.name)} className="font-medium text-sm overflow-hidden truncate">
              {category?.children.length > 0 ? (
                <Link
                  to={`/categories/${category?._id}`}
                  className="underline"
                >
                  {showingTranslateValue(category?.name)}

                  <>
                    {showChild && (
                      <>
                        <div className="w-fit flex flex-col gap-1">
                          {category?.children?.map((child) => (
                            <div key={child._id}>
                              <Link
                                to={`/categories/${child?._id}`}
                                className="underline"
                              >
                                <div className="flex text-xs items-center text-gray-500 hover:dark:text-white hover:text-black">
                                  <span className="text-xs pe-1">
                                    <IoRemoveSharp />
                                  </span>
                                  <span className="">
                                    {showingTranslateValue(child.name)}
                                  </span>
                                </div>
                              </Link>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                </Link>
              ) : (
                <span>{showingTranslateValue(category?.name)}</span>
              )}
            </TableCell>

            <TableCell title={showingTranslateValue(category?.description)} className="text-center text-sm max-w-[15vw] overflow-hidden truncate">
              {showingTranslateValue(category?.description)}
            </TableCell>

            <TableCell className="text-center text-sm max-w-[15vw] overflow-hidden truncate">
              <ShowHideButton
                id={category._id}
                category
                status={category.status}
              />
            </TableCell>

            <TableCell>
              <EditDeleteButton
                id={category?._id}
                parent={category}
                isCheck={isCheck}
                children={category?.children}
                handleUpdate={handleUpdate}
                handleModalOpen={handleModalOpen}
                title={showingTranslateValue(category?.name)}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </>
  );
};

export default CategoryTable;
