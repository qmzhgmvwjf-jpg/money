import React, { useEffect, useState } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";

function CustomerPage() {
  const navigate = useNavigate();

  const [menus, setMenus] = useState([]);
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [cart, setCart] = useState([]);

  const [page, setPage] = useState("order"); // order | mypage

  // =========================
  // 메뉴 불러오기
  // =========================
  const fetchMenus = async () => {
    const res = await API.get("/menus");
    setMenus(res.data);

    const uniqueStores = [...new Set(res.data.map(m => m.store))];
    setStores(uniqueStores);
  };

  useEffect(() => {
    fetchMenus();
  }, []);

  // =========================
  // 🛒 장바구니 (같은 가게만)
  // =========================
  const addToCart = (menu) => {
    if (cart.length > 0 && cart[0].store !== menu.store) {
      if (window.confirm("다른 가게입니다. 장바구니를 비우고 담을까요?")) {
        setCart([menu]);
        setSelectedStore(menu.store);
      }
    } else {
      setCart([...cart, menu]);
    }
  };

  // =========================
  // 주문하기
  // =========================
  const order = async () => {
    if (cart.length === 0) {
      alert("장바구니 비어있음");
      return;
    }

    const address = localStorage.getItem("address");

    if (!address) {
      alert("주소 먼저 입력하세요 (마이페이지)");
      return;
    }

    try {
      await API.post("/orders", {
        store: selectedStore,
        items: cart,
        address: address
      });

      alert("주문 완료!");
      setCart([]);
      setSelectedStore(null);

    } catch (err) {
      console.log(err);
      alert("주문 실패");
    }
  };

  // =========================
  // 마이페이지
  // =========================
  const [addressInput, setAddressInput] = useState(
    localStorage.getItem("address") || ""
  );

  const saveAddress = () => {
    localStorage.setItem("address", addressInput);
    alert("주소 저장됨");
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

      {/* 🔥 상단 메뉴 */}
      <div className="header">
        <h2>🍽️ 배달앱</h2>
        <div>
          <button onClick={() => setPage("order")}>주문</button>
          <button onClick={() => setPage("mypage")}>마이페이지</button>
        </div>
      </div>

      {/* =========================
          🍽️ 주문 페이지
      ========================= */}
      {page === "order" && (
        <>
          {!selectedStore && (
            <>
              <h3>🏪 가게 선택</h3>
              {stores.map((store, i) => (
                <div
                  key={i}
                  className="card"
                  onClick={() => setSelectedStore(store)}
                  style={{ cursor: "pointer" }}
                >
                  <b>{store}</b>
                </div>
              ))}
            </>
          )}

          {selectedStore && (
            <>
              <button onClick={() => setSelectedStore(null)}>
                ← 가게 목록
              </button>

              <h3>{selectedStore}</h3>

              {menus
                .filter(m => m.store === selectedStore)
                .map(m => (
                  <div key={m._id} className="card">
                    <b>{m.name}</b>
                    <p>{m.price}원</p>

                    <button onClick={() => addToCart(m)}>
                      담기
                    </button>
                  </div>
                ))}
            </>
          )}

          {/* 🛒 장바구니 */}
          <h3>🛒 장바구니</h3>

          {cart.map((c, i) => (
            <div key={i}>
              {c.name} - {c.price}원
            </div>
          ))}

          {selectedStore && (
            <button className="primary btn" onClick={order}>
              주문하기
            </button>
          )}
        </>
      )}

      {/* =========================
          👤 마이페이지
      ========================= */}
      {page === "mypage" && (
        <>
          <h3>👤 마이페이지</h3>

          <div className="card">
            <p>📍 주소</p>

            <input
              placeholder="주소 입력"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
            />

            <button onClick={saveAddress}>
              저장
            </button>
          </div>

          <button onClick={logout} style={{ marginTop: 20 }}>
            로그아웃
          </button>
        </>
      )}
    </div>
  );
}

export default CustomerPage;