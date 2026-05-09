import api from "./api";

export const adminService = {
  getStores: () => api.get("/admin/stores").then((res) => res.data),
  createStore: (payload) => api.post("/stores", payload).then((res) => res.data),
  updateStore: (id, payload) => api.put(`/stores/${id}`, payload).then((res) => res.data),
  deleteStore: (id) => api.delete(`/stores/${id}`),
  getDrivers: () => api.get("/drivers").then((res) => res.data),
  createDriver: (payload) => api.post("/drivers", payload).then((res) => res.data),
  updateDriver: (id, payload) => api.put(`/drivers/${id}`, payload).then((res) => res.data),
  deleteDriver: (id) => api.delete(`/drivers/${id}`),
  getCustomers: () => api.get("/customers").then((res) => res.data),
  updateCustomer: (id, payload) => api.put(`/customers/${id}`, payload).then((res) => res.data),
  getPendingUsers: () => api.get("/pending-users").then((res) => res.data),
  approveUser: (id) => api.post(`/approve-user/${id}`),
  getStats: () => api.get("/stats").then((res) => res.data),
  getActivityLogs: (limit = 20) =>
    api.get(`/admin/activity-logs?limit=${limit}`).then((res) => res.data),
  getFinanceOverview: () => api.get("/admin/finance").then((res) => res.data),
  getTopupRequests: (status) =>
    api.get(status ? `/admin/topup-requests?status=${status}` : "/admin/topup-requests").then((res) => res.data),
  approveTopup: (id, payload = {}) => api.post(`/admin/topup-requests/${id}/approve`, payload).then((res) => res.data),
  rejectTopup: (id, payload = {}) => api.post(`/admin/topup-requests/${id}/reject`, payload).then((res) => res.data),
  getWithdrawalRequests: (status) =>
    api
      .get(status ? `/admin/withdrawal-requests?status=${status}` : "/admin/withdrawal-requests")
      .then((res) => res.data),
  approveWithdrawal: (id, payload = {}) =>
    api.post(`/admin/withdrawal-requests/${id}/approve`, payload).then((res) => res.data),
  rejectWithdrawal: (id, payload = {}) =>
    api.post(`/admin/withdrawal-requests/${id}/reject`, payload).then((res) => res.data),
  getTransactions: (limit = 100) =>
    api.get(`/admin/transactions?limit=${limit}`).then((res) => res.data),
};
