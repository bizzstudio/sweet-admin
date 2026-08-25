import requests from "./httpService";

// היסטוריית הרכישות של לקוח: מה הוא קנה בפועל, מיוצא ההנהח"ש.
// משמשת כשובר שוויון בקליטת הזמנות — כשמנוע ההתאמה מחזיר כמה מועמדים דומים,
// זה שהלקוח באמת קונה מוכרע אוטומטית במקום לחכות לאדם.
const CustomerHistoryServices = {
  // למי יש היסטוריה וכמה מוצרים — לרשימת הלקוחות (בלי השורות עצמן)
  getSummary: async () => {
    return requests.get("/customer-history");
  },

  // ההיסטוריה של לקוח, מועשרת בנתוני הקטלוג. תומך ב-{search, limit}
  getCustomerHistory: async (customerId, params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.limit) query.set("limit", String(params.limit));
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return requests.get(`/customer-history/${customerId}${suffix}`);
  },

  // בדיקה מקדימה: {rows, customerNumbers}. מחזירה גם כמה שורות תקועות
  // ההיסטוריה הזו הייתה פותרת — זה המספר שאומר אם הקובץ בכלל עוזר
  checkImport: async (customerId, body) => {
    return requests.post(`/customer-history/${customerId}/check`, body);
  },

  // יבוא — דורס את ההיסטוריה הקודמת במלואה: {rows, fileName, customerNumbers, force}
  // ‏force נדרש רק כשמספר הלקוח בקובץ סותר את זה שבכרטיס
  importHistory: async (customerId, body) => {
    return requests.post(`/customer-history/${customerId}`, body);
  },

  deleteHistory: async (customerId) => {
    return requests.delete(`/customer-history/${customerId}`);
  },
};

export default CustomerHistoryServices;
