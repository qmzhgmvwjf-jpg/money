import React, { useCallback, useEffect, useState } from "react";
import API from "../../api";

const statuses = [
  "all",
  "pending",
  "accepted",
  "dispatch_ready",
  "assigned",
  "delivering",
  "completed",
];

function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchOrders = useCallback(async () => {
    const url =
      statusFilter === "all"
        ? "/admin/orders"
        : `/admin/orders?status=${statusFilter}`;
    const res = await API.get(url);
    setOrders(res.data);
  }, [statusFilter]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 3000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const changeStatus = async (id, status) => {
    await API.put(`/orders/${id}/status`, { status });
    fetchOrders();
  };

  const deleteOrder = async (id) => {
    if (!window.confirm("주문을 삭제할까요?")) return;

    await API.delete(`/orders/${id}`);
    setSelectedOrder(null);
    fetchOrders();
  };

  return (
    <>
      <h3>📦 주문 모니터링</h3>

      <div className="card">
        <label>상태 필터</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      {orders.map((order) => (
        <div key={order._id} className="card">
          <div className="admin-row">
            <div>
              <b>{order.store}</b>
              <p>고객: {order.user || "-"}</p>
              <p>주소: {order.address || "-"}</p>
              <p>상태: {order.status}</p>
            </div>
            <button onClick={() => setSelectedOrder(order)}>상세</button>
          </div>

          <select
            value={order.status}
            onChange={(e) => changeStatus(order._id, e.target.value)}
          >
            {statuses
              .filter((status) => status !== "all")
              .map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
          </select>

          <button className="danger" onClick={() => deleteOrder(order._id)}>
            삭제
          </button>
        </div>
      ))}

      {selectedOrder && (
        <div className="card admin-detail">
          <div className="header">
            <h3>주문 상세</h3>
            <button onClick={() => setSelectedOrder(null)}>닫기</button>
          </div>
          <p>가게: {selectedOrder.store}</p>
          <p>고객: {selectedOrder.user || "-"}</p>
          <p>주소: {selectedOrder.address || "-"}</p>
          <p>기사: {selectedOrder.driver_id || "-"}</p>
          <p>상태: {selectedOrder.status}</p>
          <h4>메뉴</h4>
          {selectedOrder.items?.length > 0 ? (
            selectedOrder.items.map((item, index) => (
              <div key={index}>
                {item.name} - {item.price}원
              </div>
            ))
          ) : (
            <p>메뉴 정보 없음</p>
          )}
        </div>
      )}
    </>
  );
}

export default OrdersTab;
