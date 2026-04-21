import React, { useEffect, useState, useCallback } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";

function AdminPage() {
  const navigate = useNavigate();

  const [tab, setTab] = useState("store"); // store | menu | order

  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);

  const [menus, setMenus] = useState([]);
  const [orders, setOrders] = useState([]);

  const [storeName, setStoreName] = useState("");
  const [menuName, setMenuName] = useState("");
  const [price, setPrice] = useState("");

  // 🔐 로그아웃
  const logout = useCallback(() => {
    localStorage.clear();
    navigate("/");
  }, [navigate]);

  // =========================
  // 가게 불러오기
  // =========================
  const fetchStores = async () => {
    const res = await API.get("/menus");

    // 메뉴에서 store만 추출 (중복 제거)
    const uniqueStores = [...new Set(res.data.map(m => m.store))];
    setStores(uniqueStores);
  };

  // =========================
  // 메뉴 불러오기
  // =========================
  const fetchMenus = async () => {
    const res = await API.get("/menus");
    setMenus(res.data);
  };

  // =========================
  // 주문 불러오기
  // =========================
  const fetchOrders = async () => {
    const res = await API.get("/orders");
    setOrders(res.data);
  };

  useEffect(() => {
    const role = localStorage.getItem("role");

    if (role !== "admin") {
      navigate("/");
      return;
    }

    fetchStores();
    fetchMenus();
    fetchOrders();
  }, [navigate]);

  // =========================
  // 가게 등록
  // =========================
  const createStore = () => {
    if (!storeName) return;

    setStores([...stores, storeName]);
    setStoreName("");
  };

  // =========================
  // 메뉴 등록
  // =========================
  const createMenu = async () => {
    if (!selectedStore || !menuName || !price) {
      alert("값 입력해라");
      return;
    }

    await API.post("/menus", {
      store: selectedStore,
      name: menuName,
      price: Number(price)
    });

    setMenuName("");
    setPrice("");
    fetchMenus();
  };

  // =========================
  // UI
  // =========================
  return (
    <div className="container">

      <div className="header">
        <h2>🧑‍💼 관리자</h2>
        <button onClick={logout}>로그아웃</button>
      </div>

      {/* 🔥 탭 */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button onClick={() => setTab("store")}>가게관리</button>
        <button onClick={() => setTab("menu")}>메뉴관리</button>
        <button onClick={() => setTab("order")}>주문관리</button>
      </div>

      {/* =========================
          🏪 가게 관리
      ========================= */}
      {tab === "store" && (
        <>
          <div className="card">
            <input
              placeholder="가게 이름"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
            />
            <button onClick={createStore}>가게 등록</button>
          </div>

          <h3>📋 가게 목록</h3>
          {stores.map((s, i) => (
            <div
              key={i}
              className="card"
              style={{
                cursor: "pointer",
                border: selectedStore === s ? "2px solid blue" : "1px solid #ddd"
              }}
              onClick={() => {
                setSelectedStore(s);
                setTab("menu");
              }}
            >
              {s}
            </div>
          ))}
        </>
      )}

      {/* =========================
          🍽️ 메뉴 관리
      ========================= */}
      {tab === "menu" && (
        <>
          <h3>🍽️ {selectedStore || "가게 선택 필요"}</h3>

          {selectedStore && (
            <div className="card">
              <input
                placeholder="메뉴명"
                value={menuName}
                onChange={(e) => setMenuName(e.target.value)}
              />
              <input
                placeholder="가격"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
              <button onClick={createMenu}>메뉴 추가</button>
            </div>
          )}

          <h3>📋 메뉴 목록</h3>
          {menus
            .filter(m => m.store === selectedStore)
            .map((m) => (
              <div key={m._id} className="card">
                <b>{m.name}</b>
                <p>{m.price}원</p>
              </div>
            ))}
        </>
      )}

      {/* =========================
          📦 주문 관리
      ========================= */}
      {tab === "order" && (
        <>
          <h3>📦 전체 주문</h3>

          {orders.map((o) => (
            <div key={o._id} className="card">
              <b>{o.store}</b>
              <p>{o.address}</p>
              <p>상태: {o.status}</p>
              <p>기사: {o.driver_id || "없음"}</p>
            </div>
          ))}
        </>
      )}

    </div>
  );
}

export default AdminPage;