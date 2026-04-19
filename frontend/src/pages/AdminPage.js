import React, { useEffect, useState } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";

function AdminPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [store, setStore] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);

  // 로그인 체크
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || role !== "admin") {
      navigate("/");
      return;
    }

    fetchOrders();
  }, []);

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

  const createOrder = async () => {
    if (!store || !address) return;

    await API.post("/orders", { store, address });
    setStore("");
    setAddress("");
    fetchOrders();
  };

  if (loading) return <h2>로딩중...</h2>;

  return (
    <div className="container">
      <h2>📦 관리자</h2>

      <div className="card">
        <input placeholder="가게" value={store} onChange={(e)=>setStore(e.target.value)} />
        <input placeholder="주소" value={address} onChange={(e)=>setAddress(e.target.value)} />
        <button className="btn-primary" onClick={createOrder}>주문 생성</button>
      </div>

      {orders.map(o => (
        <div key={o._id} className="card">
          <b>{o.store}</b>
          <p>{o.address}</p>
          <p>상태: {o.status}</p>
        </div>
      ))}
    </div>
  );
}

export default AdminPage;