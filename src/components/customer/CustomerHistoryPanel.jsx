// src/components/customer/CustomerHistoryPanel.jsx
// היסטוריית הרכישות של הלקוח בעמוד "צפייה בלקוח": מצב, המוצרים שהוא באמת
// קונה, וכפתור להעלאת קובץ חדש.
//
// לצד כל שורה מוצג כמה פעמים הלקוח הזמין ומתי לאחרונה — אלה שני המספרים
// שקובעים אם המוצר יכריע שורה עמומה בהזמנה או רק יופיע כרמז לעובד
// (ראה utils/purchaseHistoryRanking בשרת).
import { Badge, Button } from "@windmill/react-ui";
import React, { useCallback, useEffect, useState } from "react";
import { FiAlertTriangle, FiClock, FiSearch, FiUploadCloud } from "react-icons/fi";

// Internal import
import { Field, Panel } from "@/components/common/ReadOnlyFields";
import CustomerHistoryModal from "@/components/customer/CustomerHistoryModal";
import CustomerHistoryServices from "@/services/CustomerHistoryServices";
import { describeApiError } from "@/utils/apiError";
import {
  formatDateTime,
  formatFileDate,
  formatMoney,
  text,
} from "@/utils/displayFormat";

// כמה שורות נטענות לתצוגה. היסטוריה של לקוח כבד יכולה להיות מאות מוצרים,
// והחיפוש (שרץ בשרת על כל השורות) הוא הדרך להגיע למוצר מסוים
const VIEW_LIMIT = 100;

const timesLabel = (lines) =>
  lines === 1 ? "פעם אחת" : lines === 2 ? "פעמיים" : `${lines} פעמים`;

const CustomerHistoryPanel = ({ customerId, customerName = "" }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const load = useCallback(
    async (searchText = "") => {
      if (!customerId) return;
      setLoading(true);
      setLoadError("");
      try {
        const res = await CustomerHistoryServices.getCustomerHistory(customerId, {
          search: searchText,
          limit: VIEW_LIMIT,
        });
        setData(res);
      } catch (err) {
        // ── כשל טעינה אינו "אין היסטוריה" ──
        //
        // שרת שאינו עונה היה נראה בדיוק כמו לקוח שאין לו היסטוריה, ומי שקורא
        // היה מסיק שהיא נמחקה ומעלה אותה מחדש.
        setData(null);
        setLoadError(describeApiError(err));
      } finally {
        setLoading(false);
      }
    },
    [customerId],
  );

  useEffect(() => {
    load("");
  }, [load]);

  const handleSearch = (e) => {
    // הפאנל יושב בתוך הטופס של עמוד הלקוח, ולכן חיפוש שאינו עוצר את השליחה
    // היה שומר את הלקוח בכל הקלדה של Enter
    e.preventDefault();
    e.stopPropagation();
    load(search);
  };

  const exists = Boolean(data?.exists);
  const partial = exists && data.matchedInCatalog < data.itemsCount;

  // כשהטעינה נכשלה אין לנו מה להגיד על ההיסטוריה — לא שהיא קיימת ולא שאינה
  const note = loadError
    ? "מצב ההיסטוריה לא נטען"
    : exists
      ? undefined
      : "אין — שורות עמומות יגיעו לטיפול ידני";

  return (
    <Panel title="היסטוריית רכישות" icon={<FiClock />} note={note} span>
      <CustomerHistoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        customerId={customerId}
        customerName={customerName}
        onChanged={() => load(search)}
      />

      <div className="sm:col-span-2">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {loadError ? (
              <Badge type="danger">
                <span className="font-bold">שגיאת טעינה</span>
              </Badge>
            ) : exists ? (
              <Badge type="success">
                <span className="font-bold">{`${data.itemsCount} מוצרים`}</span>
              </Badge>
            ) : (
              <Badge type="neutral">
                <span className="font-bold">אין היסטוריה</span>
              </Badge>
            )}
            {partial ? (
              <Badge type="warning">
                <span className="font-bold">
                  {`${data.itemsCount - data.matchedInCatalog} מק"טים אינם בקטלוג`}
                </span>
              </Badge>
            ) : null}
          </div>

          {/* type="button" הכרחי: הפאנל יושב בתוך הטופס של עמוד הלקוח,
              וכפתור בלי type שולח אותו */}
          <Button
            type="button"
            layout="outline"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 text-sm"
          >
            <FiUploadCloud className="mr-1" /> העלאת היסטוריה מאקסל
          </Button>
        </div>

        {loadError ? (
          <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-gray-700">
            <FiAlertTriangle className="mt-0.5 shrink-0" />
            <span>
              {loadError}
              <button
                type="button"
                onClick={() => load(search)}
                className="ml-2 underline focus:outline-none"
              >
                נסה שוב
              </button>
            </span>
          </div>
        ) : exists ? (
          <>
            <div className="mb-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-3">
              <Field
                label="טווח התאריכים"
                value={
                  data.spanFrom && data.spanTo
                    ? `${formatFileDate(data.spanFrom)} — ${formatFileDate(data.spanTo)}`
                    : "—"
                }
              />
              <Field label="הקובץ שממנו יובא" value={text(data.fileName)} />
              <Field label="עודכן" value={formatDateTime(data.importedAt)} />
            </div>

            <div className="mb-3 flex items-center gap-2">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch(e);
                }}
                placeholder='חיפוש לפי מק"ט או שם'
                className="block w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
              />
              <Button
                type="button"
                layout="outline"
                onClick={handleSearch}
                className="px-3 py-2"
              >
                <FiSearch />
              </Button>
            </div>

            {loading ? (
              <p className="py-3 text-sm text-gray-500 dark:text-gray-400">טוען...</p>
            ) : data.items?.length ? (
              <>
                <div className="max-h-80 overflow-y-auto rounded-md border border-gray-100 dark:border-gray-700">
                  <table className="w-full text-right text-xs">
                    <thead className="sticky top-0 bg-gray-50 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                      <tr>
                        <th className="px-3 py-2 font-medium">מק"ט</th>
                        <th className="px-3 py-2 font-medium">המוצר בקטלוג</th>
                        <th className="px-3 py-2 font-medium">כמה פעמים</th>
                        <th className="px-3 py-2 font-medium">הזמנה אחרונה</th>
                        <th className="px-3 py-2 font-medium">מחיר אחרון</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-700 dark:text-gray-200">
                      {data.items.map((item) => (
                        <tr
                          key={item.sku}
                          className="border-t border-gray-100 dark:border-gray-700"
                        >
                          <td className="px-3 py-1.5 font-medium">{item.sku}</td>
                          <td className="px-3 py-1.5">
                            {item.inCatalog ? (
                              <>
                                {text(item.catalogTitle)}
                                {item.catalogStatus !== "show" ? (
                                  <span className="ml-1 text-orange-500">(מוסתר)</span>
                                ) : null}
                              </>
                            ) : (
                              // מק"ט שאינו בקטלוג נשמר בכוונה: מוצר שייווצר מחר
                              // יימצא דרכו בלי לייבא את הקובץ מחדש
                              <span className="text-orange-500">
                                {item.name ? `${item.name} — אינו בקטלוג` : "אינו בקטלוג"}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-1.5 font-semibold">
                            {timesLabel(item.lines)}
                          </td>
                          <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400">
                            {formatFileDate(item.lastAt)}
                          </td>
                          <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400">
                            {formatMoney(item.lastPrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {data.filtered > data.returned ? (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {`מוצגים ${data.returned} מתוך ${data.filtered} מוצרים — אפשר לצמצם בחיפוש.`}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="py-3 text-sm text-gray-500 dark:text-gray-400">
                לא נמצאו מוצרים מתאימים לחיפוש.
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {'ללקוח אין היסטוריית רכישות. אפשר להעלות את קובץ "היסטוריה ללקוח" ' +
              'מההנהח"ש — ומאותו רגע, כשהלקוח יזמין מוצר ששמו מתאים לכמה פריטים ' +
              "בקטלוג, המערכת תבחר את זה שהוא באמת קונה במקום להעביר את השורה לטיפול ידני."}
          </p>
        )}
      </div>
    </Panel>
  );
};

export default CustomerHistoryPanel;
