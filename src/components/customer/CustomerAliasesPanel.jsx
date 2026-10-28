// src/components/customer/CustomerAliasesPanel.jsx
// "איך הלקוח קורא למוצרים" בעמוד "צפייה בלקוח": ההכרעות שנשמרו מתוך מסך
// ההזמנה ("כשהלקוח הזה כותב X הוא מתכוון ל-Y"), עם אפשרות לחזור אליהן.
//
// ── למה זה כאן ──
//
// הכרעה נוצרת מתוך הזמנה שנעצרה, ועד עכשיו לא הייתה דרך לחזור אליה: מי שפרשה
// "סכו"ם וצלחות" למזלגות וסכינים ורצתה אחר כך להוסיף כפות — או שבחרה מוצר
// שגוי שנכנס מאז אוטומטית לכל הזמנה — הייתה צריכה לחכות שהשורה תיעצר שוב.
// כאן אפשר להוסיף ולהסיר מוצרים, לקבוע כמות ולמחוק הכרעה.
//
// מוצגות רק ההכרעות של הלקוח הזה. הכרעות "לכל הלקוחות" אינן נערכות מכרטיס
// של לקוח אחד (ראה controller/productAliasController בשרת).
import { Badge, Button } from "@windmill/react-ui";
import React, { useCallback, useEffect, useState } from "react";
import { FiAlertTriangle, FiCheck, FiEdit2, FiSlash, FiTag, FiTrash2, FiX } from "react-icons/fi";

// Internal import
import { Panel } from "@/components/common/ReadOnlyFields";
import AliasProductsEditor, {
  toAliasProducts,
  toEditorRows,
} from "@/components/order/AliasProductsEditor";
import ProductAliasServices from "@/services/ProductAliasServices";
import { describeApiError } from "@/utils/apiError";
import { formatDateTime } from "@/utils/displayFormat";
import { notifyError, notifySuccess } from "@/utils/toast";

const usedLabel = (hits) =>
  !hits ? "עוד לא שימשה" : hits === 1 ? "שימשה פעם אחת" : `שימשה ${hits} פעמים`;

const CustomerAliasesPanel = ({ customerId }) => {
  const [aliases, setAliases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  // ההכרעה שבעריכה, ורשימת המוצרים שלה כפי שהיא נערכת
  const [editingId, setEditingId] = useState(null);
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    setLoadError("");
    try {
      const res = await ProductAliasServices.getCustomerAliases(customerId);
      setAliases(Array.isArray(res?.aliases) ? res.aliases : []);
    } catch (err) {
      // כשל טעינה אינו "אין הכרעות" — אחרת נראה כאילו הן נמחקו
      setAliases([]);
      setLoadError(describeApiError(err));
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    load();
    setEditingId(null);
  }, [load]);

  const startEdit = (alias) => {
    setEditingId(alias._id);
    setRows(toEditorRows(alias.products));
  };

  const saveEdit = async () => {
    if (!rows.length) return;
    setBusy(true);
    try {
      const res = await ProductAliasServices.updateAlias(editingId, toAliasProducts(rows));
      setAliases((prev) => prev.map((a) => (a._id === editingId ? res.alias : a)));
      setEditingId(null);
      notifySuccess(res?.message || "נשמר");
    } catch (err) {
      notifyError(describeApiError(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (alias) => {
    if (
      !window.confirm(
        `למחוק את ההכרעה ל-"${alias.sourceName}"?\n` +
          "בפעם הבאה שהלקוח יכתוב את זה, השורה תיבדק מחדש — ואם המערכת לא בטוחה, תיעצר לבחירה."
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await ProductAliasServices.deleteAlias(alias._id);
      setAliases((prev) => prev.filter((a) => a._id !== alias._id));
      if (editingId === alias._id) setEditingId(null);
      notifySuccess("ההכרעה נמחקה");
    } catch (err) {
      notifyError(describeApiError(err));
    } finally {
      setBusy(false);
    }
  };

  const note = loadError
    ? "לא נטען"
    : aliases.length
      ? undefined
      : "עוד לא נשמרו — נוצרות כשמכריעים על שורה בהזמנה";

  return (
    <Panel title="איך הלקוח קורא למוצרים" icon={<FiTag />} note={note} span>
      <div className="sm:col-span-2">
        {loadError ? (
          <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-gray-700">
            <FiAlertTriangle className="mt-0.5 shrink-0" />
            <span>
              {loadError}
              <button type="button" onClick={load} className="ml-2 underline focus:outline-none">
                נסה שוב
              </button>
            </span>
          </div>
        ) : loading && !aliases.length ? (
          <p className="py-3 text-sm text-gray-500 dark:text-gray-400">טוען...</p>
        ) : !aliases.length ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {"כשמכריעים במסך ההזמנה לאיזה מוצר הלקוח התכוון, ההכרעה נשמרת כאן — " +
              "ומאותו רגע השורה נקראת אוטומטית. אפשר לחזור לכאן כדי להוסיף מוצרים, לשנות או למחוק."}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {aliases.map((alias) => {
              const editing = editingId === alias._id;
              const broken = alias.products.some((p) => p.missing);
              return (
                <li
                  key={alias._id}
                  className="rounded-md border border-gray-100 p-3 dark:border-gray-700"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs text-gray-500 dark:text-gray-400">הלקוח כותב</div>
                      <div className="break-words text-sm font-semibold text-gray-800 dark:text-gray-100">
                        {alias.sourceName}
                      </div>
                    </div>
                    {!editing && (
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          type="button"
                          layout="outline"
                          onClick={() => startEdit(alias)}
                          disabled={busy || Boolean(editingId)}
                          className="px-3 py-1 text-xs"
                        >
                          <FiEdit2 className="mr-1" />
                          {alias.ignore ? "לקשר למוצר" : "עריכה"}
                        </Button>
                        <button
                          type="button"
                          onClick={() => remove(alias)}
                          disabled={busy}
                          aria-label={`מחיקת ההכרעה ל-${alias.sourceName}`}
                          title="מחיקה"
                          className="rounded-md p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-700"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {editing ? (
                    <div className="mt-3">
                      <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                        כל מוצר ייכנס להזמנה כשורה נפרדת. כמות ריקה = הכמות שהלקוח כותב בשורה.
                      </p>
                      <AliasProductsEditor rows={rows} onChange={setRows} disabled={busy} />
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          onClick={saveEdit}
                          disabled={busy || !rows.length}
                          className="px-4 py-2 text-sm"
                        >
                          <FiCheck className="mr-1" /> {busy ? "שומר..." : "שמירה"}
                        </Button>
                        <Button
                          type="button"
                          layout="outline"
                          onClick={() => setEditingId(null)}
                          disabled={busy}
                          className="px-3 py-2 text-sm"
                        >
                          <FiX className="mr-1" /> ביטול
                        </Button>
                        {!rows.length && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            כדי לבטל את ההכרעה כולה — מחיקה (פח האשפה)
                          </span>
                        )}
                      </div>
                    </div>
                  ) : alias.ignore ? (
                    <div className="mt-2 flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                      <FiSlash className="h-4 w-4" />
                      לא שורת מוצר — עוברת להערת ההזמנה
                    </div>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {alias.products.map((p) => (
                        <span
                          key={String(p.productId)}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${
                            p.missing
                              ? "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                              : "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200"
                          }`}
                        >
                          {p.missing ? "מוצר שנמחק מהקטלוג" : p.title}
                          {p.hidden && <span className="text-orange-600">(מוסתר)</span>}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                    <span>{usedLabel(alias.hits)}</span>
                    {alias.lastUsedAt && <span>{`לאחרונה ${formatDateTime(alias.lastUsedAt)}`}</span>}
                    {alias.createdBy && <span>{`נקבע ע"י ${alias.createdBy}`}</span>}
                    {broken && (
                      <Badge type="danger">
                        <span className="font-bold">לא בשימוש עד שיוסר המוצר שנמחק</span>
                      </Badge>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Panel>
  );
};

export default CustomerAliasesPanel;
