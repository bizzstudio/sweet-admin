// src/components/drawer/CategoryDrawer.jsx
import { Input, WindmillContext } from '@windmill/react-ui';
import {
  SimpleTreeView,
  TreeItem,
} from '@mui/x-tree-view';
import { FiFolder } from 'react-icons/fi';
import React, { useContext, useMemo } from 'react';
import Scrollbars from 'react-custom-scrollbars-2';
import { useTranslation } from 'react-i18next';

// Internal imports
import { notifyError } from '@/utils/toast';
import Error from '@/components/form/others/Error';
import Title from '@/components/form/others/Title';
import InputArea from '@/components/form/input/InputArea';
import LabelArea from '@/components/form/selectOption/LabelArea';
import SwitchToggle from '@/components/form/switch/SwitchToggle';
import TextAreaCom from '@/components/form/input/TextAreaCom';
import Uploader from '@/components/image-uploader/Uploader';
import useCategorySubmit from '@/hooks/useCategorySubmit';
import CategoryServices from '@/services/CategoryServices';
import DrawerButton from '@/components/form/button/DrawerButton';
import useUtilsFunction from '@/hooks/useUtilsFunction';
import { GoDotFill } from 'react-icons/go';

const CategoryDrawer = ({ id, data }) => {
  const { t } = useTranslation();
  const { mode } = useContext(WindmillContext);

  const {
    checked,
    register,
    onSubmit,
    handleSubmit,
    errors,
    imageUrl,
    setImageUrl,
    coloredImageUrl,
    setColoredImageUrl,
    published,
    setPublished,
    setChecked,
    selectCategoryName,
    setSelectCategoryName,
    handleSelectLanguage,
    isSubmitting,
  } = useCategorySubmit(id, data);

  const { showingTranslateValue } = useUtilsFunction();

  /* ---------- Tree items with icon ---------- */
  const treeNodes = useMemo(() => {
    const map = (cats) =>
      cats.map((c) => (
        <TreeItem
          key={c._id}
          itemId={c._id}
          label={
            <span className="flex items-center gap-2">
              {c.icon ? (
                <img
                  src={c.icon}
                  alt=""
                  className="w-6 h-6 my-1 object-contain rounded" style={{ filter: mode === 'dark' ? 'brightness(0) saturate(100%) invert(100%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(100%) contrast(100%)' : 'invert(0%)' }}
                />
              ) : (
                <GoDotFill size={16} className="text-gray-400" />
              )}
              {showingTranslateValue(c.name)}
            </span>
          }
        >
          {c.children?.length ? map(c.children) : null}
        </TreeItem>
      ));
    return map(data);
  }, [data, showingTranslateValue]);

  /* ---------- Category select ---------- */
  const handleSelect = async (event, ids) => {
    const nodeId = Array.isArray(ids) ? ids[0] : ids;
    if (!nodeId) return;

    if (id) {
      const parent = await CategoryServices.getCategoryById(nodeId);
      if (id === nodeId || id === parent.parentId) {
        return notifyError("This can't be select as a parent category!");
      }
    }
    setChecked(nodeId);

    const find = (obj, target) =>
      obj._id === target
        ? obj
        : obj.children?.reduce((acc, o) => acc ?? find(o, target), undefined);

    const result = find(data[0], nodeId);
    setSelectCategoryName(showingTranslateValue(result?.name));
  };

  return (
    <>
      {/* ---------- Header ---------- */}
      <div className="w-full relative p-6 border-b border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
        {id ? (
          <Title
            register={register}
            handleSelectLanguage={handleSelectLanguage}
            title={t('UpdateCategory')}
            description={t('UpdateCategoryDescription')}
          />
        ) : (
          <Title
            register={register}
            handleSelectLanguage={handleSelectLanguage}
            title={t('AddCategoryTitle')}
            description={t('AddCategoryDescription')}
          />
        )}
      </div>

      {/* ---------- Body ---------- */}
      <Scrollbars className="w-full md:w-7/12 lg:w-8/12 xl:w-8/12 relative dark:bg-gray-700 dark:text-gray-200">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="px-6 pt-8 flex-grow scrollbar-hide w-full max-h-full pb-40">
            {/* --- Name --- */}
            <div className="grid grid-cols-6 gap-1 mb-6">
              <LabelArea label={t('Name')} />
              <div className="col-span-6">
                <InputArea
                  register={register}
                  label="Category title"
                  name="name"
                  type="text"
                  placeholder={t('ParentCategoryPlaceholder')}
                />
                <Error errorName={errors.name} />
              </div>
            </div>

            {/* --- Slug --- */}
            <div className="grid grid-cols-6 gap-1 mb-6">
              <LabelArea label={t('Slug')} />
              <div className="col-span-6">
                <InputArea
                  register={register}
                  name="slug"
                  type="text"
                  placeholder={t('Slug')}
                />
                <Error errorName={errors.slug} />
              </div>
            </div>

            {/* --- Description --- */}
            <div className="grid grid-cols-6 gap-1 mb-6">
              <LabelArea label={t('Description')} />
              <div className="col-span-6">
                <TextAreaCom
                  required
                  register={register}
                  label="Description"
                  name="description"
                  type="text"
                  placeholder="Category Description"
                />
                <Error errorName={errors.description} />
              </div>
            </div>

            {/* --- Parent category picker --- */}
            <div className="grid grid-cols-6 gap-1 mb-6">
              <LabelArea label={t('ParentCategory')} />
              <div className="col-span-6 relative">
                <Input
                  readOnly
                  {...register('parent')}
                  value={selectCategoryName || 'Home'}
                  placeholder={t('ParentCategory')}
                  type="text"
                />

                <div className="vsc-tree mt-2 rounded-lg p-2 bg-gray-800/5 dark:bg-gray-100/5">
                  <SimpleTreeView
                    selectedItems={checked ? [checked] : []}
                    onSelectedItemsChange={handleSelect}
                    expansionTrigger="content"
                  >
                    {treeNodes}
                  </SimpleTreeView>
                </div>
              </div>
            </div>

            {/* --- Icons --- */}
            <div className="w-full flex flex-col gap-3 mb-6">
              <div className="w-full">
                <LabelArea label={t('CategoryIcon')} />
                <div className="h-1" />
                <Uploader
                  imageUrl={imageUrl}
                  setImageUrl={setImageUrl}
                  folder="category"
                />
              </div>
              <div className="w-full">
                <LabelArea label={t('CategoryColoredIcon')} />
                <div className="h-1" />
                <Uploader
                  imageUrl={coloredImageUrl}
                  setImageUrl={setColoredImageUrl}
                  folder="category"
                />
              </div>
            </div>

            {/* --- Published --- */}
            <div className="grid grid-cols-6 gap-1 mb-6">
              <LabelArea label={t('Published')} />
              <div className="col-span-6">
                <SwitchToggle
                  handleProcess={setPublished}
                  processOption={published}
                />
              </div>
            </div>
          </div>

          <DrawerButton id={id} title={t("category")} isSubmitting={isSubmitting} />
        </form>
      </Scrollbars>

      {/* ---------- VS-Code-like look & feel ---------- */}
      <style>{`
        .vsc-tree .MuiTreeItem-content {
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.875rem;
        }
        .vsc-tree .MuiTreeItem-content:hover {
          background: #094771;
          color: #fff;
        }
        .vsc-tree .Mui-selected > .MuiTreeItem-content {
          background: #094771;
          color: #fff;
        }
        .vsc-tree .MuiTreeItem-group {
          margin-left: 12px;
          border-left: 1px solid #3a3d41;
        }
        [dir="rtl"] .vsc-tree .MuiTreeItem-group {
          margin-left: 0;
          margin-right: 12px;
          border-left: 0;
          border-right: 1px solid #3a3d41;
        }
        .dark .vsc-tree .MuiTreeItem-group {
          border-color: #6b7280;
        }
        [dir="rtl"] .vsc-tree .MuiTreeItem-iconContainer {
          transform: scaleX(-1);
        }
      `}</style>
    </>
  );
};

export default CategoryDrawer;