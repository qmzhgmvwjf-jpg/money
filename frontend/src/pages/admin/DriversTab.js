import React, { useCallback, useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Badge from "../../components/ui/Badge";
import { adminService } from "../../services/adminService";
import { formatCurrency } from "../../utils/format";
import { usePolling } from "../../hooks/usePolling";

function DriversTab() {
  const [drivers, setDrivers] = useState([]);
  const [form, setForm] = useState({
    username: "",
    password: "",
    phone: "",
  });

  const fetchDrivers = useCallback(async () => {
    const data = await adminService.getDrivers();
    setDrivers(data);
  }, []);

  usePolling(fetchDrivers, 4000);

  const createDriver = async () => {
    if (!form.username || !form.password || !form.phone) {
      alert("기사 정보를 모두 입력하세요.");
      return;
    }
    await adminService.createDriver(form);
    setForm({ username: "", password: "", phone: "" });
    fetchDrivers();
  };

  const toggleOnlineStatus = async (driver) => {
    const nextStatus = driver.onlineStatus === "online" ? "offline" : "online";
    await adminService.updateDriver(driver._id, { onlineStatus: nextStatus, phone: driver.phone });
    fetchDrivers();
  };

  const removeDriver = async (id) => {
    if (!window.confirm("기사를 삭제할까요?")) return;
    await adminService.deleteDriver(id);
    fetchDrivers();
  };

  return (
    <div className="page-stack">
      <Card>
        <div className="section-heading">
          <div>
            <h3>기사 등록</h3>
            <p>신규 기사 계정을 빠르게 개설합니다.</p>
          </div>
        </div>
        <div className="two-column-grid" style={{ marginTop: 16 }}>
          <Input label="아이디" value={form.username} onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))} />
          <Input label="전화번호" value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} />
          <Input label="비밀번호" type="password" value={form.password} onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))} />
        </div>
        <div className="list-actions" style={{ marginTop: 16 }}>
          <Button onClick={createDriver}>기사 등록</Button>
        </div>
      </Card>

      {drivers.map((driver) => (
        <Card key={driver._id}>
          <div className="section-heading">
            <div>
              <h3>{driver.username}</h3>
              <p>{driver.phone}</p>
            </div>
            <div className="status-row">
              <Badge status={driver.onlineStatus}>{driver.onlineStatus}</Badge>
              <Badge status={driver.currentDeliveryStatus}>{driver.currentDeliveryStatus}</Badge>
            </div>
          </div>

          <div className="dashboard-grid" style={{ marginTop: 16 }}>
            <Card className="mini-card metric-card">
              <h3>{formatCurrency(driver.earnings)}</h3>
              <p>누적 수익</p>
            </Card>
            <Card className="mini-card metric-card">
              <h3>{driver.deliveries}건</h3>
              <p>완료 배달</p>
            </Card>
          </div>

          <div className="list-actions" style={{ marginTop: 16 }}>
            <Button variant="secondary" onClick={() => toggleOnlineStatus(driver)}>
              {driver.onlineStatus === "online" ? "오프라인 전환" : "온라인 전환"}
            </Button>
            <Button variant="danger" onClick={() => removeDriver(driver._id)}>
              기사 삭제
            </Button>
          </div>

          <Card className="mini-card" style={{ marginTop: 16 }}>
            <strong>최근 배달 내역</strong>
            {driver.orders?.slice(0, 5).map((order) => (
              <div key={order._id}>
                {order.order_id} · {order.store} · {formatCurrency(order.driver_fee)}
              </div>
            ))}
          </Card>
        </Card>
      ))}
    </div>
  );
}

export default DriversTab;
