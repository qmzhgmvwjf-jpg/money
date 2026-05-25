import React, { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../layouts/AppShell";
import Header from "../components/common/Header";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import LoadingState from "../components/ui/LoadingState";
import EmptyState from "../components/ui/EmptyState";
import BottomNavigation from "../components/navigation/BottomNavigation";
import { orderService } from "../services/orderService";
import { formatCurrency, formatDateTime } from "../utils/format";
import { usePolling } from "../hooks/usePolling";

const navItems = [
  { key: "home", label: "홈", icon: "🏠" },
  { key: "cart", label: "장바구니", icon: "🛒" },
  { key: "orders", label: "주문내역", icon: "🧾" },
  { key: "profile", label: "마이", icon: "👤" },
];

function CustomerOrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      const data = await orderService.getMyOrders();
      setOrders(data);
    } finally {
      setLoading(false);
    }
  }, []);

  usePolling(fetchOrders, 4000);

  const inProgress = useMemo(
    () => orders.filter((order) => !["completed", "cancelled"].includes(order.status)),
    [orders]
  );
  const completed = useMemo(
    () => orders.filter((order) => ["completed", "cancelled"].includes(order.status)),
    [orders]
  );

  const renderOrder = (order) => (
    <Card key={order._id} className="order-card">
      <div className="hero-card__title">
        <div>
          <h3>{order.store_name || order.store}</h3>
          <p className="hero-card__subtitle">{order.order_id}</p>
        </div>
        <Badge status={order.status}>{order.status}</Badge>
      </div>
      <div className="two-column-grid">
        <div>
          <p><strong>주문시각</strong> {formatDateTime(order.created_at)}</p>
          <p><strong>주소</strong> {order.address}</p>
          <p><strong>연락처</strong> {order.phone || "-"}</p>
        </div>
        <div>
          <p><strong>결제수단</strong> {order.payment_method || "-"}</p>
          <p><strong>결제상태</strong> {order.payment_status || "-"}</p>
          <p><strong>총액</strong> {formatCurrency(order.total_price)}</p>
        </div>
      </div>
      <Card className="mini-card">
        <strong>주문 메뉴</strong>
        {order.items?.map((item, index) => (
          <div key={index}>
            {item.name} - {formatCurrency(item.price)}
          </div>
        ))}
      </Card>
      <div className="list-actions">
        <Button variant="secondary" onClick={() => navigate("/tracking")}>
          상태 추적
        </Button>
      </div>
    </Card>
  );

  return (
    <AppShell mobile>
      <Header
        title="주문내역"
        subtitle="진행중 주문과 완료 주문을 나눠서 확인할 수 있어요"
        actionLabel="홈"
        onAction={() => navigate("/customer")}
      />

      {loading ? (
        <Card>
          <LoadingState label="주문내역을 불러오는 중입니다" />
        </Card>
      ) : (
        <>
          <div className="section-heading">
            <h3>진행중 주문</h3>
            <p>{inProgress.length}건</p>
          </div>
          {inProgress.length === 0 ? (
            <Card><EmptyState title="진행중 주문이 없습니다" description="주문을 완료하면 진행 상태가 여기에 표시됩니다." /></Card>
          ) : (
            inProgress.map(renderOrder)
          )}

          <div className="section-heading" style={{ marginTop: 20 }}>
            <h3>완료/취소 주문</h3>
            <p>{completed.length}건</p>
          </div>
          {completed.length === 0 ? (
            <Card><EmptyState title="완료된 주문이 없습니다" description="완료되거나 취소된 주문은 이곳에 보관됩니다." /></Card>
          ) : (
            completed.map(renderOrder)
          )}
        </>
      )}

      <BottomNavigation
        items={navItems}
        activeKey="orders"
        onChange={(key) => {
          if (key === "home") navigate("/customer");
          if (key === "cart") navigate("/customer/cart");
          if (key === "orders") navigate("/customer/orders");
          if (key === "profile") navigate("/customer/profile");
        }}
      />
    </AppShell>
  );
}

export default CustomerOrdersPage;
