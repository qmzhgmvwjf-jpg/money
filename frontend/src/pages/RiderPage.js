import React, { useEffect, useState, useCallback } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";

function RiderPage() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [prevCount, setPrevCount] = useState(0);

  const username = localStorage.getItem("username");

  // 🔐 로그아웃
  const logout = useCallback(() => {
    localStorage.clear();
    navigate("/");
  }, [navigate]);

  // 📦 주문 가져오기 + 콜 알림
  const fetchOrders = useCallback(async () => {
    try {
      const res = await API.get("/orders");

      // 🔥 최신순 정렬 (최근 주문이 위로)
      const sorted = res.data.sort(
        (a, b) => new Date(b._id) - new Date(a._id)
      );

      const waitingOrders = sorted.filter(o => o.status === "waiting");

      // 🔔 새 주문 감지
      if (waitingOrders.length > prevCount) {
        const audio = new Audio("/alert.mp3");
        audio.play();
      }

      setPrevCount(waitingOrders.length);
      setOrders(sorted);

    } catch (err) {
      console.log(err);

      if (err.response?.status === 401) {
        alert("로그인 만료");
        logout();
      } else {
        alert("서버 오류");
      }
    } finally {
      setLoading(false);
    }
  }, [logout, prevCount]);

  // 🔄 최초 + 실시간
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

  // 수락
  const accept = async (id) => {
    await API.post(`/orders/${id}/accept`);
    fetchOrders();
  };

  // 배달 시작
  const start = async (id) => {
    await API.post(`/orders/${id}/start`);
    fetchOrders();
  };

  // 완료
  const complete = async (id) => {
    await API.post(`/orders/${id}/complete`);
    fetchOrders();
  };

  const waiting = orders.filter(o => o.status === "waiting");
  const myOrders = orders.filter(o => o.driver_id === username);

  if (loading) return <h2 style={{ textAlign: "center" }}>로딩중...</h2>;

  return (
    <div className="container">
      <div className="header">
        <h2>🚴 기사</h2>
        <button onClick={logout}>로그아웃</button>
      </div>

      {/* 🔴 대기 주문 */}
      <h3>📦 대기 주문</h3>
      {waiting.map((o) => (
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
          <div className="status waiting">waiting</div>

          <button className="success btn" onClick={() => accept(o._id)}>
            수락
          </button>
        </div>
      ))}

      {/* 🟢 내 주문 */}
      <h3>🚴 내 주문</h3>
      {myOrders.map((o) => (
        <div key={o._id} className="card">
          <b>{o.store}</b>
          <p>{o.address}</p>
          <div className={`status ${o.status}`}>{o.status}</div>

          {o.status === "accepted" && (
            <button className="orange btn" onClick={() => start(o._id)}>
              배달 시작
            </button>
          )}

          {o.status === "delivering" && (
            <button className="danger btn" onClick={() => complete(o._id)}>
              완료
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export default RiderPage;