// src/components/table/ListPager.jsx
//
// עימוד מבוקר: העמוד הפעיל מגיע מבחוץ (מהכתובת) ולא נשמר בתוך הרכיב.
//
// למה לא ה-Pagination של Windmill: הוא מחזיק את העמוד ב-state פנימי שתמיד
// מתחיל ב-1, ובטעינה קורא ל-onChange(1). מי שחוזרת מתעודה לרשימה שעמדה על
// עמוד 3 הייתה נזרקת לעמוד 1. המראה והסידור כאן הועתקו ממנו.

import React from "react";
import { Button } from "@windmill/react-ui";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

/** אותו חלון כפתורים כמו ב-Windmill: עד 7 עמודים הכל, אחרת עם "..." */
const pageButtons = (page, pages) => {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  if (page < 5) return [1, 2, 3, 4, 5, "...", pages];
  if (page < pages - 3) return [1, "...", page - 1, page, page + 1, "...", pages];
  return [1, "...", pages - 4, pages - 3, pages - 2, pages - 1, pages];
};

const ListPager = ({ totalResults, resultsPerPage, page, onChange, label }) => {
  const pages = Math.max(1, Math.ceil(totalResults / resultsPerPage));
  // עמוד מהכתובת שכבר לא קיים (נמחקו מסמכים מאז) — מציגים את האחרון
  const current = Math.min(Math.max(1, page), pages);
  const from = totalResults ? current * resultsPerPage - resultsPerPage + 1 : 0;
  const to = Math.min(current * resultsPerPage, totalResults);

  return (
    <div className="flex flex-col justify-between text-xs sm:flex-row text-gray-600 dark:text-gray-400">
      <span className="flex items-center font-semibold tracking-wide">
        מציג {from}-{to} מתוך {totalResults}
      </span>
      <div className="flex mt-2 sm:mt-auto sm:justify-end">
        <nav aria-label={label}>
          <ul className="inline-flex items-center">
            <li>
              <Button
                size="small"
                layout="link"
                icon={FiChevronRight}
                disabled={current === 1}
                onClick={() => onChange(current - 1)}
                aria-label="עמוד קודם"
              />
            </li>
            {pageButtons(current, pages).map((p, i) => (
              <li key={`${p}${i}`}>
                {p === "..." ? (
                  <span className="px-2 py-1">...</span>
                ) : (
                  <Button
                    size="pagination"
                    layout={p === current ? "primary" : "link"}
                    aria-current={p === current ? "page" : undefined}
                    onClick={() => onChange(p)}
                  >
                    {p}
                  </Button>
                )}
              </li>
            ))}
            <li>
              <Button
                size="small"
                layout="link"
                icon={FiChevronLeft}
                disabled={current === pages}
                onClick={() => onChange(current + 1)}
                aria-label="עמוד הבא"
              />
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
};

export default ListPager;
