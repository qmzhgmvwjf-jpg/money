import React, { useEffect, useState } from "react";
import API from "../api";

function CustomerPage() {
  const [menus, setMenus] = useState([]);
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [cart, setCart] = useState([]);

  // 메뉴 불러오기
  const fetchMenus = async () => {
    const res = await API.get("/menus");
    setMenus(res.data);

    // 🔥 가게 목록 추출 (중복 제거)
    const uniqueStores = [...new Set(res.data.map(m => m.store))];
    setStores(uniqueStores);
  };

  useEffect(() => {
    fetchMenus();
  }, []);

  // 장바구니 추가
  const addToCart = (menu) => {
    setCart([...cart, menu]);
  };

  // 주문하기
  const order = async () => {
    if (cart.length === 0) {
      alert("장바구니 비어있음");
      return;
    }

    try {
      await API.post("/orders", {
        store: selectedStore, // 🔥 선택한 가게
        items: cart
      });

      alert("주문 완료!");
      setCart([]);
      setSelectedStore(null);

    } catch (err) {
      console.log(err);
      alert("주문 실패");
    }
  };

  return (
    <div className="container">
      <h2>🍽️ 주문하기</h2>

      {/* =========================
          🏪 가게 목록
      ========================= */}
      {!selectedStore && (
        <>
          <h3>🏪 가게 선택</h3>

          {stores.map((store, i) => (
            <div
              key={i}
              className="card"
              style={{ cursor: "pointer" }}
              onClick={() => setSelectedStore(store)}
            >
              <b>{store}</b>
            </div>
          ))}
        </>
      )}

      {/* =========================
          🍽️ 메뉴 목록
      ========================= */}
      {selectedStore && (
        <>
          <button onClick={() => setSelectedStore(null)}>
            ← 가게 목록으로
          </button>

          <h3>🍽️ {selectedStore}</h3>

          {menus
            .filter(m => m.store === selectedStore)
            .map((m) => (
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

      {/* =========================
          🛒 장바구니
      ========================= */}
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
    </div>
  );
}

export default CustomerPage;