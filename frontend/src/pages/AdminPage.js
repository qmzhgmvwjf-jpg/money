import React, { useState } from "react";
import API from "../api";

function AdminPage() {
  const [store, setStore] = useState("");
  const [address, setAddress] = useState("");

  const createOrder = async () => {
    await API.post("/orders", {
      store,
      address
    });

    alert("주문 생성 완료");
    setStore("");
    setAddress("");
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>관리자 페이지</h1>

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

      <button onClick={createOrder}>
        주문 생성
      </button>
    </div>
  );
}

export default AdminPage;