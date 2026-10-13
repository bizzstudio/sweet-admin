// src/components/common/StoreImage.jsx
//
// תמונת מוצר / אייקון קטגוריה בפאנל הניהול, עם נפילה לסוכריה מהלוגו.
//
// הנתיבים ב-DB יחסיים לחנות ("/product-images/<מק"ט>.webp",
// "/category-icons/food.svg"). בפאנל הם נפתרו מול הדומיין של הפאנל עצמו, שם
// הקבצים לא קיימים — ולכן הופיע אייקון של תמונה שבורה. כאן:
//   - ריק או ‎/product-images/ (ה-placeholder שנוצר בסקריפט) → הסוכריה, כמו בחנות
//   - נתיב יחסי אחר → נטען מהחנות (VITE_APP_STORE_DOMAIN)
//   - URL מלא → כמו שהוא
//   - כל כשל טעינה → הסוכריה
import { useEffect, useState } from "react";

import candy from "@/assets/img/logo/candy.svg";

export const DEFAULT_IMAGE = candy;

const STORE_DOMAIN = (import.meta.env.VITE_APP_STORE_DOMAIN || "").replace(/\/+$/, "");
const STORE_ORIGIN = STORE_DOMAIN.replace(/^(https?:\/\/[^/]+).*$/i, "$1");
const STORE_PATH = STORE_DOMAIN.slice(STORE_ORIGIN.length);
const GENERATED_PRODUCT_IMAGE = /\/product-images\//;

export const resolveStoreImage = (value) => {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return candy;
  if (/^(https?:)?\/\//i.test(raw) || /^(data|blob):/i.test(raw)) return raw;
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  if (GENERATED_PRODUCT_IMAGE.test(path) || !STORE_DOMAIN) return candy;
  // הגנה מפני קידומת כפולה אם הערך כבר נשמר עם תת-הנתיב של החנות
  if (STORE_PATH && path.startsWith(`${STORE_PATH}/`)) return `${STORE_ORIGIN}${path}`;
  return `${STORE_DOMAIN}${path}`;
};

const StoreImage = ({ src, alt = "", ...rest }) => {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  return (
    <img
      src={failed ? candy : resolveStoreImage(src)}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      {...rest}
    />
  );
};

// אותו מראה כמו Avatar של Windmill — שאינו מעביר onError ל-<img> הפנימי.
export const StoreAvatar = ({ src, alt = "", className = "" }) => (
  <div className={`relative rounded-full inline-block w-8 h-8 shrink-0 ${className}`}>
    <StoreImage src={src} alt={alt} className="object-cover w-full h-full rounded-full" />
  </div>
);

export default StoreImage;
