import { lazy } from "react";

// use lazy for better code splitting
const StatusInvoice = lazy(()=>import("@/pages/StatusInvoice"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
// ⛔ תכונות כבויות (הקוד נשמר) - להחזרה: להסיר את ההערה כאן ובמסלולים למטה
// const Attributes = lazy(() => import("@/pages/Attributes"));
// const ChildAttributes = lazy(() => import("@/pages/ChildAttributes"));
const Products = lazy(() => import("@/pages/Products"));
const ProductDetails = lazy(() => import("@/pages/ProductDetails"));
const Category = lazy(() => import("@/pages/Category"));
// ⛔ מבצעים כבויים (הקוד נשמר) - להחזרה: להסיר את ההערה כאן ובמסלול למטה
// const Offers = lazy(() => import("@/pages/Offers"));
const ChildCategory = lazy(() => import("@/pages/ChildCategory"));
const Staff = lazy(() => import("@/pages/Staff"));
const Pickers = lazy(() => import("@/pages/Pickers"));
const Customers = lazy(() => import("@/pages/Customers"));
const CustomerOrder = lazy(() => import("@/pages/CustomerOrder"));
const CustomerDetails = lazy(() => import("@/pages/CustomerDetails"));
const CustomerDocumentsPage = lazy(() =>
  import("@/pages/CustomerDocumentsPage")
);
const Orders = lazy(() => import("@/pages/Orders"));
// ⛔ הזמנות קופה כבויות (הקוד נשמר) - להחזרה: להסיר את ההערה כאן ובמסלול למטה
// const CashierOrders = lazy(() => import("@/pages/CashierOrders"));
const IncomingOrders = lazy(() => import("@/pages/IncomingOrders"));
const CashierOrderInvoice = lazy(() => import("@/pages/CashierOrderInvoice"));
const Statuses = lazy(() => import("@/pages/Statuses"));
const OrderInvoice = lazy(() => import("@/pages/OrderInvoice"));
// ⛔ קופונים כבויים (הקוד נשמר) - להחזרה: להסיר את ההערה כאן ובמסלול למטה
// const Coupons = lazy(() => import("@/pages/Coupons"));
const Page404 = lazy(() => import("@/pages/404"));
const ComingSoon = lazy(() => import("@/pages/ComingSoon"));
const EditProfile = lazy(() => import("@/pages/EditProfile"));
const Languages = lazy(() => import("@/pages/Languages"));
const Currencies = lazy(() => import("@/pages/Currencies"));
const Setting = lazy(() => import("@/pages/Setting"));
const StoreHome = lazy(() => import("@/pages/StoreHome"));
const StoreSetting = lazy(() => import("@/pages/StoreSetting"));
const Scripts = lazy(() => import("@/pages/Scripts"));
const Deliveries = lazy(() => import("@/pages/Deliveries"));
const UndeliverableAddresses = lazy(() =>
  import("@/pages/UndeliverableAddresses")
);
const DeliveryEdit = lazy(() => import("@/pages/DeliveryEdit"));
const Popups = lazy(() => import("@/pages/Popups"));
const Messages = lazy(() => import("@/pages/Messages"));
const Blogs = lazy(() => import("@/pages/Blogs"));
const Lotteries = lazy(() => import("@/pages/Lotteries"));
const DeliveryNotes = lazy(() => import("@/pages/DeliveryNotes"));
const MonthlyBilling = lazy(() => import("@/pages/MonthlyBilling"));
const Quotes = lazy(() => import("@/pages/Quotes"));
const BillingDocument = lazy(() => import("@/pages/BillingDocument"));
const Invoices = lazy(() => import("@/pages/Invoices"));
const IcountDemo = lazy(() => import("@/pages/IcountDemo"));
const Receipts = lazy(() => import("@/pages/Receipts"));

/*
//  * ⚠ These are internal routes!
//  * They will be rendered inside the app, using the default `containers/Layout`.
//  * If you want to add a route to, let's say, a landing page, you should add
//  * it to the `App`'s router, exactly like `Login`, `CreateAccount` and other pages
//  * are routed.
//  *
//  * If you're looking for the links rendered in the SidebarContent, go to
//  * `routes/sidebar.js`
 */

const routes = [
  {
    path: "/dashboard",
    component: Dashboard,
  },
  {
    path: "/products",
    component: Products,
  },
  {
    path: "/deliveries",
    component: Deliveries,
  },
  {
    path: "/deliveries/addresses-not-found",
    component: UndeliverableAddresses,
  },
  {
    path: "/deliveries/:id",
    component: DeliveryEdit,
  },
  // ⛔ תכונות כבויות (לא נמחקו) - להחזרה: להסיר את ההערה
  // {
  //   path: "/attributes",
  //   component: Attributes,
  // },
  // {
  //   path: "/attributes/:id",
  //   component: ChildAttributes,
  // },
  {
    path: "/product/:id",
    component: ProductDetails,
  },
  {
    path: "/categories",
    component: Category,
  },
  // ⛔ מבצעים כבויים (לא נמחקו) - להחזרה: להסיר את ההערה
  // {
  //   path: "/offers",
  //   component: Offers,
  // },
  {
    path: "/languages",
    component: Languages,
  },
  {
    path: "/currencies",
    component: Currencies,
  },

  {
    path: "/categories/:id",
    component: ChildCategory,
  },
  {
    path: "/customers",
    component: Customers,
  },
  {
    path: "/customer-order/:id",
    component: CustomerOrder,
  },
  {
    path: "/customer-documents/:id",
    component: CustomerDocumentsPage,
  },
  {
    path: "/customer/:id",
    component: CustomerDetails,
  },
  {
    path: "/our-staff",
    component: Staff,
  },
  {
    path: "/orders",
    component: Orders,
  },
  // ⛔ הזמנות קופה כבויות (לא נמחקו) - להחזרה: להסיר את ההערה.
  //    מסלול החשבונית /cashier-order/:id נשאר פעיל בכוונה, כדי שלינקים ישירים לא ישברו.
  // {
  //   path: "/cashier-orders",
  //   component: CashierOrders,
  // },
  {
    path: "/cashier-order/:id",
    component: CashierOrderInvoice,
  },
  {
    path: "/incoming-orders",
    component: IncomingOrders,
  },
  {
    path: "/statuses",
    component: Statuses,
  },
  {
    path: "/pickers",
    component: Pickers,
  },
  {
    path: "/lotteries",
    component: Lotteries,
  },
  {
    path: "/status/:id",
    component: StatusInvoice ,
  },
  {
    path: "/order/:id",
    component: OrderInvoice,
  },
  {
    path: "/delivery-notes",
    component: DeliveryNotes,
  },
  {
    path: "/monthly-billing",
    component: MonthlyBilling,
  },
  {
    path: "/quotes",
    component: Quotes,
  },
  {
    path: "/invoices",
    component: Invoices,
  },
  {
    path: "/receipts",
    component: Receipts,
  },
  // מסך הדגמה — פעיל רק כשהשרת מחובר לחשבון דמו (ICOUNT_MODE=demo)
  {
    path: "/icount-demo",
    component: IcountDemo,
  },
  // מסמכים להדפסה — נבנים אצלנו, לא ב-iCount
  {
    path: "/quote/:id",
    component: BillingDocument,
  },
  {
    path: "/delivery-note/:id",
    component: BillingDocument,
  },
  // ⛔ קופונים כבויים (לא נמחקו) - להחזרה: להסיר את ההערה
  // {
  //   path: "/coupons",
  //   component: Coupons,
  // },
  { path: "/settings", component: Setting },
  {
    path: "/store/customization",
    component: StoreHome,
  },
  {
    path: "/store/store-settings",
    component: StoreSetting,
  },
  {
    path: "/store/scripts",
    component: Scripts,
  },
  {
    path: "/404",
    component: Page404,
  },
  {
    path: "/coming-soon",
    component: ComingSoon,
  },
  {
    path: "/edit-profile",
    component: EditProfile,
  },
  {
    path: "/popups",
    component: Popups,
  },
  {
    path: "/whatsappbot",
    component: Messages,
  },
  {
    path: "/blogs",
    component: Blogs,
  },
];

export default routes;