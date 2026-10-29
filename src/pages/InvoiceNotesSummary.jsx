// src/pages/InvoiceNotesSummary.jsx
//
// "פירוט תעודות משלוח לחשבונית" — הדף שמצורף לחשבונית החודשית.
//
// הפורמט מועתק מהמסמך שמנוע מפיק היום (דוגמה שהתקבלה 30/08/26), כדי
// שהלקוחות ורואה החשבון יקבלו בדיוק את מה שהם רגילים אליו:
//
//   כותרת עם שם החברה ומספר העוסק
//   שורת זיהוי: מספר חשבונית - תאריך - שם הלקוח - מספר לקוח - סך ללא מע"מ
//   טבלה: מספר תעודה | הערה | תאריך | סכום ללא מעמ
//
// עמודת "הערה" באה *במקום* עמודת "מספר הזמנה" שבמסמך של מנוע, לבקשת
// המנהלת (28/10/2026): ההערה שכתבה על התעודה ("כיבוד קומה 23", "חד פעמי
// קומה 23") היא מה שהלקוח מפריד לפיו, ומספר ההזמנה לא אמר לו דבר.
//   סיכום: סך ללא מעמ
//
// למה דף נפרד ולא הכל על החשבונית: החשבונית היא מסמך מס ב-iCount וגוף
// המסמך שם מוגבל באורך. לקוח עם 40 תעודות בחודש צריך טבלה שלמה, ולא
// רשימת מספרים דחוסה בכותרת.
//
// אין כאן שום נתון שנשמר בנפרד — הכל נבנה מהתעודות עצמן, כדי שלא ייווצר
// פירוט שאומר דבר אחד וחשבונית שאומרת אחר.

import React, { useEffect, useRef, useState } from "react";
import { useParams, useLocation, Link } from "react-router-dom";
import ReactToPrint from "react-to-print";
import * as XLSX from "xlsx";
import { Button, Card, CardBody } from "@windmill/react-ui";
import { FiDownload, FiPrinter } from "react-icons/fi";

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

// אותה הורדה כמו בדוח הרכישות — ראה שם למה Blob ולא writeFile
const downloadWorkbook = (book, fileName) => {
  const buffer = XLSX.write(book, { bookType: "xlsx", type: "array" });
  const url = URL.createObjectURL(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

/**
 * אותו דף בדיוק, כגיליון: כותרת, שורת זיהוי, הטבלה והסיכום — כדי שמי
 * שמקבל את האקסל יראה את מה שמודפס, רק עם סכומים שאפשר לחשב עליהם.
 * הסכומים נשמרים כמספרים (לא כטקסט מעוצב) בשביל אותו חישוב.
 */
const exportNotesExcel = ({ data, companyName, vatNumber, headline }) => {
  const rows = [
    [companyName],
    ...(vatNumber ? [[`עוסק מורשה: ${vatNumber}`]] : []),
    [headline],
    [],
    ["מספר תעודה", "הערה", "תאריך", "סכום ללא מעמ"],
  ];
  const firstNoteRow = rows.length;
  data.notes.forEach((n) => {
    rows.push([
      n.number,
      String(n.notes || "").trim(),
      dayAndTime(n.issuedAt),
      Number(n.total ?? n.netTotal ?? 0),
    ]);
  });
  rows.push([]);
  if (data.totals.shipping > 0 || data.totals.discount > 0) {
    rows.push(["מוצרים", "", "", Number(data.totals.itemsTotal || 0)]);
    if (data.totals.shipping > 0) rows.push(["משלוח", "", "", Number(data.totals.shipping)]);
    if (data.totals.discount > 0) rows.push(["הנחה", "", "", Number(data.totals.discount)]);
  }
  rows.push(["סך ללא מעמ", "", "", Number(data.totals.net || 0)]);

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = [{ wch: 14 }, { wch: 40 }, { wch: 20 }, { wch: 14 }];
  // שתי ספרות אחרי הנקודה, כמו בדף המודפס
  for (let r = firstNoteRow; r < rows.length; r += 1) {
    const cell = sheet[XLSX.utils.encode_cell({ r, c: 3 })];
    if (cell && cell.t === "n") cell.z = "#,##0.00";
  }

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "פירוט תעודות");
  // גיליון מימין לשמאל, כמו הדף
  book.Workbook = { Views: [{ RTL: true }] };
  downloadWorkbook(book, `פירוט-תעודות-${data.docNum}.xlsx`);
};

const InvoiceNotesSummary = () => {
  const { docNum } = useParams();
  // חזרה לרשימת החשבוניות באותה תצוגה שממנה הגיעו (ראה Invoices)
  const backTo = useLocation().state?.from || "/invoices";
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
          <Button
            layout="outline"
            onClick={() =>
              exportNotesExcel({ data, companyName, vatNumber, headline })
            }
          >
            <FiDownload className="ml-2" />
            <span className="text-black dark:text-gray-200">שמירה כאקסל</span>
          </Button>
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
            <p className="text-sm">בס"ד</p>
            <h1 className="text-2xl font-bold">{companyName}</h1>

            <div className="mt-6">
              {vatNumber && (
                <p className="text-sm underline">עוסק מורשה: {vatNumber}</p>
              )}
              <p className="text-sm underline mt-1">{headline}</p>
            </div>

            {/* רוחב מלא: עמודת ההערה מקבלת את כל המקום שנשאר, וכך הערה
                ארוכה נשברת לכמה שורות בתוך התא במקום למתוח את הטבלה מעבר
                לדף */}
            <table className="mt-6 w-full text-sm border border-gray-400">
              <thead>
                <tr className="border-b border-gray-400">
                  <th className="text-right py-1 px-3 border-l border-gray-400 font-normal">
                    מספר תעודה
                  </th>
                  <th className="text-right py-1 px-3 border-l border-gray-400 font-normal">
                    הערה
                  </th>
                  <th className="text-right py-1 px-3 border-l border-gray-400 font-normal">
                    תאריך
                  </th>
                  <th className="text-right py-1 px-3 font-normal whitespace-nowrap">
                    סכום ללא מעמ
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.notes.map((n) => (
                  <tr key={n._id} className="border-b border-gray-300">
                    <td className="py-1 px-3 border-l border-gray-400 font-mono align-top whitespace-nowrap">
                      {n.number}
                    </td>
                    <td className="py-1 px-3 border-l border-gray-400 align-top whitespace-pre-wrap break-words">
                      {String(n.notes || "").trim()}
                    </td>
                    <td
                      className="py-1 px-3 border-l border-gray-400 align-top whitespace-nowrap text-right"
                      dir="ltr"
                    >
                      {dayAndTime(n.issuedAt)}
                    </td>
                    <td className="py-1 px-3 align-top whitespace-nowrap">
                      {shekel(n.total ?? n.netTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* משלוח והנחה אינם קיימים במסמך של מנוע כי שם הם לא נשלחו
                לחשבונית. אצלנו הם כן, ולכן שורת הסיכום חייבת להסביר את
                ההפרש בין סכום התעודות לסכום שעל החשבונית.
                בלי המילה "שורות" (בקשת המנהלת, 28/10/2026): היא לא מתעניינת
                בשורות, ו"מוצרים" הוא מה ששורות הריכוז בחשבונית מסכמות */}
            {(data.totals.shipping > 0 || data.totals.discount > 0) && (
              <p className="mt-4 text-xs text-gray-600">
                הסכום כולל: מוצרים {shekel(data.totals.itemsTotal)} ₪
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
        <Link to={backTo} className="text-sm text-blue-600 hover:underline">
          ← חזרה לחשבוניות וגבייה
        </Link>
      </div>
    </>
  );
};

export default InvoiceNotesSummary;
