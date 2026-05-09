import React, { useCallback, useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { adminService } from "../../services/adminService";
import { formatCurrency, formatDateTime } from "../../utils/format";
import { usePolling } from "../../hooks/usePolling";

function FinanceTab() {
  const [overview, setOverview] = useState(null);
  const [topups, setTopups] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const fetchFinance = useCallback(async () => {
    const [overviewData, topupData, withdrawalData, transactionData] = await Promise.all([
      adminService.getFinanceOverview(),
      adminService.getTopupRequests(),
      adminService.getWithdrawalRequests(),
      adminService.getTransactions(50),
    ]);
    setOverview(overviewData);
    setTopups(topupData);
    setWithdrawals(withdrawalData);
    setTransactions(transactionData);
  }, []);

  usePolling(fetchFinance, 5000);

  const decideTopup = async (id, action) => {
    if (action === "approve") await adminService.approveTopup(id);
    else await adminService.rejectTopup(id);
    fetchFinance();
  };

  const decideWithdrawal = async (id, action) => {
    if (action === "approve") await adminService.approveWithdrawal(id);
    else await adminService.rejectWithdrawal(id);
    fetchFinance();
  };

  return (
    <div className="page-stack">
      <div className="dashboard-grid">
        <Card className="metric-card">
          <h3>{formatCurrency(overview?.totalRevenue || 0)}</h3>
          <p>전체 매출</p>
        </Card>
        <Card className="metric-card">
          <h3>{overview?.pendingTopups || 0}건</h3>
          <p>충전 승인 대기</p>
        </Card>
        <Card className="metric-card">
          <h3>{overview?.pendingWithdrawals || 0}건</h3>
          <p>출금 승인 대기</p>
        </Card>
      </div>

      <Card>
        <div className="section-heading">
          <h3>가게별 정산 금액</h3>
          <Badge tone="secondary">{overview?.storeSettlements?.length || 0}개 가게</Badge>
        </div>
        {(overview?.storeSettlements || []).map((store) => (
          <Card key={store.store_id} className="mini-card">
            <div className="section-heading">
              <div>
                <strong>{store.store_name}</strong>
                <p>정산 예정 {formatCurrency(store.pendingSettlement)}</p>
              </div>
              <Badge tone="primary">충전 잔액 {formatCurrency(store.balance)}</Badge>
            </div>
          </Card>
        ))}
      </Card>

      <Card>
        <div className="section-heading">
          <h3>기사별 수익</h3>
          <Badge tone="secondary">{overview?.driverBalances?.length || 0}명</Badge>
        </div>
        {(overview?.driverBalances || []).map((driver) => (
          <Card key={driver.driver_id} className="mini-card">
            <div className="section-heading">
              <div>
                <strong>{driver.driver_username}</strong>
                <p>{driver.bankName || "계좌 미등록"}</p>
              </div>
              <Badge tone="success">{formatCurrency(driver.balance)}</Badge>
            </div>
          </Card>
        ))}
      </Card>

      <Card>
        <div className="section-heading">
          <h3>충전 요청 관리</h3>
          <Badge tone="primary">{topups.filter((item) => item.status === "pending").length}건 대기</Badge>
        </div>
        {topups.map((item) => (
          <Card key={item._id} className="mini-card">
            <div className="section-heading">
              <div>
                <strong>{item.store_name}</strong>
                <p>{item.depositorName} · {formatCurrency(item.amount)}</p>
              </div>
              <Badge tone={item.status === "approved" ? "success" : item.status === "rejected" ? "danger" : "primary"}>
                {item.status}
              </Badge>
            </div>
            {item.status === "pending" && (
              <div className="list-actions" style={{ marginTop: 12 }}>
                <Button onClick={() => decideTopup(item._id, "approve")}>승인</Button>
                <Button variant="danger" onClick={() => decideTopup(item._id, "reject")}>거절</Button>
              </div>
            )}
          </Card>
        ))}
      </Card>

      <Card>
        <div className="section-heading">
          <h3>기사 출금 요청</h3>
          <Badge tone="primary">{withdrawals.filter((item) => item.status === "pending").length}건 대기</Badge>
        </div>
        {withdrawals.map((item) => (
          <Card key={item._id} className="mini-card">
            <div className="section-heading">
              <div>
                <strong>{item.driver_username}</strong>
                <p>{item.bankName} · {item.accountNumber}</p>
              </div>
              <Badge tone={item.status === "approved" ? "success" : item.status === "rejected" ? "danger" : "primary"}>
                {item.status}
              </Badge>
            </div>
            <div>{formatCurrency(item.amount)}</div>
            {item.status === "pending" && (
              <div className="list-actions" style={{ marginTop: 12 }}>
                <Button onClick={() => decideWithdrawal(item._id, "approve")}>승인</Button>
                <Button variant="danger" onClick={() => decideWithdrawal(item._id, "reject")}>거절</Button>
              </div>
            )}
          </Card>
        ))}
      </Card>

      <Card>
        <div className="section-heading">
          <h3>거래 내역</h3>
          <Badge tone="secondary">{transactions.length}건</Badge>
        </div>
        {transactions.map((item) => (
          <Card key={item._id} className="mini-card">
            <div className="section-heading">
              <div>
                <strong>{item.type}</strong>
                <p>{item.description}</p>
              </div>
              <Badge tone="secondary">{formatCurrency(item.amount)}</Badge>
            </div>
            <p>{item.actor} → {item.target}</p>
            <p>{formatDateTime(item.created_at)}</p>
          </Card>
        ))}
      </Card>
    </div>
  );
}

export default FinanceTab;
