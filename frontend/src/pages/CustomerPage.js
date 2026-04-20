import React, { useEffect, useState } from "react";
import API from "../api";

function CustomerPage() {
  const [menus, setMenus] = useState([]);
  const [cart, setCart] = useState([]);

  // 메뉴 불러오기
  const fetchMenus = async () => {
    const res = await API.get("/menus");
    setMenus(res.data);
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

    await API.post("/orders", {
      store: cart[0].store,
      items: cart
    });

    alert("주문 완료!");
    setCart([]);
  };

  return (
    <div className="container">
      <h2>🍽️ 주문하기</h2>

      {/* 메뉴 리스트 */}
      {menus.map((m) => (
        <div key={m._id} className="card">
          <b>{m.name}</b>
          <p>{m.price}원</p>

          <button onClick={() => addToCart(m)}>
            담기
          </button>
        </div>
      ))}

      {/* 장바구니 */}
      <h3>🛒 장바구니</h3>
      {cart.map((c, i) => (
        <div key={i}>
          {c.name} - {c.price}
        </div>
      ))}

      <button className="primary btn" onClick={order}>
        주문하기
      </button>
    </div>
  );
}

export default CustomerPage;