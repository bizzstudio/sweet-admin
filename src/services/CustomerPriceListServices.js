import requests from "./httpService";

// המחירון הפרטי של לקוח: מק"ט → מחיר. לקוח בלי מחירון משלם את מחירי הקטלוג.
const CustomerPriceListServices = {
  // למי יש מחירון וכמה שורות — לרשימת הלקוחות (בלי השורות עצמן)
  getSummary: async () => {
    return requests.get("/customer-price-list");
  },

  // המחירון של לקוח, מועשר בנתוני הקטלוג. תומך ב-{search, limit}
  getCustomerPriceList: async (customerId, params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.limit) query.set("limit", String(params.limit));
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return requests.get(`/customer-price-list/${customerId}${suffix}`);
  },

  // בדיקה מקדימה לפני יבוא: {rows}
  checkImport: async (customerId, body) => {
    return requests.post(`/customer-price-list/${customerId}/check`, body);
  },

  // יבוא מחירון — דורס את המחירון הקודם במלואו: {rows, fileName}
  importPriceList: async (customerId, body) => {
    return requests.post(`/customer-price-list/${customerId}`, body);
  },

  deletePriceList: async (customerId) => {
    return requests.delete(`/customer-price-list/${customerId}`);
  },
};

export default CustomerPriceListServices;
