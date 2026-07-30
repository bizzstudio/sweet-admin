import requests from "./httpService";

const LotteryServices = {
  getAll: async () => {
    return requests.get("/admin/lotteries");
  },

  getById: async (id) => {
    return requests.get(`/admin/lotteries/${id}`);
  },

  getParticipants: async (id) => {
    return requests.get(`/admin/lotteries/${id}/participants`);
  },

  create: async (body) => {
    return requests.post("/admin/lotteries", body);
  },

  refreshParticipants: async (id) => {
    return requests.post(`/admin/lotteries/${id}/refresh-participants`, {});
  },

  draw: async (id) => {
    return requests.post(`/admin/lotteries/${id}/draw`, {});
  },

  delete: async (id) => {
    return requests.delete(`/admin/lotteries/${id}`);
  },
};

export default LotteryServices;
