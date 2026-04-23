import React, { useCallback, useEffect, useState } from "react";
import API from "../../api";

const filters = [
  { value: "all", label: "전체" },
  { value: "in_progress", label: "진행중" },
  { value: "completed", label: "완료" },
  { value: "cancelled", label: "취소" },
];

const statuses = [
  "pending",
  "accepted",
  "dispatch_ready",
  "assigned",
  "delivering",
  "completed",
  "cancelled",
];

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("ko-KR");
}

function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");

  const fetchOrders = useCallback(async () => {
    const res = await API.get(`/admin/orders?filter=${filter}`);
    setOrders(res.data);
  }, [filter]);

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
    fetchOrders();
  };

  return (
    <>
      <div className="header">
        <h3>📦 주문 모니터링</h3>
        <p>3초마다 자동 새로고침됩니다.</p>
      </div>

      <div className="card filter-row">
        {filters.map((item) => (
          <button
            key={item.value}
            className={filter === item.value ? "primary" : ""}
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {orders.map((order) => (
        <div key={order._id} className="card">
          <div className="admin-grid">
            <div>
              <p><b>주문번호</b> {order.order_id}</p>
              <p><b>시간</b> {formatDate(order.created_at)}</p>
              <p><b>고객명</b> {order.customer_name || "-"}</p>
              <p><b>연락처</b> {order.phone || "-"}</p>
            </div>
            <div>
              <p><b>주소</b> {order.address || "-"}</p>
              <p><b>가게</b> {order.store}</p>
              <p><b>금액</b> {order.total_price?.toLocaleString()}원</p>
              <p><b>상태</b> {order.status}</p>
            </div>
          </div>

          <div className="mini-card">
            <b>주문메뉴</b>
            {order.items?.map((item, index) => (
              <div key={index}>
                {item.name} - {item.price}원
              </div>
            ))}
          </div>

          <select
            value={order.status}
            onChange={(e) => changeStatus(order._id, e.target.value)}
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <button className="danger" onClick={() => deleteOrder(order._id)}>
            주문 삭제
          </button>
        </div>
      ))}
    </>
  );
}

export default OrdersTab;
