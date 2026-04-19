import React, { useEffect, useState } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";

function AdminPage() {
  const navigate = useNavigate();

  const [store, setStore] = useState("");
  const [address, setAddress] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔐 접근 보호
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || role !== "admin") {
      navigate("/");
    }
  }, [navigate]);

  // 📦 주문 불러오기
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

  // ➕ 주문 생성
  const createOrder = async () => {
    try {
      await API.post("/orders", {
        store,
        address
      });

      setStore("");
      setAddress("");

      fetchOrders();

    } catch (err) {
      alert("주문 생성 실패");
    }
  };

  if (loading) return <h2>로딩중...</h2>;

  return (
    <div style={{ padding: 20 }}>
      <h1>관리자 페이지</h1>

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

      <hr />

      {orders.map((o) => (
        <div key={o._id}>
          <p>{o.store} / {o.address}</p>
          <p>상태: {o.status}</p>
          <hr />
        </div>
      ))}
    </div>
  );
}

export default AdminPage;