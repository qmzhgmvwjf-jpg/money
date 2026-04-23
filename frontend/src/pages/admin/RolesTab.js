import React, { useEffect, useState } from "react";
import API from "../../api";

function RolesTab() {
  const [pendingUsers, setPendingUsers] = useState([]);

  const fetchPendingUsers = async () => {
    const res = await API.get("/pending-users");
    setPendingUsers(res.data);
  };

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const approveUser = async (id) => {
    await API.post(`/approve-user/${id}`);
    fetchPendingUsers();
  };

  return (
    <>
      <h3>🔐 권한 관리</h3>

      <div className="card">
        <h4>역할 기반 권한 구조</h4>
        <p>admin: 관리자 전용 API, 주문/가게/기사/고객/공지 관리</p>
        <p>store: 본인 가게 주문 처리, 가게 대상 공지 조회</p>
        <p>driver: 배차 수락 및 배달 진행, 기사 대상 공지 조회</p>
        <p>customer: 주문 생성, 장바구니, 주문 추적</p>
      </div>

      <h4>승인 대기 사용자</h4>
      {pendingUsers.length === 0 && (
        <div className="card">승인 대기 중인 사용자가 없습니다.</div>
      )}

      {pendingUsers.map((user) => (
        <div key={user._id} className="card">
          <p><b>{user.username}</b></p>
          <p>역할: {user.role}</p>
          <p>전화번호: {user.phone}</p>
          {user.storeName && <p>가게명: {user.storeName}</p>}
          <button className="primary" onClick={() => approveUser(user._id)}>
            승인
          </button>
        </div>
      ))}
    </>
  );
}

export default RolesTab;
