import React, { useCallback, useEffect, useState } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";

const storeTabs = [
  { key: "orders", label: "주문 관리" },
  { key: "messages", label: "메시지함" },
  { key: "stats", label: "매출 통계" },
];

const orderFilters = [
  { value: "all", label: "전체" },
  { value: "in_progress", label: "진행중" },
  { value: "completed", label: "완료" },
  { value: "cancelled", label: "취소" },
];

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("ko-KR");
}

function StorePage() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username");
  const storeName = localStorage.getItem("storeName");

  const [tab, setTab] = useState("orders");
  const [filter, setFilter] = useState("all");
  const [orders, setOrders] = useState([]);
  const [notices, setNotices] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.clear();
    navigate("/");
  }, [navigate]);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await API.get(`/store/orders?filter=${filter}`);
      setOrders(res.data);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  }, [filter, logout]);

  const fetchNotices = useCallback(async () => {
    const res = await API.get("/notices");
    setNotices(res.data);
  }, []);

  const fetchStats = useCallback(async () => {
    const res = await API.get("/store/stats");
    setStats(res.data);
  }, []);

  useEffect(() => {
    if (localStorage.getItem("role") !== "store") {
      navigate("/");
      return;
    }

    fetchOrders();
    fetchNotices();
    fetchStats();

    const interval = setInterval(() => {
      fetchOrders();
      fetchStats();
    }, 3000);

    return () => clearInterval(interval);
  }, [navigate, fetchOrders, fetchNotices, fetchStats]);

  const acceptOrder = async (id) => {
    await API.post(`/orders/${id}/store_accept`);
    fetchOrders();
    fetchStats();
  };

  const rejectOrder = async (id) => {
    await API.post(`/orders/${id}/reject`);
    fetchOrders();
    fetchStats();
  };

  const dispatchOrder = async (id) => {
    await API.post(`/orders/${id}/dispatch`);
    fetchOrders();
  };

  const markNoticeAsRead = async (id) => {
    await API.put(`/notices/${id}/read`);
    fetchNotices();
  };

  if (loading) return <h2>로딩중...</h2>;

  return (
    <div className="container admin-container">
      <div className="header">
        <h2>🏪 {storeName}</h2>
        <button onClick={logout}>로그아웃</button>
      </div>

      <div className="admin-tabs">
        {storeTabs.map((item) => (
          <button
            key={item.key}
            className={tab === item.key ? "primary" : ""}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "orders" && (
        <>
          <div className="card filter-row">
            {orderFilters.map((item) => (
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
                  <p><b>전화번호</b> {order.phone || "-"}</p>
                </div>
                <div>
                  <p><b>주소</b> {order.address || "-"}</p>
                  <p><b>금액</b> {order.total_price?.toLocaleString()}원</p>
                  <p><b>상태</b> {order.status}</p>
                  <p><b>기사</b> {order.driver_id || "-"}</p>
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

              {order.status === "pending" && (
                <>
                  <button onClick={() => acceptOrder(order._id)}>주문 수락</button>
                  <button className="danger" onClick={() => rejectOrder(order._id)}>
                    주문 거절
                  </button>
                </>
              )}

              {order.status === "accepted" && (
                <button onClick={() => dispatchOrder(order._id)}>배차 요청</button>
              )}
            </div>
          ))}
        </>
      )}

      {tab === "messages" && (
        <div className="card">
          <h4>메시지함</h4>
          {notices.length === 0 && <p>표시할 공지가 없습니다.</p>}
          {notices.map((notice) => {
            const isRead = notice.read_by?.includes(username);
            return (
              <div key={notice._id} className="mini-card">
                <p><b>{notice.title}</b></p>
                <p>{notice.content}</p>
                <p>대상: {notice.target}</p>
                <p>읽음 여부: {isRead ? "읽음" : "안읽음"}</p>
                <p>작성일: {formatDate(notice.created_at)}</p>
                {!isRead && (
                  <button onClick={() => markNoticeAsRead(notice._id)}>
                    읽음 처리
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === "stats" && (
        <>
          <div className="stats-grid">
            <div className="card">
              <h4>오늘 매출</h4>
              <p>{stats?.todaySales?.toLocaleString() || 0}원</p>
            </div>
            <div className="card">
              <h4>누적 매출</h4>
              <p>{stats?.totalSales?.toLocaleString() || 0}원</p>
            </div>
            <div className="card">
              <h4>전체 주문</h4>
              <p>{stats?.totalOrders || 0}건</p>
            </div>
            <div className="card">
              <h4>취소 주문</h4>
              <p>{stats?.cancelledOrders || 0}건</p>
            </div>
          </div>

          <div className="card">
            <h4>최근 주문 흐름</h4>
            {stats?.orders?.map((order) => (
              <div key={order._id} className="mini-card">
                <p>{order.order_id}</p>
                <p>{order.customer_name} / {order.phone}</p>
                <p>{order.total_price?.toLocaleString()}원</p>
                <p>{order.status}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default StorePage;
