import React, { useEffect, useState, useCallback } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";

function StorePage() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const storeName = localStorage.getItem("storeName");

  const logout = useCallback(() => {
    localStorage.clear();
    navigate("/");
  }, [navigate]);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await API.get("/orders");

      const sorted = res.data.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );

      setOrders(sorted);

    } catch (err) {
      if (err.response?.status === 401) logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    if (localStorage.getItem("role") !== "store") {
      navigate("/");
      return;
    }

    fetchOrders();
    const interval = setInterval(fetchOrders, 3000);
    return () => clearInterval(interval);
  }, [navigate, fetchOrders]);

  // 🔥 필터
  const myOrders = orders.filter(o => o.store === storeName);

  const pending = myOrders.filter(o => o.status === "pending");
  const accepted = myOrders.filter(o => o.status === "accepted");
  const dispatch = myOrders.filter(o => o.status === "dispatch_ready");
  const assigned = myOrders.filter(o => o.status === "assigned");

  // 수락
  const acceptOrder = async (id) => {
    await API.post(`/orders/${id}/store_accept`);
    fetchOrders();
  };

  // 거절
  const rejectOrder = async (id) => {
    await API.post(`/orders/${id}/reject`);
    fetchOrders();
  };

  // 배차 요청
  const dispatchOrder = async (id) => {
    await API.post(`/orders/${id}/dispatch`);
    fetchOrders();
  };

  if (loading) return <h2>로딩중...</h2>;

  return (
    <div className="container">

      <div className="header">
        <h2>🏪 {storeName}</h2>
        <button onClick={logout}>로그아웃</button>
      </div>

      {/* 🟡 주문 요청 */}
      <h3>🟡 주문 요청</h3>
      {pending.map(o => (
        <div key={o._id} className="card">
          <p>{o.address}</p>

          {o.items?.map((item, i) => (
            <div key={i}>{item.name} - {item.price}</div>
          ))}

          <button onClick={() => acceptOrder(o._id)}>수락</button>
          <button onClick={() => rejectOrder(o._id)}>거절</button>
        </div>
      ))}

      {/* 🔵 수락됨 */}
      <h3>🔵 수락됨</h3>
      {accepted.map(o => (
        <div key={o._id} className="card">
          <p>{o.address}</p>
          <button onClick={() => dispatchOrder(o._id)}>기사 호출</button>
        </div>
      ))}

      {/* 🚚 배차 요청됨 */}
      <h3>🚚 배차 요청됨</h3>
      {dispatch.map(o => (
        <div key={o._id} className="card">
          <p>{o.address}</p>
        </div>
      ))}

      {/* 🏍 기사 배정됨 */}
      <h3>🏍 기사 배정</h3>
      {assigned.map(o => (
        <div key={o._id} className="card">
          <p>{o.address}</p>
          <p>기사: {o.driver_id}</p>
        </div>
      ))}

    </div>
  );
}

export default StorePage;