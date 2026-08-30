/**
 * קישורים חיצוניים של התפריט (route.outside).
 * חייבים <a> ולא NavLink: react-router v5 מתייחס ל-`to` כנתיב פנימי ומדביק
 * לו את ה-basename, כך שכתובת מלאה נשברת.
 *
 * משותף ל-SidebarContent (התפריט הצדדי) ול-Dashboard (לוח הבקרה),
 * כדי שכתובת החנות תוגדר במקום אחד בלבד.
 */
const OUTSIDE_LINKS = {
  store: import.meta.env.VITE_APP_STORE_DOMAIN,
  // ברירת המחדל היא לפי מוסכמת התת-תיקיות של שאר השירותים ב-srv2.
  // אם אפליקציית הליקוט תעלה לכתובת אחרת — להגדיר VITE_APP_LIKUTAPP_DOMAIN ב-.env.
  likutApp:
    import.meta.env.VITE_APP_LIKUTAPP_DOMAIN ||
    "https://srv2.bizzstudio.co.il/sweet-likut",
};

export default OUTSIDE_LINKS;
