import React, { useCallback, useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Badge from "../../components/ui/Badge";
import { orderService } from "../../services/orderService";
import { formatCurrency, formatDateTime } from "../../utils/format";
import { usePolling } from "../../hooks/usePolling";

const filters = [
  { value: "all", label: "전체" },
  { value: "in_progress", label: "진행중" },
  { value: "completed", label: "완료" },
  { value: "cancelled", label: "취소" },
];

const statuses = ["pending", "accepted", "dispatch_ready", "assigned", "delivering", "completed", "cancelled"];

function OrdersTab() {
  const [filter, setFilter] = useState("all");
  const [orders, setOrders] = useState([]);

  const fetchOrders = useCallback(async () => {
    const data = await orderService.getAdminOrders(filter);
    setOrders(data);
  }, [filter]);

  usePolling(fetchOrders, 3000);

  const changeStatus = async (id, status) => {
    await orderService.updateOrderStatus(id, { status });
    fetchOrders();
  };

  const removeOrder = async (id) => {
    if (!window.confirm("주문을 삭제할까요?")) return;
    await orderService.deleteOrder(id);
    fetchOrders();
  };

  return (
    <div className="page-stack">
      <Card>
        <div className="section-heading">
          <div>
            <h3>주문 모니터링</h3>
            <p>3초마다 갱신되는 실시간 주문 피드</p>
          </div>
          <Badge tone="primary">{orders.length}건</Badge>
        </div>
        <div className="chip-row" style={{ marginTop: 16 }}>
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
          <div className="two-column-grid">
            <div>
              <p><strong>주문번호</strong> {order.order_id}</p>
              <p><strong>주문시간</strong> {formatDateTime(order.created_at)}</p>
              <p><strong>고객명</strong> {order.customer_name || "-"}</p>
              <p><strong>연락처</strong> {order.phone || "-"}</p>
              <p><strong>주소</strong> {order.address || "-"}</p>
            </div>
            <div>
              <p><strong>가게</strong> {order.store}</p>
              <p><strong>금액</strong> {formatCurrency(order.total_price)}</p>
              <div className="status-row" style={{ marginTop: 10 }}>
                <Badge status={order.status}>{order.status}</Badge>
                {order.driver_id && <Badge tone="secondary">{order.driver_id}</Badge>}
              </div>
            </div>
          </div>

          <Card className="mini-card" style={{ marginTop: 16 }}>
            <strong>주문 메뉴</strong>
            {order.items?.map((item, index) => (
              <div key={index}>{item.name} - {formatCurrency(item.price)}</div>
            ))}
          </Card>

          <div className="two-column-grid" style={{ marginTop: 16 }}>
            <Input as="select" label="상태 변경" value={order.status} onChange={(event) => changeStatus(order._id, event.target.value)}>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Input>
            <div className="list-actions" style={{ alignItems: "flex-end" }}>
              <Button variant="danger" onClick={() => removeOrder(order._id)}>
                주문 삭제
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default OrdersTab;
