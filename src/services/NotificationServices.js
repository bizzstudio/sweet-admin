import requests from './httpService';

const NotificationServices = {
  addNotification: async (body) => {
    return requests.post('/notification/add', body);
  },

  getAllNotification: async (page = 1) => {
    return requests.get(`/notification?page=${page}`);
  },

  updateStatus: async (id, body) => {
    return requests.put(`/notification/${id}`, body);
  },

  deleteNotification: async (id) => {
    return requests.delete(`/notification/${id}`);
  },
};

export default NotificationServices;
