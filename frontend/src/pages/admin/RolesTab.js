import React, { useEffect, useState } from "react";
import API from "../../api";

function RolesTab() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [logs, setLogs] = useState([]);

  const fetchPendingUsers = async () => {
    const res = await API.get("/pending-users");
    setPendingUsers(res.data);
  };

  const fetchLogs = async () => {
    const res = await API.get("/admin/activity-logs?limit=20");
    setLogs(res.data);
  };

  useEffect(() => {
    fetchPendingUsers();
    fetchLogs();
  }, []);

  const approveUser = async (id) => {
    await API.post(`/approve-user/${id}`);
    fetchPendingUsers();
    fetchLogs();
  };

  return (
    <>
      <h3>🔐 권한 관리</h3>

      <div className="card">
        <h4>역할 구조</h4>
        <p>admin: 운영 전용 API 및 전체 관리 권한</p>
        <p>store: 주문 수락, 배차 요청, 매출 조회, 가게 공지 수신</p>
        <p>driver: 온라인 전환, 배차 수락/거절, 수익 조회, 기사 공지 수신</p>
        <p>customer: 주문, 장바구니, 주문 추적</p>
      </div>

      <div className="card">
        <h4>승인 대기 사용자</h4>
        {pendingUsers.length === 0 && <p>승인 대기 사용자가 없습니다.</p>}
        {pendingUsers.map((user) => (
          <div key={user._id} className="mini-card">
            <p><b>{user.username}</b> / {user.role}</p>
            <p>{user.phone}</p>
            {user.storeName && <p>{user.storeName}</p>}
            <button className="primary" onClick={() => approveUser(user._id)}>
              승인
            </button>
          </div>
        ))}
      </div>

      <div className="card">
        <h4>최근 활동 로그</h4>
        {logs.map((log) => (
          <div key={log._id} className="mini-card">
            <p><b>{log.actor}</b> ({log.role})</p>
            <p>{log.message}</p>
            <p>{new Date(log.created_at).toLocaleString("ko-KR")}</p>
          </div>
        ))}
      </div>
    </>
  );
}

export default RolesTab;
