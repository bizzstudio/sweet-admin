// src/components/blog/BlogTable.jsx
import {
    Avatar,
    TableBody,
    TableCell,
    TableRow,
    Badge,
} from "@windmill/react-ui";
import { t } from "i18next";

import CheckBox from "@/components/form/others/CheckBox";
import DeleteModal from "@/components/modal/DeleteModal";
import EditDeleteButton from "@/components/table/EditDeleteButton";
import useUtilsFunction from "@/hooks/useUtilsFunction";

const BlogTable = ({
    blogs,
    isCheck,
    setIsCheck,
    title,
    serviceId,
    handleModalOpen,
    handleUpdate,
}) => {
    const { showingTranslateValue, showDateFormat } = useUtilsFunction();

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
                <DeleteModal id={serviceId} title={title} />
            )}

            <TableBody>
                {blogs?.map((blog) => (
                    <TableRow key={blog._id}>
                        <TableCell className="text-center">
                            <CheckBox
                                type="checkbox"
                                id={blog._id}
                                handleClick={handleClick}
                                isChecked={isCheck?.includes(blog._id)}
                            />
                        </TableCell>

                        <TableCell className="text-center">
                                <Avatar src={blog.mainImage || "https://res.cloudinary.com/ahossain/image/upload/v1655097002/placeholder_kvepfp.png"} size="large" />
                        </TableCell>

                        <TableCell className="font-semibold text-sm max-w-[15vw] truncate">
                            {showingTranslateValue(blog.title)}
                        </TableCell>

                        <TableCell className="text-sm">{blog.author}</TableCell>

                        <TableCell className="text-sm">{blog.category}</TableCell>

                        <TableCell className="text-center">
                            <Badge
                                type={
                                    blog.status === "published"
                                        ? "success"
                                        : blog.status === "draft"
                                            ? "warning"
                                            : "danger"
                                }
                            >
                                {t(blog.status)}
                            </Badge>
                        </TableCell>

                        <TableCell className="text-center text-sm">
                            {showDateFormat(blog.publishDate)}
                        </TableCell>

                        <TableCell className="text-center">
                            <EditDeleteButton
                                id={blog._id}
                                parent={blog}
                                isCheck={isCheck}
                                handleUpdate={handleUpdate}
                                handleModalOpen={handleModalOpen}
                                title={showingTranslateValue(blog.title)}
                            />
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </>
    );
};

export default BlogTable; 