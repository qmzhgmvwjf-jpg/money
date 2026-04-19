import React, { useEffect, useState } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";

function RiderPage() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);

  const username = "driver1"; // 🔥 현재 로그인 유저 (나중에 JWT에서 추출 가능)

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

    if (!token || role !== "driver") {
      navigate("/");
      return;
    }

    fetchOrders();

    const interval = setInterval(fetchOrders, 3000);
    return () => clearInterval(interval);
  }, [navigate]);

  const accept = async (id) => {
    await API.post(`/orders/${id}/accept`);
    fetchOrders();
  };

  const start = async (id) => {
    await API.post(`/orders/${id}/start`);
    fetchOrders();
  };

  const complete = async (id) => {
    await API.post(`/orders/${id}/complete`);
    fetchOrders();
  };

  const waiting = orders.filter(o => o.status === "waiting");
  const myOrders = orders.filter(o => o.driver_id === username);

  return (
    <div className="container">
      <div className="header">
        <h2>🚴 기사</h2>
        <button onClick={logout}>로그아웃</button>
      </div>

      <div className="section-title">📦 대기 주문</div>
      {waiting.map(o => (
        <div key={o._id} className="card">
          <b>{o.store}</b>
          <p>{o.address}</p>
          <div className="status waiting">waiting</div>
          <button className="success btn" onClick={()=>accept(o._id)}>수락</button>
        </div>
      ))}

      <div className="section-title">🚴 내 주문</div>
      {myOrders.map(o => (
        <div key={o._id} className="card">
          <b>{o.store}</b>
          <p>{o.address}</p>
          <div className={`status ${o.status}`}>{o.status}</div>

          {o.status === "accepted" && (
            <button className="orange btn" onClick={()=>start(o._id)}>배달 시작</button>
          )}

          {o.status === "delivering" && (
            <button className="danger btn" onClick={()=>complete(o._id)}>완료</button>
          )}
        </div>
      ))}
    </div>
  );
}

export default RiderPage;