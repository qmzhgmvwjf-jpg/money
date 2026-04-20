import React, { useEffect, useState, useCallback } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";

function AdminPage() {
  const navigate = useNavigate();

  const [menus, setMenus] = useState([]);
  const [store, setStore] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  // 🔐 로그아웃
  const logout = useCallback(() => {
    localStorage.clear();
    navigate("/");
  }, [navigate]);

  // 🍽️ 메뉴 불러오기
  const fetchMenus = useCallback(async () => {
    try {
      const res = await API.get("/menus");
      setMenus(res.data);
    } catch (err) {
      console.log(err);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || role !== "admin") {
      navigate("/");
      return;
    }

    fetchMenus();
  }, [navigate, fetchMenus]);

  // ➕ 메뉴 등록
  const createMenu = async () => {
    if (!store || !name || !price) {
      alert("값 입력해라");
      return;
    }

    await API.post("/menus", {
      store,
      name,
      price: Number(price)
    });

    setStore("");
    setName("");
    setPrice("");

    fetchMenus();
  };

  return (
    <div className="container">
      <div className="header">
        <h2>🧑‍💼 관리자 (메뉴 관리)</h2>
        <button onClick={logout}>로그아웃</button>
      </div>

      <div className="card">
        <input
          placeholder="가게명"
          value={store}
          onChange={(e) => setStore(e.target.value)}
        />

        <input
          placeholder="메뉴명"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          placeholder="가격"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />

        <button className="primary btn" onClick={createMenu}>
          메뉴 등록
        </button>
      </div>

      <h3>📋 메뉴 목록</h3>
      {menus.map((m) => (
        <div key={m._id} className="card">
          <b>{m.store}</b>
          <p>{m.name}</p>
          <p>{m.price}원</p>
        </div>
      ))}
    </div>
  );
}

export default AdminPage;