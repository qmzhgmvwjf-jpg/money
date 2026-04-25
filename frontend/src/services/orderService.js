import api from "./api";

export const orderService = {
  getPublicStores: () => api.get("/stores").then((res) => res.data),
  getMenus: (storeId) =>
    api
      .get(storeId ? `/menus?store_id=${storeId}` : "/menus")
      .then((res) => res.data),
  createOrder: (payload) => api.post("/orders", payload).then((res) => res.data),
  getMyOrders: () => api.get("/my-orders").then((res) => res.data),
  getTrackingOrders: () => api.get("/my-orders").then((res) => res.data),
  getAdminOrders: (filter) => api.get(`/admin/orders?filter=${filter}`).then((res) => res.data),
  updateOrderStatus: (id, payload) => api.put(`/orders/${id}/status`, payload),
  deleteOrder: (id) => api.delete(`/orders/${id}`),
  storeAccept: (id) => api.post(`/orders/${id}/store_accept`),
  storeReject: (id) => api.post(`/orders/${id}/reject`),
  requestDispatch: (id) => api.post(`/orders/${id}/dispatch`),
  driverAccept: (id) => api.post(`/orders/${id}/accept`),
  driverReject: (id) => api.post(`/orders/${id}/driver-reject`),
  driverStart: (id) => api.post(`/orders/${id}/start`),
  driverComplete: (id) => api.post(`/orders/${id}/complete`),
  getStoreOrders: (filter) => api.get(`/store/orders?filter=${filter}`).then((res) => res.data),
  getStoreStats: () => api.get("/store/stats").then((res) => res.data),
  getStoreMyInfo: () => api.get("/store/my-info").then((res) => res.data),
  toggleStoreOpen: (payload) => api.put("/store/toggle-open", payload).then((res) => res.data),
  setStoreTime: (payload) => api.put("/store/set-time", payload).then((res) => res.data),
  toggleStoreAutoAccept: (payload) =>
    api.put("/store/toggle-auto-accept", payload).then((res) => res.data),
  createMenu: (payload) => api.post("/menus", payload).then((res) => res.data),
  updateMenu: (id, payload) => api.put(`/menus/${id}`, payload).then((res) => res.data),
  deleteMenu: (id) => api.delete(`/menus/${id}`),
  getDriverDashboard: () => api.get("/driver/dashboard").then((res) => res.data),
  getDriverAvailableOrders: () => api.get("/driver/available-orders").then((res) => res.data),
  getDriverHistory: (period) => api.get(`/driver/history?period=${period}`).then((res) => res.data),
  getDriverEarnings: (period) => api.get(`/driver/earnings?period=${period}`).then((res) => res.data),
  updateDriverOnlineStatus: (payload) => api.put("/driver/online-status", payload),
};
