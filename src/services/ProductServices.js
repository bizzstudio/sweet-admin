import requests from "./httpService";

const ProductServices = {
  getAllProducts: async ({ page, limit, category, title, price }) => {
    const searchCategory = category !== null ? category : "";
    const searchTitle = title !== null ? title : "";
    const searchPrice = price !== null ? price : "";

    return requests.get(
      `/products?page=${page}&limit=${limit}&category=${searchCategory}&title=${searchTitle}&price=${searchPrice}`
    );
  },

  // רשימת קטלוג רזה (מק"ט, שם, מחיר) לבוררי מוצרים — בלי התמונות והתיאורים
  getProductsLite: async () => {
    return requests.get("/products/lite");
  },

  // אותה רשימה, עם מזהה וקטגוריה — למסך שיוך הקטגוריות. השדות האלה אינם
  // חוזרים לבוררי המוצר, כדי לא לנפח את הקטלוג שנטען בכל מסך חיוב
  getProductsForCategoryAssign: async () => {
    return requests.get("/products/lite?withCategory=1");
  },

  // חיפוש מוצר לפי ברקוד (הקלדה או סורק). מחזיר מערך — הברקוד אינו
  // ייחודי במסד, ובחירה שקטה של אחד מכמה מוצרים הייתה מכניסה לתעודה
  // את המוצר הלא נכון.
  getProductByBarcode: async (barcode) => {
    return requests.get(`/products/by-barcode/${encodeURIComponent(barcode)}`);
  },

  // העברת מוצרים לקטגוריה אחרת. שדה יחיד שניתן לשינוי — בניגוד ל-
  // updateManyProducts שמקבל כל שדה שנשלח אליו
  bulkChangeCategory: async ({ ids, category }) => {
    return requests.patch("/products/bulk-category", { ids, category });
  },

  getProductById: async (id) => {
    return requests.post(`/products/${id}`);
  },

  // כרטיס מוצר מלא לצפייה: כולל את נתוני ההנהח"ש (erp) שלא חוזרים
  // מ-getProductById כי הם מוגדרים select:false במודל
  getProductDetails: async (id) => {
    return requests.get(`/products/${id}/details`);
  },
  addProduct: async (body) => {
    return requests.post("/products/add", body);
  },
  // בדיקה מקדימה לפני יבוא אקסל: {skus, groups} -> מה קיים ואילו קטגוריות חסרות
  checkImportProducts: async (body) => {
    return requests.post("/products/import/check", body);
  },
  // יבוא/עדכון מוצרים מאקסל לפי מק"ט: {rows, options}
  importProducts: async (body) => {
    return requests.post("/products/import", body);
  },
  updateProduct: async (id, body) => {
    // console.log('body: ', body)
    return requests.patch(`/products/${id}`, body);
  },
  updateProductPrice: async (id, body) => {
    // console.log('body: ', body)
    return requests.patch(`/products/updatePrice/${id}`, body);
  },
  updateManyProducts: async (body) => {
    return requests.patch("products/update/many", body);
  },
  updateStatus: async (id, body) => {
    return requests.put(`/products/status/${id}`, body);
  },

  deleteProduct: async (id) => {
    return requests.delete(`/products/${id}`);
  },
  deleteManyProducts: async (body) => {
    return requests.patch("/products/delete/many", body);
  },
};

export default ProductServices;
