import React from "react";
import API from "../api";

function OrderItem({ order, refresh }) {
  const acceptOrder = async () => {
    await API.put(`/orders/${order._id}/accept`);
    refresh();
  };

  return (
    <div style={{ border: "1px solid gray", margin: 10, padding: 10 }}>
      <p>가게: {order.store}</p>
      <p>주소: {order.address}</p>
      <p>상태: {order.status}</p>

      {order.status === "pending" && (
        <button onClick={acceptOrder}>
          수락
        </button>
      )}
    </div>
  );
}

export default OrderItem;