import React, { useEffect, useState, useCallback } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";

function StorePage() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const username = localStorage.getItem("username");

  // 🔐 로그아웃
  const logout = useCallback(() => {
    localStorage.clear();
    navigate("/");
  }, [navigate]);

  // 📦 주문 가져오기
  const fetchOrders = useCallback(async () => {
    try {
      const res = await API.get("/orders");

      // 🔥 최신순 정렬
      const sorted = res.data.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );

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
  }, [logout]);

  // 🔄 최초 + 실시간
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || role !== "store") {
      navigate("/");
      return;
    }

    fetchOrders();

    const interval = setInterval(fetchOrders, 3000);
    return () => clearInterval(interval);
  }, [navigate, fetchOrders]);

  // 🏪 내 가게 주문만 필터
  const myOrders = orders.filter(o => o.store === username);

  // 상태별
  const pending = myOrders.filter(o => o.status === "pending");
  const accepted = myOrders.filter(o => o.status === "accepted");

  // 🟡 수락
  const acceptOrder = async (id) => {
    await API.post(`/orders/${id}/store_accept`);
    fetchOrders();
  };

  // 🔵 배차 요청
  const dispatchOrder = async (id) => {
    await API.post(`/orders/${id}/dispatch`);
    fetchOrders();
  };

  if (loading) return <h2 style={{ textAlign: "center" }}>로딩중...</h2>;

  return (
    <div className="container">
      <div className="header">
        <h2>🏪 가게 페이지</h2>
        <button onClick={logout}>로그아웃</button>
      </div>

      {/* 🟡 주문 대기 */}
      <h3>🟡 주문 요청</h3>
      {pending.map(o => (
        <div key={o._id} className="card">
          <b>{o.store}</b>
          <p>{o.address}</p>

          <h4>메뉴</h4>
          {o.items?.map((item, i) => (
            <div key={i}>
              {item.name} - {item.price}
            </div>
          ))}

          <button className="success btn" onClick={() => acceptOrder(o._id)}>
            주문 수락
          </button>
        </div>
      ))}

      {/* 🔵 배차 대기 */}
      <h3>🔵 배차 요청</h3>
      {accepted.map(o => (
        <div key={o._id} className="card">
          <b>{o.store}</b>
          <p>{o.address}</p>

          <button className="primary btn" onClick={() => dispatchOrder(o._id)}>
            기사 호출
          </button>
        </div>
      ))}
    </div>
  );
}

export default StorePage;