import requests from "./httpService";

const BillingServices = {
  // --- iCount ---
  getIcountStatus: async () => {
    return requests.get("/billing/icount/status");
  },

  syncCustomerToIcount: async (customerId) => {
    return requests.post(`/billing/icount/sync-customer/${customerId}`, {});
  },

  // --- תעודות משלוח ---
  getDeliveryNotes: async (params = {}) => {
    const q = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== "")
    ).toString();
    return requests.get(`/billing/delivery-notes${q ? `?${q}` : ""}`);
  },

  getDeliveryNote: async (id) => {
    return requests.get(`/billing/delivery-notes/${id}`);
  },

  // התעודות של הזמנה מסוימת. מחזיר {note, notes, manualNotes};
  // note=null כשאין תעודה אוטומטית — מצב תקין ולא שגיאה
  getDeliveryNoteByOrder: async (orderId) => {
    return requests.get(`/billing/delivery-notes/by-order/${orderId}`);
  },

  // השורות הנשקלות של ההזמנה שעדיין לא הוקלדו — ממלאות מראש את הטופס הידני
  getPendingManualItems: async (orderId) => {
    return requests.get(`/billing/delivery-notes/pending-manual/${orderId}`);
  },

  // תעודה ידנית — פירות וירקות, במשקל שנשקל בפועל.
  // idempotencyKey נשלח מהטופס כדי ששליחה כפולה לא תפיק שתי תעודות
  createManualDeliveryNote: async (body) => {
    return requests.post("/billing/delivery-notes/manual", body);
  },

  // status: paid | unpaid | overdue
  getInvoices: async (params = {}) => {
    const q = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== "")
    ).toString();
    return requests.get(`/billing/invoices${q ? `?${q}` : ""}`);
  },

  createDeliveryNoteFromOrder: async (orderId) => {
    return requests.post(`/billing/delivery-notes/from-order/${orderId}`, {});
  },

  cancelDeliveryNote: async (id, reason) => {
    return requests.patch(`/billing/delivery-notes/${id}/cancel`, { reason });
  },

  // --- סגירת חודש ---
  previewMonth: async (params = {}) => {
    const q = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== "")
    ).toString();
    return requests.get(`/billing/month/preview${q ? `?${q}` : ""}`);
  },

  // confirm:true נשלח מכאן ולא מהשרת בכוונה — ההפקה חייבת להיות פעולה
  // מפורשת של מי שלחץ, ולא ברירת מחדל של הקריאה
  closeMonth: async ({ month, customer, emailDocument = false }) => {
    return requests.post("/billing/month/close", {
      confirm: true,
      month,
      customer,
      emailDocument,
    });
  },

  // --- זיכוי וקבלה ---
  creditInvoice: async ({ icountDocNum, reason, reopenNotes = true }) => {
    return requests.post("/billing/credit", { icountDocNum, reason, reopenNotes });
  },

  // הסכום המחייב מ-iCount. נקרא לפני רישום תשלום, כי הרשימה מציגה אומדן
  getInvoiceTotal: async (docNum) => {
    return requests.get(`/billing/invoices/${docNum}/total`);
  },

  createReceipt: async (body) => {
    return requests.post("/billing/receipt", body);
  },

  // כל המסמכים של הלקוח בקריאה אחת — לכרטיס הלקוח
  getCustomerDocuments: async (customerId) => {
    return requests.get(`/billing/customer/${customerId}/documents`);
  },

  getCustomerOpenInvoices: async (customerId) => {
    return requests.get(`/billing/customer/${customerId}/open-invoices`);
  },

  // --- הצעות מחיר ---
  // תמחור מקדים: מה יעלו הפריטים ללקוח הזה, לפני שמפיקים
  priceItems: async ({ customer, items }) => {
    return requests.post("/billing/quotes/price-items", { customer, items });
  },

  getQuotes: async (params = {}) => {
    const q = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== "")
    ).toString();
    return requests.get(`/billing/quotes${q ? `?${q}` : ""}`);
  },

  getQuote: async (id) => {
    return requests.get(`/billing/quotes/${id}`);
  },

  createQuote: async (body) => {
    return requests.post("/billing/quotes", body);
  },

  acceptQuote: async (id, orderId) => {
    return requests.patch(`/billing/quotes/${id}/accept`, { orderId });
  },

  rejectQuote: async (id, reason) => {
    return requests.patch(`/billing/quotes/${id}/reject`, { reason });
  },
};

export default BillingServices;
