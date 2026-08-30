// src/pages/OrderPlatforms.jsx
//
// פלטפורמות ההזמנות — מי שולח לנו הזמנה בקישור, ומה חסר כדי שהיא תיקרא לבד.
//
// ── מה הבעיה שהמסך הזה פותר ──
//
// לקוח מזמין דרך פלטפורמה (Zestt וכדומה), והמייל שמגיע אלינו אינו מכיל את
// ההזמנה: יש בו כותרת, פרטי לקוח, וכפתור "לצפייה בהזמנה". השורות נמצאות רק
// מעבר לכפתור. השרת פותח את הכפתור בדפדפן שרץ אצלו וקורא את ההזמנה משם.
//
// אי אפשר לדעת מראש דרך איזו פלטפורמה לקוח יזמין, ולכן אין כאן רשימה שצריך
// למלא: המערכת **רושמת בעצמה** כל שולח חדש שנראה כמו פלטפורמה, והמסך הזה
// הופך את הרישום לפעולה. כל פעולה כאן נעשית פעם אחת — לפלטפורמה או ללקוח —
// ולא פעם אחת להזמנה.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, CardBody, Input } from "@windmill/react-ui";
import { Link } from "react-router-dom";
import {
  FiAlertCircle,
  FiCheck,
  FiExternalLink,
  FiEye,
  FiLock,
  FiRefreshCw,
  FiSlash,
  FiUserPlus,
} from "react-icons/fi";

import { notifyError, notifySuccess } from "@/utils/toast";
import OrderPlatformServices from "@/services/OrderPlatformServices";
import CustomerServices from "@/services/CustomerServices";
import PageTitle from "@/components/Typography/PageTitle";

const STATUS_META = {
  pending: { label: "ממתינה לאישור", type: "warning" },
  approved: { label: "מאושרת", type: "success" },
  blocked: { label: "חסומה", type: "danger" },
};

const TABS = [
  { key: "pending", label: "ממתינות לאישור" },
  { key: "approved", label: "מאושרות" },
  { key: "all", label: "הכול" },
];

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString("he-IL", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

/** מספר עם תווית — שורת מונים קריאה בלי טבלה. */
const Stat = ({ label, value, tone = "text-gray-700" }) => (
  <div className="text-center px-3">
    <div className={`text-lg font-semibold ${tone}`}>{value ?? 0}</div>
    <div className="text-xs text-gray-500">{label}</div>
  </div>
);

/**
 * חלונית התחברות.
 *
 * ההתחברות היא **לפלטפורמה** ולא ללקוח: אחריה כל ההזמנות מכל הלקוחות שמזמינים
 * דרכה נקראות אוטומטית. זה ההסבר שמופיע בחלונית, כי בלעדיו נראה שצריך לחזור
 * לכאן על כל הזמנה.
 */
const LoginPanel = ({ platform, onDone }) => {
  // ברירת מחדל לכתובת ההתחברות: שורש הדומיין שהקישורים מובילים אליו. כמעט
  // בכל פלטפורמה הוא מפנה בעצמו למסך ההתחברות, ולכן זה חוסך למי שמתחבר לחפש
  // את הכתובת המדויקת — והוא תמיד יכול לתקן.
  const [url, setUrl] = useState(
    platform.login?.url ||
      (platform.linkHosts?.[0] ? `https://${platform.linkHosts[0]}/` : "")
  );
  const [username, setUsername] = useState(platform.login?.username || "");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasted, setPasted] = useState("");

  const submit = async () => {
    setBusy(true);
    try {
      const res = await OrderPlatformServices.loginPlatform(platform._id, {
        url,
        username,
        password,
      });
      notifySuccess(res.message);
      onDone();
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  const submitPasted = async () => {
    setBusy(true);
    try {
      // מקבל גם מערך קוקיז וגם אובייקט {cookies, localStorage} — מי שמעתיק
      // מכלי הפיתוח לא אמור לנחש באיזה מהם אנחנו רוצים.
      const parsed = JSON.parse(pasted);
      const body = Array.isArray(parsed) ? { cookies: parsed } : parsed;
      const res = await OrderPlatformServices.savePlatformSession(platform._id, body);
      notifySuccess(res.message);
      onDone();
    } catch (err) {
      notifyError(
        err?.response?.data?.message ||
          (err instanceof SyntaxError ? "הטקסט שהודבק אינו JSON תקין" : err.message)
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-900 dark:border-gray-700">
      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
        ההתחברות היא <span className="font-semibold">לפלטפורמה, פעם אחת</span> — לא
        ללקוח ולא להזמנה. אחריה כל ההזמנות שיגיעו דרכה ייקראו אוטומטית.
      </p>

      {!pasteMode ? (
        <div className="grid gap-2 md:grid-cols-3">
          <Input
            placeholder="כתובת דף ההתחברות"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            dir="ltr"
          />
          <Input
            placeholder="שם משתמש / מייל"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            dir="ltr"
          />
          <Input
            placeholder={platform.hasCredentials ? "סיסמה (שמורה — למלא רק לשינוי)" : "סיסמה"}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            dir="ltr"
          />
        </div>
      ) : (
        <textarea
          className="w-full h-28 text-xs p-2 border rounded font-mono"
          dir="ltr"
          placeholder='{"cookies":[...],"localStorage":{...}}'
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
        />
      )}

      <div className="flex flex-wrap items-center gap-2 mt-2">
        <Button
          size="small"
          disabled={busy}
          onClick={pasteMode ? submitPasted : submit}
          className="flex items-center gap-1"
        >
          <FiLock className="w-3.5 h-3.5" />
          {busy ? "מתחבר..." : pasteMode ? "שמור סשן" : "התחבר ושמור סשן"}
        </Button>
        <button
          onClick={() => setPasteMode(!pasteMode)}
          className="text-xs text-blue-600 hover:underline"
        >
          {pasteMode
            ? "חזרה להתחברות עם שם משתמש וסיסמה"
            : "ההתחברות דורשת אימות דו-שלבי / CAPTCHA — הדבקת סשן מהדפדפן"}
        </button>
      </div>

      {platform.login?.lastLoginError && (
        <p className="mt-2 text-xs text-red-600">
          הניסיון האחרון: {platform.login.lastLoginError}
        </p>
      )}
    </div>
  );
};

/**
 * מיפוי לקוחות: המזהה של המסעדה אצלם ← כרטיס הלקוח אצלנו.
 *
 * במייל של פלטפורמה השולח הוא no-reply@ שלה, ואותה כתובת שולחת את ההזמנות
 * של כל המסעדות — ולכן זיהוי הלקוח לפי כתובת השולח לא רק נכשל אלא היה מאחד
 * את כולן לכרטיס אחד. המיפוי הזה נעשה פעם אחת לכל מסעדה.
 */
const CustomerMapPanel = ({ platform, onDone }) => {
  const [keys, setKeys] = useState("");
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [busy, setBusy] = useState(false);

  // ── רשימת הלקוחות נטענת פעם אחת והסינון מקומי ──
  //
  // ‏GET /customer מתעלם מ-searchText ומחזיר את כל הלקוחות (ראה
  // customerController.getAllCustomers), ולכן "חיפוש בשרת" היה מחזיר תמיד את
  // אותם עשרה הראשונים לפי א-ב — תיבת חיפוש שלא מחפשת. שאר המסכים בפרויקט
  // (‏Quotes, ManualDeliveryNoteForm) טוענים את הרשימה פעם אחת ומסננים
  // מקומית, וזה מה שנעשה כאן.
  useEffect(() => {
    if (customers.length) return;
    setLoadingCustomers(true);
    CustomerServices.getAllCustomers({ searchText: "" })
      .then((res) => setCustomers(Array.isArray(res) ? res : res?.customers || []))
      .catch((err) => notifyError(err?.response?.data?.message || err.message))
      .finally(() => setLoadingCustomers(false));
  }, [customers.length]);

  // תקרה של 10 תוצאות: הרשימה נועדה לזהות לקוח, לא לדפדף בכל הלקוחות
  const results = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (term.length < 2) return [];
    return customers
      .filter((customer) =>
        [customer.name, customer.lastName, customer.email, customer.phone]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(term))
      )
      .slice(0, 10);
  }, [customers, search]);

  const attach = async (customer) => {
    const parsedKeys = keys
      .split(/[,\n]/)
      .map((key) => key.trim())
      .filter(Boolean);

    if (!parsedKeys.length) {
      notifyError("יש למלא את המזהה של הלקוח בפלטפורמה — מספר לקוח או שם העסק");
      return;
    }

    setBusy(true);
    try {
      const res = await OrderPlatformServices.mapCustomer(platform._id, {
        customerId: customer._id,
        keys: parsedKeys,
        externalName: parsedKeys[0],
      });
      notifySuccess(res.message);
      setKeys("");
      setSearch("");
      onDone();
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  const detach = async (customerId) => {
    setBusy(true);
    try {
      const res = await OrderPlatformServices.unmapCustomer(platform._id, customerId);
      notifySuccess(res.message);
      onDone();
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-900 dark:border-gray-700">
      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
        הלקוחות שמזמינים דרך הפלטפורמה מזוהים לפי המזהה שלהם{" "}
        <span className="font-semibold">אצלה</span> (מספר לקוח או שם העסק כפי
        שמופיע במייל). מיפוי אחד לכל לקוח, ומשם אוטומטי.
      </p>

      {platform.customerMap?.length > 0 && (
        <div className="mb-3 space-y-1">
          {platform.customerMap.map((entry) => (
            <div
              key={String(entry.customer?._id || entry.customer)}
              className="flex items-center justify-between text-xs bg-white dark:bg-gray-800 rounded px-2 py-1.5"
            >
              <div>
                <span className="font-mono text-gray-500">{entry.keys?.join(" / ")}</span>
                <span className="mx-2 text-gray-500">←</span>
                <span className="font-medium">
                  {entry.customer?.name
                    ? `${entry.customer.name} ${entry.customer.lastName || ""}`.trim()
                    : String(entry.customer)}
                </span>
                {entry.orderCount > 0 && (
                  <span className="text-gray-500"> · {entry.orderCount} הזמנות</span>
                )}
              </div>
              <button
                onClick={() => detach(entry.customer?._id || entry.customer)}
                disabled={busy}
                className="text-gray-500 hover:text-red-600"
                title="בטל מיפוי"
              >
                <FiSlash className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-2 md:grid-cols-2">
        <Input
          placeholder='המזהה אצלם — למשל 77521-942 או "ROOMS בסר פתח תקווה"'
          value={keys}
          onChange={(e) => setKeys(e.target.value)}
        />
        <Input
          placeholder={
            loadingCustomers ? "טוען לקוחות..." : "חיפוש לקוח אצלנו (שם, מייל או טלפון)"
          }
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={loadingCustomers}
        />
      </div>

      {search.trim().length >= 2 && results.length === 0 && !loadingCustomers && (
        <p className="mt-2 text-xs text-gray-500">אין לקוח שמתאים ל"{search.trim()}"</p>
      )}

      {results.length > 0 && (
        <div className="mt-2 space-y-1">
          {results.map((customer) => (
            <button
              key={customer._id}
              onClick={() => attach(customer)}
              disabled={busy}
              className="w-full text-right text-xs bg-white dark:bg-gray-800 hover:bg-green-50 rounded px-2 py-1.5 flex items-center justify-between disabled:opacity-40"
            >
              <span>
                {`${customer.name || ""} ${customer.lastName || ""}`.trim()}
                <span className="text-gray-500"> · {customer.email || customer.phone || ""}</span>
              </span>
              <FiUserPlus className="w-3.5 h-3.5 text-green-600" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/** תוצאת בדיקת קישור — הטקסט שנקרא מהדף, כדי לראות שזו ההזמנה הנכונה. */
const TestResult = ({ result }) => (
  <div className="mt-3 p-3 border rounded-lg text-xs bg-gray-50 dark:bg-gray-900 dark:border-gray-700">
    <div className="flex flex-wrap items-center gap-3 mb-2">
      <span className={result.ok ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
        {result.ok ? "הדף נקרא" : "הדף לא נקרא"}
      </span>
      <span className="text-gray-500">{result.chars} תווים</span>
      {result.title && <span className="text-gray-500">כותרת: {result.title}</span>}
    </div>
    {!result.ok && <p className="text-red-600 mb-2">{result.error}</p>}
    {result.sessionSkipped && (
      <p className="text-orange-600 mb-2">
        הקישור אינו בדומיין שבו התחברנו ({result.sessionOrigin}), ולכן נפתח{" "}
        <span className="font-semibold">בלי הסשן</span>. זו הגנה: קישור שהגיע במייל
        אינו מקבל את המפתחות שלנו רק כי המייל נראה כאילו הגיע מהפלטפורמה.
      </p>
    )}
    {result.textPreview && (
      <pre className="whitespace-pre-wrap max-h-48 overflow-auto bg-white dark:bg-gray-800 p-2 rounded">
        {result.textPreview}
      </pre>
    )}
    {result.screenshot && (
      <img
        src={result.screenshot}
        alt="צילום הדף שנפתח"
        className="mt-2 max-h-64 rounded border"
      />
    )}
  </div>
);

const OrderPlatforms = () => {
  const [status, setStatus] = useState("pending");
  const [data, setData] = useState({ platforms: [], counts: {} });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [openPanel, setOpenPanel] = useState({});   // {[id]: "login" | "map"}
  const [testResults, setTestResults] = useState({});

  const fetchPlatforms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await OrderPlatformServices.getAllPlatforms({ status });
      setData(res);
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchPlatforms();
  }, [fetchPlatforms]);

  const approve = async (platform) => {
    setBusyId(platform._id);
    try {
      const res = await OrderPlatformServices.approvePlatform(platform._id);
      notifySuccess(res.message);
      await fetchPlatforms();
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setBusyId(null);
    }
  };

  const setPlatformStatus = async (platform, newStatus) => {
    setBusyId(platform._id);
    try {
      await OrderPlatformServices.updatePlatform(platform._id, { status: newStatus });
      notifySuccess(newStatus === "blocked" ? "הפלטפורמה נחסמה" : "עודכן");
      await fetchPlatforms();
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setBusyId(null);
    }
  };

  const testLink = async (platform) => {
    setBusyId(platform._id);
    try {
      const res = await OrderPlatformServices.testPlatformLink(platform._id);
      setTestResults((prev) => ({ ...prev, [platform._id]: res }));
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setBusyId(null);
    }
  };

  const togglePanel = (id, panel) =>
    setOpenPanel((prev) => ({ ...prev, [id]: prev[id] === panel ? null : panel }));

  const platforms = data.platforms || [];
  const pendingCount = data.counts?.pending || 0;
  const needsLoginCount = data.counts?.needsLogin || 0;

  const tabs = useMemo(
    () =>
      TABS.map((tab) => ({
        ...tab,
        count: tab.key === "all" ? undefined : data.counts?.[tab.key],
      })),
    [data.counts]
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 my-6">
        <PageTitle style={{ margin: 0 }}>פלטפורמות הזמנות</PageTitle>
        <Button
          onClick={fetchPlatforms}
          layout="outline"
          size="small"
          className="flex items-center gap-2"
        >
          <FiRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          רענן
        </Button>
      </div>

      <Card className="min-w-0 shadow-xs bg-white dark:bg-gray-800 mb-5">
        <CardBody>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            כשלקוח מזמין דרך פלטפורמה, המייל שמגיע אלינו אינו מכיל את ההזמנה — רק
            כפתור "לצפייה בהזמנה". השרת פותח את הכפתור{" "}
            <span className="font-semibold">בדפדפן שרץ אצלו</span> וקורא את ההזמנה
            משם, ומשם היא ממשיכה כמו כל הזמנה אחרת: התאמה לקטלוג, מלאי ותעודת משלוח.
          </p>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            אין צורך לדעת מראש מי שולח כך. כל שולח חדש שנראה כמו פלטפורמת הזמנות
            נרשם כאן לבד, ומחכה ל<span className="font-semibold">אישור אחד</span>.
            {pendingCount > 0 && (
              <span className="font-semibold text-orange-600">
                {" "}
                {pendingCount} פלטפורמות ממתינות לאישור.
              </span>
            )}
            {needsLoginCount > 0 && (
              <span className="font-semibold text-red-600">
                {" "}
                {needsLoginCount} דורשות התחברות.
              </span>
            )}
          </p>
          <p className="mt-2 text-xs text-gray-500">
            ההודעות עצמן נמצאות במסך{" "}
            <Link to="/incoming-orders" className="text-blue-600 hover:underline">
              קליטת הזמנות
            </Link>
            , בלשונית "פלטפורמות חדשות".
          </p>
        </CardBody>
      </Card>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatus(tab.key)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              status === tab.key
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200"
            }`}
          >
            {tab.label}
            {tab.count ? ` (${tab.count})` : ""}
          </button>
        ))}
      </div>

      {loading && platforms.length === 0 ? (
        <Card className="bg-white dark:bg-gray-800">
          <CardBody>
            <p className="text-sm text-gray-500">טוען...</p>
          </CardBody>
        </Card>
      ) : platforms.length === 0 ? (
        <Card className="bg-white dark:bg-gray-800">
          <CardBody>
            <p className="text-sm text-gray-500">
              אין פלטפורמות {status === "pending" ? "שממתינות לאישור" : "להצגה"}. הן
              נרשמות כאן לבד ברגע שמייל כזה מגיע — אין מה למלא מראש.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4 mb-8">
          {platforms.map((platform) => {
            const meta = STATUS_META[platform.status] || {
              label: platform.status,
              type: "neutral",
            };
            const panel = openPanel[platform._id];

            return (
              <Card key={platform._id} className="bg-white dark:bg-gray-800 shadow-xs">
                <CardBody>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                          {platform.name || platform.key}
                        </h3>
                        <Badge type={meta.type}>{meta.label}</Badge>
                        {platform.requiresLogin && (
                          <Badge type="danger">דורשת התחברות</Badge>
                        )}
                        {platform.hasSession && !platform.requiresLogin && (
                          <Badge type="success" title={`תקף לקישורים ב-${platform.sessionOrigin || "?"}`}>
                            סשן שמור
                          </Badge>
                        )}
                      </div>
                      <div dir="ltr" className="text-xs text-gray-500 mt-1">
                        {platform.key}
                        {platform.linkHosts?.length ? ` → ${platform.linkHosts.join(", ")}` : ""}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        נראתה לאחרונה: {formatDate(platform.stats?.lastSeenAt)}
                        {platform.lastSubjectSample && (
                          <span> · "{platform.lastSubjectSample}"</span>
                        )}
                      </div>
                      {platform.pendingMessages > 0 && (
                        <div className="text-xs text-orange-600 font-semibold mt-1 flex items-center gap-1">
                          <FiAlertCircle className="w-3.5 h-3.5" />
                          {platform.pendingMessages} הודעות ממתינות לאישור הפלטפורמה
                        </div>
                      )}
                      {platform.unmappedMessages > 0 && (
                        <div className="text-xs text-orange-600 font-semibold mt-1 flex items-center gap-1">
                          <FiUserPlus className="w-3.5 h-3.5" />
                          {platform.unmappedMessages} הזמנות נקראו אבל הלקוח שלהן אינו ממופה
                        </div>
                      )}
                      {platform.stats?.lastError && (
                        <div className="text-xs text-red-600 mt-1">
                          כשל אחרון: {platform.stats.lastError}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center">
                      <Stat label="מיילים" value={platform.stats?.seen} />
                      <Stat
                        label="דפים שנקראו"
                        value={platform.stats?.followed}
                        tone="text-blue-600"
                      />
                      <Stat
                        label="הזמנות"
                        value={platform.stats?.ordersRead}
                        tone="text-green-600"
                      />
                      <Stat label="כשלים" value={platform.stats?.failed} tone="text-red-500" />
                    </div>
                  </div>

                  {platform.lastLinkSample && (
                    <div className="mt-2 text-xs">
                      <a
                        href={platform.lastLinkSample}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline inline-flex items-center gap-1"
                        dir="ltr"
                      >
                        <FiExternalLink className="w-3.5 h-3.5" />
                        {platform.lastLinkSample.slice(0, 90)}
                      </a>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {platform.status !== "approved" && (
                      <Button
                        size="small"
                        disabled={busyId === platform._id}
                        onClick={() => approve(platform)}
                        className="flex items-center gap-1"
                      >
                        <FiCheck className="w-3.5 h-3.5" />
                        {busyId === platform._id ? "מאשר..." : "אשר וקרא את מה שהמתין"}
                      </Button>
                    )}
                    <Button
                      size="small"
                      layout="outline"
                      onClick={() => togglePanel(platform._id, "login")}
                      className="flex items-center gap-1"
                    >
                      <FiLock className="w-3.5 h-3.5" />
                      {platform.hasSession ? "החלף סשן" : "התחברות"}
                    </Button>
                    <Button
                      size="small"
                      layout="outline"
                      onClick={() => togglePanel(platform._id, "map")}
                      className="flex items-center gap-1"
                    >
                      <FiUserPlus className="w-3.5 h-3.5" />
                      מיפוי לקוחות
                      {platform.customerMap?.length ? ` (${platform.customerMap.length})` : ""}
                    </Button>
                    <Button
                      size="small"
                      layout="outline"
                      disabled={busyId === platform._id || !platform.lastLinkSample}
                      onClick={() => testLink(platform)}
                      className="flex items-center gap-1"
                      title="פותח את הקישור האחרון ומראה מה נקרא — בלי ליצור הזמנה"
                    >
                      <FiEye className="w-3.5 h-3.5" />
                      בדוק קריאה
                    </Button>
                    {platform.status !== "blocked" ? (
                      <button
                        onClick={() => setPlatformStatus(platform, "blocked")}
                        disabled={busyId === platform._id}
                        className="text-xs text-gray-500 hover:text-red-600 px-2"
                      >
                        חסום
                      </button>
                    ) : (
                      <button
                        onClick={() => setPlatformStatus(platform, "pending")}
                        disabled={busyId === platform._id}
                        className="text-xs text-gray-500 hover:text-green-600 px-2"
                      >
                        בטל חסימה
                      </button>
                    )}
                  </div>

                  {panel === "login" && (
                    <LoginPanel
                      platform={platform}
                      onDone={() => {
                        togglePanel(platform._id, "login");
                        fetchPlatforms();
                      }}
                    />
                  )}
                  {panel === "map" && (
                    <CustomerMapPanel platform={platform} onDone={fetchPlatforms} />
                  )}
                  {testResults[platform._id] && <TestResult result={testResults[platform._id]} />}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
};

export default OrderPlatforms;
