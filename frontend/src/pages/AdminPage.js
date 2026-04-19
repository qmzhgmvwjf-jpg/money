import React, { useEffect, useState } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";

function AdminPage() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [store, setStore] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);

  // 🔐 로그아웃
  const logout = () => {
    localStorage.clear();
    navigate("/");
  };

  // 📦 주문 불러오기
  const fetchOrders = async () => {
    try {
      const res = await API.get("/orders");
      setOrders(res.data);
    } catch (err) {
      console.log("에러:", err);

      // 🔥 토큰 문제면 강제 로그아웃
      if (err.response && err.response.status === 401) {
        alert("로그인 만료됨");
        logout();
      } else {
        alert("서버 오류");
      }
    } finally {
      setLoading(false);
    }
  };

  // 🔐 최초 진입 체크 + 실시간
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || role !== "admin") {
      navigate("/");
      return;
    }

    fetchOrders();

    const interval = setInterval(fetchOrders, 3000);
    return () => clearInterval(interval);
  }, [navigate]);

  // ➕ 주문 생성
  const createOrder = async () => {
    if (!store || !address) {
      alert("값 입력해라");
      return;
    }

    try {
      await API.post("/orders", { store, address });

      setStore("");
      setAddress("");

      fetchOrders();
    } catch (err) {
      console.log(err);

      if (err.response && err.response.status === 401) {
        alert("로그인 만료됨");
        logout();
      } else {
        alert("주문 생성 실패");
      }
    }
  };

  // ⏳ 로딩 처리 (흰 화면 방지)
  if (loading) return <h2 style={{ textAlign: "center" }}>로딩중...</h2>;

  return (
    <div className="container">
      <div className="header">
        <h2>📦 관리자</h2>
        <button onClick={logout}>로그아웃</button>
      </div>

      {/* 주문 생성 */}
      <div className="card">
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

        <button className="primary btn" onClick={createOrder}>
          주문 생성
        </button>
      </div>

      {/* 주문 리스트 */}
      {orders.map((o) => (
        <div key={o._id} className="card">
          <b>{o.store}</b>
          <p>{o.address}</p>

          <div className={`status ${o.status}`}>
            {o.status}
          </div>
        </div>
      ))}
    </div>
  );
}

export default AdminPage;