import React, { useEffect, useState, useCallback } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";

function RiderPage() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const username = localStorage.getItem("username");

  const logout = useCallback(() => {
    localStorage.clear();
    navigate("/");
  }, [navigate]);

  // 🔥 주문 가져오기 + 최신순 정렬
  const fetchOrders = useCallback(async () => {
    try {
      const res = await API.get("/orders");

      const sorted = res.data.sort(
        (a, b) => new Date(b._id) - new Date(a._id)
      );

      setOrders(sorted);

    } catch (err) {
      if (err.response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  }, [logout]);

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
  }, [navigate, fetchOrders]);

  // 액션
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

  // 🔥 상태별 분리 + 정렬
  const waiting = orders.filter(o => o.status === "waiting");

  const active = orders
    .filter(o => o.driver_id === username && o.status !== "completed")
    .sort((a, b) => new Date(b._id) - new Date(a._id)); // 👉 항상 위로

  const completed = orders
    .filter(o => o.driver_id === username && o.status === "completed")
    .sort((a, b) => new Date(b._id) - new Date(a._id));

  if (loading) return <h2 style={{ textAlign: "center" }}>로딩중...</h2>;

  return (
    <div className="container">
      <div className="header">
        <h2>🚴 기사</h2>
        <button onClick={logout}>로그아웃</button>
      </div>

      {/* 📦 대기 주문 */}
      <h3>📦 대기 주문</h3>
      {waiting.map(o => (
        <div key={o._id} className="card">
          <b>{o.store}</b>
          <p>{o.address}</p>

          <button className="success btn" onClick={() => accept(o._id)}>
            수락
          </button>
        </div>
      ))}

      {/* 🚴 진행중 */}
      <h3>🚴 진행중</h3>
      {active.map(o => (
        <div key={o._id} className="card">
          <b>{o.store}</b>
          <p>{o.address}</p>

          {o.status === "accepted" && (
            <button onClick={() => start(o._id)}>배달 시작</button>
          )}

          {o.status === "delivering" && (
            <button onClick={() => complete(o._id)}>완료</button>
          )}
        </div>
      ))}

      {/* ✅ 완료 */}
      <h3>✅ 완료된 주문</h3>
      {completed.map(o => (
        <div key={o._id} className="card">
          <b>{o.store}</b>
          <p>{o.address}</p>
          <div className="status completed">완료됨</div>
        </div>
      ))}
    </div>
  );
}

export default RiderPage;