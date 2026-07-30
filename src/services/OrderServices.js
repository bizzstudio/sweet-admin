import requests from "./httpService";

const OrderServices = {
  getAllOrders: async ({
    body,
    headers,
    customerName,
    statuses,
    page = 1,
    limit = 8,
    day,
    // source,
    method,
    startDate,
    endDate,
    cities,
    cacheBust,
    // download = "",
  }) => {
    const searchName = customerName ?? "";
    const searchDay = day ?? "";
    const searchMethod = method ?? "";
    const startD = startDate ?? "";
    const endD = endDate ?? "";
    const searchStatuses = statuses && statuses.length > 0 ? statuses.join(",") : "";
    const searchCities = cities && cities.length > 0 ? cities.join(",") : "";
    const cacheParam = cacheBust != null ? `&_=${cacheBust}` : "";

    return requests.get(
      `/orders?customerName=${encodeURIComponent(searchName)}&statuses=${searchStatuses}&day=${encodeURIComponent(searchDay)}&page=${page}&limit=${limit}&startDate=${encodeURIComponent(startD)}&endDate=${encodeURIComponent(endD)}&method=${encodeURIComponent(searchMethod)}&cities=${searchCities}${cacheParam}`,
      body,
      headers
    );
  },

  getAllCashierOrders: async ({
    body,
    headers,
    customerName,
    page = 1,
    limit = 8,
    day,
    startDate,
    endDate,
  }) => {
    const searchName = customerName !== null ? customerName : "";
    const searchDay = day !== null ? day : "";
    const startD = startDate !== null ? startDate : "";
    const endD = endDate !== null ? endDate : "";

    return requests.get(
      `/cashier-orders?customerName=${searchName}&day=${searchDay}&page=${page}&limit=${limit}&startDate=${startD}&endDate=${endD}`,
      body,
      headers
    );
  },

  getAllOrdersTwo: async ({ invoice, body, headers }) => {
    const searchInvoice = invoice !== null ? invoice : "";
    return requests.get(`/orders/all?invoice=${searchInvoice}`, body, headers);
  },

  getRecentOrders: async ({
    page = 1,
    limit = 8,
    startDate = "1:00",
    endDate = "23:59",
  }) => {
    return requests.get(
      `/orders/recent?page=${page}&limit=${limit}&startDate=${startDate}&endDate=${endDate}`
    );
  },

  getOrderCustomer: async (id, body) => {
    return requests.get(`/orders/customer/${id}`, body);
  },

  getOrderById: async (id, body) => {
    return requests.get(`/orders/${id}`, body);
  },

  getCashierOrderById: async (id, body) => {
    return requests.get(`/cashier-orders/${id}`, body);
  },

  updateOrder: async (id, body, headers) => {
    return requests.put(`/orders/${id}`, body, headers);
  },

  deleteOrder: async (id) => {
    return requests.delete(`/orders/${id}`);
  },

  getDashboardOrdersData: async ({
    page = 1,
    limit = 8,
    endDate = "23:59",
  }) => {
    return requests.get(
      `/orders/dashboard?page=${page}&limit=${limit}&endDate=${endDate}`
    );
  },

  getDashboardAmount: async () => {
    return requests.get("/orders/dashboard-amount");
  },

  getDashboardCount: async () => {
    return requests.get("/orders/dashboard-count");
  },

  getDashboardRecentOrder: async ({ page = 1, limit = 8 }) => {
    return requests.get(
      `/orders/dashboard-recent-order?page=${page}&limit=${limit}`
    );
  },

  getBestSellerProductChart: async () => {
    return requests.get("/orders/best-seller/chart");
  },
};

export default OrderServices;
