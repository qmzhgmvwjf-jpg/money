import React, { useEffect, useState } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";

function AdminPage() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [store, setStore] = useState("");
  const [address, setAddress] = useState("");

  const logout = () => {
    localStorage.clear();
    navigate("/");
  };

  const fetchOrders = async () => {
    try {
      const res = await API.get("/orders");
      setOrders(res.data);
    } catch {
      alert("서버 오류");
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || role !== "admin") {
      navigate("/");
      return;
    }

    fetchOrders();

    const interval = setInterval(fetchOrders, 3000);
    return () => clearInterval(interval);
  }, [navigate]);

  const createOrder = async () => {
    if (!store || !address) return;

    await API.post("/orders", { store, address });
    setStore("");
    setAddress("");
    fetchOrders();
  };

  return (
    <div className="container">
      <div className="header">
        <h2>📦 관리자</h2>
        <button onClick={logout}>로그아웃</button>
      </div>

      <div className="card">
        <input placeholder="가게명" value={store} onChange={(e)=>setStore(e.target.value)} />
        <input placeholder="주소" value={address} onChange={(e)=>setAddress(e.target.value)} />
        <button className="primary btn" onClick={createOrder}>주문 생성</button>
      </div>

      {orders.map(o => (
        <div key={o._id} className="card">
          <b>{o.store}</b>
          <p>{o.address}</p>
          <div className={`status ${o.status}`}>{o.status}</div>
        </div>
      ))}
    </div>
  );
}

export default AdminPage;