// src/components/customer/PriceListComparison.jsx
// "השוואת מחירונים": המחירונים הפרטיים של הלקוחות שנבחרו זה לצד זה, עמודה
// לכל סניף. בוחרים מחיר אחד לכל מוצר — בלחיצה על מחיר של סניף, בהקלדה, או
// "הכל לפי סניף X" — והתוצאה נכנסת למחירון הקבוצתי כאילו הועלה קובץ.
//
// הכללים לבחירת ברירת המחדל נמצאים ב-utils/priceListComparison.js.
import { Button } from "@windmill/react-ui";
import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { FiAlertTriangle, FiCheck, FiX } from "react-icons/fi";

import spinnerLoadingImage from "@/assets/img/spinner.gif";
import GroupPriceListServices from "@/services/GroupPriceListServices";
import { describeApiError } from "@/utils/apiError";
import { formatMoney } from "@/utils/displayFormat";
import {
  SOURCE_GROUP,
  SOURCE_MAJORITY,
  commonNamePrefix,
  defaultChoices,
  hasDifferentPrices,
  shortName,
  toPriceListRows,
} from "@/utils/priceListComparison";

const inputClass =
  "rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-gray-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200";

// שורה אחת בטבלה. ממוזערת (memo) כי בחברה עם עשרות סניפים ומאות מוצרים כל
// לחיצה או הקשה הייתה מרנדרת עשרות אלפי תאים — כך מתרנדרת רק השורה שהשתנתה
const ComparisonRow = memo(({ item, columns, showGroup, chosenRaw, onChoose }) => {
  const chosen = Number(chosenRaw);
  const cell = (price, key) => {
    if (!(price > 0)) {
      return (
        <td key={key} className="px-2 py-1 text-gray-300 dark:text-gray-600">
          —
        </td>
      );
    }
    const isChosen = price === chosen;
    return (
      <td key={key} className="px-1 py-1">
        <button
          type="button"
          onClick={() => onChoose(item.sku, price)}
          aria-pressed={isChosen}
          title={String(price)}
          className={`w-full rounded px-1.5 py-0.5 text-right ${
            isChosen
              ? "bg-customGreen-dark font-semibold text-white"
              : "hover:bg-gray-100 dark:hover:bg-gray-600"
          }`}
        >
          {formatMoney(price)}
        </button>
      </td>
    );
  };
  return (
    <tr className="border-t border-gray-100 dark:border-gray-700">
      <td className="px-2 py-1 font-medium">{item.sku}</td>
      <td className="px-2 py-1">
        {item.name || "—"}
        {!item.inCatalog && <span className="text-orange-500"> (אינו בקטלוג)</span>}
      </td>
      {showGroup && cell(item.groupPrice, "group")}
      {columns.map((c) => cell(item.prices?.[c._id], c._id))}
      <td className="px-1 py-1">
        <input
          type="number"
          min="0"
          step="0.01"
          value={chosenRaw ?? ""}
          onChange={(e) => onChoose(item.sku, e.target.value)}
          aria-label={`המחיר שייקבע ל${item.name || item.sku}`}
          className={`${inputClass} w-24`}
        />
      </td>
    </tr>
  );
});
ComparisonRow.displayName = "ComparisonRow";

const PriceListComparison = ({ customerIds, groupId, onApply, onClose }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [source, setSource] = useState(SOURCE_MAJORITY);
  const [choices, setChoices] = useState({});
  const [onlyDiff, setOnlyDiff] = useState(true);
  const [search, setSearch] = useState("");

  // רשימת הלקוחות כמחרוזת יציבה: אותה בחירה לא טוענת שוב
  const idsKey = [...customerIds].sort().join(",");

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError("");
    GroupPriceListServices.compare({ customers: idsKey.split(","), groupId })
      .then((res) => {
        if (cancelled) return;
        const initial = res?.group ? SOURCE_GROUP : SOURCE_MAJORITY;
        setData(res);
        setSource(initial);
        setChoices(defaultChoices(res?.items, initial));
      })
      .catch((err) => {
        if (!cancelled) setError(describeApiError(err, "טעינת ההשוואה נכשלה"));
      });
    return () => {
      cancelled = true;
    };
  }, [idsKey, groupId]);

  const columns = useMemo(() => {
    const list = data?.customers || [];
    const prefix = commonNamePrefix(list.map((c) => c.name));
    return list.map((c) => ({ ...c, short: shortName(c.name, prefix) }));
  }, [data]);

  const items = data?.items || [];
  const diffCount = useMemo(() => items.filter(hasDifferentPrices).length, [items]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      if (onlyDiff && !hasDifferentPrices(item)) return false;
      if (!term) return true;
      return item.sku.toLowerCase().includes(term) || item.name.toLowerCase().includes(term);
    });
  }, [items, onlyDiff, search]);

  const chosenCount = items.filter((item) => Number(choices[item.sku]) > 0).length;

  const changeSource = (next) => {
    setSource(next);
    setChoices(defaultChoices(items, next));
  };

  const choose = useCallback(
    (sku, price) => setChoices((prev) => ({ ...prev, [sku]: price })),
    [],
  );

  const apply = () => onApply(toPriceListRows(items, choices));

  if (error) {
    return (
      <div className="mb-4 flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-gray-700">
        <FiAlertTriangle className="mt-0.5 shrink-0" />
        <span className="flex-1">{error}</span>
        <button type="button" onClick={onClose} className="underline focus:outline-none">
          סגירה
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center gap-2 py-4 text-sm dark:text-gray-300">
        <img src={spinnerLoadingImage} alt="Loading" width={20} height={10} />
        טוען את המחירונים...
      </div>
    );
  }

  const withoutList = columns.filter((c) => c.itemsCount === 0);

  return (
    <div className="mb-4 rounded-md border border-customGreen p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-medium dark:text-gray-200">השוואת מחירונים</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="סגירת ההשוואה"
          className="p-1 text-gray-500 hover:text-red-600"
        >
          <FiX />
        </button>
      </div>

      <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
        {`${columns.length} לקוחות, ${items.length} מוצרים, מתוכם ${diffCount} במחירים שונים. ` +
          "לוחצים על מחיר של סניף כדי לבחור אותו, או מקלידים מחיר בעמודה האחרונה. " +
          "מוצר שאין לו מחיר אצל המקור שנבחר מקבל את המחיר שרוב הסניפים משלמים (בתיקו — הגבוה). " +
          'החלפת "מחיר לפי" מבטלת בחירות שנעשו ביד.'}
      </p>

      {withoutList.length > 0 && (
        <p className="mb-3 text-xs text-orange-500">
          {`אין מחירון פרטי ל: ${withoutList.map((c) => c.short).join(", ")}`}
        </p>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm dark:text-gray-200">
          מחיר לפי
          <select
            value={source}
            onChange={(e) => changeSource(e.target.value)}
            className={inputClass}
          >
            {data.group && (
              <option value={SOURCE_GROUP}>{`המחירון הקבוצתי הנוכחי (${data.group.name})`}</option>
            )}
            <option value={SOURCE_MAJORITY}>המחיר שרוב הסניפים משלמים</option>
            {columns
              .filter((c) => c.itemsCount > 0)
              .map((c) => (
                <option key={c._id} value={c._id}>
                  {`${c.name}${c.customerNumber ? ` (${c.customerNumber})` : ""}`}
                </option>
              ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
          <input
            type="checkbox"
            checked={onlyDiff}
            onChange={(e) => setOnlyDiff(e.target.checked)}
          />
          רק מוצרים במחירים שונים
        </label>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder='חיפוש לפי מק"ט או שם'
          className={inputClass}
        />
      </div>

      <div className="max-h-[28rem] overflow-auto rounded-md border border-gray-100 dark:border-gray-700">
        <table className="w-full text-right text-xs">
          <thead className="sticky top-0 z-10 bg-gray-50 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th className="px-2 py-2 font-medium">מק"ט</th>
              <th className="min-w-[10rem] px-2 py-2 font-medium">המוצר</th>
              {data.group && <th className="px-2 py-2 font-medium">בקבוצה כרגע</th>}
              {columns.map((c) => (
                <th
                  key={c._id}
                  title={`${c.name}${c.customerNumber ? ` — לקוח ${c.customerNumber}` : ""}`}
                  className="whitespace-nowrap px-2 py-2 font-medium"
                >
                  {c.short}
                  {c.customerNumber ? (
                    <span className="block font-normal text-gray-400">{c.customerNumber}</span>
                  ) : null}
                </th>
              ))}
              <th className="px-2 py-2 font-medium">המחיר שייקבע</th>
            </tr>
          </thead>
          <tbody className="text-gray-700 dark:text-gray-200">
            {visible.map((item) => (
              <ComparisonRow
                key={item.sku}
                item={item}
                columns={columns}
                showGroup={Boolean(data.group)}
                chosenRaw={choices[item.sku]}
                onChoose={choose}
              />
            ))}
          </tbody>
        </table>
        {visible.length === 0 && (
          <p className="p-3 text-sm text-gray-500 dark:text-gray-400">
            {items.length === 0
              ? "ללקוחות שנבחרו אין מחירון פרטי."
              : "אין מוצרים מתאימים לסינון."}
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {`${chosenCount} מוצרים ייכנסו למחירון הקבוצתי. מוצר שהמחיר שלו נמחק לא ייכנס.`}
        </span>
        <Button
          type="button"
          className="bg-customGreen-dark"
          disabled={chosenCount === 0}
          onClick={apply}
        >
          <FiCheck className="ml-1" /> שימוש במחירים האלה
        </Button>
      </div>
    </div>
  );
};

export default PriceListComparison;
