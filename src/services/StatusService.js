import requests from "./httpService";

const StatusServices = {
  // global Status all function
  addStatus: async (body) => {
    return requests.post("/status", body);
  },

  getAllStatuses: async ({ query = '' }) => {
    return requests.get("/status" + query);
  },

  updateStatus: async (id, body) => {
    return requests.put(`/status/${id}`, body);
  },
  getStatusById: async (id) => {
    return requests.get(`/status/${id}`);
  },
  deleteStatus: async (id) => {
    return requests.delete(`/status/${id}`);
  },
  deleteManyStatus: async (body) => {
    return requests.patch(`/status/delete-many`, body);
  }
};

export default StatusServices;
