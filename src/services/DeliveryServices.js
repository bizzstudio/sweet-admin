import requests from "./httpService";

const DeliveryServices = {
  getAllDeliveries: async () => {
    return requests.get("/deliveries");
  },

  getDeliveryById: async (id) => {
    return requests.get(`/deliveries/${id}`);
  },

  addDelivery: async (body) => {
    return requests.post("/deliveries", body);
  },

  updateDelivery: async (id, body) => {
    return requests.put(`/deliveries/${id}`, body);
  },

  deleteDelivery: async (id) => {
    return requests.delete(`/deliveries/${id}`);
  },

  deleteManyDelivery: async (body) => {
    return requests.patch('/deliveries/delete/many', body);
  },

  addAllDelivery: async (body) => {
    return requests.post('/deliveries/add/all', body);
  },

  getUndeliverableAddressLogs: async (params = {}) => {
    const q = params.limit ? `?limit=${encodeURIComponent(params.limit)}` : "";
    return requests.get(`/deliveries/undeliverable-address-logs${q}`);
  },
};

export default DeliveryServices;
