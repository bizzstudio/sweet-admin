import {
  Button,
  Card,
  CardBody,
} from "@windmill/react-ui";
import { useContext, useState, useEffect } from "react";
import { FiSettings } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import ReactQuill from "react-quill-new";
import 'react-quill-new/dist/quill.snow.css';
import { FaWhatsapp } from "react-icons/fa";
import { BsFileEarmarkBarGraphFill } from "react-icons/bs";
import { TbTruckDelivery } from "react-icons/tb";
import { LiaTruckPickupSolid } from "react-icons/lia";
import { BsQrCode } from "react-icons/bs";
import { io } from "socket.io-client";
import Countdown from "react-countdown";
import { QRCodeCanvas } from "qrcode.react";
import axios from "axios";
import Cookies from "js-cookie";

// Internal import
import { SidebarContext } from "@/context/SidebarContext";
import useAsync from "@/hooks/useAsync";
import PageTitle from "@/components/Typography/PageTitle";
import MessageServices from "@/services/MessageServices";
import { notifyError, notifySuccess } from "@/utils/toast";
import PieChartSurvey from "@/components/chart/Pie/PieChartSurvey";  // ייבוא של PieChartSurvey
import spinnerLoadingImage from "@/assets/img/spinner.gif";
import Loading from "@/components/preloader/Loading";
import Success from "@/components/success/Success";

const Messages = () => {
  const { t } = useTranslation();
  const { lang } = useContext(SidebarContext);
  const { data, loading, error } = useAsync(MessageServices.getAllMessages);

  const [deliveryMessage, setDeliveryMessage] = useState("");
  const [pickupMessage, setPickupMessage] = useState("");
  const [surveyMessage, setSurveyMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingId, setSubmittingId] = useState(null);

  // סטייטים לחיבור לוואטסאפ
  const [isConnected, setIsConnected] = useState(false); // Connection state
  const [isAuthenticating, setIsAuthenticating] = useState(false); // Authenticating state
  const [qrCode, setQrCode] = useState(null); // QR code state
  const [timerKey, setTimerKey] = useState(0);

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
      try {
        const adminInfo = Cookies.get("adminInfo");
        const token = adminInfo ? JSON.parse(adminInfo).token : null;
        return token ? { Authorization: `Bearer ${token}` } : {};
      } catch {
        return {};
      }
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
    };

    if (socketPath) {
      socketOptions.path = socketPath;
    }

    // אתחול חיבור Socket.io
    const socket = io(link, socketOptions);

    socket.on('connect', () => {
      console.log('Connected to sweet-whatsapp server');
      socket.emit("init-whatsapp");
    });

    // טיפול בשגיאות
    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    socket.on('disconnect', (reason) => {
      console.warn('Disconnected:', reason);
    });

    // Listen for QR code updates
    socket.on("qr", (qr) => {
      setQrCode(qr);
      setIsConnected(false); // Reset connection state if a new QR code is received
      setIsAuthenticating(false); // איפוס סטטוס האימות

      if (qr !== localStorage.qrCode) {
        localStorage.qrCode = qr;
        localStorage.qrArrivalTime = Date.now();
      };

      setTimerKey((prevKey) => prevKey + 1);
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
    const confirmLogout = confirm(t("logoutWhatsApp")); // הודעת אישור
    if (!confirmLogout) {
      return; // אם המשתמש בחירת לא, הפעולה מתבטלת
    }

    try {
      const link = import.meta.env.VITE_APP_WHATSAPP_SOCKET_URL;
      const httpPrefix = import.meta.env.VITE_APP_WHATSAPP_PATH_PREFIX || "";

      let token = null;
      try {
        const adminInfo = Cookies.get("adminInfo");
        token = adminInfo ? JSON.parse(adminInfo).token : null;
      } catch {
        token = null;
      }

      const response = await axios.post(
        `${link}${httpPrefix}/logout`,
        {},
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (response.data.success) {
        setIsConnected(false); // עדכן את הסטטוס
        setQrCode(null); // אפס את קוד ה-QR
        notifySuccess(response.data.message); // הצגת הודעה למשתמש
      } else {
        console.error("Failed to logout:", response.data.message);
      }
    } catch (error) {
      console.error("Error during logout:", error.message);
    }
  };

  const renderer = ({ seconds }) => (
    <span className="text-[20px] dark:text-gray-200 mt-1">
      {t("Code will refresh in")}:
      <span className="text-mainColor-light font-bold"> {seconds} </span>
      {t("seconds")}
    </span>
  );

  const getRemainingTime = () => {
    const arrivalTime = localStorage.qrArrivalTime;
    const timeLimit = 20000; // 20 שניות
    if (arrivalTime) {
      const elapsedTime = Date.now() - parseInt(arrivalTime, 10);
      const remainingTime = timeLimit - elapsedTime;
      return remainingTime > 0 ? remainingTime : 0;
    }
    return 0;
  };

  const handleTimerComplete = () => {
    setQrCode(null);
    localStorage.removeItem("qrArrivalTime");
    localStorage.removeItem("qrCode");
  };

  const {
    data: surveyData,
    loading: loadingSurveyData,
    error: errorSurveyData,
  } = useAsync(MessageServices.getSurveyData);

  console.log('Messages :>> ', data);
  console.log('Survey data :>> ', surveyData);

  const handleUpdateMessage = async (role, message) => {
    setIsSubmitting(true);
    setSubmittingId(role);

    try {
      const messageId = data.find(msg => msg.role === role)._id;
      const res = await MessageServices.updateMessage(messageId, { message });
      setIsSubmitting(false);
      setSubmittingId(null);
      notifySuccess(res.message)
    } catch (err) {
      setIsSubmitting(false);
      setSubmittingId(null);
      notifyError(err?.response?.data?.message || err?.message);
    }
  };

  useEffect(() => {
    if (data) {
      setDeliveryMessage(data.find(msg => msg.role === "delivery")?.message || "");
      setPickupMessage(data.find(msg => msg.role === "pickup")?.message || "");
      setSurveyMessage(data.find(msg => msg.role === "survey")?.message || "");
    }
  }, [data]);

  const modules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'align': [] }],
      [{ 'direction': 'rtl' }],
    ],
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
                className="text-sm underline mr-auto shadow-none"
              >
                {t("LogoutBot")}
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
                      <p className="text-mainColor-light mb-4">{t("AfterLoggingIn")}</p>
                      <ol className="text-gray-600 dark:text-gray-300 mb-6 text-lg">
                        <li>1. {t("OpenWhatsApp")}</li>
                        <li>2. {t("TapMenu")}</li>
                        <li>3. {t("selectLinkedDevices")}</li>
                        <li>4. {t("scanQRcode")}</li>
                      </ol>
                    </div>

                    {qrCode ? (
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

          {/* תבניות הודעות */}
          <div className="inline-flex md:text-lg text-base text-gray-800 font-semibold dark:text-gray-400 mb-3">
            <FaWhatsapp size={20} className="mt-1 ml-2" />
            {t("Messages")}
          </div>
          <hr className="md:mb-6 mb-3" />
          <div className="flex-grow scrollbar-hide w-full max-h-full xl:px-10">
            <div className="md:mb-6 mb-3">
              <div className="inline-flex md:text-lg text-base text-gray-800 font-semibold dark:text-gray-400 mb-3">
                <TbTruckDelivery className="mt-1 ml-2 w-5 h-5" />
                {t("DeliveryMessage")}
              </div>
              <hr className="md:mb-3 mb-2" />
              <div className="sm:col-span-4">
                <ReactQuill
                  value={deliveryMessage}
                  onChange={setDeliveryMessage}
                  modules={modules}
                  theme="snow"
                  className="dark:text-white"
                />
              </div>
              <div className="flex justify-end mt-3">
                <Button
                  onClick={() => handleUpdateMessage("delivery", deliveryMessage)}
                  disabled={isSubmitting && submittingId === "delivery"}
                  className="h-10 px-6"
                >
                  {isSubmitting && submittingId === "delivery" ? (
                    <img
                      src={spinnerLoadingImage}
                      alt="Loading"
                      width={20}
                      height={10}
                    />
                  ) : (
                    t("UpdateBtn")
                  )}
                </Button>
              </div>
            </div>

            <div className="md:mb-6 mb-3">
              <div className="inline-flex md:text-lg text-base text-gray-800 font-semibold dark:text-gray-400 mb-3">
                <LiaTruckPickupSolid className="mt-1 ml-2 w-5 h-5" />
                {t("PickupMessage")}
              </div>
              <hr className="md:mb-3 mb-2" />
              <div className="sm:col-span-4">
                <ReactQuill
                  value={pickupMessage}
                  onChange={setPickupMessage}
                  modules={modules}
                  theme="snow"
                  className="dark:text-white"
                />
              </div>
              <div className="flex justify-end mt-3">
                <Button
                  onClick={() => handleUpdateMessage("pickup", pickupMessage)}
                  disabled={isSubmitting && submittingId === "pickup"}
                  className="h-10 px-6"
                >
                  {isSubmitting && submittingId === "pickup" ? (
                    <img
                      src={spinnerLoadingImage}
                      alt="Loading"
                      width={20}
                      height={10}
                    />
                  ) : (
                    t("UpdateBtn")
                  )}
                </Button>
              </div>
            </div>

            <div className="md:mb-6 mb-3">
              <div className="inline-flex md:text-lg text-base text-gray-800 font-semibold dark:text-gray-400 mb-3">
                <BsFileEarmarkBarGraphFill className="mt-1 ml-2" />
                {t("SurveyMessage")}
              </div>
              <hr className="md:mb-3 mb-2" />
              <div className="sm:col-span-4">
                <ReactQuill
                  value={surveyMessage}
                  onChange={setSurveyMessage}
                  modules={modules}
                  theme="snow"
                  className="dark:text-white"
                />
              </div>
              <div className="flex justify-end mt-3">
                <Button
                  onClick={() => handleUpdateMessage("survey", surveyMessage)}
                  disabled={isSubmitting && submittingId === "survey"}
                  className="h-10 px-6"
                >
                  {isSubmitting && submittingId === "survey" ? (
                    <img
                      src={spinnerLoadingImage}
                      alt="Loading"
                      width={20}
                      height={10}
                    />
                  ) : (
                    t("UpdateBtn")
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* נתוני הסקר */}
          <div className="inline-flex md:text-lg text-base text-gray-800 font-semibold dark:text-gray-400 mb-3">
            <BsFileEarmarkBarGraphFill className="mt-1 ml-2" />
            {t("Survey Data")}
          </div>
          <hr className="md:mb-6 mb-3" />
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">
                {t("SatisfactionLevelThisMonth")}
              </h2>
              <PieChartSurvey
                data={surveyData?.thisMonth}
                loading={loadingSurveyData} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">
                {t("SatisfactionLevelAllTime")}
              </h2>
              <PieChartSurvey
                data={surveyData?.allTime}
                loading={loadingSurveyData} />
            </div>
          </div>
        </CardBody>
      </Card>
    </>
  );
};

export default Messages;
