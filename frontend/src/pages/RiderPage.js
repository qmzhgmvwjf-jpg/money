import React, { useEffect, useState } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";

function RiderPage() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔐 접근 보호
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || role !== "driver") {
      navigate("/");
    }
  }, [navigate]);

  // 📦 주문 가져오기
  const fetchOrders = async () => {
    try {
      const res = await API.get("/orders");
      setOrders(res.data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // 🚴 수락
  const acceptOrder = async (id) => {
    try {
      await API.post(`/orders/${id}/accept`);
      fetchOrders();
    } catch {
      alert("수락 실패");
    }
  };

  // ✅ 완료
  const completeOrder = async (id) => {
    try {
      await API.post(`/orders/${id}/complete`);
      fetchOrders();
    } catch {
      alert("완료 실패");
    }
  };

  if (loading) return <h2>로딩중...</h2>;

  return (
    <div style={{ padding: 20 }}>
      <h1>기사 페이지</h1>

      {orders.map((o) => (
        <div key={o._id}>
          <p>{o.store} / {o.address}</p>
          <p>상태: {o.status}</p>

          {o.status === "waiting" && (
            <button onClick={() => acceptOrder(o._id)}>수락</button>
          )}

          {o.status === "accepted" && (
            <button onClick={() => completeOrder(o._id)}>완료</button>
          )}

          <hr />
        </div>
      ))}
    </div>
  );
}

export default RiderPage;