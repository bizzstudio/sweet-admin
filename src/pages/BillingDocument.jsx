// src/pages/BillingDocument.jsx
//
// מסמך להדפסה שנבנה אצלנו: תעודת משלוח או הצעת מחיר.
//
// שני סוגי המסמכים חולקים את אותו פריסה כי הם אותו דבר מבחינת המבנה —
// כותרת עם פרטי החברה, פרטי הלקוח, טבלת שורות וסיכום. מה שמשתנה הוא
// הכותרת, שדות המשנה, והאם מוצג סיכום כספי.
//
// למה לא ב-iCount: שניהם אינם מסמכי מס. הם לא נכנסים לספרים, לא מדווחים,
// וניתנים לעריכה ולמחיקה. ל-iCount נכנסת רק החשבונית החודשית.
//
// המע"מ מוצג כאן לצורך תצוגה בלבד (18%). הוא אינו מחושב בשום מקום אחר
// במערכת — המחירים ללא מע"מ, ומי שמוסיף אותו בפועל הוא iCount על החשבונית.

import React, { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import ReactToPrint from "react-to-print";
import { Button, Card, CardBody } from "@windmill/react-ui";
import { FiPrinter } from "react-icons/fi";

import PageTitle from "@/components/Typography/PageTitle";
import Loading from "@/components/preloader/Loading";
import BillingServices from "@/services/BillingServices";
import useUtilsFunction from "@/hooks/useUtilsFunction";
import { notifyError } from "@/utils/toast";

const shekel = (n) =>
  Number(n || 0).toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const hebDate = (d) => (d ? new Date(d).toLocaleDateString("he-IL") : "—");

const BillingDocument = () => {
  const { id } = useParams();
  const { pathname } = useLocation();
  const printRef = useRef();
  const { globalSetting } = useUtilsFunction();

  // הסוג נגזר מהנתיב ולא מפרמטר, כדי ששני המסלולים יהיו קריאים בכתובת
  const isQuote = pathname.startsWith("/quote/");

  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = isQuote
          ? await BillingServices.getQuote(id)
          : await BillingServices.getDeliveryNote(id);
        if (alive) setDoc(res);
      } catch (err) {
        notifyError(err?.response?.data?.message || err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, isQuote]);

  if (loading) return <Loading loading={loading} />;
  if (!doc) return <PageTitle>המסמך לא נמצא</PageTitle>;

  const title = isQuote ? "הצעת מחיר" : "תעודת משלוח";
  const company = {
    name: globalSetting?.company_name || globalSetting?.shop_name || "",
    address: globalSetting?.address || "",
    vatNumber: globalSetting?.vat_number || "",
    email: globalSetting?.email || "",
    phone: globalSetting?.contact || "",
  };

  // הסכומים מגיעים מחושבים מהשרת (lib/billing/vat). המסמך רק מציג —
  // חישוב מע"מ שני בדפדפן היה יכול להיפרד מזה שבשרת בלי שאיש ישים לב.
  // ה-fallback הוא למסמך שנשמר לפני שהשדה קיים.
  const totals = doc.totals || {
    net: Number(doc.subTotal || 0),
    shipping: Number(doc.shippingCost || 0),
    discount: Number(doc.discount || 0),
    beforeVat: Number(doc.subTotal || 0),
    vat: 0,
    total: Number(doc.total || doc.subTotal || 0),
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 my-6">
        <PageTitle style={{ margin: 0 }}>
          {title} {doc.number}
        </PageTitle>

        <ReactToPrint
          trigger={() => (
            <Button>
              <FiPrinter className="ml-2" /> הדפסה / שמירה כ-PDF
            </Button>
          )}
          content={() => printRef.current}
          documentTitle={`${title}-${doc.number}`}
        />
      </div>

      {!company.vatNumber && (
        <Card className="mb-4 border-r-4 border-yellow-500">
          <CardBody>
            <p className="text-sm text-yellow-800 dark:text-yellow-500">
              מספר ח.פ של החברה אינו מוגדר בהגדרות, ולכן אינו מופיע על המסמך.
              מומלץ למלא אותו בהגדרות → פרטי החברה.
            </p>
          </CardBody>
        </Card>
      )}

      <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-8">
        <CardBody>
          {/* בכוונה עם צבעים קבועים ולא tokens של מצב כהה: זה מה שיוצא
              למדפסת, וטקסט בהיר על רקע לבן נעלם */}
          <div ref={printRef} dir="rtl" className="bg-white text-gray-900 p-8">
            <div className="flex justify-between items-start border-b-2 border-gray-800 pb-4">
              <div>
                <h1 className="text-2xl font-bold">{company.name}</h1>
                {company.vatNumber && <p className="text-sm">ח.פ {company.vatNumber}</p>}
                {company.address && <p className="text-sm">{company.address}</p>}
                {company.phone && <p className="text-sm">טל' {company.phone}</p>}
                {company.email && <p className="text-sm">{company.email}</p>}
              </div>

              <div className="text-left">
                <h2 className="text-xl font-bold">{title}</h2>
                <p className="text-3xl font-bold mt-1">{doc.number}</p>
                <p className="text-sm mt-2">
                  תאריך: {hebDate(isQuote ? doc.createdAt : doc.issuedAt)}
                </p>
                {isQuote && doc.validUntil && (
                  <p className="text-sm">בתוקף עד: {hebDate(doc.validUntil)}</p>
                )}
                {!isQuote && doc.orderNumber && (
                  <p className="text-sm">הזמנה: {doc.orderNumber}</p>
                )}
                {/* מספר הפתק מהפנקס הידני — זה מה שמאפשר להצליב את המסמך
                    המודפס מול מה שהלקוח קיבל ביד ביום המסירה */}
                {doc.manualReference && (
                  <p className="text-sm">תעודה ידנית: {doc.manualReference}</p>
                )}
              </div>
            </div>

            <div className="mt-5 pb-4 border-b border-gray-300">
              <p className="text-sm font-semibold text-gray-500">לכבוד</p>
              <p className="text-lg font-semibold">{doc.customerSnapshot?.name || "—"}</p>
              {doc.customerSnapshot?.customerNumber && (
                <p className="text-sm">מס' לקוח: {doc.customerSnapshot.customerNumber}</p>
              )}
              {doc.customerSnapshot?.vatId && (
                <p className="text-sm">ח.פ: {doc.customerSnapshot.vatId}</p>
              )}
              {doc.customerSnapshot?.address && (
                <p className="text-sm">
                  {doc.customerSnapshot.address}
                  {doc.customerSnapshot.city ? `, ${doc.customerSnapshot.city}` : ""}
                </p>
              )}
              {doc.customerSnapshot?.contactPerson && (
                <p className="text-sm">איש קשר: {doc.customerSnapshot.contactPerson}</p>
              )}
            </div>

            <table className="w-full mt-5 text-sm">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-400">
                  <th className="text-right py-2 px-2">#</th>
                  <th className="text-right py-2 px-2">מק"ט</th>
                  <th className="text-right py-2 px-2">תיאור</th>
                  <th className="text-center py-2 px-2">כמות</th>
                  {/* בתעודת משלוח המחירים מוצגים כי הן הבסיס לחשבונית
                      החודשית, והלקוח מצליב מולן */}
                  <th className="text-left py-2 px-2">מחיר יח'</th>
                  <th className="text-left py-2 px-2">סה"כ</th>
                </tr>
              </thead>
              <tbody>
                {(doc.items || []).map((item, i) => (
                  <tr key={i} className="border-b border-gray-200">
                    <td className="py-2 px-2">{i + 1}</td>
                    <td className="py-2 px-2">{item.sku || "—"}</td>
                    <td className="py-2 px-2">
                      {item.name}
                      {item.isVatFree && (
                        <span className="text-xs text-gray-500"> (פטור ממע"מ)</span>
                      )}
                    </td>
                    <td className="text-center py-2 px-2">{item.quantity}</td>
                    <td className="text-left py-2 px-2">{shekel(item.unitPrice)}</td>
                    <td className="text-left py-2 px-2">{shekel(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-start mt-5">
              <table className="text-sm w-72">
                <tbody>
                  <tr>
                    <td className="py-1">סה"כ פריטים</td>
                    <td className="text-left py-1">{shekel(totals.net)} ₪</td>
                  </tr>
                  {totals.shipping > 0 && (
                    <tr>
                      <td className="py-1">משלוח</td>
                      <td className="text-left py-1">{shekel(totals.shipping)} ₪</td>
                    </tr>
                  )}
                  {totals.discount > 0 && (
                    <tr>
                      <td className="py-1">הנחה</td>
                      <td className="text-left py-1">-{shekel(totals.discount)} ₪</td>
                    </tr>
                  )}
                  <tr className="border-t border-gray-300">
                    <td className="py-1">סה"כ לפני מע"מ</td>
                    <td className="text-left py-1">{shekel(totals.beforeVat)} ₪</td>
                  </tr>
                  <tr>
                    <td className="py-1">מע"מ 18%</td>
                    <td className="text-left py-1">{shekel(totals.vat)} ₪</td>
                  </tr>
                  <tr className="border-t-2 border-gray-800 font-bold text-base">
                    <td className="py-2">סה"כ לתשלום</td>
                    <td className="text-left py-2">{shekel(totals.total)} ₪</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {doc.notes && (
              <div className="mt-5 pt-3 border-t border-gray-300">
                <p className="text-sm font-semibold">הערות</p>
                <p className="text-sm whitespace-pre-wrap">{doc.notes}</p>
              </div>
            )}

            <div className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-500">
              {isQuote ? (
                <p>
                  הצעת מחיר זו אינה מהווה חשבונית מס. המחירים אינם כוללים מע"מ,
                  והמע"מ מתווסף בחשבונית.
                </p>
              ) : (
                <>
                  <p>
                    תעודת משלוח זו אינה מהווה חשבונית מס. חשבונית מרכזת תופק
                    בסוף החודש.
                  </p>
                  <div className="mt-8 flex justify-between">
                    <div className="w-56 border-t border-gray-400 pt-1 text-center">
                      חתימת המוסר
                    </div>
                    <div className="w-56 border-t border-gray-400 pt-1 text-center">
                      חתימת המקבל
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
    </>
  );
};

export default BillingDocument;
