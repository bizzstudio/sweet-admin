import requests from "./httpService";

const PopupServices = {
  // Add a new popup
  addPopup: async (body) => {
    return requests.post("/popup/add", body);
  },

  // Get all popups
  getAllPopups: async () => {
    return requests.get("/popup/all");
  },

  // Get popup by ID
  getPopupById: async (id) => {
    return requests.get(`/popup/${id}`);
  },

  // Update a popup by ID
  updatePopup: async (id, body) => {
    return requests.put(`/popup/${id}`, body);
  },

  // Delete a popup by ID
  deletePopup: async (id) => {
    return requests.delete(`/popup/${id}`);
  },

  // Delete multiple popups by IDs
  deleteManyPopups: async (body) => {
    return requests.post(`/popup/delete-many`, body);
  }
};

export default PopupServices;
