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

  const fetchNotices = useCallback(async () => {
    const data = await noticeService.getNotices();
    setNotices(data);
  }, []);

  usePolling(fetchDashboard, 3000);
  usePolling(fetchNotices, 7000);
  usePolling(fetchHistory, 7000, tab === "history");
  usePolling(fetchEarnings, 7000, tab === "earnings");

  const toggleOnline = async () => {
    const nextStatus = dashboard?.onlineStatus === "online" ? "offline" : "online";
    await orderService.updateDriverOnlineStatus({ onlineStatus: nextStatus });
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
  };

  const groupedHistory = useMemo(() => groupByDate(historyOrders), [historyOrders]);

  return (
    <AppShell mobile>
      <Header
        title="라이더 센터"
        subtitle="오늘 흐름, 수익, 메시지를 한 손 안에서 확인하세요"
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
              <h3>{dashboard?.currentStatus || "대기"}</h3>
              <p>현재 상태</p>
            </Card>
            <Card className="metric-card">
              <h3>{dashboard?.onlineStatus === "online" ? "온라인" : "오프라인"}</h3>
              <p>배차 수신 상태</p>
            </Card>
          </div>

          <Card>
            <div className="section-heading">
              <div>
                <h3>근무 상태</h3>
                <p>배차를 받기 전 온라인 상태를 먼저 전환하세요</p>
              </div>
              <Button variant={dashboard?.onlineStatus === "online" ? "danger" : "primary"} onClick={toggleOnline}>
                {dashboard?.onlineStatus === "online" ? "오프라인 전환" : "온라인 전환"}
              </Button>
            </div>
          </Card>

          <Card>
            <h3>현재 배달</h3>
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
              <h3>{earnings?.totalDeliveries || 0}건</h3>
              <p>완료 배달</p>
            </Card>
          </div>
          {earnings?.orders?.map((order) => (
            <Card key={order._id} className="mini-card">
              {order.order_id} · {formatDateTime(order.created_at)} · {formatCurrency(order.driver_fee)}
            </Card>
          ))}
        </Card>
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
