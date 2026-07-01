import React, { useCallback, useMemo, useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Badge from "../../components/ui/Badge";
import { adminService } from "../../services/adminService";
import { orderService } from "../../services/orderService";
import { formatCurrency, formatDateTime } from "../../utils/format";
import { usePolling } from "../../hooks/usePolling";

const queueMeta = [
  { key: "pending", title: "접수 주문", tone: "warning" },
  { key: "dispatch_ready", title: "배차 대기", tone: "primary" },
  { key: "delivering", title: "배달 중", tone: "success" },
  { key: "completed", title: "완료", tone: "secondary" },
  { key: "cancelled", title: "취소", tone: "danger" },
];

const statuses = ["pending", "accepted", "dispatch_ready", "assigned", "delivering", "completed", "cancelled"];

function OrdersTab() {
  const [board, setBoard] = useState({ queues: {}, drivers: [] });
  const [expandedOrderId, setExpandedOrderId] = useState("");
  const [driverSelections, setDriverSelections] = useState({});

  const fetchBoard = useCallback(async () => {
    const data = await adminService.getDispatchBoard();
    setBoard(data);
  }, []);

  usePolling(fetchBoard, 3000);

  const dispatchableDrivers = useMemo(
    () => (board.drivers || []).filter((driver) => driver.canDispatch),
    [board.drivers]
  );

  const changeStatus = async (id, status) => {
    await orderService.updateOrderStatus(id, { status });
    fetchBoard();
  };

  const assignDriver = async (orderId, mode) => {
    const driverUsername = driverSelections[orderId];
    if (!driverUsername) return;
    if (mode === "reassign") {
      await adminService.reassignDriver(orderId, { driverUsername });
    } else {
      await adminService.assignDriver(orderId, { driverUsername });
    }
    fetchBoard();
  };

  const cancelOrder = async (orderId) => {
    await orderService.updateOrderStatus(orderId, { status: "cancelled" });
    fetchBoard();
  };

  const renderOrderCard = (order) => {
    const canAssign = ["accepted", "dispatch_ready"].includes(order.status);
    const canReassign = order.status === "assigned";

    return (
      <Card key={order._id} className="mini-card">
        <div className="section-heading">
          <div>
            <strong>{order.order_id}</strong>
            <p>{order.store} · {formatDateTime(order.created_at)}</p>
          </div>
          <div className="status-row">
            <Badge status={order.status}>{order.status}</Badge>
            {order.driver_id && <Badge tone="secondary">{order.driver_id}</Badge>}
          </div>
        </div>

        <div className="order-card__meta">
          <div>{order.customer_name} · {order.phone || "-"}</div>
          <div>{order.address}</div>
          <div>{formatCurrency(order.total_price)}</div>
        </div>

        <div className="list-actions" style={{ marginTop: 12 }}>
          <Button
            variant="secondary"
            onClick={() => setExpandedOrderId((prev) => (prev === order._id ? "" : order._id))}
          >
            {expandedOrderId === order._id ? "상세 닫기" : "상세 보기"}
          </Button>
          <Button variant="danger" onClick={() => cancelOrder(order._id)}>
            취소
          </Button>
        </div>

        {(canAssign || canReassign) && (
          <div className="two-column-grid" style={{ marginTop: 12 }}>
            <Input
              as="select"
              label={canReassign ? "재배차 기사" : "배정 기사"}
              value={driverSelections[order._id] || ""}
              onChange={(event) =>
                setDriverSelections((prev) => ({ ...prev, [order._id]: event.target.value }))
              }
            >
              <option value="">기사 선택</option>
              {dispatchableDrivers.map((driver) => (
                <option key={driver._id} value={driver.username}>
                  {driver.username} · {driver.driverStatus} · {driver.todayDeliveries || 0}건
                </option>
              ))}
            </Input>
            <div className="list-actions" style={{ alignItems: "flex-end" }}>
              {canAssign && <Button onClick={() => assignDriver(order._id, "assign")}>기사 배정</Button>}
              {canReassign && (
                <Button variant="secondary" onClick={() => assignDriver(order._id, "reassign")}>
                  재배차
                </Button>
              )}
            </div>
          </div>
        )}

        {expandedOrderId === order._id && (
          <div className="page-stack" style={{ marginTop: 12 }}>
            <Card className="mini-card">
              <strong>주문 메뉴</strong>
              {(order.items || []).map((item, index) => (
                <div key={`${order._id}-${index}`}>
                  {item.name} - {formatCurrency(item.price)}
                </div>
              ))}
            </Card>
            <Card className="mini-card">
              <strong>상태 변경</strong>
              <Input
                as="select"
                value={order.status}
                onChange={(event) => changeStatus(order._id, event.target.value)}
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Input>
            </Card>
            <Card className="mini-card">
              <strong>상태 로그</strong>
              {(order.status_logs || []).map((log, index) => (
                <div key={`${order._id}-log-${index}`}>
                  {formatDateTime(log.created_at)} · {log.status} · {log.message}
                </div>
              ))}
            </Card>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="page-stack">
      <Card>
        <div className="section-heading">
          <div>
            <h3>실시간 관제센터</h3>
            <p>접수, 배차, 진행, 완료, 취소 주문을 한 화면에서 동시에 관리합니다.</p>
          </div>
          <Badge tone="success">3초 갱신</Badge>
        </div>
      </Card>

      {queueMeta.map((queue) => {
        const items = board.queues?.[queue.key] || [];
        return (
          <Card key={queue.key}>
            <div className="section-heading">
              <div>
                <h3>{queue.title}</h3>
                <p>{queue.key === "dispatch_ready" ? "기사 배정과 재배차를 여기서 처리합니다." : "관제 우선순위에 맞춰 바로 대응할 수 있습니다."}</p>
              </div>
              <Badge tone={queue.tone}>{items.length}건</Badge>
            </div>
            <div className="panel-list" style={{ marginTop: 16 }}>
              {items.length === 0 ? (
                <div className="empty-state">{queue.title}이 없습니다.</div>
              ) : (
                items.map(renderOrderCard)
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export default OrdersTab;
