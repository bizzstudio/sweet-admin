import {
  Button,
  Card,
  CardBody,
  Input,
  Label,
  Table,
  TableCell,
  TableContainer,
  TableHeader,
} from "@windmill/react-ui";
import { Fragment, useContext, useEffect, useState } from "react";
import { FiChevronDown, FiChevronUp, FiTrash2, FiRefreshCw } from "react-icons/fi";
import { Link } from "react-router-dom";

import PageTitle from "@/components/Typography/PageTitle";
import TableLoading from "@/components/preloader/TableLoading";
import { SidebarContext } from "@/context/SidebarContext";
import useAsync from "@/hooks/useAsync";
import LotteryServices from "@/services/LotteryServices";

import TableHeaderCell from "@/components/table/TableHeaderCell";
function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("he-IL");
  } catch {
    return "—";
  }
}

function formatDay(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("he-IL");
  } catch {
    return "—";
  }
}

function axiosErrorMessage(err) {
  const d = err?.response?.data;
  if (d && typeof d.message === "string") return d.message;
  if (typeof d === "string" && d.trim()) return d;
  return err?.message || "שגיאה";
}

function participantDisplayName(userInfo) {
  if (!userInfo || typeof userInfo !== "object") return "—";
  const parts = [userInfo.name, userInfo.lastName].filter(Boolean);
  const joined = parts.join(" ").trim();
  if (joined) return joined;
  if (userInfo.email) return userInfo.email;
  return "—";
}

/** אחרי סוף יום תאריך הסיום שנשמר במסד (כולל 23:59:59.999) */
function hasLotteryEndDatePassed(endDateRaw) {
  const end = new Date(endDateRaw);
  if (Number.isNaN(end.getTime())) return false;
  return Date.now() > end.getTime();
}

const Lotteries = () => {
  const { setIsUpdate } = useContext(SidebarContext);
  const { data: list, loading, error } = useAsync(() => LotteryServices.getAll());

  const [tableList, setTableList] = useState(null);
  useEffect(() => {
    if (Array.isArray(list)) setTableList(list);
  }, [list]);

  const rows = Array.isArray(tableList) ? tableList : Array.isArray(list) ? list : [];

  const syncTableFromServer = async () => {
    try {
      const fresh = await LotteryServices.getAll();
      setTableList(fresh);
    } catch {
      /* לא קריטי */
    }
  };

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [pageError, setPageError] = useState("");

  const [expandedLotteryId, setExpandedLotteryId] = useState(null);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantsRows, setParticipantsRows] = useState([]);
  const [participantsSource, setParticipantsSource] = useState(null);

  const loadParticipantsForRow = async (lotteryId) => {
    if (!lotteryId) return;
    setParticipantsLoading(true);
    setPageError("");
    try {
      const res = await LotteryServices.getParticipants(lotteryId);
      setParticipantsRows(Array.isArray(res.orders) ? res.orders : []);
      setParticipantsSource(res.source || null);
    } catch (err) {
      setPageError(axiosErrorMessage(err));
      setExpandedLotteryId(null);
    } finally {
      setParticipantsLoading(false);
    }
  };

  const toggleRowParticipants = async (lotteryId) => {
    if (expandedLotteryId === lotteryId) {
      setExpandedLotteryId(null);
      return;
    }
    setExpandedLotteryId(lotteryId);
    await loadParticipantsForRow(lotteryId);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!title.trim()) {
      setFormError("נא למלא כותרת");
      return;
    }
    if (!startDate || !endDate) {
      setFormError("נא לבחור תאריך התחלה וסיום");
      return;
    }
    setSubmitting(true);
    try {
      await LotteryServices.create({
        title: title.trim(),
        startDate,
        endDate,
      });
      setTitle("");
      setStartDate("");
      setEndDate("");
      await syncTableFromServer();
      setIsUpdate(true);
      setActionMessage("הגרלה נוצרה");
      setTimeout(() => setActionMessage(""), 4000);
    } catch (err) {
      setFormError(axiosErrorMessage(err) || "שגיאה ביצירה");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDraw = async (id) => {
    if (!id) return;
    const row = rows.find((r) => String(r._id) === String(id));
    const rowDrawn = Boolean(row?.winningOrderId);
    if (rowDrawn) {
      setPageError("הגרלה כבר בוצעה");
      return;
    }
    if (!hasLotteryEndDatePassed(row?.endDate)) {
      setPageError(
        "תאריך סיום ההגרלה עדיין לא הגיע — ניתן לבצע הגרלה רק לאחר סיום טווח התאריכים."
      );
      return;
    }
    if (!window.confirm("לבצע הגרלה? פעולה זו סופית ולא ניתן לחזור אחריה.")) {
      return;
    }
    setPageError("");
    setActionMessage("");
    try {
      await LotteryServices.draw(id);
      await syncTableFromServer();
      setIsUpdate(true);
      setActionMessage("ההגרלה בוצעה בהצלחה");
      setTimeout(() => setActionMessage(""), 5000);
      if (expandedLotteryId && String(expandedLotteryId) === String(id)) {
        await loadParticipantsForRow(id);
      }
    } catch (err) {
      setPageError(axiosErrorMessage(err) || "שגיאה בהגרלה");
    }
  };

  const handleDeleteLottery = async (id, titleLabel) => {
    if (!id) return;
    const label = titleLabel ? ` «${titleLabel}»` : "";
    if (
      !window.confirm(
        `למחוק את ההגרלה${label} לצמיתות?\nפעולה זו אינה הפיכה (כולל רשומת זוכה אם הייתה).`
      )
    ) {
      return;
    }
    setPageError("");
    setActionMessage("");
    try {
      await LotteryServices.delete(id);
      if (expandedLotteryId && String(expandedLotteryId) === String(id)) {
        setExpandedLotteryId(null);
        setParticipantsRows([]);
      }
      await syncTableFromServer();
      setIsUpdate(true);
      setActionMessage("ההגרלה נמחקה");
      setTimeout(() => setActionMessage(""), 4000);
    } catch (err) {
      setPageError(axiosErrorMessage(err) || "שגיאה במחיקה");
    }
  };

  const tableColSpan = 7;

  return (
    <>
      <PageTitle>הגרלות</PageTitle>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800">
          <CardBody>
            <h3 className="text-base font-semibold mb-3 text-gray-800 dark:text-gray-100">
              הגרלה חדשה
            </h3>
            <form
              onSubmit={handleCreate}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end"
            >
              <div className="sm:col-span-2">
                <Label>
                  <span>כותרת</span>
                  <Input
                    className="mt-1"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="למשל הגרלת חג"
                  />
                </Label>
              </div>
              <div>
                <Label>
                  <span>מתאריך</span>
                  <Input
                    className="mt-1"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </Label>
              </div>
              <div>
                <Label>
                  <span>עד תאריך</span>
                  <Input
                    className="mt-1"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </Label>
              </div>
              <div className="sm:col-span-2">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-12 w-full sm:w-auto bg-customGreen-dark"
                >
                  {submitting ? "יוצר..." : "הוספת הגרלה"}
                </Button>
              </div>
            </form>
            {formError && <p className="text-red-500 mt-2 text-sm">{formError}</p>}
          </CardBody>
        </Card>

        <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
          <CardBody>
            <h3 className="text-base font-semibold mb-3 text-gray-800 dark:text-gray-100">
              כללי השתתפות — איך זה עובד?
            </h3>
            <div className="text-sm text-gray-700 dark:text-gray-300 space-y-3">
              <p className="font-medium text-gray-800 dark:text-gray-100">
                מי נכנס להגרלה?
              </p>
              <ol className="list-decimal list-inside space-y-2 mr-1">
                <li>
                  <strong>תאריך:</strong> רק הזמנות שה<strong>זמן יצירתן במערכת</strong> (שדה יצירת
                  ההזמנה) נופל בין תאריך ההתחלה לתאריך הסיום של ההגרלה — כולל יום ההתחלה ויום הסיום.
                </li>
                <li>
                  <strong>סטטוס:</strong> ההזמנה <strong>לא</strong> במצב «ממתין לתשלום» (Pending)
                  ו<strong>לא</strong> בוטלה (Cancel). כל שאר הסטטוסים (למשל «בטיפול», ליקוט,
                  הושלמה) נספרים.
                </li>
              </ol>
              <p className="text-gray-600 dark:text-gray-400">
                <strong>מספר המשתתפים</strong> בעמודה מחושב <strong>אוטומטית</strong> מהמסד בכל טעינת
                רשימה — לפי טווח התאריכים וכללי הסטטוס, בלי צורך בשמירה ידנית. <strong>החץ</strong>{' '}
                פותח את הרשימה המלאה. <strong>«בצע הגרלה»</strong> (בעמודה לפני האחרונה) זמין רק{' '}
                <strong>אחרי</strong> יום תאריך הסיום של הטווח; עד אז הכפתור חסום. בעת הביצוע נשמרים
                במערכת גם רשימת המשתתפים וגם הזוכה לתיעוד.
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 pt-1">
                בחירת זוכה טכנית: <code className="text-xs">crypto.randomInt</code>
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      {actionMessage && (
        <p className="text-green-600 dark:text-green-400 mb-3 text-sm">{actionMessage}</p>
      )}

      {loading ? (
        <TableLoading row={8} col={7} width={120} height={18} />
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <TableContainer className="mb-8">
          {pageError && (
            <p className="text-red-500 text-sm mb-2" role="alert">
              {pageError}
            </p>
          )}
          <Table className="w-full whitespace-nowrap admin-table">
            <TableHeader>
              <tr>
                <TableHeaderCell>כותרת</TableHeaderCell>
                <TableHeaderCell>טווח תאריכים</TableHeaderCell>
                <TableHeaderCell>משתתפים</TableHeaderCell>
                <TableHeaderCell>סטטוס הגרלה</TableHeaderCell>
                <TableHeaderCell>זוכה בהגרלה</TableHeaderCell>
                <TableHeaderCell className="whitespace-nowrap">ביצוע הגרלה</TableHeaderCell>
                <TableHeaderCell className="whitespace-nowrap">מחיקה</TableHeaderCell>
              </tr>
            </TableHeader>
            <tbody>
              {rows.map((row) => (
                <Fragment key={row._id}>
                  <tr className="dark:bg-gray-800">
                    <TableCell>{row.title}</TableCell>
                    <TableCell>
                      {formatDay(row.startDate)} — {formatDay(row.endDate)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => toggleRowParticipants(row._id)}
                        className="inline-flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-100 hover:text-customGreen-dark dark:hover:text-green-400 focus:outline-none rounded px-1 py-0.5"
                        aria-expanded={expandedLotteryId === row._id}
                      >
                        {expandedLotteryId === row._id ? (
                          <FiChevronUp className="w-5 h-5 shrink-0" aria-hidden />
                        ) : (
                          <FiChevronDown className="w-5 h-5 shrink-0" aria-hidden />
                        )}
                        <span>{row.liveEligibleCount ?? row.participantSnapshotCount ?? 0}</span>
                      </button>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {row.winningOrderId ? "בוצעה" : "פתוחה"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {row.winningOrderId?.invoice != null ? (
                        <div className="flex flex-col gap-0.5 items-start">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {participantDisplayName(row.winningOrderId.user_info)}
                            </span>
                            {row.winningOrderId?.refund?.requested && (
                              <FiRefreshCw
                                className={`w-3.5 h-3.5 shrink-0 ${
                                  row.winningOrderId.refund.success
                                    ? "text-green-500"
                                    : "text-red-500"
                                }`}
                                strokeWidth={2.5}
                              />
                            )}
                          </div>
                          <Link
                            className="text-customGreen-dark hover:underline text-sm"
                            to={`/order/${row.winningOrderId._id}`}
                          >
                            חשבונית {row.winningOrderId.invoice}
                          </Link>
                          {row.drawnAt && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              הוגרלה: {formatDate(row.drawnAt)}
                            </span>
                          )}

                          {/* פרטי החזר כספי */}
                          {row.winningOrderId?.refund?.requested && (
                            <div className="mt-2 w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 p-2.5 text-xs flex flex-col gap-1.5">
                              <span className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1">
                                <FiRefreshCw className="w-3 h-3" />
                                החזר כספי
                              </span>
                              <div className="flex flex-col gap-1 pr-1">
                                <div className="flex justify-between gap-2">
                                  <span className="text-gray-500 dark:text-gray-400">סטטוס</span>
                                  <span className={`font-semibold ${row.winningOrderId.refund.success ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
                                    {row.winningOrderId.refund.success ? "✓ הצליח" : "✗ נכשל"}
                                  </span>
                                </div>
                                {row.winningOrderId.refund.refundedAt && (
                                  <div className="flex justify-between gap-2">
                                    <span className="text-gray-500 dark:text-gray-400">תאריך</span>
                                    <span className="text-gray-700 dark:text-gray-300">{formatDate(row.winningOrderId.refund.refundedAt)}</span>
                                  </div>
                                )}
                                {row.winningOrderId.refund.responseCode != null && (
                                  <div className="flex justify-between gap-2">
                                    <span className="text-gray-500 dark:text-gray-400">Response Code</span>
                                    <span className="font-mono text-gray-700 dark:text-gray-300">{row.winningOrderId.refund.responseCode}</span>
                                  </div>
                                )}
                                {row.winningOrderId.refund.errorMessage && (
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-gray-500 dark:text-gray-400">שגיאה</span>
                                    <span className="text-red-500 dark:text-red-400 break-words">{row.winningOrderId.refund.errorMessage}</span>
                                  </div>
                                )}
                                {row.winningOrderId.refund.rawResponse && (
                                  <details className="mt-1">
                                    <summary className="cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 select-none">
                                      תגובת Cardcom המלאה
                                    </summary>
                                    <pre className="mt-1 bg-gray-100 dark:bg-gray-800 rounded p-1.5 overflow-x-auto whitespace-pre-wrap break-all text-gray-700 dark:text-gray-300">
                                      {JSON.stringify(row.winningOrderId.refund.rawResponse, null, 2)}
                                    </pre>
                                  </details>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      {!row.winningOrderId ? (
                        <Button
                          type="button"
                          size="small"
                          disabled={!hasLotteryEndDatePassed(row.endDate)}
                          title={
                            !hasLotteryEndDatePassed(row.endDate)
                              ? "ניתן לבצע הגרלה רק לאחר תאריך הסיום שבטווח"
                              : undefined
                          }
                          className="text-xs bg-purple-600 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => handleDraw(row._id)}
                        >
                          בצע הגרלה
                        </Button>
                      ) : (
                        <span className="text-sm text-gray-500">—</span>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      <button
                        type="button"
                        onClick={() => handleDeleteLottery(row._id, row.title)}
                        className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-red-300 bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 dark:border-red-500/50 shadow-sm hover:bg-red-50 dark:hover:bg-red-950/40 hover:border-red-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-gray-900"
                        title="מחק הגרלה"
                        aria-label={`מחק הגרלה ${row.title || ""}`}
                      >
                        <FiTrash2 className="w-4 h-4" aria-hidden strokeWidth={2} />
                      </button>
                    </TableCell>
                  </tr>
                  {expandedLotteryId === row._id && (
                    <tr className="bg-gray-50 dark:bg-gray-900/50">
                      <TableCell colSpan={tableColSpan} className="p-0">
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                            משתתפים בהגרלה «{row.title}»
                          </p>
                          {participantsLoading ? (
                            <p className="text-sm text-gray-500">טוען רשימה...</p>
                          ) : participantsRows.length === 0 ? (
                            <p className="text-sm text-gray-500">אין משתתפים בטווח זה</p>
                          ) : (
                            <>
                              <div className="rounded-md border border-gray-200 dark:border-gray-700 overflow-x-auto">
                                <table className="w-full text-sm text-right">
                                  <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-800">
                                      <th className="p-2 font-semibold">חשבונית</th>
                                      <th className="p-2 font-semibold">שם</th>
                                      <th className="p-2 font-semibold whitespace-nowrap">
                                        תאריך יצירת הזמנה
                                      </th>
                                      <th className="p-2 font-semibold">סטטוס</th>
                                      <th className="p-2 font-semibold">פעולה</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {participantsRows.map((o) => (
                                      <tr
                                        key={o._id}
                                        className="border-b border-gray-100 dark:border-gray-700"
                                      >
                                        <td className="p-2">{o.invoice ?? "—"}</td>
                                        <td className="p-2">{participantDisplayName(o.user_info)}</td>
                                        <td className="p-2 whitespace-nowrap text-gray-600 dark:text-gray-300">
                                          {formatDate(o.createdAt)}
                                        </td>
                                        <td className="p-2">
                                          {o.status?.heName || o.status?.name || "—"}
                                        </td>
                                        <td className="p-2">
                                          <Link
                                            className="text-customGreen-dark hover:underline"
                                            to={`/order/${o._id}`}
                                          >
                                            פתיחה
                                          </Link>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              {participantsSource === "live" && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                  הרשימה משקפת זכאות עדכנית (טרם בוצעה הגרלה עם נעילת רשימה במסמך).
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </TableCell>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </Table>
        </TableContainer>
      )}
    </>
  );
};

export default Lotteries;
