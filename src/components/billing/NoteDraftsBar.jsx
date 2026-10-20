// src/components/billing/NoteDraftsBar.jsx
//
// הטיוטות שהושהו (ראו utils/noteDrafts): מעל טופס התעודה/החשבונית, כדי
// שאפשר יהיה לעבור ביניהן. הטיוטה שפתוחה כרגע בטופס אינה מוצגת.

import React from "react";
import { Button } from "@windmill/react-ui";
import { FiFileText, FiTrash2 } from "react-icons/fi";

import { customerNameOf, useCustomers } from "@/components/billing/CustomerPicker";
import { deleteDraft, useNoteDrafts } from "@/utils/noteDrafts";

const savedTime = (ts) =>
  new Date(ts).toLocaleString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const DraftsList = ({ kind, drafts, onResume }) => {
  const { customers } = useCustomers();

  const nameOf = (id) => {
    if (!id) return "ללא לקוח";
    const customer = customers.find((c) => String(c._id) === String(id));
    return customer ? customerNameOf(customer) : "לקוח";
  };

  const remove = (draft) => {
    if (!window.confirm(`למחוק את הטיוטה של ${nameOf(draft.customerId)}? מה שהוקלד בה יימחק.`)) return;
    deleteDraft(draft.id);
  };

  return (
    <div className="mb-4 rounded-lg border border-yellow-300 bg-yellow-50 dark:bg-gray-800 dark:border-yellow-700 p-3">
      <p className="text-sm font-medium mb-2">
        {kind === "invoice" ? "חשבוניות שהושהו באמצע" : "תעודות שהושהו באמצע"}
      </p>
      <ul className="space-y-2">
        {drafts.map((d) => {
          const lines = (d.rows || []).filter((r) => r.sku?.trim()).length;
          return (
            <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <FiFileText className="text-gray-500" />
              <span className="font-semibold">{nameOf(d.customerId)}</span>
              <span className="text-gray-500">
                {lines} שורות · נשמרה {savedTime(d.savedAt)}
              </span>
              <span className="flex gap-2 mr-auto">
                <Button size="small" onClick={() => onResume(d.id)}>
                  המשך
                </Button>
                <Button
                  size="small"
                  layout="outline"
                  aria-label="מחיקת הטיוטה"
                  title="מחיקת הטיוטה"
                  onClick={() => remove(d)}
                >
                  <FiTrash2 />
                </Button>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

/**
 * @param {"note"|"invoice"} kind
 * @param {string}   [activeId] - הטיוטה שפתוחה כרגע בטופס
 * @param {function} onResume   - נקרא עם מזהה הטיוטה להמשך
 */
const NoteDraftsBar = ({ kind, activeId, onResume }) => {
  const drafts = useNoteDrafts(kind).filter((d) => d.id !== activeId);
  // רשימת הלקוחות נטענת רק כשיש טיוטה להציג: בלי זה כל כניסה לעמוד הייתה
  // מושכת את כל הלקוחות מהשרת, גם כשאין שם אף טיוטה
  return drafts.length ? <DraftsList kind={kind} drafts={drafts} onResume={onResume} /> : null;
};

export default NoteDraftsBar;
