import React, { useCallback, useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { adminService } from "../../services/adminService";
import { usePolling } from "../../hooks/usePolling";
import { formatDateTime } from "../../utils/format";

function RolesTab() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [logs, setLogs] = useState([]);

  const fetchPendingUsers = useCallback(async () => {
    const data = await adminService.getPendingUsers();
    setPendingUsers(data);
  }, []);

  const fetchLogs = useCallback(async () => {
    const data = await adminService.getActivityLogs(20);
    setLogs(data);
  }, []);

  usePolling(fetchPendingUsers, 5000);
  usePolling(fetchLogs, 7000);

  const approve = async (id) => {
    await adminService.approveUser(id);
    fetchPendingUsers();
    fetchLogs();
  };

  return (
    <div className="page-stack">
      <Card>
        <div className="section-heading">
          <div>
            <h3>권한 체계</h3>
            <p>admin / store / driver / customer 기반 접근 제어</p>
          </div>
          <Badge tone="primary">RBAC</Badge>
        </div>
        <div className="table-shell" style={{ marginTop: 16 }}>
          <table>
            <thead>
              <tr>
                <th>역할</th>
                <th>설명</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>admin</td><td>운영 관리, 주문/가게/기사/고객/공지 전체 제어</td></tr>
              <tr><td>store</td><td>가게 주문 처리, 배차 요청, 공지 확인</td></tr>
              <tr><td>driver</td><td>온라인 전환, 배차 수락/거절, 수익 조회</td></tr>
              <tr><td>customer</td><td>주문, 장바구니, 주문 추적</td></tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h3>승인 대기 사용자</h3>
        {pendingUsers.length === 0 && <div className="empty-state">승인 대기 계정이 없습니다.</div>}
        {pendingUsers.map((user) => (
          <div key={user._id} className="mini-card">
            <div className="section-heading">
              <div>
                <strong>{user.username}</strong>
                <p>{user.role} · {user.phone}</p>
              </div>
              <Button onClick={() => approve(user._id)}>승인</Button>
            </div>
          </div>
        ))}
      </Card>

      <Card>
        <h3>최근 활동 로그</h3>
        {logs.map((log) => (
          <div key={log._id} className="mini-card">
            <strong>{log.actor}</strong>
            <div>{log.message}</div>
            <small>{formatDateTime(log.created_at)}</small>
          </div>
        ))}
      </Card>
    </div>
  );
}

export default RolesTab;
