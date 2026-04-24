import api from "./api";

export const noticeService = {
  getNotices: () => api.get("/notices").then((res) => res.data),
  createNotice: (payload) => api.post("/notices", payload).then((res) => res.data),
  updateNotice: (id, payload) => api.put(`/notices/${id}`, payload).then((res) => res.data),
  deleteNotice: (id) => api.delete(`/notices/${id}`),
  readNotice: (id) => api.put(`/notices/${id}/read`),
};
