// src/hooks/useToggleDrawer.js
import { useContext, useEffect, useState } from "react";
import { SidebarContext } from "@/context/SidebarContext";

const useToggleDrawer = () => {
  const [allId, setAllId] = useState([]);
  const [title, setTitle] = useState("");
  const {
    toggleDrawer,
    isDrawerOpen,
    toggleModal,
    toggleBulkDrawer,
    serviceId,
    setServiceId,
  } = useContext(SidebarContext);

  const handleUpdate = (id) => {
    setServiceId(id);
    toggleDrawer();
  };

  const handleUpdateMany = (id) => {
    setAllId(id);
    toggleBulkDrawer();
  };

  const handleModalOpen = (id, title) => {
    setServiceId(id);
    toggleModal();
    setTitle(title);
  };

  useEffect(() => {
    if (!isDrawerOpen) {
      setServiceId();
    }
  }, [isDrawerOpen]);

  const handleDeleteMany = async (id, products) => {
    setAllId(id);
    toggleModal();
    setTitle("Selected items");
  };

  return {
    title,
    allId,
    serviceId,
    handleUpdate,
    setServiceId,
    handleModalOpen,
    handleDeleteMany,
    handleUpdateMany,
  };
};

export default useToggleDrawer;
