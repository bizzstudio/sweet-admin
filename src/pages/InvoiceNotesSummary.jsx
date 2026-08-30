// src/pages/InvoiceNotesSummary.jsx
//
// "פירוט תעודות משלוח לחשבונית" — הדף שמצורף לחשבונית החודשית.
//
// הפורמט מועתק מהמסמך שמנוע מפיק היום (דוגמה שהתקבלה 30/08/26), כדי
// שהלקוחות ורואה החשבון יקבלו בדיוק את מה שהם רגילים אליו:
//
//   כותרת עם שם החברה ומספר העוסק
//   שורת זיהוי: מספר חשבונית - תאריך - שם הלקוח - מספר לקוח - סך ללא מע"מ
//   טבלה: מספר תעודה | מספר הזמנה | תאריך | סכום ללא מעמ
//   סיכום: סך ללא מעמ
//
// למה דף נפרד ולא הכל על החשבונית: החשבונית היא מסמך מס ב-iCount וגוף
// המסמך שם מוגבל באורך. לקוח עם 40 תעודות בחודש צריך טבלה שלמה, ולא
// רשימת מספרים דחוסה בכותרת.
//
// אין כאן שום נתון שנשמר בנפרד — הכל נבנה מהתעודות עצמן, כדי שלא ייווצר
// פירוט שאומר דבר אחד וחשבונית שאומרת אחר.

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

/** dd/mm/yyyy בשעון ישראל. */
const dayOnly = (d) =>
  d ? new Date(d).toLocaleDateString("he-IL", { timeZone: "Asia/Jerusalem" }) : "—";

/**
 * dd/mm/yyyy HH:MM:SS — כמו בפירוט של מנוע.
 *
 * השעה אינה קישוט: שתי תעודות שיצאו לאותו לקוח באותו יום נבדלות רק בה,
 * וזה בדיוק המקרה שבו מישהו מנסה להבין למה יש שתי שורות.
 */
const dayAndTime = (d) => {
  if (!d) return "—";
  const date = new Date(d);
  return `${date.toLocaleDateString("he-IL", { timeZone: "Asia/Jerusalem" })} ${date.toLocaleTimeString(
    "he-IL",
    { timeZone: "Asia/Jerusalem", hour12: false }
  )}`;
};

/**
 * מה מופיע בעמודת "מספר הזמנה".
 *
 * במסמך של מנוע העמודה הזו נושאת גם תווית סוג ("זיכוי") ולא רק מספר.
 * אצלנו אין הזמנה לתעודה ידנית, ובמקומה מוצג מספר הפנקס — זה מה שהלקוח
 * מחזיק ביד, וזו ההצלבה היחידה שיש לתעודה כזו.
 */
const orderCell = (note) => {
  if (note.orderNumber) return String(note.orderNumber);
  if (note.manualReference) return `פנקס ${note.manualReference}`;
  return note.kind === "manual" ? "ידנית" : "—";
};

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

  const companyName =
    globalSetting?.company_name || globalSetting?.shop_name || "";
  const vatNumber = globalSetting?.vat_number || "";

  // שורת הזיהוי, באותו סדר שבמסמך של מנוע
  const headline = [
    `פירוט תעודות משלוח לחשבונית ${data.docNum}`,
    dayOnly(data.billedAt),
    data.customerSnapshot?.name,
    data.customerSnapshot?.customerNumber,
    `סך ללא מעמ: ${shekel(data.totals.net)} ₪`,
  ]
    .filter(Boolean)
    .join(" - ");

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 my-6">
        <PageTitle style={{ margin: 0 }}>
          פירוט תעודות משלוח — חשבונית {data.docNum}
        </PageTitle>

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
            documentTitle={`פירוט-תעודות-${data.docNum}`}
          />
        </div>
      </div>

      <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-8">
        <CardBody>
          {/* צבעים קבועים ולא tokens של מצב כהה: זה מה שיוצא למדפסת,
              וטקסט בהיר על רקע לבן נעלם */}
          <div ref={printRef} dir="rtl" className="bg-white text-gray-900 p-8">
            <h1 className="text-2xl font-bold">{companyName}</h1>

            <div className="mt-6">
              {vatNumber && (
                <p className="text-sm underline">עוסק מורשה: {vatNumber}</p>
              )}
              <p className="text-sm underline mt-1">{headline}</p>
            </div>

            <table className="mt-6 text-sm border border-gray-400">
              <thead>
                <tr className="border-b border-gray-400">
                  <th className="text-right py-1 px-3 border-l border-gray-400 font-normal">
                    מספר תעודה
                  </th>
                  <th className="text-right py-1 px-3 border-l border-gray-400 font-normal">
                    מספר הזמנה
                  </th>
                  <th className="text-right py-1 px-3 border-l border-gray-400 font-normal">
                    תאריך
                  </th>
                  <th className="text-right py-1 px-3 font-normal">סכום ללא מעמ</th>
                </tr>
              </thead>
              <tbody>
                {data.notes.map((n) => (
                  <tr key={n._id} className="border-b border-gray-300">
                    <td className="py-1 px-3 border-l border-gray-400 font-mono">
                      {n.number}
                    </td>
                    <td className="py-1 px-3 border-l border-gray-400">
                      {orderCell(n)}
                    </td>
                    <td className="py-1 px-3 border-l border-gray-400" dir="ltr">
                      {dayAndTime(n.issuedAt)}
                    </td>
                    <td className="py-1 px-3">{shekel(n.total ?? n.netTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* משלוח והנחה אינם קיימים במסמך של מנוע כי שם הם לא נשלחו
                לחשבונית. אצלנו הם כן, ולכן שורת הסיכום חייבת להסביר את
                ההפרש בין סכום התעודות לסכום שעל החשבונית */}
            {(data.totals.shipping > 0 || data.totals.discount > 0) && (
              <p className="mt-4 text-xs text-gray-600">
                מתוכם: שורות {shekel(data.totals.itemsTotal)} ₪
                {data.totals.shipping > 0 && ` · משלוח ${shekel(data.totals.shipping)} ₪`}
                {data.totals.discount > 0 && ` · הנחה ${shekel(data.totals.discount)} ₪`}
              </p>
            )}

            <p className="mt-4 text-sm font-semibold">
              סך ללא מעמ: {shekel(data.totals.net)} ₪
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
