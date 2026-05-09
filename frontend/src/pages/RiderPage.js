import React, { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../layouts/AppShell";
import Header from "../components/common/Header";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Badge from "../components/ui/Badge";
import BottomNavigation from "../components/navigation/BottomNavigation";
import { orderService } from "../services/orderService";
import { noticeService } from "../services/noticeService";
import { formatCurrency, formatDateTime, groupByDate } from "../utils/format";
import { usePolling } from "../hooks/usePolling";

const tabs = [
  { key: "home", label: "홈", icon: "🏍" },
  { key: "history", label: "내역", icon: "🧾" },
  { key: "earnings", label: "수익", icon: "💸" },
  { key: "settings", label: "설정", icon: "⚙️" },
  { key: "messages", label: "메시지", icon: "💬" },
];

function RiderPage() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username");
  const [tab, setTab] = useState("home");
  const [dashboard, setDashboard] = useState(null);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [historyPeriod, setHistoryPeriod] = useState("day");
  const [historyOrders, setHistoryOrders] = useState([]);
  const [earningsPeriod, setEarningsPeriod] = useState("day");
  const [earnings, setEarnings] = useState(null);
  const [settings, setSettings] = useState(null);
  const [settingsForm, setSettingsForm] = useState({
    phone: "",
    bankName: "",
    accountNumber: "",
    accountHolder: "",
  });
  const [withdrawForm, setWithdrawForm] = useState({ amount: "", note: "" });
  const [notices, setNotices] = useState([]);

  const logout = () => {
    localStorage.clear();
    navigate("/");
  };

  const fetchDashboard = useCallback(async () => {
    const [dashboardData, orderData] = await Promise.all([
      orderService.getDriverDashboard(),
      orderService.getDriverAvailableOrders(),
    ]);
    setDashboard(dashboardData);
    setAvailableOrders(orderData);
  }, []);

  const fetchHistory = useCallback(async () => {
    const data = await orderService.getDriverHistory(historyPeriod);
    setHistoryOrders(data);
  }, [historyPeriod]);

  const fetchEarnings = useCallback(async () => {
    const data = await orderService.getDriverEarnings(earningsPeriod);
    setEarnings(data);
  }, [earningsPeriod]);

  const fetchSettings = useCallback(async () => {
    const data = await orderService.getDriverSettings();
    setSettings(data);
    setSettingsForm({
      phone: data.phone || "",
      bankName: data.bankName || "",
      accountNumber: data.accountNumber || "",
      accountHolder: data.accountHolder || "",
    });
  }, []);

  const fetchNotices = useCallback(async () => {
    const data = await noticeService.getNotices();
    setNotices(data);
  }, []);

  usePolling(fetchDashboard, 3000);
  usePolling(fetchNotices, 7000);
  usePolling(fetchHistory, 7000, tab === "history");
  usePolling(fetchEarnings, 7000, tab === "earnings");
  usePolling(fetchSettings, 7000, tab === "settings");

  const toggleOnline = async () => {
    const nextStatus = dashboard?.onlineStatus === "online" ? "offline" : "online";
    await orderService.updateDriverOnlineStatus({ onlineStatus: nextStatus });
    fetchDashboard();
    fetchSettings();
  };

  const toggleDispatch = async () => {
    await orderService.updateDriverSettings({
      dispatchEnabled: !settings?.dispatchEnabled,
    });
    fetchDashboard();
    fetchSettings();
  };

  const saveSettings = async () => {
    await orderService.updateDriverSettings(settingsForm);
    fetchSettings();
  };

  const requestWithdrawal = async () => {
    if (!withdrawForm.amount) {
      alert("출금 금액을 입력하세요.");
      return;
    }
    await orderService.requestDriverWithdrawal({
      amount: Number(withdrawForm.amount),
      note: withdrawForm.note,
    });
    setWithdrawForm({ amount: "", note: "" });
    fetchSettings();
    fetchDashboard();
  };

  const takeAction = async (type, id) => {
    if (type === "accept") await orderService.driverAccept(id);
    if (type === "reject") await orderService.driverReject(id);
    if (type === "start") await orderService.driverStart(id);
    if (type === "complete") await orderService.driverComplete(id);
    fetchDashboard();
    fetchHistory();
    fetchEarnings();
    fetchSettings();
  };

  const groupedHistory = useMemo(() => groupByDate(historyOrders), [historyOrders]);

  return (
    <AppShell mobile>
      <Header
        title="라이더 센터"
        subtitle="배차 요청, 진행중 배달, 수익과 출금까지 한 흐름으로 관리합니다"
        actionLabel="로그아웃"
        onAction={logout}
      />

      {tab === "home" && (
        <>
          <div className="dashboard-grid">
            <Card className="metric-card">
              <h3>{dashboard?.todayDeliveries || 0}</h3>
              <p>오늘 배달 건수</p>
            </Card>
            <Card className="metric-card">
              <h3>{formatCurrency(dashboard?.todayEarnings || 0)}</h3>
              <p>오늘 수익</p>
            </Card>
            <Card className="metric-card">
              <h3>{dashboard?.onlineStatus === "online" ? "온라인" : "오프라인"}</h3>
              <p>현재 상태</p>
            </Card>
            <Card className="metric-card">
              <h3>{settings?.dispatchEnabled ? "ON" : "OFF"}</h3>
              <p>배차 수신</p>
            </Card>
          </div>

          <Card>
            <div className="list-actions">
              <Button variant={dashboard?.onlineStatus === "online" ? "danger" : "primary"} onClick={toggleOnline}>
                {dashboard?.onlineStatus === "online" ? "오프라인 전환" : "온라인 전환"}
              </Button>
              <Button variant={settings?.dispatchEnabled ? "primary" : "secondary"} onClick={toggleDispatch}>
                배차 수신 {settings?.dispatchEnabled ? "끄기" : "켜기"}
              </Button>
            </div>
          </Card>

          <Card>
            <h3>진행중 배달</h3>
            {dashboard?.currentOrder ? (
              <div className="panel-list">
                <div>{dashboard.currentOrder.order_id}</div>
                <div>{dashboard.currentOrder.store}</div>
                <div>{dashboard.currentOrder.customer_name} · {dashboard.currentOrder.phone}</div>
                <div>{dashboard.currentOrder.address}</div>
                <Badge status={dashboard.currentOrder.status}>{dashboard.currentOrder.status}</Badge>
                <div className="list-actions">
                  {dashboard.currentOrder.status === "assigned" && (
                    <Button onClick={() => takeAction("start", dashboard.currentOrder._id)}>배달 시작</Button>
                  )}
                  {dashboard.currentOrder.status === "delivering" && (
                    <Button onClick={() => takeAction("complete", dashboard.currentOrder._id)}>배달 완료</Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="empty-state">진행 중인 배달이 없습니다.</div>
            )}
          </Card>

          <Card>
            <h3>배차 요청</h3>
            {availableOrders.map((order) => (
              <Card key={order._id} className="mini-card">
                <div>{order.order_id}</div>
                <div>{order.store}</div>
                <div>{order.address}</div>
                <div>{formatCurrency(order.total_price)}</div>
                <div className="list-actions">
                  <Button onClick={() => takeAction("accept", order._id)}>수락</Button>
                  <Button variant="secondary" onClick={() => takeAction("reject", order._id)}>
                    거절
                  </Button>
                </div>
              </Card>
            ))}
            {availableOrders.length === 0 && <div className="empty-state">현재 수락 가능한 배차가 없습니다.</div>}
          </Card>
        </>
      )}

      {tab === "history" && (
        <Card>
          <div className="section-heading">
            <h3>배달 내역</h3>
            <Input as="select" value={historyPeriod} onChange={(event) => setHistoryPeriod(event.target.value)}>
              <option value="day">1일</option>
              <option value="week">1주</option>
              <option value="month">1개월</option>
            </Input>
          </div>
          {Object.entries(groupedHistory).map(([date, items]) => (
            <Card key={date} className="mini-card">
              <strong>{date}</strong>
              {items.map((order) => (
                <div key={order._id}>
                  {order.order_id} · {order.store} · {formatCurrency(order.driver_fee)}
                </div>
              ))}
            </Card>
          ))}
        </Card>
      )}

      {tab === "earnings" && (
        <Card>
          <div className="section-heading">
            <h3>수익 조회</h3>
            <Input as="select" value={earningsPeriod} onChange={(event) => setEarningsPeriod(event.target.value)}>
              <option value="day">일</option>
              <option value="week">주</option>
              <option value="month">월</option>
            </Input>
          </div>
          <div className="dashboard-grid" style={{ marginTop: 16 }}>
            <Card className="mini-card metric-card">
              <h3>{formatCurrency(earnings?.totalEarnings || 0)}</h3>
              <p>총 수익</p>
            </Card>
            <Card className="mini-card metric-card">
              <h3>{formatCurrency(settings?.balance || 0)}</h3>
              <p>출금 가능 잔액</p>
            </Card>
          </div>
          {earnings?.orders?.map((order) => (
            <Card key={order._id} className="mini-card">
              {order.order_id} · {formatDateTime(order.created_at)} · {formatCurrency(order.driver_fee)}
            </Card>
          ))}
        </Card>
      )}

      {tab === "settings" && (
        <div className="page-stack">
          <Card>
            <div className="section-heading">
              <h3>기사 설정</h3>
              <Badge tone="secondary">{settings?.onlineStatus || "offline"}</Badge>
            </div>
            <div className="auth-form" style={{ marginTop: 16 }}>
              <Input label="전화번호" value={settingsForm.phone} onChange={(event) => setSettingsForm((prev) => ({ ...prev, phone: event.target.value }))} />
              <Input label="은행명" value={settingsForm.bankName} onChange={(event) => setSettingsForm((prev) => ({ ...prev, bankName: event.target.value }))} />
              <Input label="계좌번호" value={settingsForm.accountNumber} onChange={(event) => setSettingsForm((prev) => ({ ...prev, accountNumber: event.target.value }))} />
              <Input label="예금주" value={settingsForm.accountHolder} onChange={(event) => setSettingsForm((prev) => ({ ...prev, accountHolder: event.target.value }))} />
              <div className="list-actions">
                <Button variant={settings?.dispatchEnabled ? "primary" : "secondary"} onClick={toggleDispatch}>
                  배차 수신 {settings?.dispatchEnabled ? "ON" : "OFF"}
                </Button>
                <Button variant={dashboard?.onlineStatus === "online" ? "danger" : "primary"} onClick={toggleOnline}>
                  {dashboard?.onlineStatus === "online" ? "오프라인" : "온라인"}
                </Button>
              </div>
              <Button block onClick={saveSettings}>설정 저장</Button>
            </div>
          </Card>

          <Card>
            <div className="section-heading">
              <h3>출금 요청</h3>
              <Badge tone="success">{formatCurrency(settings?.balance || 0)}</Badge>
            </div>
            <div className="auth-form" style={{ marginTop: 16 }}>
              <Input label="출금 금액" type="number" value={withdrawForm.amount} onChange={(event) => setWithdrawForm((prev) => ({ ...prev, amount: event.target.value }))} />
              <Input label="메모" value={withdrawForm.note} onChange={(event) => setWithdrawForm((prev) => ({ ...prev, note: event.target.value }))} />
              <Button block onClick={requestWithdrawal}>출금 요청</Button>
            </div>
          </Card>

          <Card>
            <h3>출금 요청 내역</h3>
            {(settings?.withdrawalRequests || []).map((item) => (
              <Card key={item._id} className="mini-card">
                <div className="section-heading">
                  <div>
                    <strong>{formatCurrency(item.amount)}</strong>
                    <p>{item.bankName} · {item.accountNumber}</p>
                  </div>
                  <Badge tone={item.status === "approved" ? "success" : item.status === "rejected" ? "danger" : "secondary"}>
                    {item.status}
                  </Badge>
                </div>
              </Card>
            ))}
          </Card>
        </div>
      )}

      {tab === "messages" && (
        <Card>
          <h3>메시지함</h3>
          {notices.map((notice) => {
            const isRead = notice.read_by?.includes(username);
            return (
              <Card key={notice._id} className="mini-card">
                <div className="section-heading">
                  <div>
                    <strong>{notice.title}</strong>
                    <p>{notice.content}</p>
                  </div>
                  <Badge tone={isRead ? "secondary" : "primary"}>
                    {isRead ? "읽음" : "새 공지"}
                  </Badge>
                </div>
                {!isRead && (
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      await noticeService.readNotice(notice._id);
                      fetchNotices();
                    }}
                  >
                    읽음 처리
                  </Button>
                )}
              </Card>
            );
          })}
        </Card>
      )}

      <BottomNavigation items={tabs} activeKey={tab} onChange={setTab} />
    </AppShell>
  );
}

export default RiderPage;
