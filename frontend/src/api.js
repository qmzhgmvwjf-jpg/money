import axios from "axios";

const API = axios.create({
  baseURL: "https://money-reph.onrender.com"
});

export default API;