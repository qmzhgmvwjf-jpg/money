import React, { useEffect, useState, useCallback } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";

function RiderPage() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [prevCount, setPrevCount] = useState(0);

  const username = localStorage.getItem("username");

  const logout = useCallback(() => {
    localStorage.clear();
    navigate("/");
  }, [navigate]);

  // 📦 주문 가져오기
  const fetchOrders = useCallback(async () => {
    try {
      const res = await API.get("/orders");

      const sorted = res.data.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );

      // 🔥 기사에게 보여줄 것만
      const dispatchOrders = sorted.filter(o => o.status === "dispatch_ready");

      // 🔔 콜 알림
      if (dispatchOrders.length > prevCount) {
        const audio = new Audio("/alert.mp3");
        audio.play();
      }

      setPrevCount(dispatchOrders.length);
      setOrders(sorted);

    } catch (err) {
      if (err.response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  }, [logout, prevCount]);

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

  // 🚀 액션
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

  // 🔥 상태 분리
  const waiting = orders.filter(o => o.status === "dispatch_ready");

  const active = orders.filter(
    o => o.driver_id === username && o.status !== "completed"
  );

  const completed = orders.filter(
    o => o.driver_id === username && o.status === "completed"
  );

  if (loading) return <h2 style={{ textAlign: "center" }}>로딩중...</h2>;

  return (
    <div className="container">
      <div className="header">
        <h2>🚴 기사</h2>
        <button onClick={logout}>로그아웃</button>
      </div>

      {/* 🔴 배차 요청 */}
      <h3>📦 배차 요청</h3>
      {waiting.map(o => (
        <div
          key={o._id}
          className="card"
          style={{
            border: "2px solid red",
            animation: "blink 1s infinite"
          }}
        >
          <b>{o.store}</b>
          <p>{o.address}</p>

          <button onClick={() => accept(o._id)}>
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
            <button onClick={() => start(o._id)}>출발</button>
          )}

          {o.status === "delivering" && (
            <button onClick={() => complete(o._id)}>완료</button>
          )}
        </div>
      ))}

      {/* ✅ 완료 */}
      <h3>✅ 완료</h3>
      {completed.map(o => (
        <div key={o._id} className="card">
          <b>{o.store}</b>
          <p>{o.address}</p>
        </div>
      ))}
    </div>
  );
}

export default RiderPage;