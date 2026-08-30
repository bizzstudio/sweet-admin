// src/pages/DeliveryNotes.jsx
//
// רשימת תעודות המשלוח ומצב החיוב שלהן. זה המסך שעונה על "מה עוד לא חויב"
// ועל "באיזו חשבונית נסגרה התעודה הזו".

import React, { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  Input,
  Label,
  Pagination,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHeader,
  TableRow,
} from "@windmill/react-ui";
import { Link } from "react-router-dom";
import { FiCopy, FiPlus, FiX } from "react-icons/fi";
import { MdOutlineReceiptLong } from "react-icons/md";
import useQueryParam from "@/hooks/useQueryParam";

import PageTitle from "@/components/Typography/PageTitle";
import ManualDeliveryNoteForm from "@/components/billing/ManualDeliveryNoteForm";
import TableLoading from "@/components/preloader/TableLoading";
import NotFound from "@/components/table/NotFound";
import BillingServices from "@/services/BillingServices";
import { notifyError, notifySuccess } from "@/utils/toast";

import TableHeaderCell from "@/components/table/TableHeaderCell";
const LIMIT = 25;

const STATUS_LABELS = {
  open: { text: "ממתינה לחיוב", type: "warning" },
  billing: { text: "בתהליך חיוב", type: "neutral" },
  billed: { text: "חויבה", type: "success" },
  cancelled: { text: "בוטלה", type: "danger" },
};

const shekel = (n) =>
  Number(n || 0).toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// מפתח נגד שליחה כפולה. randomUUID אינו זמין בהקשר לא מאובטח (http בלי TLS)
const newIdempotencyKey = () =>
  globalThis.crypto?.randomUUID?.() ||
  `dup-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const DeliveryNotes = () => {
  const [notes, setNotes] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [month, setMonth] = useState("");
  const [kind, setKind] = useState("");
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  // התעודה שעליה רצה כרגע פעולה — מנטרל את הכפתורים שלה בלבד, כדי
  // שלחיצה כפולה לא תיצור שתי תעודות או שתי חשבוניות
  const [working, setWorking] = useState(null);

  // סינון לפי לקוח מגיע מה-URL (קישור מכרטיס הלקוח) ולא מבורר במסך.
  // כך הקישור ניתן לשיתוף ולרענון בלי לאבד את הסינון.
  const [customerFilter, setCustomerFilter] = useQueryParam("customer");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await BillingServices.getDeliveryNotes({
        page,
        limit: LIMIT,
        status,
        month,
        kind,
        customer: customerFilter,
      });
      setNotes(res.notes || []);
      setTotal(res.total || 0);
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
      setNotes([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, status, month, kind, customerFilter]);

  useEffect(() => {
    load();
  }, [load]);

  /** "עוד אחת בדיוק כמו זו" — תעודה חדשה עם אותן שורות ואותם מחירים. */
  const duplicate = async (note) => {
    setWorking(note._id);
    try {
      const res = await BillingServices.duplicateDeliveryNote(note._id, {
        idempotencyKey: newIdempotencyKey(),
      });
      notifySuccess(res.message);
      setPage(1);
      load();
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setWorking(null);
    }
  };

  /** הפקת חשבונית מס על התעודה עכשיו, בלי להמתין לסגירת החודש. */
  const bill = async (note) => {
    if (
      !window.confirm(
        `להפיק חשבונית מס על תעודה ${note.number} (${note.customerSnapshot?.name || "הלקוח"})?\n\n` +
          `חשבונית מס נרשמת בספרים ואי אפשר למחוק אותה — רק להוציא זיכוי.`
      )
    ) {
      return;
    }

    setWorking(note._id);
    try {
      const res = await BillingServices.billDeliveryNote(note._id);
      notifySuccess(res.message);
      load();
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setWorking(null);
    }
  };

  // שינוי סינון מחזיר לעמוד הראשון — אחרת המשתמשת נשארת בעמוד 4 של תוצאה
  // שיש בה עמוד אחד, ורואה מסך ריק
  const changeFilter = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  return (
    <>
      <div className="flex items-center justify-between my-6">
        <PageTitle style={{ margin: 0 }}>תעודות משלוח</PageTitle>
        <Button onClick={() => setBuilding((v) => !v)}>
          {building ? <FiX className="ml-2" /> : <FiPlus className="ml-2" />}
          {building ? "ביטול" : "תעודה ידנית"}
        </Button>
      </div>

      {building && (
        <ManualDeliveryNoteForm
          onCancel={() => setBuilding(false)}
          onCreated={() => {
            setBuilding(false);
            setPage(1);
            load();
          }}
        />
      )}

      {customerFilter && notes.length > 0 && (
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
          מוצגות תעודות של {notes[0].customerSnapshot?.name || "לקוח נבחר"} בלבד
        </p>
      )}

      <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
        <CardBody>
          <div className="flex flex-wrap items-end gap-4">
            <Label>
              <span>סטטוס</span>
              <Select className="mt-1" value={status} onChange={changeFilter(setStatus)}>
                <option value="">הכל</option>
                <option value="open">ממתינה לחיוב</option>
                <option value="billed">חויבה</option>
                <option value="cancelled">בוטלה</option>
                <option value="billing">בתהליך חיוב</option>
              </Select>
            </Label>

            <Label>
              <span>סוג</span>
              <Select className="mt-1" value={kind} onChange={changeFilter(setKind)}>
                <option value="">הכל</option>
                <option value="auto">מהזמנה</option>
                <option value="manual">ידנית (משקל בפועל)</option>
              </Select>
            </Label>

            <Label>
              <span>חודש חיוב</span>
              <Input
                className="mt-1"
                type="month"
                value={month}
                onChange={changeFilter(setMonth)}
              />
            </Label>

            {(status || month || kind || customerFilter) && (
              <Button
                layout="link"
                onClick={() => {
                  setStatus("");
                  setMonth("");
                  setKind("");
                  setCustomerFilter(null);
                  setPage(1);
                }}
              >
                נקה סינון
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      {loading ? (
        <TableLoading row={10} col={9} width={160} height={20} />
      ) : notes.length === 0 ? (
        <NotFound title="לא נמצאו תעודות משלוח" />
      ) : (
        <TableContainer className="mb-8">
          <Table className="w-full whitespace-nowrap admin-table">
            <TableHeader>
              <tr>
                <TableHeaderCell>מספר</TableHeaderCell>
                <TableHeaderCell>סוג</TableHeaderCell>
                <TableHeaderCell>תאריך</TableHeaderCell>
                <TableHeaderCell>לקוח</TableHeaderCell>
                <TableHeaderCell>הזמנה</TableHeaderCell>
                <TableHeaderCell className="text-center">שורות</TableHeaderCell>
                <TableHeaderCell className="text-left">סכום לפני מע"מ</TableHeaderCell>
                <TableHeaderCell>סטטוס</TableHeaderCell>
                <TableHeaderCell>חשבונית</TableHeaderCell>
                <TableHeaderCell></TableHeaderCell>
              </tr>
            </TableHeader>
            <TableBody>
              {notes.map((note) => {
                const label = STATUS_LABELS[note.billing?.status] || STATUS_LABELS.open;
                return (
                  <TableRow key={note._id}>
                    <TableCell className="font-mono font-semibold">{note.number}</TableCell>
                    <TableCell>
                      {note.kind === "manual" ? (
                        <span
                          className="text-xs text-green-700 dark:text-green-500"
                          title="הכמות בתעודה היא המשקל שנשקל בפועל"
                        >
                          ידנית
                          {note.manualReference ? ` · ${note.manualReference}` : ""}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">מהזמנה</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {note.issuedAt
                        ? new Date(note.issuedAt).toLocaleDateString("he-IL")
                        : "—"}
                    </TableCell>
                    <TableCell>{note.customerSnapshot?.name || "—"}</TableCell>
                    <TableCell>
                      {note.order ? (
                        <Link
                          to={`/order/${note.order}`}
                          className="text-blue-600 hover:underline"
                        >
                          {note.orderNumber}
                        </Link>
                      ) : (
                        note.orderNumber || "—"
                      )}
                    </TableCell>
                    <TableCell className="text-center">{note.items?.length || 0}</TableCell>
                    <TableCell className="text-left">{shekel(note.total)} ₪</TableCell>
                    <TableCell>
                      <Badge type={label.type}>{label.text}</Badge>
                    </TableCell>
                    <TableCell className="font-mono">
                      {note.billing?.icountDocNum || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <Link
                          to={`/delivery-note/${note._id}`}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          פתיחה
                        </Link>

                        <button
                          onClick={() => duplicate(note)}
                          disabled={working === note._id}
                          className="text-sm text-gray-600 dark:text-gray-300 hover:underline flex items-center gap-1 disabled:opacity-40"
                          title="יצירת תעודה חדשה זהה לזו"
                        >
                          <FiCopy /> העתק
                        </button>

                        {/* רק תעודה פתוחה. תעודה שחויבה כבר סגורה מול מסמך
                            מס, ותעודה מבוטלת אינה מחייבת דבר */}
                        {note.billing?.status === "open" && (
                          <button
                            onClick={() => bill(note)}
                            disabled={working === note._id}
                            className="text-sm text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1 disabled:opacity-40"
                            title="הפקת חשבונית מס על התעודה הזו עכשיו"
                          >
                            <MdOutlineReceiptLong /> חשבונית
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <TableFooter>
            <Pagination
              totalResults={total}
              resultsPerPage={LIMIT}
              onChange={setPage}
              label="ניווט בין עמודים"
            />
          </TableFooter>
        </TableContainer>
      )}
    </>
  );
};

export default DeliveryNotes;
