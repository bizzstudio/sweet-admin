import requests from "./httpService";

// "איך הלקוח קורא למוצרים" — ההכרעות שנשמרו מתוך מסך ההזמנה (ProductAlias),
// לצפייה ועריכה בכרטיס הלקוח. ההכרעות עצמן נוצרות ב-IncomingOrderServices.resolveItem.
const ProductAliasServices = {
  // ההכרעות של הלקוח, עם פרטי המוצרים: { aliases: [...] }
  getCustomerAliases: async (customerId) => {
    return requests.get(`/product-aliases/customer/${customerId}`);
  },

  // החלפת רשימת המוצרים: products = [{ productId | sku }] — כל מוצר נכנס בכמות שבשורה
  updateAlias: async (aliasId, products) => {
    return requests.put(`/product-aliases/${aliasId}`, { products });
  },

  deleteAlias: async (aliasId) => {
    return requests.delete(`/product-aliases/${aliasId}`);
  },
};

export default ProductAliasServices;
