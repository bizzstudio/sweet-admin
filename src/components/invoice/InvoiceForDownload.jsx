import {
  Document,
  Font,
  Image,
  // Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { useTranslation } from "react-i18next";
import logoDark from "@/assets/img/logo/logo-color.png";
import AddressFormat from "../AddressFormat";

Font.register({
  family: "Assistant",
  fonts: [
    {
      src: "https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-regular.ttf",
    },
    {
      src: "https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-600.ttf",
      fontWeight: 600,
    },
  ],
});
Font.register({
  family: "DejaVu Sans",
  fonts: [
    {
      src: "https://kendo.cdn.telerik.com/2017.2.621/styles/fonts/DejaVu/DejaVuSans.ttf",
    },
    {
      src: "https://kendo.cdn.telerik.com/2017.2.621/styles/fonts/DejaVu/DejaVuSans-Bold.ttf",
    },
  ],
});

const styles = StyleSheet.create({
  page: {
    marginRight: 10,
    marginBottom: 20,
    marginLeft: 10,
    paddingTop: 30,
    paddingLeft: 10,
    paddingRight: 29,
    lineHeight: 1.5,
  },
  table: {
    display: "table",
    width: "auto",
    color: "#4b5563",
    marginRight: 10,
    marginBottom: 20,
    marginLeft: 10,
    marginTop: 0,
    borderRadius: "8px",
    borderColor: "#e9e9e9",
    borderStyle: "solid",
    borderWidth: 0.5,
    padding: 0,
    textAlign: "left",
  },
  tableRow: {
    // margin: 'auto',
    flexDirection: "row",
    paddingBottom: 2,
    paddingTop: 2,
    textAlign: "left",
    borderWidth: 0.8,
    borderColor: "#E5E7EB",
    borderBottom: "0",
  },
  tableRowHeder: {
    // margin: 'auto',
    flexDirection: "row",
    backgroundColor: "#f9fafb",
    paddingBottom: 4,
    paddingTop: 4,
    paddingLeft: 0,
    borderBottomWidth: 0.8,
    borderColor: "#E5E7EB",
    borderStyle: "solid",
    textTransform: "uppercase",
    textAlign: "left",
  },
  tableCol: {
    width: "25%",
    textAlign: "left",

    // borderStyle: 'solid',
    // borderWidth: 1,
    // borderLeftWidth: 0.5,
    // borderTopWidth: 0.5,
    // borderBottomWidth: 0.5,
    // borderColor: '#d1d5db',
  },
  tableCell: {
    margin: "auto",
    marginTop: 5,
    fontSize: 10,
    // textAlign:'center',
    paddingLeft: "0",
    paddingRight: "0",
    marginLeft: "13",
    marginRight: "13",
  },

  tableCellQuantity: {
    margin: "auto",
    marginTop: 5,
    fontSize: 10,
    textAlign: "center",
    paddingLeft: "0",
    paddingRight: "0",
    marginLeft: "12",
    marginRight: "12",
  },

  invoiceFirst: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 18,
    paddingLeft: 10,
    paddingRight: 10,
    borderBottom: 1,
    borderColor: "#f3f4f6",
    // backgroundColor:'#EEF2FF',
  },
  invoiceSecond: {
    display: "flex",
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingTop: 20,
    paddingBottom: 20,
    paddingLeft: 10,
    paddingRight: 10,
    borderRadius: 12,
    marginLeft: "13",
    marginRight: "13",
  },
  invoiceThird: {
    display: "flex",
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingTop: 20,
    paddingBottom: 20,
    paddingLeft: 10,
    paddingRight: 10,
    borderTop: 1,
    borderColor: "#ffffff",
    backgroundColor: "#f4f5f7",
    borderRadius: 12,
    marginLeft: "13",
    marginRight: "13",

    // backgroundColor:'#F2FCF9',
  },
  logo: {
    width: 64,
    height: 25,
    bottom: 5,
    right: 10,
    marginBottom: 10,
    textAlign: "right",
    color: "#4b5563",
    fontFamily: "Assistant",
    fontWeight: "bold",
    fontSize: 10.3,

    marginRight: "39%",
    textTransform: "uppercase",
  },
  title: {
    color: "#2f3032",
    fontFamily: "Assistant",
    fontWeight: "bold",
    fontSize: 8.1,
    textTransform: "uppercase",
  },
  info: {
    fontSize: 9,
    color: "#6b7280",
  },
  infoCost: {
    fontSize: 10,
    color: "#6b7280",
    marginLeft: "4%",
    marginTop: "7px",
    textAlign: "left",
    width: "25%",
  },
  invoiceNum: {
    fontSize: 9,
    color: "#6b7280",
    marginLeft: "6%",
  },
  topAddress: {
    fontSize: 10,
    color: "#6b7280",
    width: "100%",
    marginRight: "62%",
    textAlign: "right",
    whiteSapce: "nowrap",
  },
  amount: {
    fontSize: 10,
    color: "#ef4444",
  },
  totalAmount: {
    fontSize: 10,
    color: "#ef4444",
    fontFamily: "Assistant",
    fontWeight: "bold",
    textTransform: "uppercase",
    textAlign: "right",
  },
  status: {
    color: "#10b981",
  },
  quantity: {
    color: "#1f2937",
    textAlign: "center",
  },
  itemPrice: {
    color: "#1f2937",
    textAlign: "left",
  },
  header: {
    color: "#6b7280",
    fontSize: 9,
    fontFamily: "Assistant",
    fontWeight: "bold",
    textTransform: "uppercase",
    textAlign: "left",
  },

  thanks: {
    color: "#22c55e",
  },
  infoRight: {
    textAlign: "right",
    fontSize: 9,
    color: "#6b7280",
    width: "25%",
    marginRight: "39%",
    fontFamily: "Assistant",
  },
  titleRight: {
    textAlign: "right",
    fontFamily: "Assistant",
    fontWeight: "bold",
    fontSize: 8.1,
    width: "25%",
    marginRight: "39%",
    textTransform: "uppercase",
    color: "#2f3032",
  },
  topBg: {
    // backgroundColor:'#EEF2FF',
  },
  invoiceDiv: {
    alignItems: "baseline",
  },
});

const InvoiceForDownload = ({
  data,
  currency,
  globalSetting,
  showDateFormat,
  getNumberTwo,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <Document>
        <Page size="A4" style={styles.page}>
          <View style={styles.invoiceFirst}>
            <View style={styles.invoiceDiv}>
              <Text
                style={{
                  fontFamily: "Assistant",
                  fontWeight: "bold",
                  textTransform: "uppercase",
                  alignItems: "baseline",
                }}
              >
                {t("invoice")}
              </Text>
              <Text style={styles.info}>
                Status :{" "}
                {data?.status?.name === "Merged" && (
                  <Text style={{ color: "#eab308" }}>{data?.status?.heName}</Text>
                )}
                {data?.status?.name === "Pending" && (
                  <Text style={{ color: "#9ca3af" }}>{data?.status?.heName}</Text>
                )}
                {data?.status?.name === "Processing" && (
                  <Text style={{ color: "#16a34a" }}>{data?.status?.heName}</Text>
                )}
                {data?.status?.name === "POS-Completed" && (
                  <Text style={{ color: "#14b8a6" }}>{data?.status?.heName}</Text>
                )}
                {data?.status?.name === "Fully Returned" && (
                  <Text style={{ color: "#14b8a6" }}>{data?.status?.heName}</Text>
                )}
                {data?.status?.name === "Partial Returned" && (
                  <Text style={{ color: "#14b8a6" }}>{data?.status?.heName}</Text>
                )}
                {data?.status?.name === "Delivered" && (
                  <Text style={{ color: "#3c6d16" }}>{data?.status?.heName}</Text>
                )}
                {data?.status?.name === "Cancel" && (
                  <Text style={{ color: "#ef4444" }}>{data?.status?.heName}</Text>
                )}
                {data?.status?.name === "Deleted" && (
                  <Text style={{ color: "#ef4444" }}>{data?.status?.heName}</Text>
                )}
              </Text>
              {globalSetting?.vat_number && (
                <Text style={styles.info}>
                  <Text className="font-semibold text-xs capitalize mt-2">
                    VAT Number :{" "}
                    <Text className="text-customGreen">
                      {globalSetting?.vat_number}
                    </Text>
                  </Text>
                </Text>
              )}
            </View>

            <View style={{ alignItems: "flex-end" }}>
              <Text
                style={{
                  flexDirection: "row",
                  marginLeft: 80,
                  marginTop: 35,
                  textAlign: "right",
                }}
              >
                <Image
                  src={logoDark}
                  alt="מתוקיה של בני"
                  style={{
                    width: 90,
                    alignItems: "right",
                    textAlign: "right",
                    float: "right",
                  }}
                />
              </Text>
              <Text
                style={{
                  fontSize: 9,
                  color: "#888",
                  marginTop: 2,
                  textAlign: "right",
                }}
              >
                {globalSetting?.address}
                {"\n"}
                {globalSetting?.contact}
                {"\n"}
                {globalSetting?.email}
                {"\n"}
                {globalSetting?.website}
              </Text>
            </View>
          </View>

          <View style={styles.invoiceSecond}>
            <View style={{ width: "25%", alignItems: "baseline" }}>
              <Text style={[styles.title, { fontSize: 10 }]}>{t("date")}</Text>
              <Text
                style={{
                  fontSize: 9,
                  color: "#6b7280",
                  textAlign: "left",
                }}
              >
                {data?.createdAt !== undefined && (
                  <Text>{showDateFormat(data?.createdAt)}</Text>
                )}
              </Text>
            </View>
            <View style={{ width: "25%", alignItems: "baseline" }}>
              <Text style={styles.title}>
                <Text
                  style={{ width: "25%", alignItems: "baseline", fontSize: 10 }}
                >
                  {t("InvoiceNo")}
                </Text>
              </Text>
              <Text style={styles.title}>
                <Text style={{ textAlign: "left" }}>
                  <Text
                    style={{
                      fontSize: 9,
                      color: "#6b7280",
                      marginLeft: "4%",
                      marginTop: "7px",
                      textAlign: "left",
                    }}
                  >
                    #{data?.invoice}
                  </Text>
                </Text>
              </Text>
            </View>

            <View
              style={{ width: "25%", alignItems: "baseline", float: "right" }}
            >
              <Text style={styles.title}>
                <Text
                  style={{
                    fontSize: 10,
                    float: "right",
                    textAlign: "right",
                    alignItems: "baseline",
                  }}
                >
                  {t("InvoiceTo")}
                </Text>
              </Text>
              <Text style={styles.title}>
                <Text
                  style={{
                    textAlign: "right",
                    fontSize: 9,
                    textTransform: "lowercase",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 9,
                      color: "#6b7280",
                      marginTop: "7px",
                      textAlign: "right",
                      textTransform: "lowercase",
                    }}
                  >
                    {data?.user_info?.name} {data?.user_info?.lastName}
                    {"\n"}
                    {data?.user_info?.contact}
                    {"\n"}
                    {data?.user_info?.email}
                    {"\n"}
                    <AddressFormat userInfo={data?.user_info} />
                    {/* {"\n"}
                    {data?.user_info?.city}, {data?.user_info?.country},{" "}
                    {data?.user_info?.zipCode} */}
                  </Text>
                </Text>
              </Text>
            </View>
          </View>

          <View style={styles.table}>
            <View style={styles.tableRowHeder}>
              {/* <View style={styles.tableCol}>
                <Text style={styles.tableCell}>
                  <span style={styles.header}>{t('sr')}</span>
                </Text>
              </View> */}
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>
                  <Text
                    style={{
                      color: "#6b7280",
                      fontSize: 9,
                      fontFamily: "Assistant",
                      fontWeight: "bold",
                      textTransform: "uppercase",
                      textAlign: "left",
                    }}
                  >
                    Product Title
                  </Text>
                </Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>
                  <Text
                    style={{
                      color: "#6b7280",
                      fontSize: 9,
                      fontFamily: "Assistant",
                      fontWeight: "bold",
                      textTransform: "uppercase",
                      textAlign: "center",
                    }}
                  >
                    {t("Quantity")}
                  </Text>
                </Text>
              </View>
              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>
                  <Text
                    style={{
                      color: "#6b7280",
                      fontSize: 9,
                      fontFamily: "Assistant",
                      fontWeight: "bold",
                      textTransform: "uppercase",
                      textAlign: "left",
                    }}
                  >
                    {t("ItemPrice")}
                  </Text>
                </Text>
              </View>

              <View style={styles.tableCol}>
                <Text style={styles.tableCell}>
                  <Text
                    style={{
                      color: "#6b7280",
                      fontSize: 9,
                      fontFamily: "Assistant",
                      fontWeight: "bold",
                      textTransform: "uppercase",
                      textAlign: "right",
                    }}
                  >
                    {t("Amount")}
                  </Text>
                </Text>
              </View>
            </View>
            {data?.cart?.map((item, i) => (
              <View key={i} style={styles.tableRow}>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>
                    {item.title.he}
                  </Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCellQuantity}>
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: "bold",
                        textAlign: "center",
                        alignItems: "center",
                        fontFamily: "Assistant",
                      }}
                    >
                      {item.quantity}
                    </Text>
                  </Text>
                </View>
                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: "bold",
                        textAlign: "left",
                        fontFamily: "Assistant",
                      }}
                    >
                      {currency}
                      {getNumberTwo(item.price)}
                    </Text>
                  </Text>
                </View>

                <View style={styles.tableCol}>
                  <Text style={styles.tableCell}>
                    <Text
                      style={{
                        fontSize: 10,
                        color: "#ef4444",
                        fontWeight: "bold",
                        textAlign: "right",
                        fontFamily: "Assistant",
                      }}
                    >
                      {currency}
                      {getNumberTwo(item.price * item.quantity)}
                    </Text>
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.invoiceThird}>
            <View style={{ width: "25%", alignItems: "baseline" }}>
              <Text style={styles.title}>{t("InvoicepaymentMethod")}</Text>
              <Text style={{ fontSize: 10, color: "#0e9f6e" }}>
                {data?.paymentMethod}
              </Text>
            </View>
            <View style={{ width: "25%", alignItems: "baseline" }}>
              <Text style={styles.title}>
                <Text style={{ width: "25%", alignItems: "baseline" }}>
                  Sub Total
                </Text>
              </Text>
              <Text style={styles.title}>
                <Text style={{ textAlign: "left" }}>
                  <Text style={styles.infoCost}>
                    {currency}

                    {getNumberTwo(data?.subTotal)}
                  </Text>
                </Text>
              </Text>
            </View>

            <View style={{ width: "25%", alignItems: "baseline" }}>
              <Text style={styles.title}>
                <Text style={{ textAlign: "left" }}>{t("ShippingCost")}</Text>
              </Text>
              <Text style={styles.title}>
                <Text style={{ textAlign: "left" }}>
                  <Text style={styles.infoCost}>
                    {currency}
                    {getNumberTwo(data?.shippingCost)}
                  </Text>
                </Text>
              </Text>
            </View>
            <View style={{ width: "25%", alignItems: "baseline" }}>
              <Text style={styles.title}>
                <Text style={{ textAlign: "left" }}>{t("discount")} </Text>
              </Text>
              <Text style={styles.title}>
                <Text style={{ textAlign: "left" }}>
                  <Text style={styles.infoCost}>
                    {" "}
                    {currency}
                    {getNumberTwo(data?.discount)}
                  </Text>
                </Text>
              </Text>
            </View>
            <View style={{ width: "25%", alignItems: "baseline" }}>
              <Text style={styles.title}>
                <Text
                  style={{ width: "45%", textAlign: "right", float: "left" }}
                >
                  Total
                </Text>
              </Text>
              <Text style={styles.title}>
                <Text style={styles.totalAmount}>
                  {currency}

                  {getNumberTwo(data?.total)}
                </Text>
              </Text>
            </View>
          </View>
        </Page>
      </Document>
    </>
  );
};

export default InvoiceForDownload;
