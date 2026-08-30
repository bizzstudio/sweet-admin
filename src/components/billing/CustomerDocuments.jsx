// src/components/billing/CustomerDocuments.jsx
//
// כל המסמכים של הלקוח: תעודות משלוח, חשבוניות, קבלות והצעות מחיר.
//
// החלוקה היא בטאבים לפי סוג מסמך: מי שמחפש חשבונית לא צריך לגלול מעל
// שלוש רשימות. מונה על כל טאב נותן את התמונה המלאה בלי להיכנס אליו.
//
// מוצגים כל המסמכים, בלי הגבלה ובלי גלילה פנימית: כיוון שרשימה אחת
// בלבד פתוחה בכל רגע, הגלילה הרגילה של העמוד מספיקה. אזור גלילה בתוך
// עמוד שגם הוא נגלל הוא בדיוק מה שגורם לגלגלת לזוז ב"מקום הלא נכון".
//
// השורות עצמן אינן נשלחות מהשרת; מגיע רק itemCount. תעודה ממוצעת היא
// עשרות שורות, ומאות תעודות עם השורות שלהן היו מגיעות למגה-בייטים.
//
// הרכיב מציג בלבד: הטעינה, מצב השגיאה ושם הלקוח הם באחריות העמוד
// (pages/CustomerDocumentsPage.jsx), שמושך הכל בקריאה אחת. כך אין שתי
// בקשות לאותו לקוח ואין שני מצבי טעינה שמתחרים על אותו מסך.

import React, { useState } from "react";
import { Badge } from "@windmill/react-ui";
import { Link } from "react-router-dom";
import { FiExternalLink, FiFileText } from "react-icons/fi";

const shekel = (n) =>
  Number(n || 0).toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const hebDate = (d) => (d ? new Date(d).toLocaleDateString("he-IL") : "—");

const NOTE_STATUS = {
  open: { text: "ממתינה לחיוב", type: "warning" },
  billing: { text: "בתהליך", type: "neutral" },
  billed: { text: "חויבה", type: "success" },
  cancelled: { text: "בוטלה", type: "danger" },
};

const QUOTE_STATUS = {
  open: { text: "ממתינה", type: "warning" },
  accepted: { text: "אושרה", type: "success" },
  rejected: { text: "נדחתה", type: "danger" },
  expired: { text: "פג תוקף", type: "neutral" },
};

/** לשונית אחת בשורת הטאבים, עם מונה המסמכים שבה. */
const Tab = ({ id, title, count, active, onSelect }) => (
  <button
    type="button"
    role="tab"
    id={`doc-tab-${id}`}
    aria-selected={active}
    aria-controls={`doc-panel-${id}`}
    onClick={() => onSelect(id)}
    // הגבול התחתון הוא מה שמסמן את הטאב הפעיל, ולכן הוא קיים גם בטאב
    // כבוי (שקוף) — אחרת הטקסט היה קופץ מעלה ומטה בכל החלפה
    className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors duration-150 focus:outline-none ${
      active
        ? "border-mainColor text-mainColor-dark dark:text-mainColor-light"
        : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
    }`}
  >
    {title}
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-normal ${
        active
          ? "bg-mainColor-superLight text-mainColor-dark"
          : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
      }`}
    >
      {count}
    </span>
  </button>
);

const Empty = ({ text }) => <p className="py-6 text-center text-sm text-gray-500">{text}</p>;

// כתובות המסמכים מגיעות מ-iCount ונשמרות אצלנו. מוצגות כקישור רק אם הן
// http(s) — ערך אחר (javascript:, נתון פגום) יוצג כטקסט ולא כקישור לחיץ
const externalHref = (url) =>
  /^https?:\/\//i.test(String(url || "")) ? String(url) : null;

/**
 * @param {object} props
 * @param {object} props.docs - תשובת getCustomerDocuments. העמוד מוודא את
 *   המבנה לפני שהוא מרנדר, ולכן כאן אין בדיקות null חוזרות
 * @param {string} props.customerId - לקישורי "פתיחה במסך מלא"
 */
const CustomerDocuments = ({ docs, customerId }) => {
  const { deliveryNotes, invoices, quotes } = docs;

  // ברירת מחדל ולא שדה מחייב: הפאנל עשוי לרוץ מול שרת שטרם עודכן, ואז
  // עדיף טאב קבלות ריק על מסך שנופל. הבדיקה ב-CustomerDocumentsPage
  // בכוונה אינה דורשת את השדה מאותה סיבה
  const receipts = docs.receipts || { items: [], total: 0, paidEstimate: 0 };

  // count הוא total מהשרת (מה שהמונה על הטאב אומר), ו-items הוא מה
  // שמוצג בפועל. היום הם זהים, אבל הקישור "פתיחה במסך מלא" ומצב "ריק"
  // נגזרים מ-items — כך המסך לא יוכל להגיד "אין מסמכים" ובכל זאת להציע
  // לפתוח אותם, אם אי פעם ייווסף עימוד בשרת
  const TABS = [
    {
      id: "invoices",
      title: "חשבוניות",
      items: invoices.items,
      count: invoices.total ?? invoices.items.length,
      to: `/invoices?customer=${customerId}`,
    },
    {
      id: "receipts",
      title: "קבלות",
      items: receipts.items,
      count: receipts.total ?? receipts.items.length,
      to: `/receipts?customer=${customerId}`,
    },
    {
      id: "notes",
      title: "תעודות משלוח",
      items: deliveryNotes.items,
      count: deliveryNotes.total ?? deliveryNotes.items.length,
      to: `/delivery-notes?customer=${customerId}`,
    },
    {
      id: "quotes",
      title: "הצעות מחיר",
      items: quotes.items,
      count: quotes.total ?? quotes.items.length,
      to: `/quotes?customer=${customerId}`,
    },
  ];

  // פתיחה על הטאב הראשון שיש בו משהו: לקוח שיש לו רק תעודות משלוח היה
  // נוחת אחרת על "טרם הופקו חשבוניות" וחושב שאין לו כלום.
  // הערך מחושב פעם אחת בלבד (initializer). המעבר בין לקוחות אינו מסתמך
  // על כך אלא על key={customerId} בעמוד, שיוצר מופע חדש לכל לקוח
  const [active, setActive] = useState(
    () => (TABS.find((tab) => tab.items.length > 0) || TABS[0]).id
  );

  const activeTab = TABS.find((tab) => tab.id === active) || TABS[0];

  return (
    <div className="space-y-6">
      {/* ── סיכום ── */}
      <div className="flex flex-wrap gap-6">
        <div>
          <p className="text-xs text-gray-500">חוב פתוח</p>
          <p className="text-xl font-semibold">{shekel(invoices.owed)} ₪</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">חשבוניות לא שולמו</p>
          <p className="text-xl font-semibold">{invoices.unpaid}</p>
        </div>
        {invoices.overdue > 0 && (
          <div>
            <p className="text-xs text-gray-500">באיחור</p>
            <p className="text-xl font-semibold text-red-600">{invoices.overdue}</p>
          </div>
        )}
        {deliveryNotes.open > 0 && (
          <div>
            <p className="text-xs text-gray-500">תעודות שטרם חויבו</p>
            <p className="text-xl font-semibold text-yellow-600">{deliveryNotes.open}</p>
          </div>
        )}
      </div>

      {/* ── טאבים לפי סוג מסמך ── */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div role="tablist" aria-label="סוג מסמך" className="flex flex-wrap">
          {TABS.map((tab) => (
            <Tab
              key={tab.id}
              id={tab.id}
              title={tab.title}
              count={tab.count}
              active={tab.id === active}
              onSelect={setActive}
            />
          ))}
        </div>
      </div>

      {/* הקישור מוביל למסך המלא של אותו סוג מסמך, מסונן ללקוח הזה - שם
          יש חיפוש וסינון שאין כאן */}
      {activeTab.items.length > 0 && (
        <div className="-mt-3 flex justify-end">
          <Link to={activeTab.to} className="text-xs text-blue-600 hover:underline">
            פתיחה במסך מלא →
          </Link>
        </div>
      )}

      {/* ── חשבוניות ── */}
      <div
        role="tabpanel"
        id="doc-panel-invoices"
        aria-labelledby="doc-tab-invoices"
        hidden={active !== "invoices"}
      >
        {invoices.items.length === 0 ? (
          <Empty text="טרם הופקו חשבוניות ללקוח זה" />
        ) : (
          <div className="space-y-1">
            {invoices.items.map((inv) => (
              <div
                key={inv.docNum}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
              >
                {externalHref(inv.icountDocUrl) ? (
                  <a
                    href={externalHref(inv.icountDocUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    {inv.docNum} <FiExternalLink />
                  </a>
                ) : (
                  <span className="font-mono font-semibold">{inv.docNum}</span>
                )}
                <span className="text-gray-500">{hebDate(inv.billedAt)}</span>
                <span>{shekel(inv.grossEstimate)} ₪</span>
                {inv.isPaid ? (
                  <Badge type="success">שולמה</Badge>
                ) : inv.isOverdue ? (
                  <Badge type="danger">באיחור {inv.daysLate} ימים</Badge>
                ) : (
                  <Badge type="warning">לפירעון {hebDate(inv.dueDate)}</Badge>
                )}
                {inv.credits?.length > 0 && (
                  <span className="text-xs text-red-600">{inv.credits.length} זיכויים</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── קבלות ── */}
      <div
        role="tabpanel"
        id="doc-panel-receipts"
        aria-labelledby="doc-tab-receipts"
        hidden={active !== "receipts"}
      >
        {receipts.items.length === 0 ? (
          <Empty text="טרם נרשמו תשלומים ללקוח זה" />
        ) : (
          <div className="space-y-1">
            {receipts.items.map((r) => (
              <div
                key={r.docNum}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
              >
                {externalHref(r.docUrl) ? (
                  <a
                    href={externalHref(r.docUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    {r.docNum} <FiExternalLink />
                  </a>
                ) : (
                  <span className="font-mono font-semibold">{r.docNum}</span>
                )}
                <span className="text-gray-500">{hebDate(r.paidAt)}</span>
                <span>{shekel(r.grossEstimate)} ₪</span>
                {/* על איזו חשבונית שולם — זו השאלה שבגללה פותחים את הטאב */}
                {(r.invoices || []).length > 0 && (
                  <span className="text-xs text-gray-500">
                    חשבונית {r.invoices.map((i) => i.docNum).join(", ")}
                  </span>
                )}
                {r.hasCredit && <Badge type="warning">זוכתה</Badge>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── תעודות משלוח ── */}
      <div
        role="tabpanel"
        id="doc-panel-notes"
        aria-labelledby="doc-tab-notes"
        hidden={active !== "notes"}
      >
        {deliveryNotes.items.length === 0 ? (
          <Empty text="טרם הופקו תעודות משלוח" />
        ) : (
          <div className="space-y-1">
            {deliveryNotes.items.map((note) => {
              const label = NOTE_STATUS[note.billing?.status] || NOTE_STATUS.open;
              return (
                <div key={note._id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <Link
                    to={`/delivery-note/${note._id}`}
                    className="font-mono font-semibold text-blue-600 hover:underline"
                  >
                    {note.number}
                  </Link>
                  {/* בלי הסימון הזה תעודה אוטומטית ותעודת משקל ידנית מאותו
                      יום נראות כמו כפילות ומזמינות "ביטול" של אחת מהן */}
                  {note.kind === "manual" && (
                    <span
                      className="text-xs text-green-700 dark:text-green-500"
                      title="הכמות בתעודה היא המשקל שנשקל בפועל"
                    >
                      ידנית
                      {note.manualReference ? ` · ${note.manualReference}` : ""}
                    </span>
                  )}
                  <span className="text-gray-500">{hebDate(note.issuedAt)}</span>
                  <span className="text-gray-500">{note.itemCount ?? 0} שורות</span>
                  <span>{shekel(note.total)} ₪</span>
                  <Badge type={label.type}>{label.text}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── הצעות מחיר ── */}
      <div
        role="tabpanel"
        id="doc-panel-quotes"
        aria-labelledby="doc-tab-quotes"
        hidden={active !== "quotes"}
      >
        {quotes.items.length === 0 ? (
          <Empty text="טרם הופקו הצעות מחיר" />
        ) : (
          <div className="space-y-1">
            {quotes.items.map((q) => {
              const label = QUOTE_STATUS[q.status] || QUOTE_STATUS.open;
              return (
                <div key={q._id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <Link
                    to={`/quote/${q._id}`}
                    className="font-mono font-semibold text-blue-600 hover:underline"
                  >
                    {q.number}
                  </Link>
                  <span className="text-gray-500">{hebDate(q.createdAt)}</span>
                  <span>{shekel(q.total)} ₪</span>
                  <Badge type={label.type}>{label.text}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500 flex items-center gap-1">
        <FiFileText /> תעודות משלוח והצעות מחיר נשמרות במערכת · חשבוניות, קבלות
        וזיכויים ב-iCount
      </p>
    </div>
  );
};

export default CustomerDocuments;
