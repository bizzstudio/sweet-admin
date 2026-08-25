import {
  FiGrid,
  FiUsers,
  FiUser,
  FiCompass,
  FiSettings,
  FiSlack,
  FiGlobe,
  FiTarget,
  FiGift,
  FiClipboard,
  FiUserCheck,
} from "react-icons/fi";
import { FaRegWindowRestore } from "react-icons/fa6";
import { GoDependabot } from "react-icons/go";
import { IoNewspaperOutline } from "react-icons/io5";
// import ChatbotIcon from '../../public/chatbot.svg';
import { FaRoute } from "react-icons/fa";

/**
 * ⚠ These are used just to render the Sidebar!
 * You can include any link here, local or external.
 *
 * If you're looking to actual Router routes, go to
 * `routes/index.js`
 */
const sidebar = [
  {
    path: "/dashboard", // the url
    icon: FiGrid, // icon
    name: "Dashboard", // name that appear in Sidebar
  },

  {
    icon: FiSlack,
    name: "Catalog",
    routes: [
      {
        path: "/products",
        name: "Products",
      },
      {
        path: "/categories",
        name: "Categories",
      },
      // ⛔ תכונות, קופונים ומבצעים כבויים (לא נמחקו) - להחזרה: להסיר את ההערה
      // {
      //   path: "/attributes",
      //   name: "Attributes",
      // },
      // {
      //   path: "/coupons",
      //   name: "Coupons",
      // },
      // {
      //   path: "/offers",
      //   name: "Offers",
      // },
    ],
  },

  {
    path: "/customers",
    icon: FiUsers,
    name: "Customers",
  },

  {
    icon: FiCompass,
    name: "Orders",
    routes: [
      {
        path: "/orders",
        name: "Orders",
      },
      // ⛔ הזמנות קופה כבויות (לא נמחקו) - להחזרה: להסיר את ההערה
      // {
      //   path: "/cashier-orders",
      //   name: "CashierOrders",
      // },
      {
        path: "/incoming-orders",
        name: "IncomingOrders",
      },
      {
        path: "/order-platforms",
        name: "OrderPlatforms",
      },
      // ⛔ סטטוסי הזמנה מוסתרים מהתפריט (הסטטוסים והדף עצמם נשארו) - להחזרה: להסיר את ההערה
      // {
      //   path: "/statuses",
      //   name: "Statuses",
      // },
    ],
  },

  {
    icon: IoNewspaperOutline,
    name: "Billing",
    routes: [
      {
        path: "/delivery-notes",
        name: "DeliveryNotes",
      },
      {
        path: "/monthly-billing",
        name: "MonthlyBilling",
      },
      {
        path: "/invoices",
        name: "InvoicesAndCollection",
      },
      {
        path: "/receipts",
        name: "Receipts",
      },
      {
        path: "/quotes",
        name: "Quotes",
      },
      // ⛔ "הדגמת iCount" מוסתר מהתפריט (הדף והנתיב נשארים) - להחזרה: להסיר את ההערה
      //
      // כל המערכת מחוברת לחשבון הדמו, ולכן מסכי החיוב הרגילים כבר
      // מדגימים את הזרימה האמיתית. מסך נפרד ששמו "הדגמה" משדר את ההפך —
      // שהמסכים האחרים אינם דמו.
      //
      // מה שהיה ייחודי לו — הפקת מסמך בלי לכתוב למסד — זמין מהטרמינל:
      // ICOUNT_MODE=demo node scripts/icount-demo-invoice.js
      // {
      //   path: "/icount-demo",
      //   name: "IcountDemo",
      // },
    ],
  },

  // ⛔ "מלקטים" מוסתר מהתפריט (הדף עצמו נשאר) - להחזרה: להסיר את ההערה
  // {
  //   path: "/pickers",
  //   icon: FiUserCheck,
  //   name: "Pickers",
  // },

  // ⛔ "צפייה באפליקציית הליקוט" מוסתר מהתפריט - להחזרה: להסיר את ההערה
  // קישור חיצוני לאפליקציית הליקוט. אין לו path: הכתובת נקראת מ-
  // VITE_APP_LIKUTAPP_DOMAIN ב-SidebarContent, כמו הקישור "צפייה בחנות".
  // {
  //   icon: FiClipboard,
  //   name: "ViewLikutApp",
  //   outside: "likutApp",
  // },

  // {
  //   path: "/lotteries",
  //   icon: FiGift,
  //   name: "Lotteries",
  // },

  {
    path: "/our-staff",
    icon: FiUser,
    name: "OurStaff",
  },

  // ⛔ הגדרות מוסתרות מהתפריט (הדף עצמו נשאר) - להחזרה: להסיר את ההערה
  // {
  //   path: "/settings?settingTab=common-settings",
  //   icon: FiSettings,
  //   name: "Settings",
  // },

  // {
  //   icon: FiGlobe,
  //   name: "International",
  //   routes: [
  //     {
  //       path: "/languages",
  //       name: "Languages",
  //     },
  //     {
  //       path: "/currencies",
  //       name: "Currencies",
  //     },
  //   ],
  // },

  // {
  //   icon: FaRoute,
  //   name: "Shiping",
  //   routes: [
  //     {
  //       path: "/deliveries",
  //       name: "DeliveriesList",
  //     },
  //     {
  //       path: "/deliveries/addresses-not-found",
  //       name: "AddressesNotFound",
  //     },
  //   ],
  // },

  // {
  //   icon: FiTarget,
  //   name: "OnlineStore",
  //   routes: [
  //     {
  //       name: "ViewStore",
  //       path: "http://localhost:3000",
  //       outside: "store",
  //     },
  //     // {
  //     //   name: "ViewLikutApp",
  //     //   path: "https://likut.meshek-kirshner.co.il/items",
  //     //   outside: "likutApp",
  //     // },
  //     {
  //       path: "/store/customization",
  //       name: "StoreCustomization",
  //     },
  //     {
  //       path: "/store/store-settings",
  //       name: "StoreSetting",
  //     },
  //     {
  //       path: "/store/scripts",
  //       name: "Scripts",
  //     },
  //   ],
  // },

  // {
  //   icon: FiSlack,
  //   name: "Pages",
  //   routes: [
  //     // submenu

  //     {
  //       path: "/404",
  //       name: "404",
  //     },
  //     {
  //       path: "/coming-soon",
  //       name: "ComingSoon",
  //     },
  //   ],
  // },

  // {
  //   icon: FaRegWindowRestore,
  //   name: "Popups",
  //   path: "/popups",
  // },
  {
    icon: GoDependabot,
    name: "WhatsApp Bot",
    path: "/whatsappbot",
  },
  // {
  //   icon: IoNewspaperOutline,
  //   name: "Blogs",
  //   path: "/blogs",
  // },
];

export default sidebar;
