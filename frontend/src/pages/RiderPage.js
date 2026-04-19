import React, { useEffect, useState } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";

function RiderPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || role !== "driver") {
      navigate("/");
      return;
    }

    fetchOrders();
    
    // 🔥 실시간 갱신
    const interval = setInterval(fetchOrders, 3000);

    return () => clearInterval(interval);
  }, [navigate]);

  const fetchOrders = async () => {
    try {
      const res = await API.get("/orders");
      setOrders(res.data);
    } catch {
      alert("서버 오류");
    } finally {
      setLoading(false);
    }
  };

  const accept = async (id) => {
    await API.post(`/orders/${id}/accept`);
    fetchOrders();
  };

  const complete = async (id) => {
    await API.post(`/orders/${id}/complete`);
    fetchOrders();
  };

  if (loading) return <h2>로딩중...</h2>;

  return (
    <div className="container">
      <h2>🚴 기사</h2>

      {orders.map(o => (
        <div 
          key={o._id} 
          className="card"
          style={{
            border: o.status === "waiting" ? "2px solid red" : "none"
          }}
        >
          <b>{o.store}</b>
          <p>{o.address}</p>
          <p>{o.status}</p>

          {o.status === "waiting" && (
            <button className="btn-success" onClick={()=>accept(o._id)}>수락</button>
          )}

          {o.status === "accepted" && (
            <button className="btn-danger" onClick={()=>complete(o._id)}>완료</button>
          )}
        </div>
      ))}
    </div>
  );
}

export default RiderPage;