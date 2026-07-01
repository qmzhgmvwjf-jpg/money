import React, { useCallback, useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Badge from "../../components/ui/Badge";
import { adminService } from "../../services/adminService";
import { formatCurrency } from "../../utils/format";
import { usePolling } from "../../hooks/usePolling";

const driverStatuses = ["idle", "delivering", "resting", "offline", "suspended"];

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
    if (!form.username || !form.password || !form.phone) return;
    await adminService.createDriver(form);
    setForm({ username: "", password: "", phone: "" });
    fetchDrivers();
  };

  const updateDriverStatus = async (driver, payload) => {
    await adminService.updateDriver(driver._id, {
      phone: driver.phone,
      dispatchEnabled: driver.dispatchEnabled,
      ...payload,
    });
    fetchDrivers();
  };

  const removeDriver = async (id) => {
    await adminService.deleteDriver(id);
    fetchDrivers();
  };

  return (
    <div className="page-stack">
      <Card>
        <div className="section-heading">
          <div>
            <h3>기사 등록</h3>
            <p>운영 기사 계정을 생성하고 바로 관제에 연결합니다.</p>
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
              <Badge status={driver.driverStatus}>{driver.driverStatus}</Badge>
              <Badge tone={driver.dispatchEnabled ? "success" : "secondary"}>
                {driver.dispatchEnabled ? "배차수신 ON" : "배차수신 OFF"}
              </Badge>
            </div>
          </div>

          <div className="dashboard-grid" style={{ marginTop: 16 }}>
            <Card className="mini-card metric-card">
              <h3>{driver.todayDeliveries || 0}건</h3>
              <p>오늘 배달</p>
            </Card>
            <Card className="mini-card metric-card">
              <h3>{formatCurrency(driver.todayEarnings || 0)}</h3>
              <p>오늘 수익</p>
            </Card>
            <Card className="mini-card metric-card">
              <h3>{formatCurrency(driver.earnings || 0)}</h3>
              <p>누적 수익</p>
            </Card>
            <Card className="mini-card metric-card">
              <h3>{driver.activeOrderCount || 0}건</h3>
              <p>진행 주문</p>
            </Card>
          </div>

          <div className="two-column-grid" style={{ marginTop: 16 }}>
            <Input
              label="기사 상태"
              as="select"
              value={driver.driverStatus || "offline"}
              onChange={(event) => updateDriverStatus(driver, { driverStatus: event.target.value })}
            >
              {driverStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Input>
            <Input
              label="배차 수신"
              as="select"
              value={driver.dispatchEnabled ? "on" : "off"}
              onChange={(event) => updateDriverStatus(driver, { dispatchEnabled: event.target.value === "on" })}
            >
              <option value="on">수신 ON</option>
              <option value="off">수신 OFF</option>
            </Input>
          </div>

          <div className="list-actions" style={{ marginTop: 16 }}>
            <Button
              variant={driver.approved ? "secondary" : "primary"}
              onClick={() => updateDriverStatus(driver, { approved: !driver.approved })}
            >
              {driver.approved ? "승인 해제" : "기사 승인"}
            </Button>
            <Button
              variant={driver.driverStatus === "suspended" ? "secondary" : "danger"}
              onClick={() =>
                updateDriverStatus(driver, {
                  driverStatus: driver.driverStatus === "suspended" ? "offline" : "suspended",
                })
              }
            >
              {driver.driverStatus === "suspended" ? "정지 해제" : "기사 정지"}
            </Button>
            <Button variant="danger" onClick={() => removeDriver(driver._id)}>
              기사 삭제
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default DriversTab;
