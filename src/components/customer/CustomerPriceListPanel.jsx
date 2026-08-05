// src/components/customer/CustomerPriceListPanel.jsx
// המחירון הפרטי של הלקוח בעמוד "צפייה בלקוח": מצב, השורות עצמן מול הקטלוג,
// וכפתור להעלאת מחירון חדש מאקסל.
//
// לצד כל שורה מוצג גם מחיר הקטלוג, כי זה מה שאומר אם המחירון בכלל משנה משהו —
// שורה שהמחיר בה זהה לקטלוג היא שורה מיותרת, ושורה שהמק"ט שלה אינו בקטלוג
// כלל אינה תופסת עד שהמוצר ייווצר.
import { Badge, Button } from "@windmill/react-ui";
import React, { useCallback, useEffect, useState } from "react";
import {
  FiAlertTriangle,
  FiDollarSign,
  FiSearch,
  FiUploadCloud,
} from "react-icons/fi";

// Internal import
import { Field, Panel } from "@/components/common/ReadOnlyFields";
import CustomerPriceListModal from "@/components/customer/CustomerPriceListModal";
import CustomerPriceListServices from "@/services/CustomerPriceListServices";
import { describeApiError } from "@/utils/apiError";
import { formatDateTime, formatMoney, text } from "@/utils/displayFormat";

// כמה שורות נטענות לתצוגה. מחירון יכול להיות באורך הקטלוג כולו, והחיפוש
// (שרץ בשרת על כל השורות) הוא הדרך להגיע לשורה מסוימת
const VIEW_LIMIT = 100;

const CustomerPriceListPanel = ({ customerId, customerName = "" }) => {
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
        const res = await CustomerPriceListServices.getCustomerPriceList(customerId, {
          search: searchText,
          limit: VIEW_LIMIT,
        });
        setData(res);
      } catch (err) {
        // ── כשל טעינה אינו "אין מחירון" ──
        //
        // קודם השגיאה נבלעה והכרטיס הציג "ללקוח אין מחירון פרטי" — כלומר שרת
        // שלא עונה נראה בדיוק כמו לקוח שמשלם מחירי קטלוג. זו טעות מסוכנת:
        // מישהו היה מסיק שהמחירון נמחק ומעלה אותו מחדש.
        setData(null);
        setLoadError(describeApiError(err));
      } finally {
        setLoading(false);
      }
    },
    [customerId]
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

  // כשהטעינה נכשלה אין לנו מה להגיד על המחירון — לא שהוא קיים ולא שאינו קיים
  const note = loadError
    ? "מצב המחירון לא נטען"
    : exists
      ? undefined
      : "אין — הלקוח משלם מחירי קטלוג";

  return (
    <Panel title="מחירון פרטי" icon={<FiDollarSign />} note={note} span>
      <CustomerPriceListModal
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
                <span className="font-bold">{`${data.itemsCount} שורות`}</span>
              </Badge>
            ) : (
              <Badge type="neutral">
                <span className="font-bold">מחירי קטלוג</span>
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
            <FiUploadCloud className="mr-1" /> העלאת מחירון מאקסל
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
              <Field label="הקובץ שממנו יובא" value={text(data.fileName)} />
              <Field label="עודכן" value={formatDateTime(data.importedAt)} />
              <Field label="הועלה על ידי" value={text(data.importedBy)} />
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
                        <th className="px-3 py-2 font-medium">מחיר ללקוח</th>
                        <th className="px-3 py-2 font-medium">מחיר קטלוג</th>
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
                              <span className="text-orange-500">
                                {item.name
                                  ? `${item.name} — אינו בקטלוג`
                                  : "אינו בקטלוג"}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-1.5 font-semibold">
                            {formatMoney(item.price)}
                          </td>
                          <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400">
                            {formatMoney(item.catalogPrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {data.filtered > data.returned ? (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {`מוצגות ${data.returned} מתוך ${data.filtered} שורות — אפשר לצמצם בחיפוש.`}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="py-3 text-sm text-gray-500 dark:text-gray-400">
                לא נמצאו שורות מתאימות לחיפוש.
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {'ללקוח אין מחירון פרטי. אפשר להעלות קובץ אקסל עם מק"ט, שם המוצר ומחיר — ' +
              "וכל מוצר שאינו בקובץ ימשיך להימכר במחיר הקטלוג."}
          </p>
        )}
      </div>
    </Panel>
  );
};

export default CustomerPriceListPanel;
