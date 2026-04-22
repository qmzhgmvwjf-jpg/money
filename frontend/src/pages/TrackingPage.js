import React, { useEffect, useState } from "react";
import API from "../api";

const steps = [
  "pending",
  "accepted",
  "dispatch_ready",
  "assigned",
  "delivering",
  "completed"
];

const labels = {
  pending: "주문 완료",
  accepted: "가게 수락",
  dispatch_ready: "배차 중",
  assigned: "기사 배정",
  delivering: "배달 중",
  completed: "배달 완료"
};

function TrackingPage() {
  const [orders, setOrders] = useState([]);

  const fetchOrders = async () => {
    const res = await API.get("/my-orders");
    setOrders(res.data);
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container">
      <h2>📦 주문 추적</h2>

      {orders.map(o => {
        const currentIndex = steps.indexOf(o.status);

        return (
          <div key={o._id} className="card">
            <b>{o.store}</b>

            <div style={{ marginTop: 10 }}>
              {steps.map((s, i) => (
                <div
                  key={s}
                  style={{
                    padding: 5,
                    color: i <= currentIndex ? "green" : "gray",
                    fontWeight: i === currentIndex ? "bold" : "normal"
                  }}
                >
                  {i <= currentIndex ? "✔ " : "○ "} {labels[s]}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default TrackingPage;