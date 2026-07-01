import React, { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../layouts/AppShell";
import Header from "../components/common/Header";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Badge from "../components/ui/Badge";
import LoadingState from "../components/ui/LoadingState";
import EmptyState from "../components/ui/EmptyState";
import BottomNavigation from "../components/navigation/BottomNavigation";
import { orderService } from "../services/orderService";
import { noticeService } from "../services/noticeService";
import { formatCurrency, groupByDate } from "../utils/format";
import { usePolling } from "../hooks/usePolling";
import { useToast } from "../hooks/useToast";

const tabs = [
  { key: "home", label: "홈", icon: "🏍" },
  { key: "dispatch", label: "배차", icon: "📦" },
  { key: "profile", label: "내정보", icon: "👤" },
];

const driverStatusLabels = {
  idle: "대기중",
  delivering: "배달중",
  resting: "휴식중",
  offline: "오프라인",
  suspended: "정지",
};

function RiderPage() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username");
  const [tab, setTab] = useState("home");
  const [dashboard, setDashboard] = useState(null);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [historyOrders, setHistoryOrders] = useState([]);
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
  const [loading, setLoading] = useState(true);
  const { showToast, ToastViewport } = useToast();

  const logout = () => {
    localStorage.clear();
    navigate("/");
  };

  const fetchDashboard = useCallback(async () => {
    try {
      const [dashboardData, orderData] = await Promise.all([
        orderService.getDriverDashboard(),
        orderService.getDriverAvailableOrders(),
      ]);
      setDashboard(dashboardData);
      setAvailableOrders(orderData);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    const data = await orderService.getDriverHistory("month");
    setHistoryOrders(data);
  }, []);

  const fetchEarnings = useCallback(async () => {
    const data = await orderService.getDriverEarnings("month");
    setEarnings(data);
  }, []);

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
  usePolling(fetchHistory, 7000);
  usePolling(fetchEarnings, 7000);
  usePolling(fetchSettings, 7000);
  usePolling(fetchNotices, 7000, tab === "profile");

  const toggleOnline = async () => {
    const nextStatus = dashboard?.driverStatus === "offline" ? "idle" : "offline";
    await orderService.updateDriverOnlineStatus({ driverStatus: nextStatus });
    showToast(nextStatus === "idle" ? "대기중으로 전환했습니다" : "오프라인으로 전환했습니다", "success");
    fetchDashboard();
    fetchSettings();
  };

  const setDriverStatus = async (driverStatus) => {
    await orderService.updateDriverOnlineStatus({ driverStatus });
    showToast(`기사 상태를 ${driverStatusLabels[driverStatus] || driverStatus}로 변경했습니다`, "success");
    fetchDashboard();
    fetchSettings();
  };

  const toggleDispatch = async () => {
    await orderService.updateDriverSettings({ dispatchEnabled: !settings?.dispatchEnabled });
    showToast(settings?.dispatchEnabled ? "배차 수신을 중지했습니다" : "배차 수신을 시작했습니다", "success");
    fetchDashboard();
    fetchSettings();
  };

  const saveSettings = async () => {
    await orderService.updateDriverSettings(settingsForm);
    showToast("내 정보를 저장했습니다", "success");
    fetchSettings();
  };

  const requestWithdrawal = async () => {
    if (!withdrawForm.amount) {
      showToast("출금 금액을 입력하세요", "danger");
      return;
    }
    await orderService.requestDriverWithdrawal({
      amount: Number(withdrawForm.amount),
      note: withdrawForm.note,
    });
    setWithdrawForm({ amount: "", note: "" });
    showToast("출금 요청을 보냈습니다", "success");
    fetchSettings();
  };

  const takeAction = async (type, id) => {
    if (type === "accept") await orderService.driverAccept(id);
    if (type === "reject") await orderService.driverReject(id);
    if (type === "start") await orderService.driverStart(id);
    if (type === "complete") await orderService.driverComplete(id);
    showToast("배달 상태를 업데이트했습니다", "success");
    fetchDashboard();
    fetchHistory();
    fetchEarnings();
    fetchSettings();
  };

  const groupedHistory = useMemo(() => groupByDate(historyOrders), [historyOrders]);
  const currentOrder = dashboard?.currentOrder || null;

  return (
    <AppShell mobile>
      <Header
        title="라이더 센터"
        subtitle="배차와 수익, 출금과 계좌 정보까지 한 흐름으로 관리합니다"
        actionLabel="로그아웃"
        onAction={logout}
      />

      {loading ? (
        <Card>
          <LoadingState label="라이더 현황을 불러오는 중입니다" />
        </Card>
      ) : tab === "home" && (
        <>
          <div className="dashboard-grid">
            <Card className="metric-card metric-card--primary">
              <h3>{dashboard?.todayDeliveries || 0}</h3>
              <p>오늘 배달 건수</p>
            </Card>
            <Card className="metric-card">
              <h3>{formatCurrency(dashboard?.todayEarnings || 0)}</h3>
              <p>오늘 수익</p>
            </Card>
            <Card className="metric-card">
              <h3>{driverStatusLabels[dashboard?.driverStatus] || "오프라인"}</h3>
              <p>현재 상태</p>
            </Card>
            <Card className="metric-card">
              <h3>{settings?.dispatchEnabled ? "수신중" : "중지"}</h3>
              <p>배차 수신 상태</p>
            </Card>
          </div>

          <Card>
            <div className="list-actions">
              <Button variant={dashboard?.driverStatus === "offline" ? "primary" : "secondary"} onClick={() => setDriverStatus("idle")}>
                대기중
              </Button>
              <Button variant={dashboard?.driverStatus === "resting" ? "primary" : "secondary"} onClick={() => setDriverStatus("resting")}>
                휴식중
              </Button>
              <Button variant={dashboard?.driverStatus === "offline" ? "danger" : "secondary"} onClick={toggleOnline}>
                오프라인
              </Button>
              <Button variant={settings?.dispatchEnabled ? "primary" : "secondary"} onClick={toggleDispatch}>
                배차 수신 {settings?.dispatchEnabled ? "끄기" : "켜기"}
              </Button>
            </div>
          </Card>

          <Card>
            <h3>현재 진행중 배달</h3>
            {currentOrder ? (
              <div className="panel-list">
                <div>{currentOrder.order_id}</div>
                <div>{currentOrder.store}</div>
                <div>{currentOrder.customer_name} · {currentOrder.phone}</div>
                <div>{currentOrder.address}</div>
                <Badge status={currentOrder.status}>{currentOrder.status}</Badge>
                <div className="list-actions">
                  {currentOrder.status === "assigned" && (
                    <Button onClick={() => takeAction("start", currentOrder._id)}>배달 시작</Button>
                  )}
                  {currentOrder.status === "delivering" && (
                    <Button onClick={() => takeAction("complete", currentOrder._id)}>배달 완료</Button>
                  )}
                </div>
              </div>
            ) : (
              <EmptyState title="진행 중인 배달이 없습니다" description="배차를 수락하면 픽업과 완료 버튼이 표시됩니다." />
            )}
          </Card>
        </>
      )}

      {tab === "dispatch" && (
        <div className="page-stack">
          <Card>
            <div className="section-heading">
              <h3>배차 요청</h3>
              <Badge tone="primary">{availableOrders.length}건</Badge>
            </div>
            {availableOrders.map((order) => (
              <Card key={order._id} className="mini-card">
                <div>{order.order_id}</div>
                <div>{order.store}</div>
                <div>{order.address}</div>
                <div>{formatCurrency(order.total_price)}</div>
                <div className="list-actions">
                  <Button onClick={() => takeAction("accept", order._id)}>수락</Button>
                  <Button variant="secondary" onClick={() => takeAction("reject", order._id)}>거절</Button>
                </div>
              </Card>
            ))}
            {availableOrders.length === 0 && <EmptyState title="수락 가능한 배차가 없습니다" description="새 배차가 들어오면 이 화면에 바로 표시됩니다." />}
          </Card>

          <Card>
            <div className="section-heading">
              <h3>완료 내역</h3>
              <Badge tone="secondary">{historyOrders.length}건</Badge>
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
        </div>
      )}

      {tab === "profile" && (
        <div className="page-stack">
          <div className="dashboard-grid">
            <Card className="metric-card">
              <h3>{formatCurrency(settings?.balance || 0)}</h3>
              <p>현재 수익 잔액</p>
            </Card>
            <Card className="metric-card">
              <h3>{formatCurrency(earnings?.totalEarnings || 0)}</h3>
              <p>총 수익</p>
            </Card>
            <Card className="metric-card">
              <h3>{earnings?.totalDeliveries || 0}건</h3>
              <p>완료 배달</p>
            </Card>
          </div>

          <Card>
            <div className="section-heading">
              <h3>내 정보</h3>
              <Badge tone="secondary">{driverStatusLabels[settings?.driverStatus] || "오프라인"}</Badge>
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
                <Button variant={settings?.driverStatus === "resting" ? "primary" : "secondary"} onClick={() => setDriverStatus("resting")}>
                  휴식중
                </Button>
                <Button variant={dashboard?.driverStatus === "offline" ? "danger" : "primary"} onClick={toggleOnline}>
                  {dashboard?.driverStatus === "offline" ? "대기 전환" : "오프라인"}
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

          <Card>
            <h3>공지 메시지</h3>
            {notices.map((notice) => {
              const isRead = notice.read_by?.includes(username);
              return (
                <Card key={notice._id} className="mini-card">
                  <div className="section-heading">
                    <div>
                      <strong>{notice.title}</strong>
                      <p>{notice.content}</p>
                    </div>
                    <Badge tone={isRead ? "secondary" : "primary"}>{isRead ? "읽음" : "새 공지"}</Badge>
                  </div>
                  {!isRead && (
                    <Button
                      variant="secondary"
                      onClick={async () => {
                        await noticeService.readNotice(notice._id);
                        showToast("공지 읽음 처리했습니다", "success");
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
        </div>
      )}

      <BottomNavigation items={tabs} activeKey={tab} onChange={setTab} />
      <ToastViewport />
    </AppShell>
  );
}

export default RiderPage;
