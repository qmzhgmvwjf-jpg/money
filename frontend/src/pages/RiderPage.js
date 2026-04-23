import React, { useCallback, useEffect, useMemo, useState } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";

const riderTabs = [
  { key: "home", label: "홈" },
  { key: "history", label: "배달 내역" },
  { key: "earnings", label: "수익 조회" },
  { key: "messages", label: "메시지함" },
];

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("ko-KR");
}

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
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.clear();
    navigate("/");
  }, [navigate]);

  const fetchDashboard = useCallback(async () => {
    try {
      const [dashboardRes, ordersRes] = await Promise.all([
        API.get("/driver/dashboard"),
        API.get("/driver/available-orders"),
      ]);

      setDashboard(dashboardRes.data);
      setAvailableOrders(ordersRes.data);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  }, [logout]);

  const fetchHistory = useCallback(async () => {
    const res = await API.get(`/driver/history?period=${historyPeriod}`);
    setHistoryOrders(res.data);
  }, [historyPeriod]);

  const fetchEarnings = useCallback(async () => {
    const res = await API.get(`/driver/earnings?period=${earningsPeriod}`);
    setEarnings(res.data);
  }, [earningsPeriod]);

  const fetchNotices = useCallback(async () => {
    const res = await API.get("/notices");
    setNotices(res.data);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || role !== "driver") {
      navigate("/");
      return;
    }

    fetchDashboard();
    fetchNotices();

    const interval = setInterval(fetchDashboard, 3000);
    return () => clearInterval(interval);
  }, [navigate, fetchDashboard, fetchNotices]);

  useEffect(() => {
    if (tab === "history") fetchHistory();
  }, [tab, fetchHistory]);

  useEffect(() => {
    if (tab === "earnings") fetchEarnings();
  }, [tab, fetchEarnings]);

  const toggleOnline = async () => {
    const nextStatus =
      dashboard?.onlineStatus === "online" ? "offline" : "online";
    await API.put("/driver/online-status", { onlineStatus: nextStatus });
    fetchDashboard();
  };

  const accept = async (id) => {
    await API.post(`/orders/${id}/accept`);
    fetchDashboard();
  };

  const reject = async (id) => {
    await API.post(`/orders/${id}/driver-reject`);
    fetchDashboard();
  };

  const start = async (id) => {
    await API.post(`/orders/${id}/start`);
    fetchDashboard();
  };

  const complete = async (id) => {
    await API.post(`/orders/${id}/complete`);
    fetchDashboard();
    fetchHistory();
    fetchEarnings();
  };

  const markNoticeAsRead = async (id) => {
    await API.put(`/notices/${id}/read`);
    fetchNotices();
  };

  const groupedHistory = useMemo(() => {
    return historyOrders.reduce((acc, order) => {
      const dateKey = order.created_at
        ? new Date(order.created_at).toLocaleDateString("ko-KR")
        : "날짜 없음";
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(order);
      return acc;
    }, {});
  }, [historyOrders]);

  if (loading) return <h2 style={{ textAlign: "center" }}>로딩중...</h2>;

  return (
    <div className="container admin-container">
      <div className="header">
        <h2>🚴 기사 앱</h2>
        <button onClick={logout}>로그아웃</button>
      </div>

      <div className="admin-tabs">
        {riderTabs.map((item) => (
          <button
            key={item.key}
            className={tab === item.key ? "primary" : ""}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "home" && (
        <>
          <div className="stats-grid">
            <div className="card">
              <h4>온라인 상태</h4>
              <p>{dashboard?.onlineStatus === "online" ? "온라인" : "오프라인"}</p>
              <button onClick={toggleOnline}>
                {dashboard?.onlineStatus === "online" ? "오프라인 전환" : "온라인 전환"}
              </button>
            </div>
            <div className="card">
              <h4>오늘 배달</h4>
              <p>{dashboard?.todayDeliveries || 0}건</p>
            </div>
            <div className="card">
              <h4>오늘 수익</h4>
              <p>{dashboard?.todayEarnings?.toLocaleString() || 0}원</p>
            </div>
            <div className="card">
              <h4>현재 상태</h4>
              <p>{dashboard?.currentStatus || "대기"}</p>
            </div>
          </div>

          <div className="card">
            <h4>현재 배달</h4>
            {dashboard?.currentOrder ? (
              <>
                <p>{dashboard.currentOrder.order_id}</p>
                <p>{dashboard.currentOrder.store}</p>
                <p>{dashboard.currentOrder.customer_name}</p>
                <p>{dashboard.currentOrder.phone}</p>
                <p>{dashboard.currentOrder.address}</p>
                <p>{dashboard.currentOrder.total_price?.toLocaleString()}원</p>
                <p>{dashboard.currentOrder.status}</p>
                {dashboard.currentOrder.status === "assigned" && (
                  <button onClick={() => start(dashboard.currentOrder._id)}>배달 시작</button>
                )}
                {dashboard.currentOrder.status === "delivering" && (
                  <button onClick={() => complete(dashboard.currentOrder._id)}>배달 완료</button>
                )}
              </>
            ) : (
              <p>진행 중인 배달이 없습니다.</p>
            )}
          </div>

          <div className="card">
            <h4>배차 요청 리스트</h4>
            {availableOrders.length === 0 && <p>현재 수락 가능한 배차가 없습니다.</p>}
            {availableOrders.map((order) => (
              <div key={order._id} className="mini-card">
                <p><b>{order.order_id}</b></p>
                <p>{order.store}</p>
                <p>{order.customer_name} / {order.phone}</p>
                <p>{order.address}</p>
                <p>{order.total_price?.toLocaleString()}원</p>
                <button onClick={() => accept(order._id)}>수락</button>
                <button onClick={() => reject(order._id)}>거절</button>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "history" && (
        <div className="card">
          <div className="header">
            <h4>배달 내역</h4>
            <select value={historyPeriod} onChange={(e) => setHistoryPeriod(e.target.value)}>
              <option value="day">1일</option>
              <option value="week">1주</option>
              <option value="month">1개월</option>
            </select>
          </div>

          {Object.entries(groupedHistory).map(([date, orders]) => (
            <div key={date} className="mini-card">
              <b>{date}</b>
              {orders.map((order) => (
                <div key={order._id} className="mini-card">
                  <p>{order.order_id}</p>
                  <p>{order.store}</p>
                  <p>수익: {order.driver_fee?.toLocaleString()}원</p>
                  <p>완료: {formatDate(order.created_at)}</p>
                </div>
              ))}
            </div>
          ))}

          {historyOrders.length === 0 && <p>표시할 배달 내역이 없습니다.</p>}
        </div>
      )}

      {tab === "earnings" && (
        <div className="card">
          <div className="header">
            <h4>수익 조회</h4>
            <select value={earningsPeriod} onChange={(e) => setEarningsPeriod(e.target.value)}>
              <option value="day">일</option>
              <option value="week">주</option>
              <option value="month">월</option>
            </select>
          </div>
          <p>총 수익: {earnings?.totalEarnings?.toLocaleString() || 0}원</p>
          <p>총 배달 건수: {earnings?.totalDeliveries || 0}건</p>

          {earnings?.orders?.map((order) => (
            <div key={order._id} className="mini-card">
              <p>{order.order_id}</p>
              <p>{order.store}</p>
              <p>수익 {order.driver_fee?.toLocaleString()}원</p>
              <p>{formatDate(order.created_at)}</p>
            </div>
          ))}
        </div>
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
                <p>작성일: {formatDate(notice.created_at)}</p>
                <p>읽음 여부: {isRead ? "읽음" : "안읽음"}</p>
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
    </div>
  );
}

export default RiderPage;
