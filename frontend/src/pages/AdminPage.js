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

  const [storeName, setStoreName] = useState("");
  const [menuName, setMenuName] = useState("");
  const [price, setPrice] = useState("");

  const [editMenuId, setEditMenuId] = useState(null);

  const logout = useCallback(() => {
    localStorage.clear();
    navigate("/");
  }, [navigate]);

  // =========================
  // 불러오기
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
    setOrders(res.data);
  };

  useEffect(() => {
    if (localStorage.getItem("role") !== "admin") {
      navigate("/");
      return;
    }

    fetchStores();
    fetchMenus();
    fetchOrders();
  }, [navigate]);

  // =========================
  // 가게
  // =========================
  const createStore = () => {
    if (!storeName) return;
    setStores([...stores, storeName]);
    setStoreName("");
  };

  const deleteStore = (name) => {
    if (!window.confirm("가게 삭제?")) return;

    const newMenus = menus.filter(m => m.store !== name);
    setMenus(newMenus);

    fetchStores();
  };

  // =========================
  // 메뉴
  // =========================
  const createMenu = async () => {
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
  // 주문 관리
  // =========================
  const deleteOrder = async (id) => {
    await API.delete(`/orders/${id}`);
    fetchOrders();
  };

  const changeStatus = async (id, status) => {
    await API.put(`/orders/${id}/status`, { status });
    fetchOrders();
  };

  return (
    <div className="container">

      <div className="header">
        <h2>🧑‍💼 관리자</h2>
        <button onClick={logout}>로그아웃</button>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
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
            <input value={storeName} onChange={(e)=>setStoreName(e.target.value)} />
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
          🍽 메뉴 관리
      ========================= */}
      {tab === "menu" && (
        <>
          <h3>{selectedStore}</h3>

          <div className="card">
            <input value={menuName} onChange={(e)=>setMenuName(e.target.value)} />
            <input value={price} onChange={(e)=>setPrice(e.target.value)} />

            {editMenuId ? (
              <button onClick={updateMenu}>수정</button>
            ) : (
              <button onClick={createMenu}>등록</button>
            )}
          </div>

          {menus.filter(m=>m.store===selectedStore).map(m=>(
            <div key={m._id} className="card">
              {m.name} - {m.price}

              <button onClick={()=>startEditMenu(m)}>수정</button>
              <button onClick={()=>deleteMenu(m._id)}>삭제</button>
            </div>
          ))}
        </>
      )}

      {/* =========================
          📦 주문 관리
      ========================= */}
      {tab === "order" && (
        <>
          {orders.map(o => (
            <div key={o._id} className="card">
              <b>{o.store}</b>
              <p>{o.address}</p>
              <p>{o.status}</p>

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

    </div>
  );
}

export default AdminPage;