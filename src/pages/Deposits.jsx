// src/pages/Deposits.jsx
//
// שיוך משקאות למוצר הפיקדון שלהם.
//
// מוצר משקה ששויך כאן מוסיף לכל תעודת משלוח שורת פיקדון לפי הכמות:
// כמות × מספר הפיקדונות ביחידה (1 לבקבוק, 6 לשישייה, 24 לקרטון). החישוב
// בשרת: sweet-backend/lib/billing/deposits.js.
//
// הרשימה מציגה את כל המוצרים שכבר שויכו, ואת המוצרים שהשם שלהם נראה כמו
// משקה במכל ("פחית", "330", "1.5 ליטר"). ההצעה אינה נשמרת עד שמסמנים
// ושומרים — הזיהוי לפי שם יכול לטעות.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, CardBody, Input, Label, Select } from "@windmill/react-ui";
import { FiSearch } from "react-icons/fi";

import PageTitle from "@/components/Typography/PageTitle";
import Loading from "@/components/preloader/Loading";
import ProductServices from "@/services/ProductServices";
import { notifyError, notifySuccess } from "@/utils/toast";

// הקטלוג כולו הוא כ-4,300 מוצרים; רשימה מלאה מקפיאה את הדפדפן בהקלדה
const MAX_SHOWN = 200;

const FILTERS = {
  suggested: "הצעות שעדיין לא שויכו",
  assigned: "משויכים",
  all: "כל הקטלוג (לפי חיפוש)",
};

// מצב העריכה של שורה: מה ייבחר אם תישמר
const initialDraft = (row) =>
  row.current
    ? { depositProductId: String(row.current.product), perUnit: String(row.current.perUnit || 1) }
    : {
        depositProductId: row.suggestion?.depositProductId ? String(row.suggestion.depositProductId) : "",
        perUnit: String(row.suggestion?.perUnit || 1),
      };

const Deposits = () => {
  const [loading, setLoading] = useState(true);
  const [depositProducts, setDepositProducts] = useState([]);
  const [rows, setRows] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [selected, setSelected] = useState(() => new Set());
  const [filter, setFilter] = useState("suggested");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);
  const [backfilling, setBackfilling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ProductServices.getDepositSetup();
      setDepositProducts(res.depositProducts || []);
      setRows(res.rows || []);
      setDrafts(Object.fromEntries((res.rows || []).map((r) => [r._id, initialDraft(r)])));
      setSelected(new Set());
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const depositName = useMemo(
    () => new Map(depositProducts.map((d) => [String(d._id), d.title])),
    [depositProducts]
  );

  const filtered = useMemo(() => {
    const q = search.trim();
    return rows.filter((r) => {
      if (filter === "suggested" && (r.current || !r.suggestion)) return false;
      if (filter === "assigned" && !r.current) return false;
      if (filter === "all" && !q) return false;
      if (q && !r.title.includes(q) && !String(r.sku || "").includes(q)) return false;
      return true;
    });
  }, [rows, filter, search]);
  const visible = filtered.slice(0, MAX_SHOWN);

  const setDraft = (id, patch) => {
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));
    setSelected((s) => new Set(s).add(id));
  };

  const toggle = (id) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allSelected = visible.length > 0 && visible.every((r) => selected.has(r._id));
  const toggleAll = () =>
    setSelected((s) => {
      const next = new Set(s);
      for (const r of visible) {
        if (allSelected) next.delete(r._id);
        else next.add(r._id);
      }
      return next;
    });

  const save = async () => {
    const items = rows
      .filter((r) => selected.has(r._id))
      .map((r) => ({
        productId: r._id,
        depositProductId: drafts[r._id]?.depositProductId || null,
        perUnit: Number(drafts[r._id]?.perUnit) || 1,
      }));
    if (!items.length) return;

    const removing = items.filter((i) => !i.depositProductId).length;
    if (
      removing &&
      !window.confirm(`${removing} מהמוצרים שסומנו בלי מוצר פיקדון — השיוך שלהם יוסר. להמשיך?`)
    ) {
      return;
    }

    setSaving(true);
    try {
      const res = await ProductServices.saveDeposits(items);
      notifySuccess(res.message);
      await load();
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  // תעודות שנוצרו לפני השיוך: קודם תצוגה מקדימה, ורק אחריה הוספה
  const runBackfill = async (apply) => {
    if (apply && !window.confirm(`להוסיף פיקדון ל-${preview?.changed} תעודות פתוחות?`)) return;
    setBackfilling(true);
    try {
      const res = await ProductServices.applyDepositsToOpenNotes(apply);
      if (apply) {
        notifySuccess(`פיקדון נוסף ל-${res.changed} תעודות`);
        setPreview(null);
      } else {
        setPreview(res);
      }
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setBackfilling(false);
    }
  };

  if (loading) return <Loading loading={loading} />;

  const missingPrice = depositProducts.filter((d) => !(d.price > 0));

  return (
    <>
      <PageTitle>פיקדונות</PageTitle>

      <Card className="min-w-0 shadow-xs bg-white dark:bg-gray-800 mb-5">
        <CardBody>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            משקה ששויך כאן מוסיף לכל תעודת משלוח שורת פיקדון: הכמות שהוזמנה ×
            מספר הפיקדונות ביחידה (1 לבקבוק או פחית, 6 לשישייה, 24 לקרטון). השורה
            מחושבת מחדש בכל שמירה של התעודה, ונכנסת לחשבונית עם המשקאות.
          </p>

          <p className="text-sm font-semibold mb-1">מוצרי הפיקדון בקטלוג</p>
          {depositProducts.length === 0 ? (
            <p className="text-sm text-red-600">
              לא נמצא בקטלוג מוצר שהשם שלו מכיל "פיקדון".
            </p>
          ) : (
            <ul className="text-sm mb-2">
              {depositProducts.map((d) => (
                <li key={d._id}>
                  {d.title} · מק"ט {d.sku} ·{" "}
                  {d.price > 0 ? `${d.price} ₪ לפני מע"מ` : <span className="text-red-600">אין מחיר</span>}
                  {d.status === "hide" ? " · מוסתר בחנות" : ""}
                </li>
              ))}
            </ul>
          )}
          {missingPrice.length > 0 && (
            <p className="text-sm text-red-600">
              לפיקדון בלי מחיר תתווסף שורה בסכום 0. כדאי לקבוע לו מחיר בכרטיס המוצר.
            </p>
          )}

          <div className="flex flex-wrap items-end gap-4 mt-4">
            <Label className="w-60">
              <span>הצג</span>
              <Select className="mt-1" value={filter} onChange={(e) => setFilter(e.target.value)}>
                {Object.entries(FILTERS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Label>
            <Label className="flex-1 min-w-[220px]">
              <span>חיפוש לפי שם או מק"ט</span>
              <div className="relative mt-1">
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="קולה, מים..." />
                <FiSearch className="absolute left-3 top-3 text-gray-400" />
              </div>
            </Label>
            <Badge type={selected.size ? "success" : "neutral"}>נבחרו {selected.size}</Badge>
            <Button onClick={save} disabled={saving || !selected.size}>
              {saving ? "שומר..." : `שמירת ${selected.size} מוצרים`}
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card className="min-w-0 shadow-xs bg-white dark:bg-gray-800 mb-5">
        <CardBody>
          <p className="text-sm font-semibold mb-1">תעודות שכבר פתוחות</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            תעודה שנוצרה לפני ששויכו המשקאות לא כוללת פיקדון. כאן אפשר להוסיף אותו
            לכל התעודות שעוד לא חויבו. התעודות לא יודפסו שוב.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button layout="outline" onClick={() => runBackfill(false)} disabled={backfilling}>
              {backfilling && !preview ? "בודק..." : "בדיקה: אילו תעודות ישתנו"}
            </Button>
            {preview && (
              <>
                <span className="text-sm">
                  {preview.changed
                    ? `${preview.changed} מתוך ${preview.checked} תעודות פתוחות יקבלו פיקדון, סה"כ ${preview.depositAdded} ₪ לפני מע"מ`
                    : `אין תעודה פתוחה שחסר בה פיקדון (נבדקו ${preview.checked})`}
                </span>
                {preview.changed > 0 && (
                  <Button onClick={() => runBackfill(true)} disabled={backfilling}>
                    {backfilling ? "מוסיף..." : `הוספת פיקדון ל-${preview.changed} תעודות`}
                  </Button>
                )}
              </>
            )}
          </div>
          {preview?.notes?.length > 0 && (
            <ul className="text-xs text-gray-500 mt-3 max-h-48 overflow-y-auto">
              {preview.notes.map((n) => (
                <li key={n.number}>
                  תעודה {n.number} · {n.customer} · {n.before} ← {n.after}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card className="min-w-0 shadow-xs bg-white dark:bg-gray-800 mb-8">
        <CardBody>
          {filter === "all" && !search.trim() ? (
            <p className="text-sm text-gray-500">יש להקליד שם או מק"ט כדי לחפש בכל הקטלוג.</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-500">אין מוצרים להצגה.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-right text-xs text-gray-500 border-b dark:border-gray-700">
                    <th className="py-2 px-2 w-8">
                      <input
                        type="checkbox"
                        aria-label="סמן הכל"
                        checked={allSelected}
                        onChange={toggleAll}
                      />
                    </th>
                    <th className="py-2 px-2">מוצר</th>
                    <th className="py-2 px-2">מק"ט</th>
                    <th className="py-2 px-2">מוצר פיקדון</th>
                    <th className="py-2 px-2 w-28">פיקדונות ביחידה</th>
                    <th className="py-2 px-2">מצב</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => {
                    const draft = drafts[r._id] || {};
                    return (
                      <tr key={r._id} className="border-b border-gray-100 dark:border-gray-700">
                        <td className="py-1.5 px-2">
                          <input
                            type="checkbox"
                            aria-label={`בחירת ${r.title}`}
                            checked={selected.has(r._id)}
                            onChange={() => toggle(r._id)}
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          {r.title}
                          {r.status === "hide" && <span className="text-xs text-gray-400"> (מוסתר)</span>}
                        </td>
                        <td className="py-1.5 px-2 font-mono text-xs">{r.sku}</td>
                        <td className="py-1.5 px-2">
                          <Select
                            aria-label={`מוצר פיקדון ל${r.title}`}
                            value={draft.depositProductId || ""}
                            onChange={(e) => setDraft(r._id, { depositProductId: e.target.value })}
                          >
                            <option value="">— ללא פיקדון —</option>
                            {depositProducts.map((d) => (
                              <option key={d._id} value={String(d._id)}>
                                {d.title}
                              </option>
                            ))}
                          </Select>
                        </td>
                        <td className="py-1.5 px-2">
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            aria-label={`פיקדונות ביחידה של ${r.title}`}
                            value={draft.perUnit || ""}
                            onChange={(e) => setDraft(r._id, { perUnit: e.target.value })}
                          />
                        </td>
                        <td className="py-1.5 px-2 text-xs text-gray-500">
                          {r.current
                            ? `משויך: ${depositName.get(String(r.current.product)) || "?"} × ${r.current.perUnit}`
                            : r.suggestion
                            ? `הצעה (${r.suggestion.reason})`
                            : ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {visible.length < filtered.length && (
                <p className="text-xs text-gray-500 mt-2">
                  מוצגים {visible.length} מתוך {filtered.length} — יש לצמצם בחיפוש.
                </p>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </>
  );
};

export default Deposits;
