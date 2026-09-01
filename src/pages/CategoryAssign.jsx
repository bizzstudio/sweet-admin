// src/pages/CategoryAssign.jsx
//
// שיוך מוצרים לקטגוריה — העברה של מוצרים מקטגוריה אחת לאחרת, באצווה.
//
// נבנה כדי לאייש את קטגוריית "כיבוד". היא נוצרה ריקה, ומקורה הוא בעיקר
// "מזון" (3,591 מוצרים) — ואין שום נתון במסד שממנו אפשר לגזור מי מהם
// כיבוד. גם הקיבוץ שהגיע ממנוע (erp.groupName) מכיל בדיוק את אותן חמש
// קטגוריות, ולכן סיווג אוטומטי היה ניחוש.
//
// למה זה חשוב: הפיצול בחשבונית החודשית ("ריכוז תעודות משלוח כיבוד")
// נעשה לפי הקטגוריה של המוצר. מוצר שנשאר תחת "מזון" ייספר כמזון.
//
// ⚠️ ייבוא אקסל חוזר של המוצרים דורס את השיוך — הקובץ של מנוע מכיל
//    "מזון" בעמודת הקבוצה. יש לבדוק כאן אחרי כל ייבוא.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  Input,
  Label,
  Select,
} from "@windmill/react-ui";
import { FiArrowLeft, FiSearch } from "react-icons/fi";

import PageTitle from "@/components/Typography/PageTitle";
import Loading from "@/components/preloader/Loading";
import ProductServices from "@/services/ProductServices";
import CategoryServices from "@/services/CategoryServices";
import { notifyError, notifySuccess } from "@/utils/toast";

// כמה מוצרים לרנדר בבת אחת. "מזון" הוא 3,591 מוצרים, ורשימה מלאה
// מקפיאה את הדפדפן בכל הקלדה בתיבת החיפוש.
const PAGE_SIZE = 200;

const nameOf = (c) => c?.name?.he || c?.name?.en || "";

const CategoryAssign = () => {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [shown, setShown] = useState(PAGE_SIZE);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cats, prods] = await Promise.all([
        CategoryServices.getAllCategory(),
        // מסלול נפרד ולא getAllProducts: כאן צריך רק מק"ט, שם וקטגוריה
        // של כל הקטלוג, בלי תמונות ובלי דפדוף
        ProductServices.getProductsForCategoryAssign(),
      ]);

      // רק קטגוריות שמוצרים באמת משויכים אליהן. "ראשי" היא ההורה של
      // כולן ואין תחתיה מוצרים, ושיוך אליה היה מוציא אותם מכל פיצול
      const list = Array.isArray(cats) ? cats : cats?.categories || [];
      const leaves = list
        .flatMap((c) => (c.children?.length ? c.children : [c]))
        .filter((c) => nameOf(c) && nameOf(c) !== "ראשי");

      setCategories(leaves);
      setProducts(prods.products || []);
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // כל שינוי בסינון מאפס את הבחירה: סימון שנשאר מרשימה קודמת הוא בדיוק
  // הדרך להעביר מוצר שלא התכוונו אליו
  useEffect(() => {
    setSelected(new Set());
    setShown(PAGE_SIZE);
  }, [source, search]);

  const counts = useMemo(() => {
    const map = new Map();
    for (const p of products) {
      map.set(String(p.category || ""), (map.get(String(p.category || "")) || 0) + 1);
    }
    return map;
  }, [products]);

  const filtered = useMemo(() => {
    const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return products.filter((p) => {
      if (source && String(p.category || "") !== source) return false;
      if (!terms.length) return true;
      const haystack = `${p.name} ${p.sku} ${p.barcode || ""}`.toLowerCase();
      return terms.every((t) => haystack.includes(t));
    });
  }, [products, source, search]);

  const visible = filtered.slice(0, shown);

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  /** סימון כל התוצאות המסוננות — גם אלה שמעבר לרשימה המוצגת. */
  const selectAllFiltered = () => setSelected(new Set(filtered.map((p) => p._id)));

  const move = async () => {
    if (!target) return notifyError("יש לבחור קטגוריית יעד");
    if (!selected.size) return notifyError("לא נבחרו מוצרים");

    const targetName = nameOf(categories.find((c) => String(c._id) === target));
    if (
      !window.confirm(
        `להעביר ${selected.size} מוצרים לקטגוריית "${targetName}"?\n\n` +
          `השיוך משפיע על הפיצול בחשבונית ועל הסינון בחנות.`
      )
    ) {
      return;
    }

    setSaving(true);
    try {
      const res = await ProductServices.bulkChangeCategory({
        ids: [...selected],
        category: target,
      });
      notifySuccess(res.message);
      setSelected(new Set());
      await load();
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading loading={loading} />;

  const sourceName = source
    ? nameOf(categories.find((c) => String(c._id) === source))
    : "כל הקטגוריות";

  return (
    <>
      <PageTitle>שיוך מוצרים לקטגוריה</PageTitle>

      <Card className="min-w-0 shadow-xs bg-white dark:bg-gray-800 mb-5">
        <CardBody>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            הקטגוריה של המוצר היא מה שקובע את הפיצול בחשבונית החודשית — שורת
            "ריכוז תעודות משלוח" מופקת לכל קטגוריה בנפרד. מוצר שנשאר תחת
            "מזון" ייספר כמזון.
          </p>

          <div className="flex flex-wrap items-end gap-4">
            <Label className="w-56">
              <span>מציג מקטגוריה</span>
              <Select
                className="mt-1"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                <option value="">כל הקטגוריות ({products.length})</option>
                {categories.map((c) => (
                  <option key={c._id} value={String(c._id)}>
                    {nameOf(c)} ({counts.get(String(c._id)) || 0})
                  </option>
                ))}
              </Select>
            </Label>

            <Label className="flex-1 min-w-[240px]">
              <span>חיפוש לפי שם, מק"ט או ברקוד</span>
              <div className="relative mt-1">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="בורקס, עוגיות, 1071..."
                />
                <FiSearch className="absolute left-3 top-3 text-gray-400" />
              </div>
            </Label>

            <Label className="w-56">
              <span>העברה לקטגוריה</span>
              <Select
                className="mt-1"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              >
                <option value="">— בחרי יעד —</option>
                {categories
                  .filter((c) => String(c._id) !== source)
                  .map((c) => (
                    <option key={c._id} value={String(c._id)}>
                      {nameOf(c)}
                    </option>
                  ))}
              </Select>
            </Label>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-4">
            <Button size="small" layout="outline" onClick={selectAllFiltered}>
              סמן את כל {filtered.length} התוצאות
            </Button>
            <Button
              size="small"
              layout="outline"
              onClick={() => setSelected(new Set())}
              disabled={!selected.size}
            >
              נקה בחירה
            </Button>

            <Badge type={selected.size ? "success" : "neutral"}>
              נבחרו {selected.size}
            </Badge>

            <div className="flex-1" />

            <Button onClick={move} disabled={saving || !selected.size || !target}>
              <FiArrowLeft className="ml-2" />
              {saving ? "מעביר..." : `העבר ${selected.size} מוצרים`}
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card className="min-w-0 shadow-xs bg-white dark:bg-gray-800 mb-8">
        <CardBody>
          <p className="text-sm text-gray-500 mb-3">
            {filtered.length} מוצרים ב{sourceName}
            {search ? ` התואמים "${search}"` : ""}
            {visible.length < filtered.length && ` · מוצגים ${visible.length}`}
          </p>

          {filtered.length === 0 ? (
            <p className="text-sm text-gray-500">לא נמצאו מוצרים.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6">
              {visible.map((p) => (
                <label
                  key={p._id}
                  className="flex items-center gap-3 py-1.5 cursor-pointer border-b border-gray-100 dark:border-gray-700"
                >
                  <input
                    type="checkbox"
                    className="w-4 h-4 shrink-0"
                    checked={selected.has(p._id)}
                    onChange={() => toggle(p._id)}
                  />
                  <span className="text-sm truncate flex-1">{p.name}</span>
                  <span className="text-xs text-gray-400 font-mono shrink-0">
                    {p.barcode || p.sku}
                  </span>
                </label>
              ))}
            </div>
          )}

          {visible.length < filtered.length && (
            <div className="mt-4 text-center">
              <Button
                layout="outline"
                onClick={() => setShown((n) => n + PAGE_SIZE)}
              >
                הצג עוד {Math.min(PAGE_SIZE, filtered.length - visible.length)}
              </Button>
            </div>
          )}
        </CardBody>
      </Card>
    </>
  );
};

export default CategoryAssign;
