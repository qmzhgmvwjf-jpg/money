import React, { useEffect, useState } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";

function CustomerPage() {
  const navigate = useNavigate();

  const [menus, setMenus] = useState([]);
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [cart, setCart] = useState([]);

  const [page, setPage] = useState("home"); // home search cart mypage

  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");

  const [orders, setOrders] = useState([]);

  const [phone, setPhone] = useState(
    localStorage.getItem("phone") || ""
  );

  const [addressInput, setAddressInput] = useState(
    localStorage.getItem("address") || ""
  );

  // =========================
  // 데이터
  // =========================
  const fetchMenus = async () => {
    const res = await API.get("/menus");
    setMenus(res.data);

    const uniqueStores = [...new Set(res.data.map(m => m.store))];
    setStores(uniqueStores);
  };

  const fetchOrders = async () => {
    const res = await API.get("/my-orders");
    setOrders(res.data);
  };

  useEffect(() => {
    fetchMenus();
    fetchOrders();
  }, []);

  // =========================
  // 장바구니
  // =========================
  const addToCart = (menu) => {
    if (cart.length > 0 && cart[0].store !== menu.store) {
      if (window.confirm("다른 가게입니다. 장바구니 초기화할까요?")) {
        setCart([menu]);
        setSelectedStore(menu.store);
      }
    } else {
      setCart([...cart, menu]);
    }
  };

  const totalPrice = cart.reduce((sum, item) => sum + item.price, 0);

  // =========================
  // 주문
  // =========================
  const order = async () => {
    if (cart.length === 0) return alert("장바구니 비어있음");

    const address = localStorage.getItem("address");

    if (!address) return alert("주소 입력하세요");

    try {
      setLoading(true);

      await API.post("/orders", {
        store: cart[0].store,
        items: cart,
        address
      });

      alert("주문 완료!");
      setCart([]);
      navigate("/tracking");

    } catch {
      alert("주문 실패");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // 저장
  // =========================
  const saveAddress = () => {
    localStorage.setItem("address", addressInput);
    alert("주소 저장됨");
  };

  const savePhone = () => {
    localStorage.setItem("phone", phone);
    alert("번호 저장됨");
  };

  const logout = () => {
    localStorage.clear();
    navigate("/");
  };

  // =========================
  // UI
  // =========================
  return (
    <div className="container">

      {/* 🔥 상단 */}
      <div className="header">
        <h2>🚀 Delivery OS</h2>
        <p>{localStorage.getItem("address") || "주소 설정 필요"}</p>
      </div>

      {/* 🔥 검색 바 */}
      <div className="card">
        <input
          placeholder="🏪 음식점을 검색하세요"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage("search"); // 🔥 입력하면 바로 검색모드
          }}
          style={{ width: "100%", padding: 10 }}
        />
      </div>

      {/* =========================
          🏠 홈
      ========================= */}
      {page === "home" && (
        <>
          <h3>🏪 추천 가게</h3>

          {stores.map((s, i) => (
            <div
              key={i}
              className="card"
              onClick={() => setSelectedStore(s)}
            >
              {s}
            </div>
          ))}

          {selectedStore && (
            <>
              <h3>{selectedStore}</h3>

              {menus
                .filter(m => m.store === selectedStore)
                .map(m => (
                  <div key={m._id} className="card">
                    {m.name} - {m.price}
                    <button onClick={() => addToCart(m)}>담기</button>
                  </div>
                ))}
            </>
          )}
        </>
      )}

      {/* =========================
          🔍 검색
      ========================= */}
      {page === "search" && (
        <>
          <h3>🔍 검색 결과</h3>

         {stores
            .filter(s => s.includes(search))
            .map((s, i) => (
              <div
                key={i}
                className="card"
                onClick={() => {
                  setSelectedStore(s);
                  setPage("home");
                }}
              >
                {s}
              </div>
            ))}
        </>
      )}

      {/* =========================
          🛒 장바구니
      ========================= */}
      {page === "cart" && (
        <>
          <h3>🛒 장바구니</h3>

          {cart.map((c, i) => (
            <div key={i}>
              {c.name} - {c.price}
            </div>
          ))}

          <b>총 금액: {totalPrice}</b>

          <button onClick={order} disabled={loading}>
            {loading ? "주문중..." : "주문하기"}
          </button>
        </>
      )}

      {/* =========================
          👤 마이페이지
      ========================= */}
      {page === "mypage" && (
        <>
          <h3>👤 마이페이지</h3>

          <div className="card">
            주소
            <input value={addressInput} onChange={(e)=>setAddressInput(e.target.value)} />
            <button onClick={saveAddress}>저장</button>
          </div>

          <div className="card">
            전화번호
            <input value={phone} onChange={(e)=>setPhone(e.target.value)} />
            <button onClick={savePhone}>저장</button>
          </div>

          <h3>📦 주문내역</h3>
          {orders.map(o => (
            <div key={o._id} className="card">
              {o.store} - {o.status}
              <button onClick={() => navigate("/tracking")}>
                추적
              </button>
            </div>
          ))}

          <button onClick={logout}>로그아웃</button>
        </>
      )}

      {/* =========================
          🔥 하단바
      ========================= */}
<div
  style={{
    position: "fixed",
    bottom: 0,
    left: 0, // 🔥 추가
    width: "100%",
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
    background: "#fff",
    padding: "10px 0",
    borderTop: "1px solid #ddd",
    zIndex: 1000
  }}
>
  <button style={{ flex: 1 }} onClick={() => setPage("home")}>🏠 홈</button>
  <button style={{ flex: 1 }} onClick={() => setPage("search")}>🔍 검색</button>
  <button style={{ flex: 1 }} onClick={() => setPage("cart")}>🛒 장바구니</button>
  <button style={{ flex: 1 }} onClick={() => setPage("mypage")}>👤 마이</button>
</div>

    </div>
  );
}

export default CustomerPage;