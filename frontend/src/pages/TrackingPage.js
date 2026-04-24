import React, { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../layouts/AppShell";
import Header from "../components/common/Header";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import { orderService } from "../services/orderService";
import { usePolling } from "../hooks/usePolling";

const steps = ["pending", "accepted", "dispatch_ready", "assigned", "delivering", "completed"];

function TrackingPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);

  const fetchOrders = useCallback(async () => {
    const data = await orderService.getTrackingOrders();
    setOrders(data);
  }, []);

  usePolling(fetchOrders, 3000);

  return (
    <AppShell mobile>
      <Header
        title="주문 추적"
        subtitle="가장 최근 주문부터 실시간으로 보여드려요"
        actionLabel="홈"
        onAction={() => navigate("/customer")}
      />

      {orders.length === 0 && (
        <Card>
          <div className="empty-state">주문 내역이 없습니다.</div>
        </Card>
      )}

      {orders.map((order) => {
        const currentIndex = steps.indexOf(order.status);

        return (
          <Card key={order._id}>
            <div className="hero-card__title">
              <div>
                <h3>{order.store}</h3>
                <p className="hero-card__subtitle">{order.order_id || order._id}</p>
              </div>
              <Badge status={order.status}>{order.status}</Badge>
            </div>

            <div className="timeline-list" style={{ marginTop: 18 }}>
              {steps.map((step, index) => (
                <div
                  key={step}
                  className={`timeline-step ${
                    index < currentIndex ? "is-complete" : index === currentIndex ? "is-active" : ""
                  }`}
                >
                  {step}
                </div>
              ))}
            </div>

            {order.status === "completed" && (
              <div className="list-actions" style={{ marginTop: 18 }}>
                <Button onClick={() => navigate("/customer")}>다시 주문하기</Button>
              </div>
            )}
          </Card>
        );
      })}
    </AppShell>
  );
}

export default TrackingPage;
