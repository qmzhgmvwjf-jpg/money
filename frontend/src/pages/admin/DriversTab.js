import React, { useEffect, useState } from "react";
import API from "../../api";

function DriversTab() {
  const [drivers, setDrivers] = useState([]);
  const [form, setForm] = useState({
    username: "",
    password: "",
    phone: "",
  });
  const [editingDriver, setEditingDriver] = useState(null);

  const fetchDrivers = async () => {
    const res = await API.get("/drivers");
    setDrivers(res.data);
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const createDriver = async () => {
    if (!form.username || !form.password || !form.phone) {
      alert("기사 정보를 모두 입력하세요.");
      return;
    }
    await API.post("/drivers", form);
    setForm({ username: "", password: "", phone: "" });
    fetchDrivers();
  };

  const updateDriver = async () => {
    await API.put(`/drivers/${editingDriver._id}`, {
      phone: editingDriver.phone,
      onlineStatus: editingDriver.onlineStatus,
    });
    setEditingDriver(null);
    fetchDrivers();
  };

  const deleteDriver = async (id) => {
    if (!window.confirm("기사를 삭제할까요?")) return;
    await API.delete(`/drivers/${id}`);
    fetchDrivers();
  };

  return (
    <>
      <h3>🚴 기사 관리</h3>

      <div className="card">
        <h4>기사 등록</h4>
        <input
          placeholder="기사 아이디"
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
        <button className="primary full-width-btn" onClick={createDriver}>
          기사 등록
        </button>
      </div>

      {drivers.map((driver) => (
        <div key={driver._id} className="card">
          {editingDriver?._id === driver._id ? (
            <>
              <input
                value={editingDriver.phone}
                onChange={(e) =>
                  setEditingDriver({ ...editingDriver, phone: e.target.value })
                }
              />
              <select
                value={editingDriver.onlineStatus || "offline"}
                onChange={(e) =>
                  setEditingDriver({
                    ...editingDriver,
                    onlineStatus: e.target.value,
                  })
                }
              >
                <option value="online">온라인</option>
                <option value="offline">오프라인</option>
              </select>
              <button onClick={updateDriver}>저장</button>
              <button onClick={() => setEditingDriver(null)}>취소</button>
            </>
          ) : (
            <>
              <div className="admin-grid">
                <div>
                  <p><b>{driver.username}</b></p>
                  <p>연락처: {driver.phone}</p>
                  <p>온라인: {driver.onlineStatus === "online" ? "온라인" : "오프라인"}</p>
                  <p>현재 상태: {driver.currentDeliveryStatus}</p>
                </div>
                <div>
                  <p>누적 수익: {driver.earnings?.toLocaleString()}원</p>
                  <p>완료 배달: {driver.deliveries}건</p>
                  <button onClick={() => setEditingDriver(driver)}>수정</button>
                  <button className="danger" onClick={() => deleteDriver(driver._id)}>
                    삭제
                  </button>
                </div>
              </div>

              <h4>배달 내역</h4>
              {driver.orders?.length > 0 ? (
                driver.orders.map((order) => (
                  <div key={order._id} className="mini-card">
                    <p>{order.order_id}</p>
                    <p>{order.store} / {order.status}</p>
                    <p>{order.total_price?.toLocaleString()}원</p>
                  </div>
                ))
              ) : (
                <p>배달 내역 없음</p>
              )}
            </>
          )}
        </div>
      ))}
    </>
  );
}

export default DriversTab;
