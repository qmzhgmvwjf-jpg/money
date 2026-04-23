import React, { useCallback, useEffect, useState } from "react";
import API from "../../api";

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("ko-KR");
}

function StoresTab() {
  const [stores, setStores] = useState([]);
  const [form, setForm] = useState({
    username: "",
    password: "",
    phone: "",
    storeName: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    storeName: "",
    phone: "",
    storeStatus: "open",
  });
  const [selectedStoreId, setSelectedStoreId] = useState(null);

  const fetchStores = useCallback(async () => {
    const res = await API.get("/stores");
    setStores(res.data);
    if (!selectedStoreId && res.data.length > 0) {
      setSelectedStoreId(res.data[0]._id);
    }
  }, [selectedStoreId]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  const createStore = async () => {
    if (!form.username || !form.password || !form.phone || !form.storeName) {
      alert("가게 정보를 모두 입력하세요.");
      return;
    }

    await API.post("/stores", {
      ...form,
      storeStatus: "open",
    });
    setForm({
      username: "",
      password: "",
      phone: "",
      storeName: "",
    });
    fetchStores();
  };

  const startEdit = (store) => {
    setEditingId(store._id);
    setEditForm({
      storeName: store.storeName || "",
      phone: store.phone || "",
      storeStatus: store.storeStatus || "open",
    });
  };

  const updateStore = async () => {
    await API.put(`/stores/${editingId}`, editForm);
    setEditingId(null);
    fetchStores();
  };

  const toggleStatus = async (store) => {
    const nextStatus = store.storeStatus === "open" ? "closed" : "open";
    await API.put(`/stores/${store._id}`, { storeStatus: nextStatus });
    fetchStores();
  };

  const deleteStore = async (id) => {
    if (!window.confirm("가게를 삭제할까요?")) return;
    await API.delete(`/stores/${id}`);
    fetchStores();
  };

  const selectedStore = stores.find((store) => store._id === selectedStoreId);

  return (
    <>
      <h3>🏪 가맹점 관리</h3>

      <div className="card">
        <h4>가게 등록</h4>
        <input
          placeholder="가게 계정 아이디"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <input
          placeholder="전화번호"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <input
          placeholder="가게명"
          value={form.storeName}
          onChange={(e) => setForm({ ...form, storeName: e.target.value })}
        />
        <button className="primary full-width-btn" onClick={createStore}>
          가게 등록
        </button>
      </div>

      <div className="card">
        <h4>가게 리스트</h4>
        {stores.map((store) => (
          <div key={store._id} className="mini-card">
            {editingId === store._id ? (
              <>
                <input
                  value={editForm.storeName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, storeName: e.target.value })
                  }
                />
                <input
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm({ ...editForm, phone: e.target.value })
                  }
                />
                <select
                  value={editForm.storeStatus}
                  onChange={(e) =>
                    setEditForm({ ...editForm, storeStatus: e.target.value })
                  }
                >
                  <option value="open">영업중</option>
                  <option value="closed">중지</option>
                </select>
                <button onClick={updateStore}>저장</button>
                <button onClick={() => setEditingId(null)}>취소</button>
              </>
            ) : (
              <div className="admin-row">
                <div>
                  <b>{store.storeName}</b>
                  <p>계정: {store.username}</p>
                  <p>전화번호: {store.phone}</p>
                  <p>상태: {store.storeStatus === "open" ? "영업중" : "중지"}</p>
                  <p>매출: {store.sales?.toLocaleString()}원</p>
                </div>
                <div>
                  <button onClick={() => setSelectedStoreId(store._id)}>내역</button>
                  <button onClick={() => startEdit(store)}>수정</button>
                  <button onClick={() => toggleStatus(store)}>
                    {store.storeStatus === "open" ? "중지" : "영업중"}
                  </button>
                  <button className="danger" onClick={() => deleteStore(store._id)}>
                    삭제
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedStore && (
        <div className="card">
          <h4>{selectedStore.storeName} 운영 현황</h4>
          <p>누적 주문: {selectedStore.orderCount}건</p>
          <p>누적 매출: {selectedStore.sales?.toLocaleString()}원</p>

          <h4>메뉴</h4>
          {selectedStore.menus?.length > 0 ? (
            selectedStore.menus.map((menu) => (
              <div key={menu._id} className="mini-card">
                {menu.name} - {menu.price}원
              </div>
            ))
          ) : (
            <p>등록된 메뉴 없음</p>
          )}

          <h4>주문 내역</h4>
          {selectedStore.orders?.length > 0 ? (
            selectedStore.orders.map((order) => (
              <div key={order._id} className="mini-card">
                <p>{order.order_id}</p>
                <p>{formatDate(order.created_at)}</p>
                <p>{order.customer_name} / {order.phone}</p>
                <p>{order.address}</p>
                <p>{order.total_price?.toLocaleString()}원 / {order.status}</p>
              </div>
            ))
          ) : (
            <p>주문 내역 없음</p>
          )}
        </div>
      )}
    </>
  );
}

export default StoresTab;
