import React, { useEffect, useState, useCallback } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";

function AdminPage() {
  const navigate = useNavigate();

  const [tab, setTab] = useState("store");

  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);

  const [menus, setMenus] = useState([]);
  const [orders, setOrders] = useState([]);

  const [stats, setStats] = useState(null);

  const [storeName, setStoreName] = useState("");
  const [menuName, setMenuName] = useState("");
  const [price, setPrice] = useState("");

  const [editMenuId, setEditMenuId] = useState(null);

  // 🔐 로그아웃
  const logout = useCallback(() => {
    localStorage.clear();
    navigate("/");
  }, [navigate]);

  // =========================
  // 🔥 데이터 불러오기
  // =========================
  const fetchStores = async () => {
    const res = await API.get("/menus");
    const uniqueStores = [...new Set(res.data.map(m => m.store))];
    setStores(uniqueStores);
  };

  const fetchMenus = async () => {
    const res = await API.get("/menus");
    setMenus(res.data);
  };

  const fetchOrders = async () => {
    const res = await API.get("/orders");

    const sorted = res.data.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    setOrders(sorted);
  };

  const fetchStats = async () => {
    try {
      const res = await API.get("/stats");
      setStats(res.data);
    } catch {
      console.log("통계 없음");
    }
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
    fetchStats();
  }, [navigate]);

  // =========================
  // 🏪 가게 관리
  // =========================
  const createStore = () => {
    if (!storeName) return;

    setStores(prev => [...prev, storeName]);
    setStoreName("");
  };

  const deleteStore = (name) => {
    if (!window.confirm("가게 삭제?")) return;

    const filteredMenus = menus.filter(m => m.store !== name);
    setMenus(filteredMenus);

    fetchStores();
  };

  // =========================
  // 🍽 메뉴 관리
  // =========================
  const createMenu = async () => {
    if (!selectedStore || !menuName || !price) {
      alert("값 입력");
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

  const deleteMenu = async (id) => {
    if (!window.confirm("삭제?")) return;

    await API.delete(`/menus/${id}`);
    fetchMenus();
  };

  const startEditMenu = (m) => {
    setEditMenuId(m._id);
    setMenuName(m.name);
    setPrice(m.price);
  };

  const updateMenu = async () => {
    await API.put(`/menus/${editMenuId}`, {
      name: menuName,
      price: Number(price)
    });

    setEditMenuId(null);
    setMenuName("");
    setPrice("");
    fetchMenus();
  };

  // =========================
  // 📦 주문 관리
  // =========================
  const deleteOrder = async (id) => {
    if (!window.confirm("삭제?")) return;

    await API.delete(`/orders/${id}`);
    fetchOrders();
    fetchStats();
  };

  const changeStatus = async (id, status) => {
    await API.put(`/orders/${id}/status`, { status });
    fetchOrders();
    fetchStats();
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

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button onClick={() => setTab("store")}>가게</button>
        <button onClick={() => setTab("menu")}>메뉴</button>
        <button onClick={() => setTab("order")}>주문</button>
        <button onClick={() => setTab("stats")}>통계</button>
      </div>

      {/* =========================
          🏪 가게
      ========================= */}
      {tab === "store" && (
        <>
          <div className="card">
            <input
              placeholder="가게명"
              value={storeName}
              onChange={(e)=>setStoreName(e.target.value)}
            />
            <button onClick={createStore}>등록</button>
          </div>

          {stores.map((s, i) => (
            <div key={i} className="card">
              <b>{s}</b>
              <button onClick={()=>setSelectedStore(s)}>선택</button>
              <button onClick={()=>deleteStore(s)}>삭제</button>
            </div>
          ))}
        </>
      )}

      {/* =========================
          🍽 메뉴
      ========================= */}
      {tab === "menu" && (
        <>
          <h3>{selectedStore || "가게 선택"}</h3>

          <div className="card">
            <input
              placeholder="메뉴명"
              value={menuName}
              onChange={(e)=>setMenuName(e.target.value)}
            />

            <input
              placeholder="가격"
              value={price}
              onChange={(e)=>setPrice(e.target.value)}
            />

            {editMenuId ? (
              <button onClick={updateMenu}>수정</button>
            ) : (
              <button onClick={createMenu}>등록</button>
            )}
          </div>

          {menus
            .filter(m=>m.store===selectedStore)
            .map(m=>(
              <div key={m._id} className="card">
                {m.name} - {m.price}원

                <button onClick={()=>startEditMenu(m)}>수정</button>
                <button onClick={()=>deleteMenu(m._id)}>삭제</button>
              </div>
          ))}
        </>
      )}

      {/* =========================
          📦 주문
      ========================= */}
      {tab === "order" && (
        <>
          {orders.map(o => (
            <div key={o._id} className="card">
              <b>{o.store}</b>
              <p>{o.address}</p>
              <p>상태: {o.status}</p>

              <select
                value={o.status}
                onChange={(e)=>changeStatus(o._id, e.target.value)}
              >
                <option value="pending">pending</option>
                <option value="accepted">accepted</option>
                <option value="dispatch_ready">dispatch_ready</option>
                <option value="assigned">assigned</option>
                <option value="delivering">delivering</option>
                <option value="completed">completed</option>
              </select>

              <button onClick={()=>deleteOrder(o._id)}>삭제</button>
            </div>
          ))}
        </>
      )}

      {/* =========================
          📊 통계
      ========================= */}
      {tab === "stats" && stats && (
        <>
          <div className="card">
            <p>총 주문: {stats.total_orders}</p>
            <p>오늘 주문: {stats.today_orders}</p>
            <p>총 매출: {stats.total_sales}원</p>
          </div>

          <h3>🏪 가게 매출</h3>
          {Object.entries(stats.store_sales).map(([k,v]) => (
            <div key={k} className="card">
              {k} - {v}원
            </div>
          ))}

          <h3>📦 상태</h3>
          {Object.entries(stats.status_count).map(([k,v]) => (
            <div key={k} className="card">
              {k} - {v}
            </div>
          ))}
        </>
      )}

    </div>
  );
}

export default AdminPage;