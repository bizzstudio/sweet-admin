import requests from "./httpService";

// מחירון קבוצתי: מחירון אחד שמשויכים אליו כמה לקוחות. גובר על המחירון הפרטי
// של הלקוח בכל מק"ט שמופיע בו.
const GroupPriceListServices = {
  // כל הקבוצות, עם מזהי הלקוחות של כל אחת (בלי שורות המחירון)
  getAll: async () => {
    return requests.get("/group-price-list");
  },

  // קבוצה אחת עם שורות המחירון. תומך ב-{search, limit}
  getOne: async (id, params = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.limit) query.set("limit", String(params.limit));
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return requests.get(`/group-price-list/${id}${suffix}`);
  },

  // בדיקה מקדימה של קובץ מול הקטלוג: {rows}
  checkImport: async (body) => {
    return requests.post("/group-price-list/check", body);
  },

  // {name, rows, fileName, customers}
  create: async (body) => {
    return requests.post("/group-price-list", body);
  },

  // {name?, customers?, rows?, fileName?} — שדה שלא נשלח נשאר כמו שהוא.
  // rows דורס את המחירון במלואו; customers הוא הרשימה המלאה
  update: async (id, body) => {
    return requests.put(`/group-price-list/${id}`, body);
  },

  remove: async (id) => {
    return requests.delete(`/group-price-list/${id}`);
  },

  // שיוך לקוח אחד מכרטיס הלקוח: groupId ריק = בלי מחירון קבוצתי
  setCustomerGroup: async (customerId, groupId) => {
    return requests.put(`/group-price-list/customer/${customerId}`, {
      groupId: groupId || null,
    });
  },
};

export default GroupPriceListServices;
