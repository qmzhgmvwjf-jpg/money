import axios from "axios";

const API = axios.create({
  baseURL: "https://money-reph.onrender.com"
});

// 👉 요청마다 토큰 자동 붙이기
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default API;