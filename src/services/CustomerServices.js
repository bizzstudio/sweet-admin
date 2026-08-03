import requests from "./httpService";

const CustomerServices = {
  getAllCustomers: async ({ searchText = "" }) => {
    return requests.get(`/customer?searchText=${searchText}`);
  },

  // בדיקה מקדימה לפני יבוא אקסל: {customerNumbers, emails, phones}
  checkImportCustomers: async (body) => {
    return requests.post("/customer/import/check", body);
  },
  // יבוא/עדכון לקוחות מאקסל לפי מספר לקוח: {rows, options}
  importCustomers: async (body) => {
    return requests.post("/customer/import", body);
  },
  // user create
  createCustomer: async (body) => {
    return requests.post(`/customer/create`, body);
  },

  filterCustomer: async (email) => {
    return requests.post(`/customer/filter/${email}`);
  },

  getCustomerById: async (id) => {
    return requests.get(`/customer/${id}`);
  },

  // כרטיס לקוח מלא לצפייה: כולל את נתוני ההנהח"ש (erp) שלא חוזרים
  // מ-getCustomerById כי הם מוגדרים select:false במודל
  getCustomerDetails: async (id) => {
    return requests.get(`/customer/${id}/details`);
  },

  updateCustomer: async (id, body) => {
    return requests.put(`/customer/${id}`, body);
  },

  deleteCustomer: async (id) => {
    return requests.delete(`/customer/${id}`);
  },

  toggleCashier: async (id, body) => {
    return requests.put(`/customer/toggle-cashier/${id}`, body);
  },
};

export default CustomerServices;
