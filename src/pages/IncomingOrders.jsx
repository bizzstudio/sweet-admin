// src/pages/IncomingOrders.jsx
//
// הודעות שנקלטו מהמייל ומווצאפ.
//
// המסך הזה הוא בעיקר מסך *טיפול בכשלים*: הזמנה שנקראה בהצלחה הופכת אוטומטית
// להזמנה רגילה ומופיעה במסך ההזמנות. מה שנשאר כאן לטיפול הוא מה שהמערכת לא
// הצליחה לקרוא — ואת זה אי אפשר להשאיר לאף אחד לגלות לבד.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardBody,
  Input,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHeader,
  TableRow,
} from "@windmill/react-ui";
import { Link } from "react-router-dom";
import { FiMail, FiRefreshCw, FiSearch, FiSlash, FiUserPlus } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";

import { notifyError, notifySuccess } from "@/utils/toast";
import IncomingOrderServices from "@/services/IncomingOrderServices";
import NotFound from "@/components/table/NotFound";
import PageTitle from "@/components/Typography/PageTitle";
import TableLoading from "@/components/preloader/TableLoading";

const RESULTS_PER_PAGE = 20;

// רק מה שדורש פעולה מקבל לשונית משלו. הסטטוסים האחרים (נוצרה הזמנה, בעיבוד,
// לא הזמנה, לא רלוונטי) עדיין קיימים ברשומות ונגישים דרך "הכול" — אין להם
// לשונית כי אין עליהם מה לעשות.
const STATUS_TABS = [
  { key: "failed", label: "הזמנות שגויות" },
  // שולח שאינו לקוח במערכת. עלולה להיות כאן הזמנה אמיתית מלקוח חדש, ולכן
  // הלשונית בולטת ולא נבלעת ב"הכול".
  { key: "unknown_sender", label: "שולח לא מוכר" },
  { key: "all", label: "הכול" },
];

const STATUS_META = {
  received: { label: "בעיבוד", type: "warning" },
  order_created: { label: "נוצרה הזמנה", type: "success" },
  // "הזמנות שגויות" כאן פירושו שההזמנה נוצרה בסטטוס "שגיאה בקריאה" (או שלא נוצרה
  // בכלל, כשלא ניתן היה לזהות לקוח) — כלומר משהו לא נקרא במלואו
  failed: { label: "שגיאה בקריאה", type: "danger" },
  not_an_order: { label: "לא הזמנה", type: "neutral" },
  ignored: { label: "לא רלוונטי", type: "neutral" },
  unknown_sender: { label: "שולח לא מוכר", type: "warning" },
};

// תרגום קודי הכשל לשפה שאומרת לעובד מה לעשות
const ERROR_HINTS = {
  llm_failed: "שירות הניתוח לא הגיב — נסה שוב",
  no_items: "לא זוהו פריטים בהודעה",
  items_unmatched: "פריט שהלקוח ביקש לא נמצא בקטלוג",
  low_confidence: "הזיהוי לא היה בטוח מספיק",
  customer_unresolved: "אין טלפון ואין מייל לזיהוי הלקוח",
  address_unresolved: "כתובת המשלוח לא זוהתה או שהעיר אינה ביעדי החלוקה",
  below_minimum: "ההזמנה מתחת למינימום ליעד",
  out_of_stock: "אין מלאי מספיק",
  order_create_failed: "כשל טכני ביצירת ההזמנה",
};

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString("he-IL", {
        timeZone: "Asia/Jerusalem",
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const ChannelIcon = ({ channel }) => {
  if (channel === "whatsapp") {
    return (
      <span className="flex items-center gap-1 text-green-600" title="ווצאפ">
        <FaWhatsapp className="w-4 h-4" /> ווצאפ
      </span>
    );
  }
  if (channel === "email") {
    return (
      <span className="flex items-center gap-1 text-blue-600" title="מייל">
        <FiMail className="w-4 h-4" /> מייל
      </span>
    );
  }
  return <span className="text-gray-500">בדיקה</span>;
};

const IncomingOrders = () => {
  const [status, setStatus] = useState("failed");
  const [channel, setChannel] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [data, setData] = useState({
    incomingOrders: [],
    totalDoc: 0,
    countByStatus: {},
    stuckCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  // מעבר מהיר בין לשוניות מייצר כמה בקשות במקביל, והן לא בהכרח חוזרות בסדר
  // שנשלחו. בלי המונה הזה תשובה איטית של הלשונית הקודמת הייתה דורסת את זו
  // הנוכחית — כלומר רשימה שאינה תואמת ללשונית המסומנת.
  const latestRequest = useRef(0);

  const load = useCallback(async () => {
    const requestId = latestRequest.current + 1;
    latestRequest.current = requestId;
    setLoading(true);
    setError("");
    try {
      const res = await IncomingOrderServices.getAllIncomingOrders({
        status,
        channel,
        search,
        page,
        limit: RESULTS_PER_PAGE,
      });
      if (requestId !== latestRequest.current) return;
      setData(res);
    } catch (err) {
      if (requestId !== latestRequest.current) return;
      setError(err?.response?.data?.message || err.message);
    } finally {
      // בקשה שכבר אינה האחרונה לא מכבה את מחוון הטעינה — יש אחת חדשה בדרך
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, [status, channel, search, page]);

  useEffect(() => {
    load();
    // יציאה מהמסך פוסלת את הבקשה שבאוויר, כדי שלא תעדכן סטייט של רכיב שכבר אינו
    return () => {
      latestRequest.current += 1;
    };
  }, [load]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleRetry = async (id) => {
    setBusyId(id);
    try {
      const res = await IncomingOrderServices.retryIncomingOrder(id);
      notifySuccess(res.message);
      await load();
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setBusyId(null);
    }
  };

  // "השולח הזה לקוח חדש שלנו" — יוצר כרטיס לקוח וקורא את ההודעה מחדש
  const handleApproveSender = async (row) => {
    const identifier = row.sender?.email || row.sender?.phone || "השולח";
    if (
      !window.confirm(
        `ליצור כרטיס לקוח עבור ${identifier} ולקרוא את ההזמנה?\n\n` +
          `מכאן והלאה המערכת תקרא הזמנות מהשולח הזה אוטומטית.`
      )
    ) {
      return;
    }

    setBusyId(row._id);
    try {
      const res = await IncomingOrderServices.approveSender(row._id);
      notifySuccess(res.message);
      await load();
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleIgnore = async (id) => {
    setBusyId(id);
    try {
      const res = await IncomingOrderServices.ignoreIncomingOrder(id);
      notifySuccess(res.message);
      await load();
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleScanEmail = async () => {
    setScanning(true);
    try {
      const res = await IncomingOrderServices.scanEmailNow();
      notifySuccess(res.message);
      await load();
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setScanning(false);
    }
  };

  const rows = data.incomingOrders || [];
  const failedCount = data.countByStatus?.failed || 0;
  const unknownSenderCount = data.countByStatus?.unknown_sender || 0;
  const stuckCount = data.stuckCount || 0;

  // ל"בעיבוד" אין לשונית קבועה — במצב תקין הסטטוס חולף תוך שניות. אבל הודעה
  // נתקעת בו כשהשרת נופל באמצע העיבוד, ובלי שום לשונית היא הייתה בלתי נראית.
  // הפשרה: הלשונית נולדת רק כשיש משהו תקוע באמת (השרת מחליט מה "תקוע"), ונשארת
  // כל עוד היא הלשונית הנבחרת — כדי שלא תיעלם מתחת לאצבע אחרי הטיפול האחרון.
  const tabs = useMemo(() => {
    const showStuck = stuckCount > 0 || status === "stuck";
    return STATUS_TABS.flatMap((tab) =>
      tab.key === "all" && showStuck
        ? [{ key: "stuck", label: "תקוע בעיבוד", count: stuckCount }, tab]
        : [tab]
    );
  }, [stuckCount, status]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 my-6">
        <PageTitle style={{ margin: 0 }}>קליטת הזמנות</PageTitle>
        <Button
          onClick={handleScanEmail}
          disabled={scanning}
          layout="outline"
          size="small"
          className="flex items-center gap-2"
        >
          <FiMail className="w-4 h-4" />
          {scanning ? "סורק..." : "סרוק מייל עכשיו"}
        </Button>
      </div>

      <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
        <CardBody>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            הודעות שהגיעו בווצאפ ובמייל ונקראו אוטומטית. הודעה שנקראה במלואה הפכה
            להזמנה בסטטוס "בטיפול". הודעה שלא נקראה במלואה הפכה להזמנה בסטטוס
            "שגיאה בקריאה" — היא נמצאת במסך ההזמנות, לא ירד עליה מלאי, והיא מחכה
            לאישור. לחיצה על מספר ההזמנה פותחת אותה עם פרטי השגיאה.
            {failedCount > 0 && (
              <span className="font-semibold text-red-600">
                {" "}
                {failedCount} הזמנות שגויות מחכות לטיפול.
              </span>
            )}
          </p>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            המערכת קוראת הודעות <span className="font-semibold">רק מלקוחות שקיימים במערכת</span>.
            הודעה ממייל או ממספר שאינם בכרטיסי הלקוחות אינה נקראת כלל, ומופיעה
            בלשונית "שולח לא מוכר".
            {unknownSenderCount > 0 && (
              <span className="font-semibold text-orange-600">
                {" "}
                {unknownSenderCount} הודעות משולחים לא מוכרים — כדאי לעבור עליהן, ייתכן
                שיש שם הזמנה מלקוח חדש.
              </span>
            )}
          </p>
          {stuckCount > 0 && (
            <p className="mt-2 text-sm font-semibold text-orange-600">
              {stuckCount} הודעות תקועות בעיבוד — כנראה השרת נפל באמצע קריאתן.
              בלשונית "תקוע בעיבוד" לחץ "נסה שוב".
            </p>
          )}
        </CardBody>
      </Card>

      {/* סינון */}
      <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
        <CardBody>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {tabs.map((tab) => {
              const count =
                tab.key === "all" ? undefined : tab.count ?? data.countByStatus?.[tab.key];
              const active = status === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    setStatus(tab.key);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    active
                      ? "bg-green-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200"
                  }`}
                >
                  {tab.label}
                  {count ? ` (${count})` : ""}
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-2">
            <div className="flex-grow min-w-48">
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="חיפוש בטקסט ההודעה, טלפון, מייל או מספר הזמנה"
              />
            </div>
            <select
              value={channel}
              onChange={(e) => {
                setChannel(e.target.value);
                setPage(1);
              }}
              className="block w-40 h-12 px-3 text-sm border rounded-md dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="all">כל הערוצים</option>
              <option value="whatsapp">ווצאפ</option>
              <option value="email">מייל</option>
              <option value="manual">בדיקה</option>
            </select>
            <Button type="submit" size="small" className="flex items-center gap-2 h-12">
              <FiSearch className="w-4 h-4" /> חיפוש
            </Button>
          </form>
        </CardBody>
      </Card>

      {loading ? (
        <TableLoading row={12} col={6} width={160} height={20} />
      ) : error ? (
        <span className="text-center mx-auto text-red-500">{error}</span>
      ) : rows.length > 0 ? (
        <TableContainer className="mb-8 rounded-b-lg">
          <Table>
            <TableHeader>
              <tr>
                <TableCell>זמן</TableCell>
                <TableCell>ערוץ</TableCell>
                <TableCell>שולח</TableCell>
                <TableCell>ההודעה</TableCell>
                <TableCell>מה זוהה</TableCell>
                <TableCell>סטטוס</TableCell>
                <TableCell className="text-center">פעולות</TableCell>
              </tr>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const meta = STATUS_META[row.status] || { label: row.status, type: "neutral" };
                const expanded = expandedId === row._id;
                const unmatched = (row.matchedItems || []).filter((i) => !i.product);
                const matched = (row.matchedItems || []).filter((i) => i.product);

                return (
                  <TableRow key={row._id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {formatDate(row.receivedAt || row.createdAt)}
                    </TableCell>

                    <TableCell className="text-xs whitespace-nowrap">
                      <ChannelIcon channel={row.channel} />
                    </TableCell>

                    <TableCell className="text-xs">
                      <div className="font-medium">
                        {row.resolved?.customer
                          ? `${row.resolved.customer.name || ""} ${row.resolved.customer.lastName || ""}`.trim()
                          : row.sender?.name || "—"}
                      </div>
                      <div dir="ltr" className="text-gray-500">
                        {row.sender?.phone || row.sender?.email || "—"}
                      </div>
                    </TableCell>

                    <TableCell className="text-xs max-w-xs">
                      {row.subject && (
                        <div className="font-medium truncate">{row.subject}</div>
                      )}
                      <button
                        onClick={() => setExpandedId(expanded ? null : row._id)}
                        className="text-right text-blue-600 hover:underline"
                        title="הצג/הסתר את ההודעה המלאה"
                      >
                        {expanded ? "הסתר" : "הצג הודעה"}
                      </button>
                      {expanded && (
                        <pre className="mt-2 p-2 text-xs whitespace-pre-wrap bg-gray-50 dark:bg-gray-900 rounded max-h-64 overflow-y-auto">
                          {row.rawText}
                        </pre>
                      )}
                      {expanded && row.attachments?.length > 0 && (
                        <ul className="mt-2 space-y-0.5">
                          {row.attachments.map((att, i) => (
                            <li
                              key={i}
                              className={att.read ? "text-gray-600" : "text-orange-600"}
                              title={att.mimeType || ""}
                            >
                              {att.read ? "✓" : "✕"} {att.filename}
                              {att.error
                                ? ` — ${att.error}`
                                : att.read
                                  ? ` — נקרא${att.note ? ` (${att.note})` : ""}`
                                  : " — לא נקרא"}
                            </li>
                          ))}
                        </ul>
                      )}
                    </TableCell>

                    <TableCell className="text-xs max-w-xs">
                      {matched.length > 0 && (
                        <ul className="space-y-0.5">
                          {matched.map((item, i) => (
                            <li key={i}>
                              <span className="font-medium">{item.quantity}×</span>{" "}
                              {item.productTitle || item.rawName}
                              {item.confidence < 0.9 && (
                                <span className="text-orange-600">
                                  {" "}
                                  ({Math.round(item.confidence * 100)}%)
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                      {unmatched.length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {unmatched.map((item, i) => (
                            <li key={i} className="text-red-600">
                              «{item.rawName}» — {item.failReason || "לא זוהה"}
                            </li>
                          ))}
                        </ul>
                      )}
                      {!row.matchedItems?.length && "—"}
                    </TableCell>

                    <TableCell className="text-xs">
                      <Badge type={meta.type}>{meta.label}</Badge>
                      {row.invoice && (
                        <div className="mt-1 font-medium">
                          <Link
                            to={`/order/${row.order}`}
                            className="text-blue-600 hover:underline"
                          >
                            הזמנה {row.invoice}
                          </Link>
                        </div>
                      )}
                      {row.status === "failed" && (
                        <div className="mt-1 text-red-600">
                          {ERROR_HINTS[row.errorCode] || row.error}
                        </div>
                      )}
                      {row.status === "not_an_order" && row.parsed?.notAnOrderReason && (
                        <div className="mt-1 text-gray-500">
                          {row.parsed.notAnOrderReason}
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="text-center whitespace-nowrap">
                      {row.status === "unknown_sender" ? (
                        // שולח לא מוכר: הפעולה הרלוונטית היא לאשר אותו כלקוח,
                        // לא "לנסות שוב" — ניסיון חוזר יידחה מאותה סיבה בדיוק.
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleApproveSender(row)}
                            disabled={busyId === row._id}
                            className="px-2 py-1.5 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-40 flex items-center gap-1"
                            title="צור כרטיס לקוח מהשולח וקרא את ההזמנה"
                          >
                            <FiUserPlus className="w-3.5 h-3.5" />
                            {busyId === row._id ? "מוסיף..." : "לקוח חדש"}
                          </button>
                          <button
                            onClick={() => handleIgnore(row._id)}
                            disabled={busyId === row._id}
                            title="סמן כלא רלוונטי"
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-40"
                          >
                            <FiSlash className="w-4 h-4" />
                          </button>
                        </div>
                      ) : row.status !== "order_created" && (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleRetry(row._id)}
                            disabled={busyId === row._id}
                            title="נסה לקרוא שוב"
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-40"
                          >
                            <FiRefreshCw
                              className={`w-4 h-4 ${busyId === row._id ? "animate-spin" : ""}`}
                            />
                          </button>
                          {row.status !== "ignored" && (
                            <button
                              onClick={() => handleIgnore(row._id)}
                              disabled={busyId === row._id}
                              title="סמן כלא רלוונטי"
                              className="p-2 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-40"
                            >
                              <FiSlash className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <TableFooter>
            <Pagination
              // ה-Pagination של Windmill מחזיק את העמוד הנוכחי בסטייט פנימי ואין
              // דרך לשלוט בו מבחוץ. בלי המפתח הזה, מעבר לשונית היה מאפס אותנו
              // לעמוד 1 בנתונים אבל הרכיב היה ממשיך להציג "עמוד 3" ומספר תוצאות
              // שגוי. המפתח מכריח אותו להיבנות מחדש בדיוק כשהסינון משתנה.
              key={`${status}|${channel}|${search}`}
              totalResults={data.totalDoc}
              resultsPerPage={RESULTS_PER_PAGE}
              onChange={setPage}
              label="Table navigation"
            />
          </TableFooter>
        </TableContainer>
      ) : (
        <NotFound title="אין הודעות להצגה" />
      )}
    </>
  );
};

export default IncomingOrders;
