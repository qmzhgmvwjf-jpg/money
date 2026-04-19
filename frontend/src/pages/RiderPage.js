import React, { useEffect, useState } from "react";
import API from "../api";

function RiderPage() {
  const [orders, setOrders] = useState([]);

  // 로그아웃
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = "/";
  };

  // 주문 가져오기
  const fetchOrders = async () => {
    try {
      const res = await API.get("/orders");
      setOrders(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  // 수락
  const acceptOrder = async (id) => {
    try {
      await API.post(`/orders/${id}/accept`);
      fetchOrders();
    } catch (err) {
      alert("수락 실패");
    }
  };

  // 완료
  const completeOrder = async (id) => {
    try {
      await API.post(`/orders/${id}/complete`);
      fetchOrders();
    } catch (err) {
      alert("완료 실패");
    }
  };

  // 자동 새로고침
  useEffect(() => {
    fetchOrders();

    const interval = setInterval(fetchOrders, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>기사 페이지</h1>

      <button onClick={logout}>로그아웃</button>

      <h2>주문 목록</h2>

      {orders.map((o) => (
        <div
          key={o._id}
          style={{
            border: "1px solid #ccc",
            margin: 10,
            padding: 10,
            borderRadius: 8
          }}
        >
          <p><b>가게:</b> {o.store}</p>
          <p><b>주소:</b> {o.address}</p>
          <p>
            <b>상태:</b>{" "}
            {o.status === "waiting" && "🟡 대기"}
            {o.status === "accepted" && "🟢 배달중"}
            {o.status === "completed" && "⚫ 완료"}
          </p>

          {/* 대기 상태 → 수락 */}
          {o.status === "waiting" && (
            <button onClick={() => acceptOrder(o._id)}>
              수락
            </button>
          )}

          {/* 내가 수락한 것만 완료 */}
          {o.status === "accepted" && (
            <button onClick={() => completeOrder(o._id)}>
              완료
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export default RiderPage;