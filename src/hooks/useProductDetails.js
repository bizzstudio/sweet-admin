// src/hooks/useProductDetails.js
// טוען כרטיס מוצר מלא (כולל erp מיבוא האקסל) עבור התצוגות לקריאה בלבד.
// מוחזק כהוק נפרד ולא בתוך useProductSubmit בכוונה: useProductSubmit מנהל
// את טופס עריכת המוצר כולו, ושינוי מקור הנתונים שלו היה מסכן את העריכה.
// כאן כישלון בטעינה פוגע רק בפאנל הקריאה, והעריכה ממשיכה לעבוד.
import { useEffect, useState } from "react";

import ProductServices from "@/services/ProductServices";

const useProductDetails = (id, enabled = true) => {
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id || !enabled) {
      setProduct(null);
      setError("");
      return;
    }

    // cancelled מונע מתשובה של מוצר קודם לדרוס את המסך אם המשתמש עבר
    // למוצר אחר לפני שהבקשה הראשונה חזרה
    let cancelled = false;
    setIsLoading(true);
    setError("");
    setProduct(null);

    ProductServices.getProductDetails(id)
      .then((res) => {
        if (!cancelled) setProduct(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err?.response?.data?.message || err?.message || "טעינת המוצר נכשלה"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, enabled]);

  return { product, isLoading, error };
};

export default useProductDetails;
