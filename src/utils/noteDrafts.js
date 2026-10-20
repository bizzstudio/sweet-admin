// src/utils/noteDrafts.js
//
// טיוטות של תעודת משלוח ידנית / חשבונית חדשה שעוד לא הופקו.
//
// הלקוחה ביקשה (19/10/2026) לעצור באמצע הקלדת תעודה, לעבור לתעודה אחרת
// ולחזור, בלי לבטל ולהקליד הכל מחדש. הטופס שומר את עצמו כאן בכל שינוי,
// ולכן גם רענון של הדף או סגירה בטעות אינם מוחקים את מה שהוקלד.
//
// השמירה היא בדפדפן (localStorage) ולא בשרת: טיוטה היא עבודה באמצע של מי
// שיושבת מול המחשב, ואינה מסמך. טיוטה שנפתחה במחשב אחד אינה מופיעה באחר.
// דפדפן שחוסם אחסון (חלון פרטי) פשוט עובד בלי טיוטות.

import { useEffect, useState } from "react";

const STORAGE_KEY = "sweet-admin:note-drafts";
const CHANGED = "note-drafts-changed";

// טיוטה שלא נגעו בה חודש היא כבר לא עבודה באמצע, ומשקל שנשקל אז אינו
// רלוונטי. בלי זה הרשימה הייתה רק מתארכת
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const readAll = () => {
  try {
    const list = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(list)) return [];
    const now = Date.now();
    return list.filter((d) => d?.id && now - (d.savedAt || 0) < MAX_AGE_MS);
  } catch {
    return [];
  }
};

const writeAll = (list) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // אחסון מלא או חסום — הטופס ממשיך לעבוד, רק בלי טיוטה
  }
  window.dispatchEvent(new Event(CHANGED));
};

export const newDraftId = () =>
  `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const loadDraft = (id) => (id ? readAll().find((d) => d.id === id) || null : null);

/** שמירה (או עדכון) של טיוטה. kind: "note" / "invoice". */
export const saveDraft = (draft) => {
  const list = readAll().filter((d) => d.id !== draft.id);
  writeAll([{ ...draft, savedAt: Date.now() }, ...list]);
};

export const deleteDraft = (id) => {
  const list = readAll();
  if (list.some((d) => d.id === id)) writeAll(list.filter((d) => d.id !== id));
};

/** הטיוטות מסוג אחד, מהחדשה לישנה. מתעדכן כשהטופס שומר או כשטאב אחר שומר. */
export const useNoteDrafts = (kind) => {
  const pick = () =>
    readAll()
      .filter((d) => d.kind === kind)
      .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
  const [drafts, setDrafts] = useState(pick);

  useEffect(() => {
    const refresh = () => setDrafts(pick());
    window.addEventListener(CHANGED, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CHANGED, refresh);
      window.removeEventListener("storage", refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  return drafts;
};
