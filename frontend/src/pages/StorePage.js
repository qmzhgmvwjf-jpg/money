import React, { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../layouts/AppShell";
import Header from "../components/common/Header";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import BottomNavigation from "../components/navigation/BottomNavigation";
import { orderService } from "../services/orderService";
import { noticeService } from "../services/noticeService";
import { formatCurrency, formatDateTime } from "../utils/format";
import { usePolling } from "../hooks/usePolling";

const tabs = [
  { key: "orders", label: "주문", icon: "📦" },
  { key: "messages", label: "메시지", icon: "💬" },
  { key: "stats", label: "통계", icon: "📈" },
];

const filters = [
  { value: "all", label: "전체" },
  { value: "in_progress", label: "진행중" },
  { value: "completed", label: "완료" },
  { value: "cancelled", label: "취소" },
];

function StorePage() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username");
  const storeName = localStorage.getItem("storeName");
  const [tab, setTab] = useState("orders");
  const [filter, setFilter] = useState("all");
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [notices, setNotices] = useState([]);

  const logout = () => {
    localStorage.clear();
    navigate("/");
  };

  const fetchOrders = useCallback(async () => {
    const data = await orderService.getStoreOrders(filter);
    setOrders(data);
  }, [filter]);

  const fetchStats = useCallback(async () => {
    const data = await orderService.getStoreStats();
    setStats(data);
  }, []);

  const fetchNotices = useCallback(async () => {
    const data = await noticeService.getNotices();
    setNotices(data);
  }, []);

  usePolling(fetchOrders, 3000);
  usePolling(fetchStats, 5000);
  usePolling(fetchNotices, 7000);

  const orderAction = async (type, id) => {
    if (type === "accept") await orderService.storeAccept(id);
    if (type === "reject") await orderService.storeReject(id);
    if (type === "dispatch") await orderService.requestDispatch(id);
    fetchOrders();
    fetchStats();
  };

  return (
    <AppShell mobile>
      <Header
        title={storeName || "가게 운영"}
        subtitle="주문 흐름과 메시지, 매출 통계를 한 화면에서 관리합니다."
        actionLabel="로그아웃"
        onAction={logout}
      />

      {tab === "orders" && (
        <>
          <Card>
            <div className="chip-row">
              {filters.map((item) => (
                <Button
                  key={item.value}
                  variant={filter === item.value ? "primary" : "secondary"}
                  onClick={() => setFilter(item.value)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </Card>

          {orders.map((order) => (
            <Card key={order._id}>
              <div className="section-heading">
                <div>
                  <h3>{order.order_id}</h3>
                  <p>{formatDateTime(order.created_at)}</p>
                </div>
                <Badge status={order.status}>{order.status}</Badge>
              </div>
              <div className="two-column-grid" style={{ marginTop: 16 }}>
                <div>
                  <p><strong>고객명</strong> {order.customer_name || "-"}</p>
                  <p><strong>전화번호</strong> {order.phone || "-"}</p>
                  <p><strong>주소</strong> {order.address || "-"}</p>
                </div>
                <div>
                  <p><strong>총 금액</strong> {formatCurrency(order.total_price)}</p>
                  <p><strong>기사</strong> {order.driver_id || "-"}</p>
                </div>
              </div>
              <Card className="mini-card" style={{ marginTop: 16 }}>
                <strong>주문 메뉴</strong>
                {order.items?.map((item, index) => (
                  <div key={index}>
                    {item.name} - {formatCurrency(item.price)}
                  </div>
                ))}
              </Card>
              <div className="list-actions" style={{ marginTop: 16 }}>
                {order.status === "pending" && (
                  <>
                    <Button onClick={() => orderAction("accept", order._id)}>주문 수락</Button>
                    <Button variant="danger" onClick={() => orderAction("reject", order._id)}>
                      주문 거절
                    </Button>
                  </>
                )}
                {order.status === "accepted" && (
                  <Button onClick={() => orderAction("dispatch", order._id)}>배차 요청</Button>
                )}
              </div>
            </Card>
          ))}
        </>
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

      {tab === "stats" && (
        <>
          <div className="dashboard-grid">
            <Card className="metric-card">
              <h3>{formatCurrency(stats?.todaySales || 0)}</h3>
              <p>오늘 매출</p>
            </Card>
            <Card className="metric-card">
              <h3>{formatCurrency(stats?.totalSales || 0)}</h3>
              <p>누적 매출</p>
            </Card>
            <Card className="metric-card">
              <h3>{stats?.totalOrders || 0}건</h3>
              <p>전체 주문</p>
            </Card>
            <Card className="metric-card">
              <h3>{stats?.cancelledOrders || 0}건</h3>
              <p>취소 주문</p>
            </Card>
          </div>

          <Card>
            <h3>최근 주문 흐름</h3>
            {stats?.orders?.map((order) => (
              <Card key={order._id} className="mini-card">
                {order.order_id} · {order.customer_name} · {formatCurrency(order.total_price)} · {order.status}
              </Card>
            ))}
          </Card>
        </>
      )}

      <BottomNavigation items={tabs} activeKey={tab} onChange={setTab} />
    </AppShell>
  );
}

export default StorePage;
