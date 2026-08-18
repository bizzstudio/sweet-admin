// src/components/billing/DeliveryNoteAction.jsx
//
// כרטיס תעודות המשלוח במסך ההזמנה.
//
// להזמנה יש עד שתי משפחות של תעודות, והכרטיס מציג את שתיהן זו לצד זו:
//
//   אוטומטית — על מה שנמכר ביחידות. פעולה חד-פעמית להזמנה (השרת אוכף
//               באינדקס ייחודי), ולכן אחרי ההפקה הכפתור נעלם.
//   ידניות   — על הסחורה שנשקלת (פירות וירקות). ההזמנה נקלטה עם המשקל
//               שהלקוח ביקש, והתעודה הידנית נושאת את מה שנשקל בפועל.
//               יכולות להיות כמה, כי משלוח פירות יוצא לפעמים בפעימות.
//
// השורות הנשקלות שעדיין לא הוקלדו מוצגות במפורש כאזהרה: סחורה שנמסרה ולא
// הוקלדה לא תופיע בשום תעודה, וסגירת החודש לא תחייב עליה דבר. זו טעות
// שמתגלה רק כשמשווים מחזור לשקילות — כלומר חודשיים אחרי.

import React, { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, CardBody } from "@windmill/react-ui";
import { Link } from "react-router-dom";
import { FiAlertTriangle, FiFileText, FiPlusCircle } from "react-icons/fi";

import ManualDeliveryNoteForm from "@/components/billing/ManualDeliveryNoteForm";
import BillingServices from "@/services/BillingServices";
import { notifyError, notifySuccess } from "@/utils/toast";

const STATUS_LABELS = {
  open: { text: "ממתינה לחיוב", type: "warning" },
  billing: { text: "בתהליך חיוב", type: "neutral" },
  billed: { text: "חויבה", type: "success" },
  cancelled: { text: "בוטלה", type: "danger" },
};

/** שורת תעודה קיימת — זהה לאוטומטית ולידנית */
const NoteRow = ({ note }) => {
  const label = STATUS_LABELS[note.billing?.status] || STATUS_LABELS.open;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-2">
      <div className="flex items-center gap-3">
        <FiFileText className="text-2xl text-gray-400 shrink-0" />
        <div>
          <Link
            to={`/delivery-note/${note._id}`}
            className="font-semibold text-blue-600 hover:underline"
          >
            תעודת משלוח {note.number}
          </Link>
          {note.kind === "manual" && (
            <span className="mr-2 text-xs text-green-700 dark:text-green-500">
              ידנית · משקל בפועל
            </span>
          )}
          <p className="text-sm text-gray-500">
            הופקה{" "}
            {note.issuedAt ? new Date(note.issuedAt).toLocaleDateString("he-IL") : "—"}
            {" · "}חודש חיוב {note.billing?.billingMonth || "—"}
            {note.manualReference ? ` · פנקס ${note.manualReference}` : ""}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Badge type={label.type}>{label.text}</Badge>
        {note.billing?.icountDocNum &&
          (note.billing.icountDocUrl ? (
            <a
              href={note.billing.icountDocUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              חשבונית{" "}
              <span className="font-mono font-semibold">{note.billing.icountDocNum}</span>
            </a>
          ) : (
            <span className="text-sm text-gray-500">
              חשבונית{" "}
              <span className="font-mono font-semibold">{note.billing.icountDocNum}</span>
            </span>
          ))}
      </div>
    </div>
  );
};

const DeliveryNoteAction = ({ orderId, customerId }) => {
  const [note, setNote] = useState(null);
  const [manualNotes, setManualNotes] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      // שתי הקריאות במקביל: אחת שואלת מה כבר הופק, השנייה מה עוד ממתין
      // להקלדה. אין ביניהן תלות, וסדרתי היה רק מאט את פתיחת המסך
      const [notes, pendingRes] = await Promise.all([
        BillingServices.getDeliveryNoteByOrder(orderId),
        BillingServices.getPendingManualItems(orderId).catch(() => ({ items: [] })),
      ]);

      setNote(notes.note || null);
      setManualNotes(notes.manualNotes || []);
      setPending(pendingRes.items || []);
    } catch {
      // כשלון בטעינה לא צריך להקפיץ שגיאה על מסך ההזמנה — הכפתור פשוט
      // יציע להפיק, והשרת יחזיר את התעודה הקיימת אם יש
      setNote(null);
      setManualNotes([]);
      setPending([]);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    setCreating(true);
    try {
      const res = await BillingServices.createDeliveryNoteFromOrder(orderId);
      notifySuccess(res.message);
      // רענון מלא ולא setNote בלבד: ההפקה גם מעדכנת מה נשאר ממתין להקלדה
      await load();
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) return null;

  return (
    <>
      <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 my-5">
        <CardBody>
          {note ? (
            <NoteRow note={note} />
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-semibold">טרם הופקה תעודת משלוח</p>
                <p className="text-sm text-gray-500">
                  התעודה נוצרת אוטומטית עם קליטת ההזמנה, ומתעדכנת איתה כל עוד לא
                  חויבה. אם היא חסרה כאן — ההפקה נכשלה, או שכל ההזמנה היא סחורה
                  נשקלת שעליה מקלידים תעודה ידנית.
                </p>
              </div>
              <Button onClick={create} disabled={creating}>
                <FiPlusCircle className="ml-2" />
                {creating ? "מפיק..." : "הפק תעודת משלוח"}
              </Button>
            </div>
          )}

          {manualNotes.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              {manualNotes.map((m) => (
                <NoteRow key={m._id} note={m} />
              ))}
            </div>
          )}

          {pending.length > 0 && !manualOpen && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-2">
                <FiAlertTriangle className="mt-0.5 shrink-0 text-yellow-600" />
                <div>
                  <p className="font-semibold text-sm">
                    {pending.length} שורות נשקלות ממתינות לתעודה ידנית
                  </p>
                  <p className="text-sm text-gray-500">
                    {pending.map((i) => `${i.name} (הוזמן ${i.quantity})`).join(" · ")}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    כל עוד לא הוקלדו — הסחורה הזו לא תחויב בסוף החודש.
                  </p>
                </div>
              </div>
              <Button onClick={() => setManualOpen(true)}>
                <FiPlusCircle className="ml-2" />
                הפק תעודה ידנית
              </Button>
            </div>
          )}

          {pending.length === 0 && !manualOpen && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
              <Button size="small" layout="link" onClick={() => setManualOpen(true)}>
                הפקת תעודה ידנית נוספת
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      {manualOpen && (
        <ManualDeliveryNoteForm
          orderId={orderId}
          customerId={customerId}
          onCancel={() => setManualOpen(false)}
          onCreated={() => {
            setManualOpen(false);
            load();
          }}
        />
      )}
    </>
  );
};

export default DeliveryNoteAction;
