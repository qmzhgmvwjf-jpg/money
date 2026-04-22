import React, { useEffect, useState } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);

  // =========================
  // 주문 가져오기
  // =========================
  const fetchOrders = async () => {
    const res = await API.get("/my-orders");

    const sorted = res.data.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    setOrders(sorted);
  };

  useEffect(() => {
    fetchOrders();

    const interval = setInterval(fetchOrders, 3000);
    return () => clearInterval(interval);
  }, []);

  // =========================
  // 이동
  // =========================
  const goBack = () => {
    navigate("/customer");
  };

  const goHome = () => {
    navigate("/customer");
  };

  // =========================
  // UI
  // =========================
  return (
    <div className="container">

      {/* 🔥 상단 바 */}
      <div className="header">
        <button onClick={goBack}>← 뒤로가기</button>
        <h2>📦 주문 추적</h2>
        <button onClick={goHome}>홈</button>
      </div>

      {/* =========================
          주문 리스트
      ========================= */}
      {orders.length === 0 && (
        <div className="card">
          주문 내역 없음
        </div>
      )}

      {orders.map(o => {
        const currentIndex = steps.indexOf(o.status);

        return (
          <div key={o._id} className="card">
            <b>{o.store}</b>
            <p>현재 상태: {labels[o.status]}</p>

            {/* 🔥 상태 진행 UI */}
            <div style={{ marginTop: 10 }}>
              {steps.map((s, i) => (
                <div
                  key={s}
                  style={{
                    padding: 6,
                    borderRadius: 5,
                    marginBottom: 4,
                    backgroundColor:
                      i < currentIndex
                        ? "#d4edda"
                        : i === currentIndex
                        ? "#cce5ff"
                        : "#f1f1f1",
                    fontWeight: i === currentIndex ? "bold" : "normal"
                  }}
                >
                  {i < currentIndex && "✔ "}
                  {i === currentIndex && "👉 "}
                  {i > currentIndex && "○ "}
                  {labels[s]}
                </div>
              ))}
            </div>

            {/* 🔥 완료 시 버튼 */}
            {o.status === "completed" && (
              <button
                style={{ marginTop: 10 }}
                onClick={() => navigate("/customer")}
              >
                다시 주문하기
              </button>
            )}
          </div>
        );
      })}

    </div>
  );
}

export default TrackingPage;