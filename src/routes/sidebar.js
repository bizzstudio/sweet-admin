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
      {
        path: "/attributes",
        name: "Attributes",
      },
      {
        path: "/coupons",
        name: "Coupons",
      },
      {
        path: "/offers",
        name: "Offers",
      },
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
      {
        path: "/cashier-orders",
        name: "CashierOrders",
      },
      {
        path: "/statuses",
        name: "Statuses",
      },
    ],
  },

  {
    path: "/lotteries",
    icon: FiGift,
    name: "Lotteries",
  },

  {
    path: "/our-staff",
    icon: FiUser,
    name: "OurStaff",
  },

  {
    path: "/settings?settingTab=common-settings",
    icon: FiSettings,
    name: "Settings",
  },

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

  {
    icon: FaRoute,
    name: "Shiping",
    routes: [
      {
        path: "/deliveries",
        name: "DeliveriesList",
      },
      {
        path: "/deliveries/addresses-not-found",
        name: "AddressesNotFound",
      },
    ],
  },

  {
    icon: FiTarget,
    name: "OnlineStore",
    routes: [
      {
        name: "ViewStore",
        path: "http://localhost:3000",
        outside: "store",
      },
      // {
      //   name: "ViewLikutApp",
      //   path: "https://likut.meshek-kirshner.co.il/items",
      //   outside: "likutApp",
      // },
      {
        path: "/store/customization",
        name: "StoreCustomization",
      },
      {
        path: "/store/store-settings",
        name: "StoreSetting",
      },
      {
        path: "/store/scripts",
        name: "Scripts",
      },
    ],
  },

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

  {
    icon: FaRegWindowRestore,
    name: "Popups",
    path: "/popups",
  },
  // {
  //   icon: GoDependabot,
  //   name: "WhatsApp Bot",
  //   path: "/whatsappbot",
  // },
  {
    icon: IoNewspaperOutline,
    name: "Blogs",
    path: "/blogs",
  },
];

export default sidebar;
