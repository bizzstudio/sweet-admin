import { Card, CardBody } from "@windmill/react-ui";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { BsQrCode } from "react-icons/bs";
import { io } from "socket.io-client";
import { QRCodeCanvas } from "qrcode.react";
import axios from "axios";
import Cookies from "js-cookie";

// Internal import
import PageTitle from "@/components/Typography/PageTitle";
import { notifySuccess, notifyError } from "@/utils/toast";
import Loading from "@/components/preloader/Loading";
import Success from "@/components/success/Success";

// קריאת טוקן האדמין מהעוגייה. משמש גם ללחיצת היד של הסוקט וגם לקריאות ה-HTTP,
// ששניהם מוגנים באותו שער בשרת הווצאפ.
const readAdminToken = () => {
  try {
    const adminInfo = Cookies.get("adminInfo");
    return adminInfo ? JSON.parse(adminInfo).token : null;
  } catch {
    return null;
  }
};

const Messages = () => {
  const { t } = useTranslation();

  // סטייטים לחיבור לוואטסאפ
  const [isConnected, setIsConnected] = useState(false); // Connection state
  const [isAuthenticating, setIsAuthenticating] = useState(false); // Authenticating state
  const [qrCode, setQrCode] = useState(null); // QR code state
  const [isLoggingOut, setIsLoggingOut] = useState(false); // ניתוק בתהליך
  const [connectionError, setConnectionError] = useState(null); // כשל בחיבור לשרת

  // חיבור לוואטסאפ או שליפת קוד קיו-אר
  useEffect(() => {
    // כתובת שרת הווצאפ (sweet-whatsapp). בפיתוח: http://localhost:3009
    const link = import.meta.env.VITE_APP_WHATSAPP_SOCKET_URL;

    // קידומת הנתיב ב-nginx כשהשרת יושב מאחורי פרוקסי (למשל "/sweet-whatsapp").
    // ריק בפיתוח, כשפונים ישירות לפורט של השרת.
    const httpPrefix = import.meta.env.VITE_APP_WHATSAPP_PATH_PREFIX || "";

    // ‏path של Socket.IO. ריק = ברירת המחדל "/socket.io" (פיתוח).
    const socketPath = import.meta.env.VITE_APP_WHATSAPP_SOCKET_PATH || "";

    if (!link) {
      console.error(
        "VITE_APP_WHATSAPP_SOCKET_URL אינו מוגדר — לא ניתן להתחבר לשרת הווצאפ"
      );
      return;
    }

    // ‏/status ו-/logout מוגנים בשרת הווצאפ. הדשבורד מזדהה עם טוקן האדמין
    // שלו, כדי שה-API key של שרת-לשרת לא יישב ב-bundle של הדפדפן.
    const authHeader = () => {
      const token = readAdminToken();
      return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const checkStatus = async () => {
      try {
        const response = await axios.get(`${link}${httpPrefix}/status`, {
          headers: authHeader(),
        });
        if (response.data.connected) {
          setIsConnected(true); // עדכן את הסטטוס אם כבר מחובר
          setIsAuthenticating(false); // איפוס סטטוס האימות
        } else {
          console.log("Not connected to WhatsApp");
        }
      } catch (error) {
        console.error("Error checking connection status:", error);
      }
    };

    checkStatus();

    // ‏polling נשאר ראשון: מאחורי פרוקסי שאינו מעביר Upgrade, חיבור
    // websocket-only נכשל בשקט ו-QR פשוט לא מגיע למסך.
    const socketOptions = {
      transports: ["polling", "websocket"],
      // שרת הווצאפ מאמת את לחיצת היד. בלי הטוקן החיבור נדחה ולא יגיע QR.
      auth: { token: readAdminToken() },
    };

    if (socketPath) {
      socketOptions.path = socketPath;
    }

    // אתחול חיבור Socket.io
    const socket = io(link, socketOptions);

    socket.on('connect', () => {
      console.log('Connected to sweet-whatsapp server');
      setConnectionError(null);
      socket.emit("init-whatsapp");
    });

    // טיפול בשגיאות. סוקט שנדחה משמעו שלא יגיע QR לעולם, ובלי ההודעה הזו
    // המסך היה נתקע על "ממתין לקוד QR" בלי שום רמז למה.
    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setConnectionError(
        error.message === "אין הרשאה"
          ? "אין הרשאה להתחבר לשרת הוואטסאפ — יש להתנתק ולהתחבר מחדש לפאנל"
          : "אין תקשורת עם שרת הוואטסאפ"
      );
    });

    socket.on('disconnect', (reason) => {
      console.warn('Disconnected:', reason);
    });

    // Listen for QR code updates
    socket.on("qr", (qr) => {
      setQrCode(qr);
      setIsConnected(false); // Reset connection state if a new QR code is received
      setIsAuthenticating(false); // איפוס סטטוס האימות
    });

    // Listen for authentication status
    socket.on("whatsapp-authenticated", () => {
      setIsAuthenticating(true); // האימות החל
    });

    // Listen for connection status
    socket.on("whatsapp-connected", () => {
      console.log("whatsapp-connected triggered")
      setIsConnected(true);
      setIsAuthenticating(false); // האימות הושלם
    });

    // Listen for disconnection status
    socket.on("whatsapp-disconnected", () => {
      setIsConnected(false);
      setIsAuthenticating(false); // האימות הושלם
      // reload
      window.location.reload();
    });

    // Clean up socket connection on unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  // Handle logout
  const handleLogout = async () => {
    if (isLoggingOut) return; // לחיצה כפולה שולחת שתי בקשות ניתוק במקביל
    const confirmLogout = confirm(t("logoutWhatsApp")); // הודעת אישור
    if (!confirmLogout) {
      return; // אם המשתמש בחירת לא, הפעולה מתבטלת
    }

    setIsLoggingOut(true);
    try {
      const link = import.meta.env.VITE_APP_WHATSAPP_SOCKET_URL;
      const httpPrefix = import.meta.env.VITE_APP_WHATSAPP_PATH_PREFIX || "";

      const token = readAdminToken();

      const response = await axios.post(
        `${link}${httpPrefix}/logout`,
        {},
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          // בלי תקרה בקשה תקועה נשארת פתוחה והמסך פשוט לא מגיב.
          // גבוה מ-LOGOUT_TIMEOUT_MS בשרת, כדי שתשובה אמיתית תנצח.
          timeout: 20000,
        }
      );
      if (response.data.success) {
        setIsConnected(false); // עדכן את הסטטוס
        setQrCode(null); // אפס את קוד ה-QR
        notifySuccess(response.data.message); // הצגת הודעה למשתמש
      } else {
        console.error("Failed to logout:", response.data.message);
        notifyError(response.data.message || "ההתנתקות נכשלה");
      }
    } catch (error) {
      // בלי ההודעה הזו כישלון (למשל 403 על הרשאות) נראה למשתמש כמו כלום —
      // לוחצים "אישור" והמסך פשוט לא משתנה.
      console.error("Error during logout:", error.message);
      const status = error.response?.status;
      const messageByStatus = {
        403: "אין הרשאה לנתק את הבוט — יש להתחבר עם משתמש ניהולי",
        429: "יותר מדי ניסיונות — יש להמתין כ-15 דקות ולנסות שוב",
      };
      notifyError(
        messageByStatus[status] ||
          error.response?.data?.message ||
          (error.code === "ECONNABORTED"
            ? "שרת הוואטסאפ לא הגיב בזמן — יש לרענן ולבדוק את הסטטוס"
            : status
              ? `ההתנתקות נכשלה (${status})`
              : "ההתנתקות נכשלה — אין תקשורת עם שרת הוואטסאפ")
      );
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <PageTitle>{t("WhatsApp Bot")}</PageTitle>

      <Card className="min-w-0 shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5">
        <CardBody>
          {/* חיבור לוואטסאפ */}
          <div className="inline-flex md:text-lg text-base text-gray-800 font-semibold dark:text-gray-400 mb-3 w-full">
            <BsQrCode size={17} className="mt-[5px] ml-2" />
            {t("ConnectingToWhatsApp")}

            {isConnected &&
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="text-sm underline mr-auto shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoggingOut ? "מנתק…" : t("LogoutBot")}
              </button>}
          </div>
          <hr className="md:mb-6 mb-3" />
          <div className="flex-grow scrollbar-hide w-full max-h-full xl:px-10">
            {!isConnected ? (
              <Card className="flex md:flex-row flex-col flex-grow w-full justify-center gap-10 items-center shadow-xs overflow-hidden bg-white dark:bg-gray-800 mb-5 text-center p-6">
                {isAuthenticating ? (
                  <div>
                    <Loading />
                    <p className="text-mainColor-light font-bold">{t("Authentication in progress...")}</p>
                  </div>
                ) : (
                  <>
                    <div className="text-start">
                      <h2 className="text-2xl font-bold mb-1 text-gray-900 dark:text-gray-100">
                        {t("ScanToConnect")}
                      </h2>
                      <ol className="text-gray-600 dark:text-gray-300 mb-6 text-lg">
                        <li>1. {t("OpenWhatsApp")}</li>
                        <li>2. {t("TapMenu")}</li>
                        <li>3. {t("selectLinkedDevices")}</li>
                        <li>4. {t("scanQRcode")}</li>
                      </ol>
                    </div>

                    {connectionError ? (
                      <p className="bg-white rounded-md text-red-600 font-bold w-[246px] min-h-[246px] border border-red-300 flex items-center justify-center p-4 text-center">
                        {connectionError}
                      </p>
                    ) : qrCode ? (
                      <div className="flex flex-col items-center">
                        <div className="bg-white p-2 rounded-md">
                          <QRCodeCanvas value={qrCode} size={230} />
                        </div>
                      </div>
                    ) : (
                      <p className="bg-white rounded-md text-gray-800 font-bold w-[246px] h-[246px] border border-gray-700 flex items-center justify-center">
                        {t("Waiting for QR code...")}
                      </p>
                    )}
                  </>
                )}
              </Card>
            ) : (
              <Success />
            )}
          </div>
        </CardBody>
      </Card>
    </>
  );
};

export default Messages;
