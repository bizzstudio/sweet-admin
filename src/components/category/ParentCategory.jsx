import { useContext, useMemo } from "react";
import { SimpleTreeView, TreeItem, RichTreeView } from "@mui/x-tree-view";
import { FiFolder } from "react-icons/fi";
import { GoDotFill } from "react-icons/go";

// Internal import
import useAsync from "@/hooks/useAsync";
import { notifySuccess } from "@/utils/toast";
import CategoryServices from "@/services/CategoryServices";
import useUtilsFunction from "@/hooks/useUtilsFunction";
import { WindmillContext } from "@windmill/react-ui";

// Custom TreeItem component to hide checkbox for root categories
const CustomTreeItem = ({ children, hideCheckbox, ...props }) => {
  return (
    <TreeItem
      {...props}
      slotProps={{
        checkbox: hideCheckbox ? { style: { display: 'none' } } : {}
      }}
    >
      {children}
    </TreeItem>
  );
};

const ParentCategory = ({
  selectedCategory,
  setSelectedCategory,
  setDefaultCategory,
}) => {
  const { data, loading } = useAsync(CategoryServices?.getAllCategory);
  const { showingTranslateValue } = useUtilsFunction();
  const { mode } = useContext(WindmillContext);
  console.log('data :>> ', data);

  // Convert categories to tree structure for @mui/x-tree-view
  const treeNodes = useMemo(() => {
    const map = (cats, isRoot = false) =>
      cats.map((c) => (
        <CustomTreeItem
          key={c._id}
          itemId={c._id}
          hideCheckbox={isRoot}
          label={
            <span className="flex items-center gap-2">
              {c.icon ? (
                <img
                  src={c.icon}
                  alt=""
                  className="w-6 h-6 my-1 object-contain rounded" style={{ filter: mode === 'dark' ? 'brightness(0) saturate(100%) invert(100%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(100%) contrast(100%)' : 'invert(0%)' }}
                />
              ) : (
                <GoDotFill size={16} className="text-gray-500" />
              )}
              {showingTranslateValue(c.name)}
            </span>
          }
        >
          {c.children?.length ? map(c.children, false) : null}
        </CustomTreeItem>
      ));
    return data ? map(data, true) : []; // isRoot = true for first level
  }, [data, showingTranslateValue]);

  // Find category object by ID
  const findObject = (obj, target) => {
    return obj._id === target
      ? obj
      : obj?.children?.reduce(
          (acc, obj) => acc ?? findObject(obj, target),
          undefined
        );
  };

  // Handle selection changes (both adding and removing)
  const handleSelectionChange = (event, selectedIds) => {
    if (!data || data.length === 0) return;
    
    const obj = data[0];
    const currentSelectedIds = selectedCategory.map(cat => cat._id);
    
    // Find newly selected items (added)
    const addedIds = selectedIds.filter(id => !currentSelectedIds.includes(id));
    
    // Find deselected items (removed)
    const removedIds = currentSelectedIds.filter(id => !selectedIds.includes(id));
    
    let newSelectedCategories = [...selectedCategory];
    
    // Add new categories
    addedIds.forEach(id => {
      const result = findObject(obj, id);
      if (result) {
        newSelectedCategories.push({
          _id: result._id,
          name: showingTranslateValue(result.name),
        });
      }
    });
    
    // Remove deselected categories
    newSelectedCategories = newSelectedCategories.filter(cat => !removedIds.includes(cat._id));
    
    setSelectedCategory(newSelectedCategories);
    
    // Update default category
    if (newSelectedCategories.length > 0) {
      // Keep current default if it's still selected, otherwise use first selected
      const currentDefault = selectedCategory.find(cat => cat._id === newSelectedCategories[0]?._id);
      setDefaultCategory([currentDefault || newSelectedCategories[0]]);
    } else {
      setDefaultCategory([]);
    }
  };

  // Handle removing categories from the tag display
  const handleRemove = (categoryToRemove) => {
    const newSelectedCategories = selectedCategory.filter(cat => cat._id !== categoryToRemove._id);
    setSelectedCategory(newSelectedCategories);
    
    // Update default category if the removed one was the default
    if (newSelectedCategories.length > 0) {
      setDefaultCategory([newSelectedCategories[0]]);
    } else {
      setDefaultCategory([]);
    }
  };

  // Get selected IDs for the tree view
  const selectedIds = selectedCategory.map(cat => cat._id);

  return (
    <>
      {/* Display selected categories */}
      {/* <div className="mb-2">
        <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-gray-50 dark:bg-gray-800 dark:border-gray-600 min-h-[40px]">
          {selectedCategory.length === 0 ? (
            <span className="text-gray-500 dark:text-gray-400 text-sm">Select Categories</span>
          ) : (
            selectedCategory.map((category) => (
              <span
                key={category._id}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm rounded-md"
              >
                {category.name}
                <button
                  onClick={() => handleRemove(category)}
                  className="ml-1 text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100"
                >
                  ×
                </button>
              </span>
            ))
          )}
        </div>
      </div> */}

      {/* Tree view for category selection */}
      {!loading && data && (
        <div className="vsc-tree rounded-lg p-[10px] bg-gray-800/5 dark:bg-gray-100/5">
          <SimpleTreeView
            multiSelect
            checkboxSelection
            selectedItems={selectedIds}
            onSelectedItemsChange={handleSelectionChange}
            expansionTrigger="content"
          >
            {treeNodes}
          </SimpleTreeView>
        </div>
      )}

      {/* VS Code-like styling with improved dark mode support */}
      <style>{`
        .vsc-tree .MuiTreeItem-content {
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.875rem;
          color: inherit;
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
        .dark .vsc-tree .MuiTreeItem-content {
          color: #e5e7eb;
        }
        .dark .vsc-tree .MuiTreeItem-content:hover {
          background: #1e40af;
          color: #fff;
        }
        .dark .vsc-tree .Mui-selected > .MuiTreeItem-content {
          background: #1e40af;
          color: #fff;
        }
        [dir="rtl"] .vsc-tree .MuiTreeItem-iconContainer {
          transform: scaleX(-1);
        }
        
        /* Checkbox styling for better dark mode support */
        .dark .vsc-tree .MuiCheckbox-root {
          color: #9ca3af;
        }
        .dark .vsc-tree .MuiCheckbox-root.Mui-checked {
          color: #3b82f6;
        }
      `}</style>
    </>
  );
};

export default ParentCategory;