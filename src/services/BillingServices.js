import requests from "./httpService";

const BillingServices = {
  // --- iCount ---
  getIcountStatus: async () => {
    return requests.get("/billing/icount/status");
  },

  syncCustomerToIcount: async (customerId) => {
    return requests.post(`/billing/icount/sync-customer/${customerId}`, {});
  },

  // המצב הפעיל בלבד. בניגוד ל-getIcountStatus הוא אינו מתחבר ל-iCount,
  // ולכן מתאים לבאנר שנטען בכל מסך חיוב
  getIcountMode: async () => {
    return requests.get("/billing/icount/mode");
  },

  // --- דמו ---
  // כל אלה מחזירים 409 כשהשרת מחובר לחשבון האמיתי
  getDemoOptions: async () => {
    return requests.get("/billing/demo/options");
  },

  // deliveryNoteId — הפקה על בסיס תעודה קיימת (התעודה עצמה לא משתנה);
  // customerId — הפקה על סל ההדגמה הקבוע
  createDemoInvoice: async ({ deliveryNoteId, customerId }) => {
    return requests.post("/billing/demo/invoice", { deliveryNoteId, customerId });
  },

  getDemoInvoiceTotal: async (docNum) => {
    return requests.get(`/billing/demo/invoice/${docNum}/total`);
  },

  createDemoCredit: async ({ docNum, reason }) => {
    return requests.post("/billing/demo/credit", { docNum, reason });
  },

  createDemoReceipt: async ({ docNum, method }) => {
    return requests.post("/billing/demo/receipt", { docNum, method });
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

  // עריכת תעודה שעדיין לא חויבה. שדה שלא נשלח לא משתנה; תעודה שחויבה
  // נדחית בשרת עם ההסבר (התיקון עובר דרך זיכוי).
  updateDeliveryNote: async (id, body) => {
    return requests.patch(`/billing/delivery-notes/${id}`, body);
  },

  // "עוד אחת בדיוק כמו זו". idempotencyKey מונע שתי תעודות מלחיצה כפולה
  duplicateDeliveryNote: async (id, body = {}) => {
    return requests.post(`/billing/delivery-notes/${id}/duplicate`, body);
  },

  // הפיכת תעודה בודדת לחשבונית מס, בלי להמתין לסגירת החודש
  billDeliveryNote: async (id, body = {}) => {
    return requests.post(`/billing/delivery-notes/${id}/bill`, body);
  },

  // --- הדפסה ---
  // התעודה מודפסת אוטומטית ברגע שהיא נוצרת; שתי אלה קיימות למקרה שההדפסה
  // האוטומטית לא הגיעה ליעדה (מדפסת כבויה, המחשב במשרד לא דלוק).
  reprintDeliveryNote: async (id) => {
    return requests.post(`/billing/delivery-notes/${id}/reprint`, {});
  },

  getDeliveryNotePrintStatus: async (id) => {
    return requests.get(`/billing/delivery-notes/${id}/print-status`);
  },

  // --- סגירת חודש ---
  // מחזיר תמיד את כל התעודות הפתוחות. הבחירה נעשית במסך, ונשלחת רק
  // בהפקה עצמה — התצוגה המקדימה היא הרשימה שממנה בוחרים.
  previewMonth: async (params = {}) => {
    const q = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== "")
    ).toString();
    return requests.get(`/billing/month/preview${q ? `?${q}` : ""}`);
  },

  // הלקוחות שיש להם תעודות פתוחות בחודש — למילוי בורר הלקוח
  getOpenCustomers: async ({ month } = {}) => {
    const q = new URLSearchParams(month ? { month } : {}).toString();
    return requests.get(`/billing/month/open-customers${q ? `?${q}` : ""}`);
  },

  // confirm:true נשלח מכאן ולא מהשרת בכוונה — ההפקה חייבת להיות פעולה
  // מפורשת של מי שלחץ, ולא ברירת מחדל של הקריאה.
  //
  // notes ריק = כל התעודות הפתוחות של החודש. notes מלא = הפקה חלקית על
  // התעודות שסומנו בלבד, ומחייב customer.
  //
  // emailDocument אינו נשלח כברירת מחדל: השרת שולח כל חשבונית ללקוח במייל,
  // ושליחת false מכאן הייתה מבטלת את זה בשקט. הוא עובר רק כשמישהו בחר במפורש.
  closeMonth: async ({ month, customer, notes, emailDocument }) => {
    return requests.post("/billing/month/close", {
      confirm: true,
      month,
      customer,
      notes: notes?.length ? notes : undefined,
      ...(typeof emailDocument === "boolean" ? { emailDocument } : {}),
    });
  },

  // --- זיכוי וקבלה ---
  creditInvoice: async ({ icountDocNum, reason, reopenNotes = true }) => {
    return requests.post("/billing/credit", { icountDocNum, reason, reopenNotes });
  },

  // ריכוז התעודות שהחשבונית סגרה — הנספח המודפס שמצורף אליה
  getInvoiceNotes: async (docNum) => {
    return requests.get(`/billing/invoices/${encodeURIComponent(docNum)}/notes`);
  },

  // הסכום המחייב מ-iCount. נקרא לפני רישום תשלום, כי הרשימה מציגה אומדן
  getInvoiceTotal: async (docNum) => {
    return requests.get(`/billing/invoices/${docNum}/total`);
  },

  createReceipt: async (body) => {
    return requests.post("/billing/receipt", body);
  },

  // כל הקבלות שהופקו. from/to הם תאריכי תשלום בפורמט YYYY-MM-DD
  getReceipts: async (params = {}) => {
    const q = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== "" && v !== null)
    ).toString();
    return requests.get(`/billing/receipts${q ? `?${q}` : ""}`);
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

  duplicateQuote: async (id, body = {}) => {
    return requests.post(`/billing/quotes/${id}/duplicate`, body);
  },

  // target: "deliveryNote" (ברירת מחדל) | "invoice"
  //
  // אין כאן idempotencyKey: השרת גוזר אותו מההצעה עצמה, כדי ששתי לחיצות
  // נפרדות (או שני מסכים פתוחים) לא יוכלו להפיק שתי תעודות על אותה סחורה
  convertQuote: async (id, { target } = {}) => {
    return requests.post(`/billing/quotes/${id}/convert`, { target });
  },
};

export default BillingServices;
