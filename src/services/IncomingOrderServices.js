import requests from "./httpService";

const IncomingOrderServices = {
  // רשימת ההודעות שנקלטו מהמייל ומווצאפ
  getAllIncomingOrders: async ({ status, channel, search, page, limit } = {}) => {
    const params = new URLSearchParams();
    if (status && status !== "all") params.append("status", status);
    if (channel && channel !== "all") params.append("channel", channel);
    if (search) params.append("search", search);
    if (page) params.append("page", page);
    if (limit) params.append("limit", limit);

    const query = params.toString();
    return requests.get(`/incoming-orders${query ? `?${query}` : ""}`);
  },

  getIncomingOrderById: async (id) => {
    return requests.get(`/incoming-orders/${id}`);
  },

  // הרצה חוזרת של הודעה שנכשלה
  retryIncomingOrder: async (id) => {
    return requests.post(`/incoming-orders/${id}/retry`);
  },

  // עיבוד הודעה שממתינה להודעות המשך, בלי להמתין לסוף חלון השקט
  processCollectedNow: async (id) => {
    return requests.post(`/incoming-orders/${id}/process-now`);
  },

  // סימון הודעה כלא רלוונטית
  ignoreIncomingOrder: async (id) => {
    return requests.put(`/incoming-orders/${id}/ignore`);
  },

  // ── הרשימה הלבנה: המערכת קוראת רק מלקוחות קיימים ──

  // "השולח הזה לקוח חדש שלנו" — יוצר כרטיס לקוח וקורא את ההודעה מחדש
  approveSender: async (id, body = {}) => {
    return requests.post(`/incoming-orders/${id}/approve-sender`, body);
  },

  // מצב הרשימה הלבנה
  getWhitelistStats: async () => {
    return requests.get("/incoming-orders/whitelist/stats");
  },

  // ── פעולות על הזמנה שנכנסה ב"שגיאה בקריאה" ──

  // אישור ההזמנה: מעביר ל"בטיפול" ומוריד מלאי.
  // חייב לעבור מכאן ולא משינוי סטטוס ידני — שינוי סטטוס לא מוריד מלאי.
  approveErrorOrder: async (orderId) => {
    return requests.post(`/incoming-orders/order/${orderId}/approve`);
  },

  // הרצה חוזרת של ההודעה המקורית (מוחקת את הזמנת השגיאה ויוצרת חדשה)
  retryFromOrder: async (orderId) => {
    return requests.post(`/incoming-orders/order/${orderId}/retry`);
  },

  // סריקת תיבת המייל עכשיו, בלי לחכות לסריקה המתוזמנת
  scanEmailNow: async (body = {}) => {
    return requests.post("/incoming-orders/scan-email", body);
  },

  // הרצת טקסט חופשי דרך הצינור — לכיול על הזמנות אמיתיות
  testIngestion: async (body) => {
    return requests.post("/incoming-orders/test", body);
  },
};

export default IncomingOrderServices;
