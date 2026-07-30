// src/components/drawer/BlogDrawer.jsx
import { Input, Textarea, Select } from "@windmill/react-ui";
import ReactTagInput from "@pathofdev/react-tag-input";
import { useTranslation } from "react-i18next";
import { Scrollbars } from "react-custom-scrollbars-2";
import { Modal } from "react-responsive-modal";
import "react-responsive-modal/styles.css";
import { FiX } from "react-icons/fi";
import ReactQuill from "react-quill-new";
import 'react-quill-new/dist/quill.snow.css';

import Title from "@/components/form/others/Title";
import Error from "@/components/form/others/Error";
import LabelArea from "@/components/form/selectOption/LabelArea";
import Uploader from "@/components/image-uploader/Uploader";
import DrawerButton from "@/components/form/button/DrawerButton";

import useBlogSubmit from "@/hooks/useBlogSubmit";

const BlogDrawer = ({ id }) => {
    const { t } = useTranslation();
    const {
        register,
        handleSubmit,
        onSubmit,
        errors,
        mainImage,
        setMainImage,
        authorImage,
        setAuthorImage,
        tags,
        setTags,
        isSubmitting,
        handleSelectLanguage,
        handleBlogSlug,
        openModal,
        onCloseModal,
        handleSelectImage,
        content,
        setContent,
        setValue,
    } = useBlogSubmit(id);

    const handleContentChange = (value) => {
        setContent(value);
        setValue("content", value);
    };

    const modules = {
        toolbar: {
            container: [
                [{ 'header': [1, 2, 3, false] }],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'align': [] }],
                ['link'],
                [{ 'indent': '-1' }, { 'indent': '+1' }],
                [{ 'direction': 'rtl' }],
            ],
        },
    };

    return (
        <>
            <Modal
                open={openModal}
                onClose={onCloseModal}
                center
                closeIcon={
                    <div className="absolute top-0 right-0 text-red-500 active:outline-none text-xl border-0">
                        <FiX className="text-3xl" />
                    </div>
                }
            >
                <div className="cursor-pointer">
                    <Uploader
                        imageUrl={mainImage}
                        setImageUrl={setMainImage}
                        handleSelectImage={handleSelectImage}
                        folder='blogs'
                    />
                </div>
            </Modal>

            <div className="w-full relative p-6 border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                {id ? (
                    <Title
                        register={register}
                        handleSelectLanguage={handleSelectLanguage}
                        title={t("UpdateBlog")}
                        description={t("UpdateBlogDesc")}
                    />
                ) : (
                    <Title
                        register={register}
                        handleSelectLanguage={handleSelectLanguage}
                        title={t("AddBlog")}
                        description={t("AddBlogDesc")}
                    />
                )}
            </div>

            <Scrollbars className="w-full md:w-7/12 lg:w-8/12 xl:w-8/12 relative dark:bg-gray-700 dark:text-gray-200">
                <form onSubmit={handleSubmit(onSubmit)} id="block">
                    <div className="px-6 pt-8 flex-grow scrollbar-hide w-full max-h-full pb-40">
                        {/* title */}
                        <div className="grid grid-cols-6 gap-1 mb-6">
                            <LabelArea label={t("Title")} />
                            <div className="col-span-6">
                                <Input
                                    {...register("title", { required: t("TitleRequired") })}
                                    name="title"
                                    type="text"
                                    placeholder={t("Title")}
                                    onBlur={(e) => handleBlogSlug(e.target.value)}
                                />
                                <Error errorName={errors.title} />
                            </div>
                        </div>

                        {/* preview */}
                        <div className="grid grid-cols-6 gap-1 mb-6">
                            <LabelArea label={t("Preview")} />
                            <div className="col-span-6">
                                <Textarea
                                    {...register("preview")}
                                    name="preview"
                                    rows="3"
                                    className="border text-sm block w-full bg-gray-100 border-gray-200"
                                    placeholder={t("Preview")}
                                />
                                <Error errorName={errors.preview} />
                            </div>
                        </div>

                        {/* publish date */}
                        <div className="grid grid-cols-6 gap-1 mb-6">
                            <LabelArea label={t("PublishDate")} />
                            <div className="col-span-6">
                                <Input
                                    {...register("publishDate", { required: t("PublishDateRequired") })}
                                    name="publishDate"
                                    type="date"
                                />
                                <Error errorName={errors.publishDate} />
                            </div>
                        </div>

                        {/* author */}
                        <div className="grid grid-cols-6 gap-1 mb-6">
                            <LabelArea label={t("Author")} />
                            <div className="col-span-6">
                                <Input
                                    {...register("author")}
                                    name="author"
                                    type="text"
                                    placeholder={t("Author")}
                                />
                                <Error errorName={errors.author} />
                            </div>
                        </div>

                        {/* category */}
                        <div className="grid grid-cols-6 gap-1 mb-6">
                            <LabelArea label={t("Category")} />
                            <div className="col-span-6">
                                <Input
                                    {...register("category")}
                                    name="category"
                                    type="text"
                                    placeholder={t("Category")}
                                />
                                <Error errorName={errors.category} />
                            </div>
                        </div>

                        {/* content with ReactQuill */}
                        <div className="grid grid-cols-6 gap-1 mb-6">
                            <LabelArea label={t("Content")} />
                            <div className="col-span-6" dir="ltr">
                                <ReactQuill
                                    value={content}
                                    onChange={handleContentChange}
                                    className="text-black dark:text-white"
                                    theme="snow"
                                    modules={modules}
                                />
                                <Error errorName={errors.content} />
                            </div>
                        </div>

                        {/* main image */}
                        <div className="grid grid-cols-6 gap-1 mb-6">
                            <LabelArea label={t("MainImage")} />
                            <div className="col-span-6">
                                <Uploader
                                    imageUrl={mainImage}
                                    setImageUrl={setMainImage}
                                    handleSelectImage={handleSelectImage}
                                    folder="blogs"
                                />
                            </div>
                        </div>

                        {/* author image */}
                        <div className="grid grid-cols-6 gap-1 mb-6">
                            <LabelArea label={t("AuthorImage")} />
                            <div className="col-span-6">
                                <Uploader
                                    imageUrl={authorImage}
                                    setImageUrl={setAuthorImage}
                                    folder="blog-authors"
                                />
                            </div>
                        </div>

                        {/* slug */}
                        <div className="grid grid-cols-6 gap-1 mb-6" title={t("whatIsSlug")}>
                            <LabelArea label={t("Slug")} />
                            <div className="col-span-6">
                                <Input
                                    {...register("slug", { required: t("SlugRequired") })}
                                    name="slug"
                                    type="text"
                                    onChange={(e) => handleBlogSlug(e.target.value)}
                                    placeholder={t("Slug")}
                                />
                                <Error errorName={errors.slug} />
                            </div>
                        </div>

                        {/* status */}
                        <div className="grid grid-cols-6 gap-1 mb-6">
                            <LabelArea label={t("Status")} />
                            <div className="col-span-6">
                                <Select {...register("status")} name="status">
                                    <option value="draft">{t("Draft")}</option>
                                    <option value="published">{t("Published")}</option>
                                    <option value="hidden">{t("Hidden")}</option>
                                </Select>
                            </div>
                        </div>

                        {/* tags */}
                        <div className="grid grid-cols-6 gap-1 mb-6">
                            <LabelArea label={t("Tags")} />
                            <div className="col-span-6">
                                <ReactTagInput
                                    placeholder={t("TagsPlaceholder")}
                                    tags={tags}
                                    onChange={(newTags) => setTags(newTags)}
                                />
                            </div>
                        </div>
                    </div>

                    <DrawerButton id={id} title={t("Blog")} isSubmitting={isSubmitting} />
                </form>
            </Scrollbars>
        </>
    );
};

export default BlogDrawer; 