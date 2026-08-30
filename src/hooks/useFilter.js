import Ajv from "ajv";
import csvToJson from "csvtojson";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import isToday from "dayjs/plugin/isToday";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import * as XLSX from "xlsx";

// Internal import
import { SidebarContext } from "@/context/SidebarContext";
import AttributeServices from "@/services/AttributeServices";
import OfferServices from "@/services/OfferServices";
import CategoryServices from "@/services/CategoryServices";
import CouponServices from "@/services/CouponServices";
import CurrencyServices from "@/services/CurrencyServices";
import LanguageServices from "@/services/LanguageServices";
import SettingServices from "@/services/SettingServices";
import { notifyError, notifySuccess } from "@/utils/toast";
import useAsync from "@/hooks/useAsync";
import useUtilsFunction from "./useUtilsFunction";
import DeliveryServices from "@/services/DeliveryServices";

const categorySchema = {
  type: "object",
  properties: {
    _id: { type: "string" },
    name: { type: "object" },
    description: { type: "object" },
    icon: { type: "string" },
    status: { type: "string" },
  },
  required: ["name"],
};
const attributeSchema = {
  type: "object",
  properties: {
    status: { type: "string" },
    title: { type: "object" },
    name: { type: "object" },
    variants: { type: "array" },
    option: { type: "string" },
    type: { type: "string" },
  },
  required: ["name", "title"],
};
const offerSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    quantity: { type: "number" },
    price: { type: "number" },
    products: { type: "array" },
  },
  required: ["name", "quantity", "price", "products"],
};
const couponSchema = {
  type: "object",
  properties: {
    title: { type: "object" },
    couponCode: { type: "string" },
    endTime: { type: "string" },
    discountPercentage: { type: "number" },
    minimumAmount: { type: "number" },
    productType: { type: "string" },
    logo: { type: "string" },
    discountType: { type: "object" },
    status: { type: "string" },
  },
  required: ["title", "couponCode", "endTime", "status"],
};
// סימוני כיווניות (RTL/LTR) נדבקים למספר טלפון כשמעתיקים אותו מאקסל או
// מוואטסאפ, והם בלתי נראים - אבל שוברים כל השוואת מחרוזות
const stripBidiMarks = (value) =>
  String(value ?? "").replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "");

// הטלפון נשמר בבסיס הנתונים כספרות בלבד (0528459703 / 039622655 / 528459703),
// אבל מוקלד עם מקפים, רווחים או קידומת +972. ההשוואה נעשית על הספרות בלבד,
// בלי קידומת המדינה ובלי האפס המוביל, כדי שכל הצורות יימצאו
const phoneDigits = (value) => {
  let digits = stripBidiMarks(value).replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("972") && digits.length > 9) digits = digits.slice(3);
  return digits.replace(/^0+/, "");
};

// רק מחרוזת שכולה ספרות וסימני טלפון נחשבת חיפוש טלפון. בלי זה, חיפוש מייל
// כמו erp-782@import.local היה מחזיר גם כל לקוח שבטלפון שלו הרצף 782
const looksLikePhoneQuery = (value) =>
  /^[+(]?\d[\d\s()+.\-]*$/.test(stripBidiMarks(value).trim());

// שם לקוח נשמר כמחרוזת, אבל שם עובד (Admin) נשמר כאובייקט רב-לשוני {he,en}.
// אותו סינון משרת את שני העמודים, ולכן שתי הצורות מומרות לטקסט לחיפוש.
// כל השפות נכללות כדי שעובד עם שם אנגלי יימצא גם כשהממשק בעברית
const searchableText = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    return Object.values(value)
      .filter((item) => typeof item === "string")
      .join(" ");
  }
  return String(value);
};

const useFilter = (data) => {
  const ajv = new Ajv({ allErrors: true });

  const [filter, setFilter] = useState("");
  const [sortedField, setSortedField] = useState("");
  const [searchText, setSearchText] = useState("");
  const [searchUser, setSearchUser] = useState("");
  const [searchCoupon, setSearchCoupon] = useState("");
  const [searchOrder, setSearchOrder] = useState("");
  const [categoryType, setCategoryType] = useState("");
  const [attributeTitle, setAttributeTitle] = useState("");
  const [offerTitle, setOfferTitle] = useState("");
  const [country, setCountry] = useState("");
  const [zone, setZone] = useState("");
  const [language, setLanguage] = useState("");
  const [currency, setCurrency] = useState("");
  const [delivery, setDelivery] = useState("");
  const [pending, setPending] = useState([]);
  const [processing, setProcessing] = useState([]);
  const [delivered, setDelivered] = useState([]);
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  const [time, setTime] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [dataTable, setDataTable] = useState([]); //tableTable for showing on table according to filtering
  const [todayOrder, setTodayOrder] = useState("");
  const [monthlyOrder, setMonthlyOrder] = useState("");
  const [totalOrder, setTotalOrder] = useState("");
  const [selectedFile, setSelectedFile] = useState([]);
  const [filename, setFileName] = useState("");
  const [isDisabled, setIsDisable] = useState(false);
  const [shipping, setShipping] = useState("");
  const currencyRef = useRef("");
  const searchRef = useRef("");
  const userRef = useRef("");
  const couponRef = useRef("");
  const orderRef = useRef("");
  const categoryRef = useRef("");
  const attributeRef = useRef("");
  const offerRef = useRef("");
  const countryRef = useRef("");
  const languageRef = useRef("");
  const taxRef = useRef("");
  const shippingRef = useRef("");
  const deliveryRef = useRef("");
  const [searchBlog, setSearchBlog] = useState("");

  dayjs.extend(isBetween);
  dayjs.extend(isToday);
  const location = useLocation();
  const { lang, setIsUpdate, setLoading } = useContext(SidebarContext);
  const { globalSetting } = useUtilsFunction();

  //service data filtering
  const serviceData = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - time);
    let services = data?.map((el) => {
      const newDate = new Date(el?.updatedAt).toLocaleString("en-US", {
        timeZone: globalSetting?.default_time_zone,
      });
      const newObj = {
        ...el,
        updatedDate: newDate === "Invalid Date" ? "" : newDate,
      };
      return newObj;
    });
    if (location.pathname === "/dashboard") {
      const orderPending = services?.filter(
        (statusP) => statusP.status === "Pending"
      );
      setPending(orderPending);
      const orderProcessing = services?.filter(
        (statusO) => statusO.status === "Processing"
      );
      setProcessing(orderProcessing);
      const orderDelivered = services?.filter(
        (statusD) => statusD.status === "Delivered"
      );
      setDelivered(orderDelivered);
      //daily total order calculation
      const todayServices = services?.filter((order) =>
        dayjs(order.createdAt).isToday()
      );
      const todayOrder = todayServices?.reduce(
        (preValue, currentValue) => preValue + currentValue.total,
        0
      );
      setTodayOrder(todayOrder);
      //monthly order calculation
      const monthlyServices = services?.filter((order) =>
        dayjs(order.createdAt).isBetween(
          new Date().setDate(new Date().getDate() - 30),
          new Date()
        )
      );
      const monthlyOrder = monthlyServices?.reduce(
        (preValue, currentValue) => preValue + currentValue.total,
        0
      );
      setMonthlyOrder(monthlyOrder);
      //total order calculation
      const totalOrder = services?.reduce(
        (preValue, currentValue) => preValue + currentValue.total,
        0
      );
      setTotalOrder(totalOrder);
    }
    //products filtering
    if (filter) {
      services = services.filter((item) => item.parent === filter);
    }
    if (sortedField === "Low") {
      services = services.sort((a, b) => a.price < b.price && -1);
    }
    if (sortedField === "High") {
      services = services.sort((a, b) => a.price > b.price && -1);
    }
    if (searchText) {
      // For blogs - search in title, author, category, content
      if (location.pathname === "/blogs") {
        services = services.filter((search) =>
          search?.title[lang]
            ?.toLowerCase()
            ?.includes(searchText?.toLowerCase()) ||
          search?.author
            ?.toLowerCase()
            ?.includes(searchText?.toLowerCase()) ||
          search?.category
            ?.toLowerCase()
            ?.includes(searchText?.toLowerCase()) ||
          search?.content[lang]
            ?.toLowerCase()
            ?.includes(searchText?.toLowerCase())
        );
      } else {
        // For other entities (products, etc.)
        services = services.filter((search) =>
          search?.title?.toLowerCase().includes(searchText.toLowerCase())
        );
      }
    }

    if (attributeTitle) {
      // console.log("asss");
      services = services.filter(
        (search) =>
          search?.title[lang]
            ?.toLowerCase()
            ?.includes(attributeTitle?.toLowerCase()) ||
          search?.attribute
            ?.toLowerCase()
            .includes(attributeTitle?.toLowerCase())
      );
    }

    if (offerTitle) {
      services = services.filter(
        (search) =>
          search?.name[lang]
            ?.toLowerCase()
            ?.includes(offerTitle?.toLowerCase()) ||
          search?.offer
            ?.toLowerCase()
            .includes(offerTitle?.toLowerCase())
      );
    }

    if (categoryType) {
      services = services.filter(
        (search) =>
          search?.name[lang]
            ?.toLowerCase()
            ?.includes(categoryType?.toLowerCase()) ||
          search?.category?.toLowerCase().includes(categoryType?.toLowerCase())
      );
    }

    // admin Filtering
    if (role) {
      services = services.filter((staff) => staff.role === role);
    }
    // User and Admin filtering
    // התנאי על הטקסט הנקי ולא על searchUser הגולמי, כדי שחיפוש של רווחים
    // בלבד יציג את כל הרשומות במקום להריץ סינון שלא מתאים לאף אחת
    const term = stripBidiMarks(searchUser).trim().toLowerCase();
    if (term) {
      const termDigits = looksLikePhoneQuery(term) ? phoneDigits(term) : "";
      services = services.filter(
        (search) => {
          const fullName =
            `${searchableText(search?.name)} ${searchableText(search?.lastName)}`
              .replace(/\s+/g, " ")
              .trim()
              .toLowerCase();
          if (fullName.includes(term)) return true;
          if (searchableText(search?.email).toLowerCase().includes(term))
            return true;
          // הטלפון מושווה בספרות בלבד, ולכן נמצא גם כשהוא נשמר בלי אפס מוביל
          return !!termDigits && phoneDigits(search?.phone).includes(termDigits);
        });
    }
    // Coupon filtering
    if (searchCoupon) {
      services = services?.filter(
        (search, i) => {
          if (isNaN(search?.title[lang])) {
            return (
              search?.title[lang]
                ?.toLowerCase()
                .includes(searchCoupon
                  ?.toLowerCase()
                ) ||
              search?.couponCode
                ?.toLowerCase()
                .includes(searchCoupon
                  ?.toLowerCase()
                )
            )
          } else {
            return search?.title[lang] == searchCoupon || search?.couponCode == searchCoupon;
          }
        }
      );
    }
    // order filtering
    if (status) {
      // Only apply this status filter for orders, not blogs
      if (location.pathname !== "/blogs") {
        services = services.filter((order) => order?.status?.heName === status);
      }
    }
    if (searchOrder) {
      services = services.filter((search) =>
        search.contact.toLowerCase().includes(searchOrder.toLowerCase())
      );
    }
    if (time) {
      services = services.filter((order) =>
        dayjs(order.createdAt).isBetween(date, new Date())
      );
    }

    //country filtering
    if (country) {
      services = services.filter(
        (cou) =>
          cou?.name?.toLowerCase().includes(country.toLowerCase()) ||
          cou?.iso_code?.toLowerCase().includes(country.toLowerCase())
      );
    }

    //shipping filtering
    if (shipping) {
      services = services.filter((ship) =>
        ship?.name.toLowerCase().includes(shipping.toLowerCase())
      );
    }

    //language filtering
    if (language) {
      services = services.filter(
        (lan) =>
          lan.name.toLowerCase().includes(language.toLowerCase()) ||
          lan.iso_code.toLowerCase().includes(language.toLowerCase()) ||
          lan.language_code.toLowerCase().includes(language.toLowerCase())
      );
    }

    if (currency) {
      services = services.filter((cur) =>
        cur.iso_code.toLowerCase().includes(currency.toLowerCase())
      );
    }

    if (delivery) {
      services = services.filter(
        (del) => {
          const searchTerm = delivery.toLowerCase();
          const cityNameHe = del?.city?.city_name_he?.toLowerCase() || "";
          const cityNameEn = del?.city?.city_name_en?.toLowerCase() || "";
          const priceStr = del?.price?.toString() || "";
          const minOrderStr = (del?.minimumOrder != null ? del.minimumOrder : 150).toString();

          return (
            cityNameHe.includes(searchTerm) ||
            cityNameEn.includes(searchTerm) ||
            priceStr.includes(searchTerm) ||
            minOrderStr.includes(searchTerm)
          );
        }
      );
    }

    // Blog status filtering
    if (status && location.pathname === "/blogs") {
      services = services.filter((blog) => blog?.status === status);
    }
    // console.log("render", data, "categoryRef", categoryRef);

    return services;
  }, [
    time,
    data,
    location.pathname,
    filter,
    sortedField,
    searchText,
    attributeTitle,
    offerTitle,
    categoryType,
    role,
    searchUser,
    searchCoupon,
    status,
    searchOrder,
    country,
    shipping,
    language,
    currency,
    delivery,
    categoryRef,
    globalSetting?.default_time_zone,
    lang,
    searchBlog,
  ]);

  //pagination functionality start
  const resultsPerPage = 20;
  const totalResults = serviceData?.length;
  const handleChangePage = (p) => {
    setCurrentPage(p);
  };
  // חיפוש שמבוצע כשעומדים על עמוד 3 מחזיר תוצאה אחת, אבל הטבלה נחתכה
  // מהרשומה ה-40 והלאה ולכן נראתה ריקה. הצמדת העמוד לטווח הקיים פותרת זאת
  // בלי לאפס state - איפוס היה יוצר חוסר סנכרון עם ה-Pagination של Windmill,
  // ששומר את העמוד הפעיל אצלו ומעדכן רק כשלוחצים עליו
  useEffect(() => {
    const lastPage = Math.max(
      1,
      Math.ceil((serviceData?.length || 0) / resultsPerPage)
    );
    const page = Math.min(currentPage, lastPage);
    setDataTable(
      serviceData?.slice((page - 1) * resultsPerPage, page * resultsPerPage)
    );
  }, [serviceData, currentPage, resultsPerPage]);
  //pagination functionality end
  //table form submit function for search start
  const handleSubmitForAll = (e) => {
    e.preventDefault();
    setSearchText(searchRef.current.value);
  };
  const handleSubmitUser = (e) => {
    e.preventDefault();
    setSearchUser(userRef.current.value);
  };
  const handleSubmitCoupon = (e) => {
    e.preventDefault();
    setSearchCoupon(couponRef.current.value);
  };
  const handleSubmitOrder = (e) => {
    e.preventDefault();
    setSearchOrder(orderRef.current.value);
  };
  const handleSubmitCategory = (e) => {
    e.preventDefault();
    setCategoryType(categoryRef.current.value);
  };
  const handleSubmitAttribute = (e) => {
    e.preventDefault();
    setAttributeTitle(attributeRef.current.value);
  };
  const handleSubmitOffer = (e) => {
    e.preventDefault();
    setOfferTitle(offerRef.current.value);
  };

  const handleSubmitCountry = (e) => {
    e.preventDefault();
    setCountry(countryRef.current.value);
  };

  const handleSubmitShipping = (e) => {
    e.preventDefault();
    setShipping(shippingRef.current.value);
  };
  const handleSubmitLanguage = (e) => {
    e.preventDefault();
    setLanguage(languageRef.current.value);
  };
  const handleSubmitCurrency = (e) => {
    e.preventDefault();
    setCurrency(currencyRef.current.value);
  };
  const handleSubmitDelivery = (e) => {
    e.preventDefault();
    setDelivery(deliveryRef.current.value);
  };
  // table form submit function for search end
  const handleSelectFile = (e) => {
    e.preventDefault();
    // return notifyError("This option disabled for this option!");

    const fileReader = new FileReader();
    const file = e.target?.files[0];

    if (file && file.type === "application/json") {
      setFileName(file?.name);
      setIsDisable(true);

      fileReader.readAsText(file, "UTF-8");
      fileReader.onload = (e) => {
        let text = JSON.parse(e.target.result);

        let data = [];
        if (location.pathname === "/categories") {
          data = text.map((value) => {
            return {
              _id: value._id,
              id: value.id,
              status: value.status,
              name: value.name,
              description: value.description,
              parentName: value.parentName,
              parentId: value.parentId,
              icon: value.icon,
              coloredIcon: value.coloredIcon,
            };
          });
        }
        if (location.pathname === "/attributes") {
          data = text.map((value) => {
            return {
              _id: value._id,
              status: value.status,
              title: value.title,
              name: value.name,
              variants: value.variants,
              option: value.option,
              type: value.type,
            };
          });
        }

        if (location.pathname === "/offers") {
          data = text.map((value) => {
            return {
              _id: value._id,
              name: value.name,
              quantity: value.quantity,
              price: value.price,
              products: value.products,
            };
          });
        }

        if (location.pathname === "/coupons") {
          data = text.map((value) => {
            return {
              title: value.title,
              couponCode: value.couponCode,
              endTime: value.endTime,
              discountPercentage: value.discountPercentage,
              minimumAmount: value.minimumAmount,
              productType: value.productType,
              logo: value.logo,
              discountType: value.discountType,
              status: value.status,
            };
          });
        }
        if (location.pathname === "/customers") {
          data = text.map((value) => {
            return {
              name: value.name,
              lastName: value.lastName,
              email: value.email,
              password: value.password,
              phone: value.phone,
            };
          });
        }
        setSelectedFile(data);
      };
    } else if (file && file.type === "text/csv") {
      setFileName(file?.name);
      setIsDisable(true);

      fileReader.onload = async (event) => {
        const text = event.target.result;
        const json = await csvToJson().fromString(text);
        
        // הדפס את כל ה-keys של הרשומה הראשונה
        // if (json.length > 0) {
        //   console.log("All keys in uploaded file:", Object.keys(json[0]));
        //   console.log("First record sample:", json[0]);
        // }
        
        let data = [];

        if (location.pathname === "/categories") {
          data = json.map((value) => {
            return {
              _id: value._id,
              id: value.id,
              status: value.status,
              name: JSON.parse(value.name),
              description: JSON.parse(value.description),
              parentName: value.parentName,
              parentId: value.parentId,
              icon: value.icon,
              coloredIcon: value.coloredIcon,
            };
          });
        }
        if (location.pathname === "/attributes") {
          data = json.map((value) => {
            return {
              status: value.status,
              title: JSON.parse(value.title),
              name: JSON.parse(value.name),
              variants: JSON.parse(value.variants),
              option: value.option,
              type: value.type,
            };
          });
        }

        if (location.pathname === "/offers") {
          data = json.map((value) => {
            return {
              name: JSON.parse(value.name),
              quantity: value.quantity,
              price: value.price,
              products: JSON.parse(value.products),
            };
          });
        }

        if (location.pathname === "/coupons") {
          data = json.map((value) => {
            return {
              title: JSON.parse(value.title),
              couponCode: value.couponCode,
              endTime: value.endTime,
              discountPercentage: value.discountPercentage
                ? JSON.parse(value.discountPercentage)
                : 0,
              minimumAmount: value.minimumAmount
                ? JSON.parse(value.minimumAmount)
                : 0,
              productType: value.productType,
              logo: value.logo,
              // discountType: JSON.parse(value.discountType),
              status: value.status,
            };
          });
        }
        if (location.pathname === "/customers") {
          data = json.map((value) => {
            return {
              name: value.name,
              lastName: value.lastName,
              email: value.email,
              password: value.password,
              phone: value.phone,
            };
          });
        }
        setSelectedFile(data);
      };
      fileReader.readAsText(file, "UTF-8");
    } else {
      setFileName(file?.name);
      setIsDisable(true);

      const rABS = !!fileReader.readAsBinaryString;

      fileReader.onload = function (event) {
        /* Parse data */
        const bstr = event.target.result;
        const wb = XLSX.read(bstr, {
          type: rABS ? "binary" : "array",
          bookVBA: true,
        });
        /* Get first worksheet */
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        /* Convert array of arrays */
        const json = XLSX.utils.sheet_to_json(ws);

        let data = [];

        if (location.pathname === "/categories") {
          data = json.map((value) => {
            return {
              _id: value._id,
              id: value.id,
              status: value.status,
              name: JSON.parse(value.name),
              description: JSON.parse(value.description),
              parentName: value.parentName,
              parentId: value.parentId,
              icon: value.icon,
              coloredIcon: value.coloredIcon,
            };
          });
        }
        if (location.pathname === "/attributes") {
          data = json.map((value) => {
            return {
              status: value.status,
              title: JSON.parse(value.title),
              name: JSON.parse(value.name),
              variants: JSON.parse(value.variants),
              option: value.option,
              type: value.type,
            };
          });
        }

        if (location.pathname === "/offers") {
          data = json.map((value) => {
            return {
              name: JSON.parse(value.name),
              quantity: value.quantity,
              price: value.price,
              products: JSON.parse(value.products),
            };
          });
        }

        if (location.pathname === "/coupons") {
          data = json.map((value) => {
            return {
              title: JSON.parse(value.title),
              couponCode: value.couponCode,
              endTime: value.endTime,
              discountPercentage: value.discountPercentage,
              minimumAmount: value.minimumAmount,
              productType: value.productType,
              logo: value.logo,
              // discountType: JSON.parse(value.discountType),
              status: value.status,
            };
          });
        }
        if (location.pathname === "/customers") {
          data = json.map((value) => {
            return {
              name: value.name,
              lastName: value.lastName,
              email: value.email,
              password: value.password ? value.password : "null",
              phone: value.phone ? value.phone : "null",
            };
          });
        }
        setSelectedFile(data);
      };

      if (rABS) {
        fileReader.readAsBinaryString(file);
      } else {
        fileReader.readAsArrayBuffer(file);
      }
    }
  };

  const handleUploadMultiple = (e) => {
    // return notifyError("This option disabled for this option!");

    if (selectedFile.length > 1) {
      if (location.pathname === "/categories") {
        setLoading(true);
        let categoryDataValidation = selectedFile.map((value) =>
          ajv.validate(categorySchema, value)
        );

        const isBelowThreshold = (currentValue) => currentValue === true;
        const validationData = categoryDataValidation.every(isBelowThreshold);

        if (validationData) {
          CategoryServices.addAllCategory(selectedFile)
            .then((res) => {
              setLoading(false);
              setIsUpdate(true);
              notifySuccess(res.message);
            })
            .catch((err) => {
              setLoading(false);
              notifyError(err?.response?.data?.message || err?.message);
            });
        } else {
          notifyError("Please enter valid data!");
        }
      }
      if (location.pathname === "/coupons") {
        setLoading(true);
        let attributeDataValidation = selectedFile.map((value) =>
          ajv.validate(couponSchema, value)
        );

        const isBelowThreshold = (currentValue) => currentValue === true;
        const validationData = attributeDataValidation.every(isBelowThreshold);

        if (validationData) {
          CouponServices.addAllCoupon(selectedFile)
            .then((res) => {
              setLoading(false);
              setIsUpdate(true);
              notifySuccess(res.message);
            })
            .catch((err) => {
              setLoading(false);
              notifyError(err?.response?.data?.message || err?.message);
            });
        } else {
          notifyError("Please enter valid data!");
        }
      }
      if (location.pathname === "/attributes") {
        setLoading(true);
        let attributeDataValidation = selectedFile.map((value) =>
          ajv.validate(attributeSchema, value)
        );

        const isBelowThreshold = (currentValue) => currentValue === true;
        const validationData = attributeDataValidation.every(isBelowThreshold);

        if (validationData) {
          AttributeServices.addAllAttributes(selectedFile)
            .then((res) => {
              setLoading(false);
              setIsUpdate(true);
              notifySuccess(res.message);
            })
            .catch((err) => {
              setLoading(false);
              notifyError(err?.response?.data?.message || err?.message);
            });
        } else {
          notifyError("Please enter valid data!");
        }
      }
      // if (location.pathname === "/offers") {
      //   setLoading(true);
      //   let offerDataValidation = selectedFile.map((value) =>
      //     ajv.validate(offerSchema, value)
      //   );

      //   const isBelowThreshold = (currentValue) => currentValue === true;
      //   const validationData = offerDataValidation.every(isBelowThreshold);

      //   if (validationData) {
      //     OfferServices.addAllOffer(selectedFile)
      //       .then((res) => {
      //         setLoading(false);
      //         setIsUpdate(true);
      //         notifySuccess(res.message);
      //       })
      //       .catch((err) => {
      //         setLoading(false);
      //         notifyError(err?.response?.data?.message || err?.message);
      //       });
      //   } else {
      //     notifyError("Please enter valid data!");
      //   }
      // }
      if (location.pathname === "/languages") {
        LanguageServices.addAllLanguage(selectedFile)
          .then((res) => {
            setIsUpdate(true);
            notifySuccess(res.message);
          })
          .catch((err) =>
            notifyError(err?.response?.data?.message || err?.message)
          );
      }

      if (location.pathname === "/currencies") {
        CurrencyServices.addAllCurrency(selectedFile)
          .then((res) => {
            setIsUpdate(true);
            notifySuccess(res.message);
          })
          .catch((err) =>
            notifyError(err?.response?.data?.message || err?.message)
          );
      }

      if (location.pathname === "/deliveries") {
        DeliveryServices.addAllDelivery(selectedFile)
          .then((res) => {
            setIsUpdate(true);
            notifySuccess(res.message);
          })
          .catch((err) =>
            notifyError(err?.response?.data?.message || err?.message)
          );
      }
    } else {
      notifyError("Please select a valid .JSON/.CSV/.XLS file first!");
    }
  };

  const handleRemoveSelectFile = (e) => {
    // console.log('remove');
    setFileName("");
    setSelectedFile([]);
    setTimeout(() => setIsDisable(false), 1000);
  };

  return {
    userRef,
    searchRef,
    couponRef,
    orderRef,
    categoryRef,
    attributeRef,
    offerRef,
    pending,
    processing,
    delivered,
    todayOrder,
    monthlyOrder,
    totalOrder,
    setFilter,
    setSortedField,
    setStatus,
    setRole,
    time,
    zone,
    setTime,
    taxRef,
    setZone,
    filename,
    countryRef,
    deliveryRef,
    dataTable,
    serviceData,
    country,
    setSearchText,
    setCountry,
    isDisabled,
    languageRef,
    currencyRef,
    shippingRef,
    setSearchUser,
    setDataTable,
    setCategoryType,
    handleChangePage,
    totalResults,
    resultsPerPage,
    setSearchCoupon,
    setAttributeTitle,
    setOfferTitle,
    handleSelectFile,
    handleSubmitUser,
    handleSubmitForAll,
    handleSubmitCoupon,
    handleSubmitOrder,
    handleSubmitCategory,
    handleSubmitAttribute,
    handleSubmitOffer,
    handleSubmitCountry,
    handleSubmitCurrency,
    handleSubmitShipping,
    handleSubmitLanguage,
    handleSubmitDelivery,
    handleUploadMultiple,
    handleRemoveSelectFile,
    setDelivery,
  };
};

export default useFilter;
