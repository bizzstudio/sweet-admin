import requests from "./httpService";

const MessageServices = {
  // Add a new message
  addMessage: async (body) => {
    return requests.post("/message/add", body);
  },

  // Get all messages
  getAllMessages: async () => {
    return requests.get("/message/all");
  },

  // Get message by ID
  getMessageById: async (id) => {
    return requests.get(`/message/${id}`);
  },

  // Get message by role
  getMessageByRole: async (role) => {
    return requests.get(`/message/role/${role}`);
  },

  // Get Survey Data
  getSurveyData: async () => {
    return requests.get(`/message/getSurvey/data`);
  },

  // Update a message by ID
  updateMessage: async (id, body) => {
    return requests.put(`/message/${id}`, body);
  },

  // Delete a message by ID
  deleteMessage: async (id) => {
    return requests.delete(`/message/${id}`);
  },

  // Delete multiple messages by IDs
  deleteManyMessages: async (body) => {
    return requests.post(`/message/delete-many`, body);
  }
};

export default MessageServices;
