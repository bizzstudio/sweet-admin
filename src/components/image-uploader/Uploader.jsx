import React, { useEffect, useState } from "react";
import { t } from "i18next";
import { useDropzone } from "react-dropzone";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { FiUploadCloud, FiXCircle } from "react-icons/fi";

// Internal import
import useAsync from "@/hooks/useAsync";
import SettingServices from "@/services/SettingServices";
import { notifyError, notifySuccess } from "@/utils/toast";
import Container from "@/components/image-uploader/Container";
import requests from "@/services/httpService";
import DriveImg from "./DriveImg";

const Uploader = ({ setImageUrl, imageUrl, product, folder }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setError] = useState("");

  const { data: globalSetting } = useAsync(SettingServices.getGlobalSetting);

  const { getRootProps, getInputProps, fileRejections } = useDropzone({
    accept: {
      "image/jpeg": [".jpeg", ".jpg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
      "image/svg": [".svg"]
    },
    multiple: product ? true : false,
    maxSize: 5000000, // 5MB
    maxFiles: globalSetting?.number_of_image_per_product || 2,
    onDrop: (acceptedFiles) => {
      setFiles(
        acceptedFiles.map((file) =>
          Object.assign(file, {
            preview: URL.createObjectURL(file),
          })
        )
      );
    },
  });

  // הצגת שגיאות הקשורות להעלאת קבצים
  useEffect(() => {
    if (fileRejections) {
      fileRejections.map(({ file, errors }) => (
        <li key={file.path}>
          {file.path} - {file.size} bytes
          <ul>
            {errors.map((e) => (
              <li key={e.code}>
                {e.code === "too-many-files"
                  ? notifyError(
                    `Maximum ${globalSetting?.number_of_image_per_product} Image Can be Upload!`
                  )
                  : notifyError(e.message)}
              </li>
            ))}
          </ul>
        </li>
      ));
    }

    // שליחת קבצים לשרת שלך שמעלה ל-Google Drive
    if (files.length > 0) {
      files.forEach((file) => {
        if (
          product &&
          imageUrl?.length + files?.length >
          globalSetting?.number_of_image_per_product
        ) {
          return notifyError(
            `Maximum ${globalSetting?.number_of_image_per_product} Image Can be Upload!`
          );
        }

        setLoading(true);
        setError("Uploading....");

        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", folder); // הוספת מידע על התיקייה ב-Google Drive

        requests.post("/upload", formData) // שימוש ב-requests.post במקום axios
          .then((res) => {
            notifySuccess("Image Uploaded successfully!");
            setLoading(false);
            console.log('res.link: ', res.link)
            if (product) {
              setImageUrl((imgUrl) => [...imgUrl, res.link]); // קבלת הלינק מהשרת שלך
            } else {
              setImageUrl(res.link);
            }
          })
          .catch((err) => {
            console.error("err", err);
            notifyError(err.message || "Error uploading image");
            setLoading(false);
          });
      });
    }
  }, [files]);

  const thumbs = files.map((file) => (
    <div key={file.name}>
      <div>
        <DriveImg
          className="inline-flex border rounded-md w-24 max-h-24 p-2 border-gray-100 dark:border-gray-600"
          // className="inline-flex border-2 border-gray-100 w-24 max-h-24"
          src={file.preview}
          alt={file.name}
        />
      </div>
    </div>
  ));

  useEffect(() =>
    () => {
      // ניקוי תמונות מתצוגה מקדימה כדי להימנע מבעיות זיכרון
      files.forEach((file) => URL.revokeObjectURL(file.preview));
    },
    [files]
  );

  // הוספת useEffect שמנקה את הfiles כאשר imageUrl מתאפס
  useEffect(() => {
    if (!imageUrl || (Array.isArray(imageUrl) && imageUrl.length === 0)) {
      setFiles([]);
    }
  }, [imageUrl]);

  const handleRemoveImage = async (img) => {
    try {
      setLoading(false);
      notifyError("Image deleted successfully!");
      if (product) {
        const result = imageUrl?.filter((i) => i !== img);
        setImageUrl(result);
      } else {
        setImageUrl("");
      }
    } catch (err) {
      console.error("err", err);
      notifyError(err.message || "Error deleting image");
      setLoading(false);
    }
  };
  
  return (
    <div className="w-full text-center dark:text-mainColor text-mainColor-light">
      <div
        className="border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md cursor-pointer px-6 pt-5 pb-6"
        {...getRootProps()}
      >
        <input {...getInputProps()} />
        <span className="mx-auto flex justify-center">
          <FiUploadCloud className="text-3xl text-customGreen" />
        </span>
        <p className="text-sm mt-2">{t("DragYourImage")}</p>
        <em className="text-xs text-gray-400">{t("imageFormat")}</em>
      </div>

      <div className="text-customGreen">{loading && err}</div>
      <aside className="flex flex-row flex-wrap mt-4">
        {product ? (
          <DndProvider backend={HTML5Backend}>
            <Container
              setImageUrl={setImageUrl}
              imageUrl={imageUrl}
              handleRemoveImage={handleRemoveImage}
            />
          </DndProvider>
        ) : !product && imageUrl ? (
          <div className="relative">
            <DriveImg
              className="inline-flex border rounded-md w-24 max-h-24 p-2 border-gray-100 dark:border-gray-600"
              src={imageUrl}
              alt="Image"
            />
            <button
              type="button"
              className="absolute top-0 right-0 text-red-500 focus:outline-none"
              onClick={() => handleRemoveImage(imageUrl)}
            >
              <FiXCircle />
            </button>
          </div>
        ) : (
          thumbs
        )}
      </aside>
    </div>
  );
};

export default Uploader;
