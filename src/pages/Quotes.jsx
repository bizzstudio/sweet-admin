// src/pages/Quotes.jsx
//
// הצעות מחיר: רשימה + בונה הצעה חדשה.
//
// המחיר מוצג ליד כל שורה עוד לפני ההפקה, יחד עם מקורו (מחירון הלקוח או
// מחיר קטלוג). זה מכוון: הצעה היא מה שהלקוח יצפה לשלם, וכשרוב הקטלוג
// מתומחר במחירי ברירת מחדל צריך לראות את זה לפני ששולחים ולא אחרי.

import React, { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  Input,
  Label,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHeader,
  TableRow,
  Pagination,
} from "@windmill/react-ui";
import { FiAlertTriangle, FiPlus, FiPrinter, FiTrash2, FiX } from "react-icons/fi";
import { Link } from "react-router-dom";
import useQueryParam from "@/hooks/useQueryParam";

import PageTitle from "@/components/Typography/PageTitle";
import ProductPicker from "@/components/billing/ProductPicker";
import TableLoading from "@/components/preloader/TableLoading";
import NotFound from "@/components/table/NotFound";
import BillingServices from "@/services/BillingServices";
import CustomerServices from "@/services/CustomerServices";
import { notifyError, notifySuccess } from "@/utils/toast";

const LIMIT = 25;

const STATUS_LABELS = {
  open: { text: "ממתינה", type: "warning" },
  accepted: { text: "אושרה", type: "success" },
  rejected: { text: "נדחתה", type: "danger" },
  expired: { text: "פג תוקף", type: "neutral" },
};

const SOURCE_LABELS = {
  customerPriceList: { text: "מחירון הלקוח", cls: "text-green-600" },
  catalog: { text: "מחיר קטלוג", cls: "text-yellow-600" },
  manual: { text: "ידני", cls: "text-blue-600" },
  missing: { text: "אין מחיר!", cls: "text-red-600 font-semibold" },
};

const shekel = (n) =>
  Number(n || 0).toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const Quotes = () => {
  const [quotes, setQuotes] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  // סינון לפי לקוח מה-URL, כמו בתעודות המשלוח
  const [customerFilter, setCustomerFilter] = useQueryParam("customer");

  const [building, setBuilding] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [rows, setRows] = useState([{ sku: "", quantity: 1 }]);
  const [priced, setPriced] = useState(null);
  const [validDays, setValidDays] = useState(30);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await BillingServices.getQuotes({ page, limit: LIMIT, status, customer: customerFilter });
      setQuotes(res.quotes || []);
      setTotal(res.total || 0);
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [page, status, customerFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!building || customers.length) return;
    CustomerServices.getAllCustomers({ searchText: "" })
      .then((res) => setCustomers(Array.isArray(res) ? res : res?.customers || []))
      .catch(() => setCustomers([]));
  }, [building, customers.length]);

  const updateRow = (i, field, value) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
    setPriced(null);
  };

  const addRow = () => setRows((prev) => [...prev, { sku: "", quantity: 1 }]);
  const removeRow = (i) => {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
    setPriced(null);
  };

  const validRows = rows.filter((r) => r.sku?.trim() && Number(r.quantity) > 0);

  const doPrice = async () => {
    if (!customerId) return notifyError("יש לבחור לקוח");
    if (!validRows.length) return notifyError("יש להזין לפחות מק\"ט אחד עם כמות");

    try {
      const res = await BillingServices.priceItems({
        customer: customerId,
        items: validRows.map((r) => ({ sku: r.sku.trim(), quantity: Number(r.quantity) })),
      });
      setPriced(res);
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    }
  };

  const doCreate = async () => {
    setSaving(true);
    try {
      const res = await BillingServices.createQuote({
        customer: customerId,
        items: validRows.map((r) => ({ sku: r.sku.trim(), quantity: Number(r.quantity) })),
        validDays: Number(validDays) || 30,
        notes,
      });
      notifySuccess(res.message);
      setBuilding(false);
      setRows([{ sku: "", quantity: 1 }]);
      setPriced(null);
      setNotes("");
      setCustomerId("");
      load();
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const setQuoteStatus = async (quote, action) => {
    try {
      const res =
        action === "accept"
          ? await BillingServices.acceptQuote(quote._id)
          : await BillingServices.rejectQuote(quote._id);
      notifySuccess(res.message);
      load();
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    }
  };

  const pricedTotal = (priced?.items || []).reduce((s, i) => s + i.lineTotal, 0);
  const catalogCount = priced?.quality?.catalog || 0;

  return (
    <>
      <div className="flex items-center justify-between my-6">
        <PageTitle style={{ margin: 0 }}>הצעות מחיר</PageTitle>
        <Button onClick={() => setBuilding((v) => !v)}>
          {building ? <FiX className="ml-2" /> : <FiPlus className="ml-2" />}
          {building ? "ביטול" : "הצעה חדשה"}
        </Button>
      </div>

      {building && (
        <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-6">
          <CardBody>
            <div className="flex flex-wrap gap-4 mb-4">
              <Label className="flex-1 min-w-[240px]">
                <span>לקוח</span>
                <Select
                  className="mt-1"
                  value={customerId}
                  onChange={(e) => {
                    setCustomerId(e.target.value);
                    setPriced(null);
                  }}
                >
                  <option value="">— בחרי לקוח —</option>
                  {customers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Label>

              <Label className="w-40">
                <span>תוקף (ימים)</span>
                <Input
                  className="mt-1"
                  type="number"
                  min="1"
                  value={validDays}
                  onChange={(e) => setValidDays(e.target.value)}
                />
              </Label>
            </div>

            <p className="text-sm font-medium mb-2">פריטים</p>
            {rows.map((row, i) => (
              <div key={i} className="flex gap-2 mb-2 items-center">
                <ProductPicker
                  className="flex-1 min-w-0"
                  value={row.sku}
                  onChange={(sku) => updateRow(i, "sku", sku)}
                />
                <Input
                  className="w-28"
                  type="number"
                  min="1"
                  placeholder="כמות"
                  value={row.quantity}
                  onChange={(e) => updateRow(i, "quantity", e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  disabled={rows.length === 1}
                  className="p-2 text-red-500 disabled:opacity-30"
                >
                  <FiTrash2 />
                </button>
              </div>
            ))}

            <div className="flex flex-wrap gap-3 mt-3">
              <Button size="small" layout="outline" onClick={addRow}>
                <FiPlus className="ml-1" /> שורה
              </Button>
              <Button size="small" layout="outline" onClick={doPrice}>
                חשב מחירים
              </Button>
            </div>

            <Label className="mt-4">
              <span>הערות (מופיעות על המסמך)</span>
              <Input
                className="mt-1"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Label>

            {priced && (
              <div className="mt-5">
                <TableContainer>
                  <Table>
                    <TableHeader>
                      <tr>
                        <TableCell>מוצר</TableCell>
                        <TableCell className="text-center">כמות</TableCell>
                        <TableCell className="text-left">מחיר יח'</TableCell>
                        <TableCell className="text-left">סה"כ</TableCell>
                        <TableCell>מקור המחיר</TableCell>
                      </tr>
                    </TableHeader>
                    <TableBody>
                      {priced.items.map((item, i) => {
                        const src = SOURCE_LABELS[item.source] || SOURCE_LABELS.catalog;
                        return (
                          <TableRow key={i}>
                            <TableCell>{item.name}</TableCell>
                            <TableCell className="text-center">{item.quantity}</TableCell>
                            <TableCell className="text-left">{shekel(item.unitPrice)}</TableCell>
                            <TableCell className="text-left">{shekel(item.lineTotal)}</TableCell>
                            <TableCell className={`text-xs ${src.cls}`}>{src.text}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="text-sm">
                    <p>
                      סה"כ לפני מע"מ:{" "}
                      <span className="font-semibold text-lg">{shekel(pricedTotal)} ₪</span>
                    </p>
                    <p className="text-gray-500">
                      כולל מע"מ: ~{shekel(pricedTotal * 1.18)} ₪
                    </p>
                  </div>

                  <Button onClick={doCreate} disabled={saving || priced.quality.hasMissing}>
                    {saving ? "מפיק..." : "הפק הצעת מחיר"}
                  </Button>
                </div>

                {priced.quality.hasMissing && (
                  <p className="mt-3 text-sm text-red-600 flex items-center gap-2">
                    <FiAlertTriangle /> יש מק"טים ללא מחיר — יש לתקן לפני הפקה
                  </p>
                )}

                {catalogCount > 0 && !priced.quality.hasMissing && (
                  <p className="mt-3 text-sm text-yellow-700 dark:text-yellow-500 flex items-start gap-2">
                    <FiAlertTriangle className="mt-0.5 shrink-0" />
                    <span>
                      {catalogCount} מתוך {priced.quality.total} השורות מתומחרות לפי
                      מחיר הקטלוג ולא לפי מחירון הלקוח. כל עוד לא הועלה מחירון
                      בסיס אמיתי, אלה מחירי ברירת מחדל — כדאי לבדוק לפני שליחה.
                    </span>
                  </p>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
        <CardBody className="flex flex-wrap items-end gap-4">
          <Label className="w-56">
            <span>סטטוס</span>
            <Select
              className="mt-1"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">הכל</option>
              <option value="open">ממתינה</option>
              <option value="accepted">אושרה</option>
              <option value="rejected">נדחתה</option>
            </Select>
          </Label>

          {customerFilter && (
            <Button
              layout="link"
              className="mt-6"
              onClick={() => {
                setCustomerFilter(null);
                setPage(1);
              }}
            >
              הצג את כל הלקוחות
            </Button>
          )}
        </CardBody>
      </Card>

      {loading ? (
        <TableLoading row={8} col={7} width={160} height={20} />
      ) : quotes.length === 0 ? (
        <NotFound title="לא נמצאו הצעות מחיר" />
      ) : (
        <TableContainer className="mb-8">
          <Table>
            <TableHeader>
              <tr>
                <TableCell>מספר</TableCell>
                <TableCell>תאריך</TableCell>
                <TableCell>לקוח</TableCell>
                <TableCell className="text-center">שורות</TableCell>
                <TableCell className="text-left">סכום</TableCell>
                <TableCell>בתוקף עד</TableCell>
                <TableCell>סטטוס</TableCell>
                <TableCell></TableCell>
              </tr>
            </TableHeader>
            <TableBody>
              {quotes.map((q) => {
                const label = STATUS_LABELS[q.status] || STATUS_LABELS.open;
                return (
                  <TableRow key={q._id}>
                    <TableCell className="font-mono font-semibold">{q.number}</TableCell>
                    <TableCell>
                      {new Date(q.createdAt).toLocaleDateString("he-IL")}
                    </TableCell>
                    <TableCell>{q.customerSnapshot?.name || "—"}</TableCell>
                    <TableCell className="text-center">{q.items?.length || 0}</TableCell>
                    <TableCell className="text-left">{shekel(q.total)} ₪</TableCell>
                    <TableCell>
                      {q.validUntil
                        ? new Date(q.validUntil).toLocaleDateString("he-IL")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge type={label.type}>{label.text}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/quote/${q._id}`}
                          className="text-blue-600 hover:underline flex items-center gap-1 text-sm"
                        >
                          מסמך <FiPrinter />
                        </Link>
                        {q.status === "open" && (
                          <>
                            <button
                              onClick={() => setQuoteStatus(q, "accept")}
                              className="text-green-600 text-sm hover:underline"
                            >
                              אושרה
                            </button>
                            <button
                              onClick={() => setQuoteStatus(q, "reject")}
                              className="text-red-500 text-sm hover:underline"
                            >
                              נדחתה
                            </button>
                          </>
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

export default Quotes;
