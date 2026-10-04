// src/components/customer/CustomerPriceListPanel.jsx
// המחירון הפרטי של הלקוח בעמוד "צפייה בלקוח": מצב, השורות עצמן מול הקטלוג,
// וכפתור להעלאת מחירון חדש מאקסל.
//
// מ-04/10/2026 אפשר גם לעדכן את המחירון ישירות מכאן, בלי אקסל (בקשת
// הלקוחה): שינוי מחיר בשורה, הוספת מוצר והסרת מוצר. כל פעולה כזו היא
// מיזוג — שאר השורות נשארות — בניגוד ליבוא מאקסל, שדורס את הכל.
//
// לצד כל שורה מוצג גם מחיר הקטלוג, כי זה מה שאומר אם המחירון בכלל משנה משהו —
// שורה שהמחיר בה זהה לקטלוג היא שורה מיותרת, ושורה שהמק"ט שלה אינו בקטלוג
// כלל אינה תופסת עד שהמוצר ייווצר.
import { Badge, Button } from "@windmill/react-ui";
import React, { useCallback, useEffect, useState } from "react";
import {
  FiAlertTriangle,
  FiCheck,
  FiDollarSign,
  FiEdit2,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiUploadCloud,
  FiX,
} from "react-icons/fi";

// Internal import
import { Field, Panel } from "@/components/common/ReadOnlyFields";
import CustomerPriceListModal from "@/components/customer/CustomerPriceListModal";
import ProductPicker from "@/components/billing/ProductPicker";
import CustomerPriceListServices from "@/services/CustomerPriceListServices";
import { describeApiError } from "@/utils/apiError";
import { formatDateTime, formatMoney, text } from "@/utils/displayFormat";
import { notifyError, notifySuccess } from "@/utils/toast";

// כמה שורות נטענות לתצוגה. מחירון יכול להיות באורך הקטלוג כולו, והחיפוש
// (שרץ בשרת על כל השורות) הוא הדרך להגיע לשורה מסוימת
const VIEW_LIMIT = 100;

// מחיר שהוקלד — מספר חיובי, או null. השרת בודק שוב; הבדיקה כאן היא כדי
// שהבקשה לא תישלח בכלל עם שדה ריק או "0". השדה הוא type="number", ולכן
// הערך כבר מנורמל בנקודה עשרונית (או ריק כשההקלדה אינה מספר)
const parsePrice = (value) => {
  const text = String(value ?? "").trim();
  const num = Number(text);
  return text !== "" && Number.isFinite(num) && num > 0 ? num : null;
};

const inputClass =
  "block w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus:border-gray-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200";

// Enter בתוך הפאנל לא ישלח את הטופס של עמוד הלקוח, אלא יפעיל את הפעולה
const onEnter = (action) => (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    e.stopPropagation();
    action();
  }
};

const CustomerPriceListPanel = ({ customerId, customerName = "" }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // עריכה ישירה: שורה אחת בעריכה בכל רגע, ופעולה אחת בכל רגע
  const [editingSku, setEditingSku] = useState(null);
  const [editPrice, setEditPrice] = useState("");
  const [adding, setAdding] = useState(false);
  const [newSku, setNewSku] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [saving, setSaving] = useState(false);

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

  /**
   * שמירת מחיר אחד (עדכון שורה קיימת או הוספת מוצר).
   *
   * name נשלח בעריכת שורה קיימת: השרת משלים שם רק מהקטלוג, ולכן מוצר שאינו
   * בקטלוג היה מאבד את השם שהגיע מקובץ האקסל ברגע ששינו לו מחיר.
   */
  const savePrice = async (sku, rawPrice, name) => {
    if (saving) return false;
    const price = parsePrice(rawPrice);
    if (!sku) {
      notifyError("יש לבחור מוצר");
      return false;
    }
    if (price === null) {
      notifyError("יש להזין מחיר חיובי");
      return false;
    }
    setSaving(true);
    try {
      const res = await CustomerPriceListServices.upsertItems(customerId, {
        items: [name ? { sku, price, name } : { sku, price }],
      });
      notifySuccess(res?.message || "המחיר נשמר");
      await load(search);
      return true;
    } catch (err) {
      notifyError(describeApiError(err));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item) => {
    setAdding(false);
    setEditingSku(item.sku);
    setEditPrice(String(item.price ?? ""));
  };

  const saveEdit = async () => {
    const item = data?.items?.find((row) => row.sku === editingSku);
    if (await savePrice(editingSku, editPrice, item?.name)) setEditingSku(null);
  };

  const saveNew = async () => {
    if (await savePrice(newSku, newPrice)) {
      setNewSku("");
      setNewPrice("");
      setAdding(false);
    }
  };

  const removeItem = async (item) => {
    if (saving) return;
    const label = item.catalogTitle || item.name || item.sku;
    if (
      !window.confirm(
        `להסיר את "${label}" (מק"ט ${item.sku}) מהמחירון?\n\nהמוצר יימכר ללקוח במחיר הקטלוג.`
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      const res = await CustomerPriceListServices.removeItems(customerId, {
        skus: [item.sku],
      });
      notifySuccess(res?.message || "המוצר הוסר מהמחירון");
      await load(search);
    } catch (err) {
      notifyError(describeApiError(err));
    } finally {
      setSaving(false);
    }
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
          <div className="flex flex-wrap items-center gap-2">
            {!loadError && (
              <Button
                type="button"
                layout="outline"
                onClick={() => {
                  setEditingSku(null);
                  setAdding((v) => !v);
                }}
                disabled={saving}
                className="px-4 py-2 text-sm"
              >
                <FiPlus className="mr-1" /> הוספת מוצר למחירון
              </Button>
            )}
            <Button
              type="button"
              layout="outline"
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 text-sm"
            >
              <FiUploadCloud className="mr-1" /> העלאת מחירון מאקסל
            </Button>
          </div>
        </div>

        {/* הוספת מוצר בודד — בלי אקסל. השדות מוצגים רק אחרי לחיצה, כדי
            שכרטיס הלקוח במצב צפייה יישאר בלי שדות קלט */}
        {adding && !loadError && (
          <div className="mb-4 rounded-md border border-gray-200 p-3 dark:border-gray-600">
            <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
              הוספת מוצר או עדכון מחיר
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-0 flex-1" style={{ minWidth: "14rem" }}>
                <ProductPicker value={newSku} onChange={setNewSku} />
              </div>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                onKeyDown={onEnter(saveNew)}
                placeholder='מחיר ללא מע"מ'
                aria-label="מחיר ללקוח"
                className={inputClass}
                style={{ width: "9rem" }}
              />
              <Button
                type="button"
                onClick={saveNew}
                disabled={saving}
                className="px-4 py-2 text-sm"
              >
                <FiCheck className="mr-1" /> {saving ? "שומר..." : "שמירה"}
              </Button>
              <Button
                type="button"
                layout="outline"
                onClick={() => setAdding(false)}
                disabled={saving}
                className="px-3 py-2 text-sm"
              >
                ביטול
              </Button>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              מוצר שכבר נמצא במחירון יקבל את המחיר החדש. שאר המחירון לא משתנה.
            </p>
          </div>
        )}

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
              {/* עריכה מהמסך מעדכנת את updatedAt ולא את importedAt — זה
                  התאריך שאומר מתי המחירון השתנה בפועל */}
              <Field
                label="עודכן לאחרונה"
                value={formatDateTime(data.updatedAt || data.importedAt)}
              />
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
                        <th className="px-3 py-2 font-medium">
                          <span className="sr-only">פעולות</span>
                        </th>
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
                            {editingSku === item.sku ? (
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                inputMode="decimal"
                                autoFocus
                                value={editPrice}
                                onChange={(e) => setEditPrice(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Escape") setEditingSku(null);
                                  else onEnter(saveEdit)(e);
                                }}
                                aria-label={`מחיר חדש למק"ט ${item.sku}`}
                                className={inputClass}
                                style={{ width: "7rem" }}
                              />
                            ) : (
                              formatMoney(item.price)
                            )}
                          </td>
                          <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400">
                            {formatMoney(item.catalogPrice)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-1.5">
                            {editingSku === item.sku ? (
                              <>
                                <button
                                  type="button"
                                  onClick={saveEdit}
                                  disabled={saving}
                                  title="שמירה"
                                  aria-label="שמירת המחיר"
                                  className="p-1 text-green-600 hover:text-green-800 disabled:opacity-40"
                                >
                                  <FiCheck />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingSku(null)}
                                  disabled={saving}
                                  title="ביטול"
                                  aria-label="ביטול העריכה"
                                  className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-40"
                                >
                                  <FiX />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startEdit(item)}
                                  disabled={saving}
                                  title="שינוי מחיר"
                                  aria-label={`שינוי המחיר של מק"ט ${item.sku}`}
                                  className="p-1 text-gray-500 hover:text-blue-600 disabled:opacity-40"
                                >
                                  <FiEdit2 />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeItem(item)}
                                  disabled={saving}
                                  title="הסרה מהמחירון"
                                  aria-label={`הסרת מק"ט ${item.sku} מהמחירון`}
                                  className="p-1 text-gray-500 hover:text-red-600 disabled:opacity-40"
                                >
                                  <FiTrash2 />
                                </button>
                              </>
                            )}
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
            {"ללקוח אין מחירון פרטי. אפשר להוסיף מוצרים אחד-אחד בכפתור \"הוספת מוצר למחירון\", " +
              'או להעלות קובץ אקסל עם מק"ט, שם המוצר ומחיר — וכל מוצר שאינו במחירון ' +
              "ימשיך להימכר במחיר הקטלוג."}
          </p>
        )}
      </div>
    </Panel>
  );
};

export default CustomerPriceListPanel;
