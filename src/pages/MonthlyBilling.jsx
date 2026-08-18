// src/pages/MonthlyBilling.jsx
//
// מסך סגירת חודש. הזרימה מכוונת: קודם תצוגה מקדימה, ורק אחריה אפשר להפיק.
// חשבונית מס אינה ניתנת למחיקה, ולכן כפתור ההפקה נעול עד שנטענה תצוגה
// מקדימה ונדרש אישור מפורש בתיבת סימון.
//
// שני מצבים במסך:
//   כל הלקוחות — סגירת החודש הרגילה. אפשרית רק על חודש שהסתיים.
//   לקוח בודד  — הפקה נקודתית, גם באמצע החודש, ועם בחירה אילו תעודות
//                ייכנסו לחשבונית. מה שלא נבחר נשאר פתוח ויחויב בסגירת החודש.

import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  Label,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHeader,
  TableRow,
} from "@windmill/react-ui";
import { FiAlertTriangle, FiCheckCircle, FiExternalLink, FiEye } from "react-icons/fi";
import { notifyError, notifySuccess } from "@/utils/toast";

import PageTitle from "@/components/Typography/PageTitle";
import DemoModeBanner from "@/components/common/DemoModeBanner";
import BillingServices from "@/services/BillingServices";

const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

/**
 * החודשים לבחירה: החודש הנוכחי ו-12 שקדמו לו.
 *
 * החודש הנוכחי נכלל כי הפקה ללקוח בודד באמצעו היא בדיוק מה שהמסך נועד
 * לאפשר. סגירה גורפת שלו חסומה בשרת, והמסך מסביר זאת במקום.
 */
const billingMonths = () => {
  const now = new Date();
  const out = [];
  for (let i = 0; i <= 12; i++) {
    out.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  }
  return out;
};

const shekel = (n) =>
  Number(n || 0).toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// חייב להתאים ל-MAX_ITEMS_PER_REQUEST בשרת. רשימה ארוכה מזה נדחית ב-400.
const MAX_SELECTABLE_NOTES = 500;

const shortDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "2-digit" })
    : "—";

const MonthlyBilling = () => {
  const months = useMemo(billingMonths, []);
  const currentMonth = months[0];

  const [month, setMonth] = useState(months[1]); // ברירת מחדל: החודש שהסתיים
  const [customer, setCustomer] = useState(""); // "" = כל הלקוחות
  const [openCustomers, setOpenCustomers] = useState([]);
  const [preview, setPreview] = useState(null);
  const [selected, setSelected] = useState([]); // מזהי התעודות שסומנו
  // מצב ההתחלה מגיע מהשרת (BILLING_EMAIL_DOCUMENTS) ואינו מנוחש: תיבה
  // שמתחילה כבויה בזמן שהמדיניות שולחת הייתה מפסיקה את השליחה בשקט, ותיבה
  // שמתחילה דלוקה בזמן שהמדיניות כבויה הייתה מדליקה שליחה שכיבו בכוונה.
  const [emailDocument, setEmailDocument] = useState(true);
  const [result, setResult] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  // כשהשרת מחובר לחשבון דמו הסגירה חסומה בצד השרת. בלי הבדיקה הזאת
  // הכפתור נראה זמין והלחיצה מחזירה שגיאה שנראית כמו תקלה
  const [demoMode, setDemoMode] = useState(false);

  const isCurrentMonth = month === currentMonth;
  const singleCustomer = Boolean(customer);

  // סגירה גורפת של חודש שעדיין רץ חסומה בשרת. עדיף להסביר זאת לפני
  // הלחיצה מאשר להחזיר שגיאה אחרי שהתצוגה המקדימה כבר נטענה.
  const blockedBulkClose = isCurrentMonth && !singleCustomer;

  useEffect(() => {
    // גם מסלול הכשלון נושא את שני הערכים — מסך שלא הצליח להתחבר עדיין
    // חייב להציג את המצב הנכון ולא ברירת מחדל שהומצאה בצד הלקוח
    const apply = (s) => {
      setDemoMode(s?.demo === true);
      if (typeof s?.emailDocuments === "boolean") setEmailDocument(s.emailDocuments);
    };

    // getIcountStatus מתחבר מחדש ל-iCount; כאן נדרשים רק המצב ומדיניות
    // השליחה, ושניהם מגיעים מהסביבה
    BillingServices.getIcountMode()
      .then(apply)
      .catch((err) => apply(err?.response?.data));
  }, []);

  const resetPreview = () => {
    setPreview(null);
    setSelected([]);
    setResult(null);
    setConfirmed(false);
  };

  // הלקוחות שיש להם תעודות פתוחות בחודש הנבחר. נטענים עם המסך ובכל
  // החלפת חודש — הבורר צריך להציג רק את מי שבאמת אפשר לחייב.
  const loadOpenCustomers = (targetMonth) =>
    BillingServices.getOpenCustomers({ month: targetMonth })
      .then((res) => res?.customers || [])
      .catch((err) => {
        notifyError(err?.response?.data?.message || err.message);
        return [];
      });

  useEffect(() => {
    let cancelled = false;

    loadOpenCustomers(month).then((list) => {
      if (cancelled) return;
      setOpenCustomers(list);
      // לקוח שנבחר ואין לו תעודות פתוחות בחודש הזה — הבחירה מתאפסת,
      // אחרת הבורר מציג שם שאינו ברשימה והתצוגה המקדימה תחזור ריקה
      setCustomer((prev) => (prev && !list.some((c) => c.id === prev) ? "" : prev));
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const loadPreview = async () => {
    setLoading(true);
    setResult(null);
    setConfirmed(false);
    try {
      const res = await BillingServices.previewMonth({ month, customer });
      setPreview(res);
      // ברירת המחדל היא הכל מסומן. הפקה חלקית היא החריג, ולא מה שקורה
      // כשלוחצים בלי לשים לב
      setSelected((res?.results || []).flatMap((r) => (r.notes || []).map((n) => n.id)));
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
      setPreview(null);
      setSelected([]);
    } finally {
      setLoading(false);
    }
  };

  // התעודות של הלקוח הבודד. במצב "כל הלקוחות" אין בחירה נקודתית — סימון
  // תעודות בודדות מתוך עשרות לקוחות אינו פעולה שמישהו מתכוון אליה.
  const customerResult = singleCustomer ? preview?.results?.[0] : null;
  const notes = customerResult?.notes || [];

  const toggleNote = (id) => {
    setConfirmed(false);
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleAll = () => {
    setConfirmed(false);
    setSelected((prev) =>
      notes.every((n) => prev.includes(n.id)) ? [] : notes.map((n) => n.id)
    );
  };

  const selectedNotes = notes.filter((n) => selected.includes(n.id));
  const isPartial =
    singleCustomer && selectedNotes.length > 0 && selectedNotes.length < notes.length;

  // הסכומים הם נטו — המע"מ מתווסף ב-iCount, ולכן מוצג גם האומדן ברוטו
  // כדי שהמספר על המסך יהיה מה שהלקוח יראה על החשבונית.
  //
  // אצל לקוח בודד הסיכום מחושב מהתעודות שסומנו ולא מהתצוגה המקדימה
  // המלאה, אחרת המספר על המסך אינו מה שיופק בפועל.
  const summary = useMemo(() => {
    if (!preview) return null;

    if (!singleCustomer) {
      return {
        customers: preview.customersProcessed,
        invoices: preview.invoicesCreated,
        netTotal: (preview.results || []).reduce(
          (sum, r) => sum + r.invoices.reduce((s, i) => s + i.netTotal, 0),
          0
        ),
      };
    }

    const netTotal = selectedNotes.reduce((s, n) => s + n.netTotal, 0);
    // לקוח עם פיצול לפי קטגוריה מקבל חשבונית לכל קטגוריה שמופיעה בתעודות
    // שנבחרו, ולכן המספר משתנה עם הבחירה
    const invoices = customerResult?.splitByCategory
      ? new Set(selectedNotes.flatMap((n) => n.categories)).size
      : selectedNotes.length
        ? 1
        : 0;

    return { customers: selectedNotes.length ? 1 : 0, invoices, netTotal };
  }, [preview, singleCustomer, selectedNotes, customerResult]);

  const doClose = async () => {
    // הגנה אחרונה. הכפתור אינו מוצג במצב הזה, אבל רשימה ריקה שתגיע לשרת
    // הייתה נקראת כ"אין בחירה" — כלומר חיוב של כל התעודות הפתוחות.
    if (singleCustomer && !selectedNotes.length) {
      notifyError("לא נבחרה אף תעודה להפקה");
      return;
    }

    // מעל תקרת השרת: בחירה חלקית נחסמת, כי שליחה בלי הרשימה הייתה מחייבת
    // גם את מה שלא נבחר. בחירה מלאה פשוט נשלחת בלי הרשימה — זו בדיוק
    // התנהגות סגירת החודש הרגילה, ואין מה לקבע.
    const oversized = singleCustomer && selectedNotes.length > MAX_SELECTABLE_NOTES;
    if (oversized && isPartial) {
      notifyError(
        `אפשר לבחור עד ${MAX_SELECTABLE_NOTES} תעודות בהפקה אחת. יש לצמצם את הבחירה.`
      );
      return;
    }

    setClosing(true);
    try {
      const res = await BillingServices.closeMonth({
        month,
        customer: customer || undefined,
        // אצל לקוח בודד נשלחת תמיד רשימת התעודות המדויקת שהוצגה ואושרה,
        // גם כשסומן הכל: בין התצוגה המקדימה ללחיצה יכולה להיכנס תעודה
        // חדשה (הזמנה שנקלטה, שקילה שהוקלדה), והיא הייתה נכנסת לחשבונית
        // שאיש לא ראה. הרשימה מקבעת את מה שאושר.
        // נגזר מ-selectedNotes ולא מ-selected: רק מזהים שקיימים בתצוגה
        // המקדימה שהוצגה על המסך נשלחים לחיוב
        notes: singleCustomer && !oversized ? selectedNotes.map((n) => n.id) : undefined,
        emailDocument,
      });
      setResult(res);
      setPreview(null);
      setSelected([]);
      setConfirmed(false);
      notifySuccess(res.message);
      // תעודות שחויבו ירדו מהרשימה — הבורר חייב לשקף זאת
      loadOpenCustomers(month).then(setOpenCustomers);
    } catch (err) {
      notifyError(err?.response?.data?.message || err.message);
    } finally {
      setClosing(false);
    }
  };

  return (
    <>
      <PageTitle>סגירת חודש והפקת חשבוניות</PageTitle>

      <DemoModeBanner>
        סגירת החודש תרוץ במלואה ותפיק חשבוניות לחשבון הדמו, בלי לשלוח אותן
        לאף לקוח. החיוב נרשם בכיס נפרד — התעודות עדיין ממתינות לחיוב האמיתי,
        והסגירה האוטומטית של סוף החודש מושבתת כל עוד המצב הזה פעיל.
      </DemoModeBanner>

      <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
        <CardBody>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label>
                <span>חודש לחיוב</span>
                <Select
                  className="mt-1"
                  value={month}
                  onChange={(e) => {
                    setMonth(e.target.value);
                    resetPreview();
                  }}
                >
                  {months.map((m) => (
                    <option key={m} value={m}>
                      {m}
                      {m === currentMonth ? " — החודש הנוכחי" : ""}
                    </option>
                  ))}
                </Select>
              </Label>
            </div>

            <div className="flex-1 min-w-64">
              <Label>
                <span>לקוח</span>
                <Select
                  className="mt-1"
                  value={customer}
                  onChange={(e) => {
                    setCustomer(e.target.value);
                    resetPreview();
                  }}
                >
                  <option value="">כל הלקוחות ({openCustomers.length})</option>
                  {openCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.customerNumber ? `${c.customerNumber} — ` : ""}
                      {c.name} ({c.noteCount} תעודות · {shekel(c.netTotal)} ₪)
                    </option>
                  ))}
                </Select>
              </Label>
            </div>

            <Button layout="outline" onClick={loadPreview} disabled={loading}>
              <FiEye className="ml-2" />
              {loading ? "טוען..." : "תצוגה מקדימה"}
            </Button>
          </div>

          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            סגירת חודש אוספת את כל תעודות המשלוח הפתוחות של אותו חודש ומפיקה
            חשבונית מס אחת לכל לקוח. לקוח שמוגדר לו פיצול לפי קטגוריה יקבל
            חשבונית נפרדת לכל קטגוריה. בחירת לקוח מסוים מאפשרת להפיק לו
            חשבונית גם באמצע החודש, ולבחור אילו תעודות ייכנסו אליה.
          </p>

          {blockedBulkClose && (
            <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
              חודש {month} עדיין רץ. תצוגה מקדימה זמינה, אבל סגירה לכל הלקוחות
              תיפתח רק בסופו — ובלילה האחרון של החודש היא מתבצעת ממילא
              אוטומטית. להפקה עכשיו יש לבחור לקוח מסוים למעלה.
            </p>
          )}
        </CardBody>
      </Card>

      {preview && summary && (
        <>
          <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
            <CardBody>
              <div className="flex flex-wrap gap-8">
                <div>
                  <p className="text-xs text-gray-500">
                    {singleCustomer ? "תעודות שנבחרו" : "לקוחות לחיוב"}
                  </p>
                  <p className="text-2xl font-semibold">
                    {singleCustomer
                      ? `${selectedNotes.length} / ${notes.length}`
                      : summary.customers}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">חשבוניות שייווצרו</p>
                  <p className="text-2xl font-semibold">{summary.invoices}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">סה"כ לפני מע"מ</p>
                  <p className="text-2xl font-semibold">{shekel(summary.netTotal)} ₪</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">אומדן כולל מע"מ</p>
                  <p className="text-2xl font-semibold text-gray-500">
                    ~{shekel(summary.netTotal * 1.18)} ₪
                  </p>
                </div>
              </div>

              {preview.failures?.length > 0 && (
                <div className="mt-4 p-3 rounded bg-red-50 dark:bg-red-900/20 text-sm">
                  <p className="font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
                    <FiAlertTriangle /> {preview.failures.length} לקוחות עם בעיה
                  </p>
                  <ul className="mt-2 list-disc pr-5 text-red-700 dark:text-red-400">
                    {preview.failures.map((f, i) => (
                      <li key={i}>
                        {f.customerName || f.customerId}: {f.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardBody>
          </Card>

          {/* לקוח בודד — טבלת התעודות עצמן, עם בחירה */}
          {singleCustomer && notes.length > 0 && (
            <TableContainer className="mb-5">
              <Table>
                <TableHeader>
                  <tr>
                    <TableCell>
                      <input
                        type="checkbox"
                        className="w-4 h-4"
                        checked={selectedNotes.length === notes.length}
                        onChange={toggleAll}
                        aria-label="בחר הכל"
                      />
                    </TableCell>
                    <TableCell>תעודה</TableCell>
                    <TableCell>סוג</TableCell>
                    <TableCell>הזמנה</TableCell>
                    <TableCell>תאריך</TableCell>
                    <TableCell>חודש חיוב</TableCell>
                    <TableCell className="text-center">שורות</TableCell>
                    <TableCell className="text-left">סכום לפני מע"מ</TableCell>
                  </tr>
                </TableHeader>
                <TableBody>
                  {notes.map((n) => (
                    <TableRow key={n.id} className={selected.includes(n.id) ? "" : "opacity-50"}>
                      <TableCell>
                        <input
                          type="checkbox"
                          className="w-4 h-4"
                          checked={selected.includes(n.id)}
                          onChange={() => toggleNote(n.id)}
                          aria-label={`תעודה ${n.number}`}
                        />
                      </TableCell>
                      <TableCell className="font-mono">{n.number}</TableCell>
                      <TableCell>{n.kind === "manual" ? "ידנית" : "אוטומטית"}</TableCell>
                      <TableCell>{n.orderNumber || "—"}</TableCell>
                      <TableCell>{shortDate(n.issuedAt)}</TableCell>
                      <TableCell>{n.billingMonth || "—"}</TableCell>
                      <TableCell className="text-center">{n.itemCount}</TableCell>
                      <TableCell className="text-left">{shekel(n.netTotal)} ₪</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* כל הלקוחות — הפירוט לפי חשבונית, בלי בחירה נקודתית */}
          {!singleCustomer && preview.invoicesCreated > 0 && (
            <TableContainer className="mb-5">
              <Table>
                <TableHeader>
                  <tr>
                    <TableCell>לקוח</TableCell>
                    <TableCell>קטגוריה</TableCell>
                    <TableCell className="text-center">תעודות</TableCell>
                    <TableCell className="text-center">שורות</TableCell>
                    <TableCell className="text-left">סכום לפני מע"מ</TableCell>
                  </tr>
                </TableHeader>
                <TableBody>
                  {preview.results.flatMap((r) =>
                    r.invoices.map((inv, idx) => (
                      <TableRow key={`${r.customerId}-${idx}`}>
                        <TableCell>{idx === 0 ? r.customerName : ""}</TableCell>
                        <TableCell>{inv.category || "—"}</TableCell>
                        <TableCell className="text-center">{inv.noteCount}</TableCell>
                        <TableCell className="text-center">{inv.itemCount}</TableCell>
                        <TableCell className="text-left">{shekel(inv.netTotal)} ₪</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {summary.invoices > 0 && !blockedBulkClose && (
            <Card
              className={`min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-8 border-r-4 ${
                demoMode ? "border-yellow-500" : "border-red-500"
              }`}
            >
              <CardBody>
                {/* אזהרת "בלתי הפיכה" על הפקה לחשבון דמו היא אזהרה שקרית,
                    ומי שרואה אותה פעמיים מפסיק לקרוא אותה גם באמת */}
                {demoMode ? (
                  <>
                    <p className="font-semibold flex items-center gap-2 text-yellow-800 dark:text-yellow-300">
                      <FiAlertTriangle /> הפקה לחשבון הדמו
                    </p>
                    <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                      המסמכים ייווצרו בחשבון הדמו ולא יישלחו לאף לקוח. החיוב
                      נרשם בכיס הדמו בלבד, והחיוב האמיתי של התעודות האלה עדיין
                      ממתין.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold flex items-center gap-2 text-red-700 dark:text-red-400">
                      <FiAlertTriangle /> פעולה בלתי הפיכה
                    </p>
                    <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                      חשבונית מס אינה ניתנת למחיקה. ביטול אפשרי רק בהוצאת חשבונית
                      זיכוי, שגם היא נרשמת בספרים. ודאי שהמחירים בתעודות נכונים
                      לפני ההפקה.
                    </p>
                  </>
                )}

                {isPartial && (
                  <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
                    הפקה חלקית: {notes.length - selectedNotes.length} תעודות לא נבחרו
                    ויישארו פתוחות. הן ייכנסו לחשבונית בסגירת החודש.
                  </p>
                )}

                <label className="mt-4 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailDocument}
                    onChange={(e) => setEmailDocument(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">שלח את החשבונית ללקוח במייל מ-iCount</span>
                </label>

                <label className="mt-3 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">
                    בדקתי את הרשימה למעלה ואני מאשרת הפקת {summary.invoices} חשבוניות
                    {singleCustomer ? ` על ${selectedNotes.length} תעודות` : ""}
                  </span>
                </label>

                <Button
                  className="mt-4"
                  disabled={!confirmed || closing}
                  onClick={doClose}
                >
                  {closing
                    ? "מפיק חשבוניות..."
                    : `הפק ${summary.invoices} חשבוניות${demoMode ? " (דמו)" : ""}`}
                </Button>
              </CardBody>
            </Card>
          )}

          {singleCustomer && notes.length > 0 && selectedNotes.length === 0 && (
            <Card className="mb-8">
              <CardBody>
                <p className="text-gray-600 dark:text-gray-400">
                  לא נבחרה אף תעודה — אין מה להפיק.
                </p>
              </CardBody>
            </Card>
          )}

          {preview.invoicesCreated === 0 && (
            <Card className="mb-8">
              <CardBody>
                <p className="text-gray-600 dark:text-gray-400">
                  אין תעודות משלוח פתוחות בחודש {preview.month}
                  {singleCustomer ? " ללקוח שנבחר" : ""}.
                </p>
              </CardBody>
            </Card>
          )}
        </>
      )}

      {result && (
        <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-8 border-r-4 border-green-500">
          <CardBody>
            <p className="font-semibold flex items-center gap-2 text-green-700 dark:text-green-400">
              <FiCheckCircle /> {result.message}
            </p>

            {result.demo && (
              <p className="mt-2 text-sm text-yellow-800 dark:text-yellow-300">
                חשבוניות דמו — נוצרו בחשבון הדמו ולא נשלחו. הן מופיעות במסך
                החשבוניות ואפשר לרשום עליהן תשלום, אבל החיוב האמיתי לא בוצע.
              </p>
            )}

            <TableContainer className="mt-4">
              <Table>
                <TableHeader>
                  <tr>
                    <TableCell>לקוח</TableCell>
                    <TableCell>קטגוריה</TableCell>
                    <TableCell>מספר חשבונית</TableCell>
                    <TableCell className="text-center">תעודות</TableCell>
                    <TableCell>נשלח במייל</TableCell>
                    <TableCell></TableCell>
                  </tr>
                </TableHeader>
                <TableBody>
                  {result.results.flatMap((r) =>
                    r.invoices.map((inv, idx) => (
                      <TableRow key={`${r.customerId}-${idx}`}>
                        <TableCell>{idx === 0 ? r.customerName : ""}</TableCell>
                        <TableCell>{inv.category || "—"}</TableCell>
                        <TableCell className="font-mono">{inv.docNum}</TableCell>
                        <TableCell className="text-center">{inv.noteCount}</TableCell>
                        {/* חשבונית שלא נשלחה קיימת רק ב-iCount והלקוח אינו
                            יודע עליה. זו השורה היחידה שבה רואים את זה. */}
                        <TableCell className="text-xs">
                          {inv.emailedTo ? (
                            <span className="text-green-700 dark:text-green-400">
                              {inv.emailedTo}
                            </span>
                          ) : (
                            <span className="text-red-600 dark:text-red-400">
                              לא נשלח — אין מייל תקין
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {inv.url && (
                            <a
                              href={inv.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1"
                            >
                              צפייה <FiExternalLink />
                            </a>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {result.failures?.length > 0 && (
              <div className="mt-4 p-3 rounded bg-red-50 dark:bg-red-900/20 text-sm">
                <p className="font-semibold text-red-700 dark:text-red-400">
                  {result.failures.length} לקוחות נכשלו — התעודות שלהם נשארו פתוחות
                </p>
                <ul className="mt-2 list-disc pr-5 text-red-700 dark:text-red-400">
                  {result.failures.map((f, i) => (
                    <li key={i}>
                      {f.customerName || f.customerId}: {f.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardBody>
        </Card>
      )}
    </>
  );
};

export default MonthlyBilling;
