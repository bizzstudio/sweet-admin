/*
 * לוח הבקרה = מסך ניווט.
 *
 * במקום גרפים וסיכומים, המסך מציג כפתור לכל פריט בתפריט הצדדי, מקובץ
 * לפי אותן קבוצות. ההסבר "מה רואים כאן" נחשף במעבר עכבר על הכפתור,
 * ובמכשיר בלי עכבר (נייד/טאבלט) מוצג תמיד מתחת לשם.
 *
 * הרשימה נבנית מ-@/routes/sidebar — כל פריט שיתווסף לתפריט יופיע כאן
 * אוטומטית. מה שמתחזקים כאן ידנית זה רק ההסבר והאייקון של כל פריט
 * (TILE_META למטה); פריט בלי הסבר עדיין יוצג, פשוט בלי טקסט.
 *
 * נתוני המכירות שהיו כאן קודם עברו כמו שהם ל-@/pages/DashboardStats
 * (הכפתור "נתוני מכירות" בקבוצה "כללי").
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  FiBox,
  FiClipboard,
  FiFileText,
  FiGrid,
  FiInbox,
  FiLayers,
  FiShoppingCart,
  FiTarget,
  FiUser,
  FiUsers,
} from "react-icons/fi";
import { GoDependabot } from "react-icons/go";
import { MdOutlineReceiptLong, MdOutlineRequestQuote } from "react-icons/md";
import { TbCalendarStats } from "react-icons/tb";

// Internal import
import PageTitle from "@/components/Typography/PageTitle";
import sidebar from "@/routes/sidebar";
import OUTSIDE_LINKS from "@/routes/outsideLinks";

/*
 * ההסבר והאייקון של כל כפתור, לפי ה-name שבתפריט הצדדי.
 * accent = צבע הרקע של עיגול האייקון ושל שכבת ההסבר.
 *
 * יש כאן גם ערכים לפריטים שמוערים כרגע ב-routes/sidebar.js (מלקטים,
 * אפליקציית הליקוט, הגדרות): ברגע שיוחזרו לתפריט הם יקבלו כפתור מלא
 * בלי לגעת בקובץ הזה.
 */
const TILE_META = {
  Products: {
    icon: FiBox,
    accent: "amber",
    desc: "כל המוצרים בקטלוג: הוספת מוצר, מק\"ט, מחיר ומלאי, תמונה, סדר ההופעה בחנות, והצגה או הסתרה.",
  },
  Categories: {
    icon: FiLayers,
    accent: "amber",
    desc: "הקטגוריות שהמוצרים משויכים אליהן: יצירה, שינוי שם, שיוך לקטגוריית אב, ופרסום או הסתרה בחנות.",
  },
  CategoryAssign: {
    icon: FiLayers,
    accent: "amber",
    desc: "העברת מוצרים בין קטגוריות באצווה. הקטגוריה קובעת את הפיצול בחשבונית החודשית — שורת ריכוז נפרדת לכל אחת.",
  },
  Customers: {
    icon: FiUsers,
    accent: "green",
    desc: "רשימת הלקוחות: פרטי קשר וכתובת, עריכת מחירון הלקוח, ומעבר לכרטיס עם סיסמת הכניסה לחנות, ההזמנות והמסמכים.",
  },
  Orders: {
    icon: FiShoppingCart,
    accent: "blue",
    desc: "כל ההזמנות שנקלטו: חיפוש וסינון לפי תאריך, צפייה בהזמנה, שינוי סטטוס, מספר החשבונית שלה וייצוא הרשימה.",
  },
  IncomingOrders: {
    icon: FiInbox,
    accent: "blue",
    desc: "הזמנות שנקלטו אוטומטית וממתינות לאישור: התאמת כל שורה למוצר, זיהוי שולח לא מוכר וטיפול בהזמנות שגויות.",
  },
  OrderPlatforms: {
    icon: FiTarget,
    accent: "blue",
    desc: "הזמנות מפלטפורמות חיצוניות: שמירת פרטי ההתחברות לפלטפורמה, ומעבר על ההזמנות שנקלטו ממנה לאישור.",
  },
  DeliveryNotes: {
    icon: FiClipboard,
    accent: "purple",
    desc: "תעודות המשלוח ללקוחות: מה עדיין ממתין לחיוב, באיזו חשבונית נסגרה כל תעודה, ויצירת תעודה ידנית.",
  },
  MonthlyBilling: {
    icon: TbCalendarStats,
    accent: "purple",
    desc: "סגירת חודש: בחירת תעודות המשלוח שטרם חויבו, תצוגה מקדימה, והפקת חשבונית מרוכזת ללקוח. ההפקה בלתי הפיכה.",
  },
  InvoicesAndCollection: {
    icon: FiFileText,
    accent: "purple",
    desc: "החשבוניות שהופקו ומצב הגבייה: מה שולם ומה פתוח, הפקת קבלה על תשלום שהתקבל, והפקת חשבונית זיכוי.",
  },
  Receipts: {
    icon: MdOutlineReceiptLong,
    accent: "purple",
    desc: "הקבלות שהופקו: איזו חשבונית שולמה ומתי, פתיחת הקבלה ב-iCount והוצאת זיכוי עליה.",
  },
  PurchaseReports: {
    icon: FiFileText,
    accent: "purple",
    desc: "מה כל לקוח קנה בטווח תאריכים: פירוט התעודות שלו, ומה נמכר לפי מוצר. ניתן לייצוא לאקסל.",
  },
  Quotes: {
    icon: MdOutlineRequestQuote,
    accent: "purple",
    desc: "הצעות מחיר ללקוחות: בניית הצעה לפי מחירון הלקוח או מחיר הקטלוג, מעקב אחרי הסטטוס שלה והפקתה.",
  },
  OurStaff: {
    icon: FiUser,
    accent: "green",
    desc: "משתמשי המערכת: הוספת עובד, קביעת תפקיד, שינוי סיסמה, וסימון כלא-פעיל כדי לחסום גישה.",
  },
  "WhatsApp Bot": {
    icon: GoDependabot,
    accent: "green",
    desc: "חיבור מספר הווטסאפ בסריקת קוד QR, מצב החיבור וניתוקו. דרכו נקלטות הזמנות הלקוחות מווטסאפ למערכת.",
  },
  ViewStore: {
    icon: FiTarget,
    accent: "green",
    desc: "פתיחת החנות המקוונת בלשונית חדשה, כדי לראות בדיוק מה הלקוחות רואים.",
  },
  Pickers: {
    icon: FiUsers,
    accent: "green",
    desc: "המלקטים שאוספים את ההזמנות במחסן: הוספה ועריכה.",
  },
  ViewLikutApp: {
    icon: FiClipboard,
    accent: "green",
    desc: "פתיחת אפליקציית הליקוט בלשונית חדשה — המסך שהמלקטים עובדים איתו.",
  },
  Settings: {
    icon: FiGrid,
    accent: "green",
    desc: "הגדרות כלליות של המערכת והחנות.",
  },
};

/*
 * כפתורים שאינם בתפריט הצדדי ומתווספים לקבוצת "כללי".
 *
 * ⛔ "נתוני מכירות" הוסר מכאן (30/08/26, בקשת הלקוחה): המסך הראשי לא
 *    אמור להזכיר מכירות בכלל — לא סכומים ולא כפתור אליהם. המסך עצמו
 *    נשאר ומגיעים אליו מהתפריט הצדדי ("נתוני מכירות").
 */
const EXTRA_TILES = [];

/*
 * פריטים שקיימים בתפריט הצדדי ואינם מקבלים כפתור במסך הראשי.
 *
 *   /dashboard       — המסך הזה עצמו.
 *   /dashboard-stats — נתוני מכירות. הלקוחה ביקשה (30/08/26) שהמסך הראשי
 *                      לא יציג סכומי מכירות ולא כמה נעשה בחודש שעבר. גם
 *                      כפתור בשם "נתוני מכירות" הוא הפניה לשם, ולכן הוא
 *                      יורד מכאן — המסך עצמו נשאר, בתפריט הצדדי.
 */
const HIDDEN_FROM_HOME = new Set(["/dashboard", "/dashboard-stats"]);

/*
 * מחלקות Tailwind מלאות ולא מחורזות (`bg-${accent}-500`) — הסורק של
 * Tailwind קורא את הקוד כטקסט ולא היה מוצא מחלקה שנבנית בזמן ריצה.
 */
const ACCENTS = {
  green: {
    iconBox: "bg-mainColor/10 text-mainColor dark:bg-mainColor/20 dark:text-mainColor-light",
    overlay: "bg-mainColor-dark",
    hoverBorder: "hover:border-mainColor",
  },
  amber: {
    iconBox: "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300",
    overlay: "bg-amber-700",
    hoverBorder: "hover:border-amber-500",
  },
  blue: {
    iconBox: "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300",
    overlay: "bg-blue-700",
    hoverBorder: "hover:border-blue-500",
  },
  purple: {
    iconBox: "bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300",
    overlay: "bg-purple-700",
    hoverBorder: "hover:border-purple-500",
  },
};

/* שמות הקבוצות בתפריט הצדדי -> כותרת הקבוצה בלוח הבקרה. */
const GROUP_TITLES = {
  Catalog: "קטלוג",
  Orders: "הזמנות",
  Billing: "חיוב וגבייה",
};

const GENERAL_GROUP = "כללי";

/*
 * שיטוח התפריט הצדדי לרשימת קבוצות של כפתורים.
 * פריט עם routes הופך לקבוצה; פריט בודד נכנס לקבוצת "כללי".
 * "לוח בקרה" מדולג — זה המסך שאנחנו נמצאים בו.
 */
const buildGroups = () => {
  const groups = [];
  const general = { title: GENERAL_GROUP, tiles: [] };

  /*
   * כפתור מת עדיף שלא יוצג בכלל:
   * - קישור חיצוני בלי כתובת מוגדרת (משתנה סביבה חסר) מייצר <a> בלי href,
   *   שאי אפשר ללחוץ עליו ואי אפשר למקד אליו מקלדת.
   * - פריט בלי path ובלי outside (טעות הגדרה בתפריט) מייצר <Link> ל-undefined,
   *   שרק "מנווט" לעמוד הנוכחי.
   * הבדיקה חלה גם על פריטים ברמה העליונה וגם על פריטי תת-תפריט.
   */
  const isRenderable = (route) =>
    route.outside ? Boolean(OUTSIDE_LINKS[route.outside]) : Boolean(route.path);

  const toTile = (route, fallbackIcon) => {
    const meta = TILE_META[route.name] || {};
    return {
      name: route.name,
      path: route.path,
      outside: route.outside,
      icon: meta.icon || fallbackIcon || route.icon || FiGrid,
      accent: meta.accent || "green",
      desc: meta.desc || "",
    };
  };

  sidebar.forEach((route) => {
    if (HIDDEN_FROM_HOME.has(route.path)) return;

    if (route.routes) {
      const tiles = route.routes
        .filter(isRenderable)
        .map((child) => toTile(child, route.icon));
      if (tiles.length > 0) {
        groups.push({
          title: GROUP_TITLES[route.name] || route.name,
          tiles,
        });
      }
      return;
    }

    if (!isRenderable(route)) return;
    general.tiles.push(toTile(route));
  });

  general.tiles.push(...EXTRA_TILES.map((tile) => ({ ...tile, extra: true })));
  groups.push(general);

  return groups.filter((group) => group.tiles.length > 0);
};

const Tile = ({ tile }) => {
  const { t } = useTranslation();
  const accent = ACCENTS[tile.accent] || ACCENTS.green;
  const Icon = tile.icon;
  // כפתורים שאינם מהתפריט (EXTRA_TILES) כבר מגיעים עם כותרת בעברית.
  const title = tile.extra ? tile.name : t(`${tile.name}`);

  const content = (
    <>
      <div className="flex items-center">
        <span
          className={`flex items-center justify-center w-12 h-12 rounded-xl shrink-0 ${accent.iconBox}`}
        >
          <Icon className="w-6 h-6" aria-hidden="true" />
        </span>
        <h3 className="mr-4 text-base font-bold text-gray-700 dark:text-gray-200">
          {title}
        </h3>
      </div>

      {/* מכשיר בלי עכבר (נייד וטאבלט): אין hover, לכן ההסבר מוצג תמיד.
          התנאי הוא (hover: hover) ולא breakpoint של רוחב — טאבלט רחב
          מ-md ואין בו מעבר עכבר, ולפי רוחב ההסבר היה נעלם בו לגמרי.

          במכשיר עם עכבר הפסקה נשארת במקומה ורק שקופה, ולא display:none.
          שתי סיבות: היא זו שקובעת את גובה הכרטיס, כך ששכבת ההסבר שמעליה
          לעולם לא תיחתך גם אם יתווסף הסבר ארוך יותר; והיא נשארת בעץ
          הנגישות, בעוד השכבה עצמה היא aria-hidden (כפילות ויזואלית). */}
      {tile.desc && (
        <p className="mt-3 text-sm leading-relaxed text-gray-500 dark:text-gray-400 [@media(hover:hover)]:opacity-0">
          {tile.desc}
        </p>
      )}

      {/* מכשיר עם עכבר: ההסבר עולה מלמטה במעבר עכבר או במיקוד מקלדת.
          הכותרת חוזרת גם כאן — השכבה מכסה את כל הכרטיס, ובלעדיה המשתמש
          מאבד את שם המסך בדיוק ברגע שהוא קורא עליו. */}
      {tile.desc && (
        <span
          className={`hidden [@media(hover:hover)]:flex absolute inset-0 flex-col justify-center p-5 text-white transition-transform duration-200 ease-out translate-y-full group-hover:translate-y-0 group-focus:translate-y-0 ${accent.overlay}`}
          aria-hidden="true"
        >
          <span className="mb-1 text-sm font-bold">{title}</span>
          <span className="text-sm leading-relaxed">{tile.desc}</span>
        </span>
      )}
    </>
  );

  const className = `group relative block overflow-hidden p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-mainColor dark:focus:ring-offset-gray-900 ${accent.hoverBorder}`;

  // קישור חיצוני חייב <a>: react-router v5 מדביק basename ל-`to` ושובר כתובת מלאה.
  if (tile.outside) {
    return (
      <a
        href={OUTSIDE_LINKS[tile.outside]}
        target="_blank"
        rel="noreferrer"
        className={className}
      >
        {content}
      </a>
    );
  }

  return (
    <Link to={tile.path} className={className}>
      {content}
    </Link>
  );
};

const Dashboard = () => {
  const { t } = useTranslation();
  const groups = useMemo(() => buildGroups(), []);

  return (
    <>
      <PageTitle>{t("Dashboard")}</PageTitle>

      <p className="-mt-4 mb-6 text-sm text-gray-500 dark:text-gray-400">
        בחרו מסך. ההסבר על כל מסך מופיע בעמידה עליו עם העכבר, ובמסך מגע — מתחת לשם.
      </p>

      {groups.map((group) => (
        <section key={group.title} className="mb-8">
          <h2 className="mb-3 text-sm font-bold tracking-wide text-gray-500 uppercase dark:text-gray-400">
            {group.title}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {group.tiles.map((tile) => (
              <Tile key={tile.name} tile={tile} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
};

export default Dashboard;
