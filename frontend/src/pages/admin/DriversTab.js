import React, { useEffect, useState } from "react";
import API from "../../api";

function DriversTab() {
  const [drivers, setDrivers] = useState([]);
  const [form, setForm] = useState({
    username: "",
    password: "",
    phone: "",
  });
  const [expandedDriverId, setExpandedDriverId] = useState(null);

  const fetchDrivers = async () => {
    const res = await API.get("/drivers");
    setDrivers(res.data);
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const createDriver = async () => {
    if (!form.username || !form.password || !form.phone) {
      alert("기사 등록 정보를 모두 입력하세요.");
      return;
    }

    await API.post("/drivers", form);
    setForm({
      username: "",
      password: "",
      phone: "",
    });
    fetchDrivers();
  };

  const deleteDriver = async (id) => {
    if (!window.confirm("기사를 삭제할까요? 진행 중인 배차는 다시 요청 상태가 됩니다.")) return;

    await API.delete(`/drivers/${id}`);
    fetchDrivers();
  };

  return (
    <>
      <h3>🚴 배달기사 관리</h3>

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
          <div className="admin-row">
            <div>
              <b>{driver.username}</b>
              <p>전화번호: {driver.phone}</p>
              <p>상태: {driver.driverStatus}</p>
              <p>수행 주문: {driver.orders?.length || 0}건</p>
            </div>
            <div>
              <button
                onClick={() =>
                  setExpandedDriverId(
                    expandedDriverId === driver._id ? null : driver._id
                  )
                }
              >
                주문 목록
              </button>
              <button className="danger" onClick={() => deleteDriver(driver._id)}>
                삭제
              </button>
            </div>
          </div>

          {expandedDriverId === driver._id && (
            <div>
              <h4>수행 주문 목록</h4>
              {driver.orders?.length > 0 ? (
                driver.orders.map((order) => (
                  <div key={order._id} className="mini-card">
                    {order.store} - {order.status} - {order.address || "-"}
                  </div>
                ))
              ) : (
                <p>수행한 주문 없음</p>
              )}
            </div>
          )}
        </div>
      ))}
    </>
  );
}

export default DriversTab;
