import React, { useEffect, useState } from "react";
import API from "../api";

function RiderPage() {
  const [orders, setOrders] = useState([]);

  const fetchOrders = async () => {
    const res = await API.get("/orders");
    setOrders(res.data);
  };

  const acceptOrder = async (id) => {
    await API.post(`/orders/${id}/accept`);
    fetchOrders();
  };

  const completeOrder = async (id) => {
    await API.post(`/orders/${id}/complete`);
    fetchOrders();
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>기사 페이지</h1>

      {orders.map((o) => (
        <div key={o._id} style={{ border: "1px solid #ccc", margin: 10 }}>
          <p>{o.store}</p>
          <p>{o.address}</p>
          <p>{o.status}</p>

          {o.status === "waiting" && (
            <button onClick={() => acceptOrder(o._id)}>
              수락
            </button>
          )}

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