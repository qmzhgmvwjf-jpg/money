import React, { useEffect, useState } from "react";
import API from "../../api";

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
  const [menuForm, setMenuForm] = useState({
    storeName: "",
    name: "",
    price: "",
  });
  const [editingMenuId, setEditingMenuId] = useState(null);

  const fetchStores = async () => {
    const res = await API.get("/stores");
    setStores(res.data);
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const createStore = async () => {
    if (!form.username || !form.password || !form.phone || !form.storeName) {
      alert("가게 등록 정보를 모두 입력하세요.");
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

  const toggleStoreStatus = async (store) => {
    const nextStatus = store.storeStatus === "open" ? "closed" : "open";
    await API.put(`/stores/${store._id}`, { storeStatus: nextStatus });
    fetchStores();
  };

  const deleteStore = async (id) => {
    if (!window.confirm("가게를 삭제할까요? 등록 메뉴도 함께 삭제됩니다.")) return;

    await API.delete(`/stores/${id}`);
    fetchStores();
  };

  const startCreateMenu = (store) => {
    setEditingMenuId(null);
    setMenuForm({
      storeName: store.storeName,
      name: "",
      price: "",
    });
  };

  const startEditMenu = (store, menu) => {
    setEditingMenuId(menu._id);
    setMenuForm({
      storeName: store.storeName,
      name: menu.name,
      price: String(menu.price),
    });
  };

  const saveMenu = async () => {
    if (!menuForm.storeName || !menuForm.name || !menuForm.price) {
      alert("메뉴 정보를 입력하세요.");
      return;
    }

    if (editingMenuId) {
      await API.put(`/menus/${editingMenuId}`, {
        name: menuForm.name,
        price: Number(menuForm.price),
      });
    } else {
      await API.post("/menus", {
        store: menuForm.storeName,
        name: menuForm.name,
        price: Number(menuForm.price),
      });
    }

    setEditingMenuId(null);
    setMenuForm({
      storeName: "",
      name: "",
      price: "",
    });
    fetchStores();
  };

  const deleteMenu = async (id) => {
    if (!window.confirm("메뉴를 삭제할까요?")) return;

    await API.delete(`/menus/${id}`);
    fetchStores();
  };

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

      {stores.map((store) => (
        <div key={store._id} className="card">
          {editingId === store._id ? (
            <>
              <input
                placeholder="가게명"
                value={editForm.storeName}
                onChange={(e) =>
                  setEditForm({ ...editForm, storeName: e.target.value })
                }
              />
              <input
                placeholder="전화번호"
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
            <>
              <div className="admin-row">
                <div>
                  <b>{store.storeName}</b>
                  <p>계정: {store.username}</p>
                  <p>전화번호: {store.phone}</p>
                  <p>상태: {store.storeStatus === "open" ? "영업중" : "중지"}</p>
                  <p>주문 수: {store.orderCount}</p>
                </div>
                <div>
                  <button onClick={() => startEdit(store)}>수정</button>
                  <button onClick={() => toggleStoreStatus(store)}>
                    {store.storeStatus === "open" ? "중지" : "영업중"}
                  </button>
                  <button className="danger" onClick={() => deleteStore(store._id)}>
                    삭제
                  </button>
                </div>
              </div>

              <h4>메뉴</h4>
              <button onClick={() => startCreateMenu(store)}>메뉴 추가</button>

              {menuForm.storeName === store.storeName && (
                <div className="mini-card">
                  <input
                    placeholder="메뉴명"
                    value={menuForm.name}
                    onChange={(e) =>
                      setMenuForm({ ...menuForm, name: e.target.value })
                    }
                  />
                  <input
                    placeholder="가격"
                    value={menuForm.price}
                    onChange={(e) =>
                      setMenuForm({ ...menuForm, price: e.target.value })
                    }
                  />
                  <button onClick={saveMenu}>
                    {editingMenuId ? "메뉴 수정" : "메뉴 등록"}
                  </button>
                  <button
                    onClick={() => {
                      setEditingMenuId(null);
                      setMenuForm({
                        storeName: "",
                        name: "",
                        price: "",
                      });
                    }}
                  >
                    취소
                  </button>
                </div>
              )}

              {store.menus?.length > 0 ? (
                store.menus.map((menu) => (
                  <div key={menu._id} className="mini-card">
                    {menu.name} - {menu.price}원
                    <button onClick={() => startEditMenu(store, menu)}>
                      수정
                    </button>
                    <button className="danger" onClick={() => deleteMenu(menu._id)}>
                      삭제
                    </button>
                  </div>
                ))
              ) : (
                <p>등록된 메뉴 없음</p>
              )}
            </>
          )}
        </div>
      ))}
    </>
  );
}

export default StoresTab;
