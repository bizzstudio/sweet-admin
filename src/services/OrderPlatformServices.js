import requests from "./httpService";

// ── פלטפורמות ההזמנות ──
//
// פלטפורמה (Zestt וכדומה) שולחת מייל שאין בו הזמנה — רק כפתור "לצפייה
// בהזמנה". השרת פותח את הכפתור בדפדפן שרץ אצלו וקורא את ההזמנה משם.
//
// כל מה שכאן הוא פעולה שנעשית **פעם אחת לפלטפורמה** (אישור, התחברות) או
// **פעם אחת ללקוח** (מיפוי) — לא פעם אחת להזמנה.
const OrderPlatformServices = {
  getAllPlatforms: async ({ status } = {}) => {
    const query = status && status !== "all" ? `?status=${encodeURIComponent(status)}` : "";
    return requests.get(`/order-platforms${query}`);
  },

  getPlatformById: async (id) => {
    return requests.get(`/order-platforms/${id}`);
  },

  // "כן, זו פלטפורמת הזמנות" — ומעבד את ההודעות שהמתינו
  approvePlatform: async (id, body = {}) => {
    return requests.post(`/order-platforms/${id}/approve`, body);
  },

  updatePlatform: async (id, body) => {
    return requests.put(`/order-platforms/${id}`, body);
  },

  // התחברות אחת לפלטפורמה. הסשן נשמר בשרת ומשרת את כל הלקוחות שמזמינים דרכה.
  loginPlatform: async (id, body) => {
    return requests.post(`/order-platforms/${id}/login`, body);
  },

  // הדבקת סשן מהדפדפן — לפלטפורמה עם אימות דו-שלבי או CAPTCHA
  savePlatformSession: async (id, body) => {
    return requests.post(`/order-platforms/${id}/session`, body);
  },

  // בדיקה שההתחברות עבדה, בלי ליצור הזמנה
  testPlatformLink: async (id, body = {}) => {
    return requests.post(`/order-platforms/${id}/test`, body);
  },

  // "המסעדה הזאת אצלם היא הכרטיס הזה אצלנו"
  mapCustomer: async (id, body) => {
    return requests.post(`/order-platforms/${id}/map-customer`, body);
  },

  unmapCustomer: async (id, customerId) => {
    return requests.delete(`/order-platforms/${id}/map-customer/${customerId}`);
  },

  // מה למפות בהודעה הזו: המזהים שנמצאו בה + לקוחות מוצעים
  getMappingSuggestion: async (incomingOrderId) => {
    return requests.get(`/order-platforms/message/${incomingOrderId}/mapping-suggestion`);
  },

  // צילום המסך של הדף שנפתח (נטען בנפרד — הוא כבד)
  getMessageScreenshot: async (incomingOrderId) => {
    return requests.get(`/order-platforms/message/${incomingOrderId}/screenshot`);
  },
};

export default OrderPlatformServices;
