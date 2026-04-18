import React, { useEffect, useState } from "react";
import API from "../api";
import OrderItem from "../components/OrderItem";

function RiderPage() {
  const [orders, setOrders] = useState([]);

  const fetchOrders = async () => {
    const res = await API.get("/orders");
    setOrders(res.data);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>기사 페이지</h1>

      {orders.map((order) => (
        <OrderItem
          key={order._id}
          order={order}
          refresh={fetchOrders}
        />
      ))}
    </div>
  );
}

export default RiderPage;