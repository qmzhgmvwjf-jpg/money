import React, { useState, useEffect } from "react";
import API from "../api";

function AdminPage() {
  const [store, setStore] = useState("");
  const [address, setAddress] = useState("");
  const [orders, setOrders] = useState([]);

  // 주문 가져오기
  const fetchOrders = async () => {
    try {
      const res = await API.get("/orders");
      setOrders(res.data);
    } catch (err) {
      console.log(err);
      alert("주문 불러오기 실패");
    }
  };

  // 주문 생성
  const createOrder = async () => {
    try {
      await API.post("/orders", { store, address });
      alert("주문 생성 완료");
      setStore("");
      setAddress("");
      fetchOrders(); // 생성 후 새로고침
    } catch {
      alert("권한 없음 또는 오류");
    }
  };

  // 처음 로딩 시 주문 불러오기
  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>관리자 페이지</h1>

      {/* 주문 생성 */}
      <div style={{ marginBottom: 20 }}>
        <input
          placeholder="가게명"
          value={store}
          onChange={(e) => setStore(e.target.value)}
        />

        <input
          placeholder="주소"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />

        <button onClick={createOrder}>주문 생성</button>
      </div>

      {/* 새로고침 버튼 */}
      <button onClick={fetchOrders}>새로고침</button>

      {/* 주문 리스트 */}
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
          <p><b>기사:</b> {o.driver_id || "없음"}</p>
        </div>
      ))}
    </div>
  );
}

export default AdminPage;