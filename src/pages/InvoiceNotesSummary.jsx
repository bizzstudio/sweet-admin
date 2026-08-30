// src/pages/InvoiceNotesSummary.jsx
//
// ריכוז תעודות המשלוח של חשבונית — הנספח שמצורף אליה.
//
// החשבונית עצמה נושאת שורת ריכוז לכל קטגוריה ("ריכוז תעודות משלוח —
// כיבוד"), ובראשה טבלת מספרי התעודות. הדף הזה הוא אותה טבלה בגרסה מלאה
// ומודפסת, לצירוף לחשבונית: מספר תעודה, תאריך, מספר הפנקס, הקטגוריות
// שבה והסכום.
//
// למה נספח נפרד ולא הכל על החשבונית: החשבונית היא מסמך מס ב-iCount, וגוף
// המסמך שם מוגבל. לקוח עם 40 תעודות בחודש צריך טבלה שלמה, ולא רשימת
// מספרים דחוסה בכותרת.
//
// אין כאן שום נתון שנשמר בנפרד: הכל נבנה מהתעודות עצמן, כדי שלא ייווצר
// ריכוז שאומר דבר אחד וחשבונית שאומרת אחר.

import React, { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import ReactToPrint from "react-to-print";
import { Button, Card, CardBody } from "@windmill/react-ui";
import { FiPrinter } from "react-icons/fi";

import PageTitle from "@/components/Typography/PageTitle";
import Loading from "@/components/preloader/Loading";
import BillingServices from "@/services/BillingServices";
import useUtilsFunction from "@/hooks/useUtilsFunction";
import { notifyError } from "@/utils/toast";

const shekel = (n) =>
  Number(n || 0).toLocaleString("he-IL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const hebDate = (d) => (d ? new Date(d).toLocaleDateString("he-IL") : "—");

const InvoiceNotesSummary = () => {
  const { docNum } = useParams();
  const printRef = useRef();
  const { globalSetting } = useUtilsFunction();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await BillingServices.getInvoiceNotes(docNum);
        if (alive) setData(res);
      } catch (err) {
        if (alive) notifyError(err?.response?.data?.message || err.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [docNum]);

  if (loading) return <Loading loading={loading} />;
  if (!data) return <PageTitle>לא נמצאו תעודות לחשבונית {docNum}</PageTitle>;

  const company = {
    name: globalSetting?.company_name || globalSetting?.shop_name || "",
    address: globalSetting?.address || "",
    vatNumber: globalSetting?.vat_number || "",
    phone: globalSetting?.contact || "",
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 my-6">
        <PageTitle style={{ margin: 0 }}>ריכוז תעודות — חשבונית {data.docNum}</PageTitle>

        <div className="flex items-center gap-3">
          {data.docUrl && (
            <a
              href={data.docUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              צפייה בחשבונית ב-iCount
            </a>
          )}
          <ReactToPrint
            trigger={() => (
              <Button>
                <FiPrinter className="ml-2" /> הדפסה / שמירה כ-PDF
              </Button>
            )}
            content={() => printRef.current}
            documentTitle={`ריכוז-תעודות-${data.docNum}`}
          />
        </div>
      </div>

      <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-8">
        <CardBody>
          {/* צבעים קבועים ולא tokens של מצב כהה: זה מה שיוצא למדפסת */}
          <div ref={printRef} dir="rtl" className="bg-white text-gray-900 p-8">
            <div className="flex justify-between items-start border-b-2 border-gray-800 pb-4">
              <div>
                <h1 className="text-2xl font-bold">{company.name}</h1>
                {company.vatNumber && <p className="text-sm">ח.פ {company.vatNumber}</p>}
                {company.address && <p className="text-sm">{company.address}</p>}
                {company.phone && <p className="text-sm">טל' {company.phone}</p>}
              </div>

              <div className="text-left">
                <h2 className="text-xl font-bold">ריכוז תעודות משלוח</h2>
                <p className="text-sm mt-1">
                  נספח לחשבונית{" "}
                  <span className="font-mono font-bold text-lg">{data.docNum}</span>
                </p>
                <p className="text-sm">תאריך החשבונית: {hebDate(data.billedAt)}</p>
              </div>
            </div>

            <div className="mt-5 pb-4 border-b border-gray-300">
              <p className="text-sm font-semibold text-gray-500">לכבוד</p>
              <p className="text-lg font-semibold">
                {data.customerSnapshot?.name || "—"}
              </p>
              {data.customerSnapshot?.customerNumber && (
                <p className="text-sm">מס' לקוח: {data.customerSnapshot.customerNumber}</p>
              )}
              {data.customerSnapshot?.vatId && (
                <p className="text-sm">ח.פ: {data.customerSnapshot.vatId}</p>
              )}
            </div>

            {/* הריכוז לפי קטגוריה — אותן שורות שמופיעות על החשבונית עצמה */}
            <h3 className="mt-6 mb-2 font-bold">ריכוז לפי קטגוריה</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-400">
                  <th className="text-right py-2 px-2">קטגוריה</th>
                  <th className="text-center py-2 px-2">שורות</th>
                  <th className="text-left py-2 px-2">סה"כ לפני מע"מ</th>
                </tr>
              </thead>
              <tbody>
                {data.categories.map((c) => (
                  <tr key={c.category} className="border-b border-gray-200">
                    <td className="py-2 px-2 font-semibold">
                      ריכוז תעודות משלוח — {c.category}
                    </td>
                    <td className="text-center py-2 px-2">{c.lines}</td>
                    <td className="text-left py-2 px-2">{shekel(c.total)} ₪</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* הטבלה שהלקוח מצליב מולה: כל תעודה שנסגרה בחשבונית הזו */}
            <h3 className="mt-8 mb-2 font-bold">
              תעודות המשלוח שנסגרו בחשבונית ({data.totals.noteCount})
            </h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-400">
                  <th className="text-right py-2 px-2">#</th>
                  <th className="text-right py-2 px-2">תעודה</th>
                  <th className="text-right py-2 px-2">תאריך</th>
                  <th className="text-right py-2 px-2">הזמנה</th>
                  <th className="text-right py-2 px-2">פנקס</th>
                  <th className="text-right py-2 px-2">קטגוריות</th>
                  <th className="text-center py-2 px-2">שורות</th>
                  <th className="text-left py-2 px-2">סה"כ</th>
                </tr>
              </thead>
              <tbody>
                {data.notes.map((n, i) => (
                  <tr key={n._id} className="border-b border-gray-200">
                    <td className="py-2 px-2">{i + 1}</td>
                    <td className="py-2 px-2 font-mono font-semibold">{n.number}</td>
                    <td className="py-2 px-2">{hebDate(n.issuedAt)}</td>
                    <td className="py-2 px-2">{n.orderNumber || "—"}</td>
                    <td className="py-2 px-2">{n.manualReference || "—"}</td>
                    <td className="py-2 px-2">{n.categories.join(", ") || "—"}</td>
                    <td className="text-center py-2 px-2">{n.itemCount}</td>
                    <td className="text-left py-2 px-2">
                      {shekel(n.total ?? n.netTotal)} ₪
                      {/* הפירוט מוצג רק כשיש בו משהו. המספר הראשי הוא זה
                          שמודפס על התעודה, כדי שההצלבה מול הנייר תעבוד */}
                      {(n.discount > 0 || n.shippingCost > 0) && (
                        <span className="block text-xs text-gray-500">
                          שורות {shekel(n.netTotal)}
                          {n.shippingCost > 0 && ` · משלוח ${shekel(n.shippingCost)}`}
                          {n.discount > 0 && ` · הנחה ${shekel(n.discount)}`}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-start mt-5">
              <table className="text-sm w-72">
                <tbody>
                  <tr>
                    <td className="py-1">סה"כ שורות התעודות</td>
                    <td className="text-left py-1">{shekel(data.totals.itemsTotal)} ₪</td>
                  </tr>
                  {data.totals.shipping > 0 && (
                    <tr>
                      <td className="py-1">דמי משלוח</td>
                      <td className="text-left py-1">{shekel(data.totals.shipping)} ₪</td>
                    </tr>
                  )}
                  {data.totals.discount > 0 && (
                    <tr>
                      <td className="py-1">הנחה</td>
                      <td className="text-left py-1">-{shekel(data.totals.discount)} ₪</td>
                    </tr>
                  )}
                  <tr className="border-t-2 border-gray-800 font-bold text-base">
                    <td className="py-2">סה"כ לפני מע"מ</td>
                    <td className="text-left py-2">{shekel(data.totals.net)} ₪</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-500">
              מסמך זה הוא ריכוז לצורכי הצלבה בלבד ואינו מהווה חשבונית מס.
              חשבונית המס היא מסמך {data.docNum}, והמע"מ מחושב בה.
            </p>
          </div>
        </CardBody>
      </Card>

      <div className="mb-8">
        <Link to="/invoices" className="text-sm text-blue-600 hover:underline">
          ← חזרה לחשבוניות וגבייה
        </Link>
      </div>
    </>
  );
};

export default InvoiceNotesSummary;
