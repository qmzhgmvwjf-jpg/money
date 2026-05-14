import React, { useCallback, useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Badge from "../../components/ui/Badge";
import { adminService } from "../../services/adminService";
import { formatCurrency, formatDateTime } from "../../utils/format";
import { usePolling } from "../../hooks/usePolling";

function FinanceTab() {
  const [overview, setOverview] = useState(null);
  const [topups, setTopups] = useState([]);
  const [driverWithdrawals, setDriverWithdrawals] = useState([]);
  const [storeWithdrawals, setStoreWithdrawals] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [storeAdjust, setStoreAdjust] = useState({});
  const [driverAdjust, setDriverAdjust] = useState({});

  const fetchFinance = useCallback(async () => {
    const [overviewData, topupData, driverWithdrawalData, storeWithdrawalData, transactionData] =
      await Promise.all([
        adminService.getFinanceOverview(),
        adminService.getTopupRequests(),
        adminService.getWithdrawalRequests(),
        adminService.getStoreWithdrawalRequests(),
        adminService.getTransactions(50),
      ]);
    setOverview(overviewData);
    setTopups(topupData);
    setDriverWithdrawals(driverWithdrawalData);
    setStoreWithdrawals(storeWithdrawalData);
    setTransactions(transactionData);
  }, []);

  usePolling(fetchFinance, 5000);

  const decideTopup = async (id, action) => {
    if (action === "approve") await adminService.approveTopup(id);
    else await adminService.rejectTopup(id);
    fetchFinance();
  };

  const decideDriverWithdrawal = async (id, action) => {
    if (action === "approve") await adminService.approveWithdrawal(id);
    else await adminService.rejectWithdrawal(id);
    fetchFinance();
  };

  const decideStoreWithdrawal = async (id, action) => {
    if (action === "approve") await adminService.approveStoreWithdrawal(id);
    else await adminService.rejectStoreWithdrawal(id);
    fetchFinance();
  };

  const submitStoreAdjust = async (storeId) => {
    const value = Number(storeAdjust[storeId] || 0);
    if (!value) return;
    await adminService.adjustStoreBalance(storeId, { amount: value, note: "관리자 잔액 수정" });
    setStoreAdjust((prev) => ({ ...prev, [storeId]: "" }));
    fetchFinance();
  };

  const submitDriverAdjust = async (driverId) => {
    const value = Number(driverAdjust[driverId] || 0);
    if (!value) return;
    await adminService.adjustDriverBalance(driverId, { amount: value, note: "관리자 수익 수정" });
    setDriverAdjust((prev) => ({ ...prev, [driverId]: "" }));
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
          <p>입금 승인 대기</p>
        </Card>
        <Card className="metric-card">
          <h3>{(overview?.pendingWithdrawals || 0) + (overview?.pendingStoreWithdrawals || 0)}건</h3>
          <p>출금 승인 대기</p>
        </Card>
      </div>

      <Card>
        <div className="section-heading">
          <h3>가게별 정산 현황</h3>
          <Badge tone="secondary">{overview?.storeSettlements?.length || 0}개 가게</Badge>
        </div>
        {(overview?.storeSettlements || []).map((store) => (
          <Card key={store.store_id} className="mini-card">
            <div className="section-heading">
              <div>
                <strong>{store.store_name}</strong>
                <p>총 매출 {formatCurrency(store.totalSales || 0)} · 출금 {formatCurrency(store.withdrawnAmount || 0)}</p>
              </div>
              <Badge tone="primary">{formatCurrency(store.balance)}</Badge>
            </div>
            <div className="two-column-grid" style={{ marginTop: 12 }}>
              <Input
                label="잔액 조정"
                type="number"
                value={storeAdjust[store.store_id] || ""}
                onChange={(event) => setStoreAdjust((prev) => ({ ...prev, [store.store_id]: event.target.value }))}
              />
              <div className="list-actions" style={{ alignItems: "flex-end" }}>
                <Button onClick={() => submitStoreAdjust(store.store_id)}>잔액 수정</Button>
              </div>
            </div>
          </Card>
        ))}
      </Card>

      <Card>
        <div className="section-heading">
          <h3>기사별 정산 현황</h3>
          <Badge tone="secondary">{overview?.driverBalances?.length || 0}명</Badge>
        </div>
        {(overview?.driverBalances || []).map((driver) => (
          <Card key={driver.driver_id} className="mini-card">
            <div className="section-heading">
              <div>
                <strong>{driver.driver_username}</strong>
                <p>오늘 {formatCurrency(driver.todayEarnings || 0)} · 총 {formatCurrency(driver.totalEarnings || 0)}</p>
              </div>
              <Badge tone="success">{formatCurrency(driver.balance)}</Badge>
            </div>
            <div className="two-column-grid" style={{ marginTop: 12 }}>
              <Input
                label="수익 조정"
                type="number"
                value={driverAdjust[driver.driver_id] || ""}
                onChange={(event) => setDriverAdjust((prev) => ({ ...prev, [driver.driver_id]: event.target.value }))}
              />
              <div className="list-actions" style={{ alignItems: "flex-end" }}>
                <Button onClick={() => submitDriverAdjust(driver.driver_id)}>수익 수정</Button>
              </div>
            </div>
          </Card>
        ))}
      </Card>

      <Card>
        <div className="section-heading">
          <h3>가게 입금 요청</h3>
          <Badge tone="primary">{topups.filter((item) => item.status === "pending").length}건</Badge>
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
          <h3>가게 출금 요청</h3>
          <Badge tone="primary">{storeWithdrawals.filter((item) => item.status === "pending").length}건</Badge>
        </div>
        {storeWithdrawals.map((item) => (
          <Card key={item._id} className="mini-card">
            <div className="section-heading">
              <div>
                <strong>{item.store_name}</strong>
                <p>{item.bankName} · {item.accountNumber}</p>
              </div>
              <Badge tone={item.status === "approved" ? "success" : item.status === "rejected" ? "danger" : "primary"}>
                {item.status}
              </Badge>
            </div>
            <div>{formatCurrency(item.amount)}</div>
            {item.status === "pending" && (
              <div className="list-actions" style={{ marginTop: 12 }}>
                <Button onClick={() => decideStoreWithdrawal(item._id, "approve")}>승인</Button>
                <Button variant="danger" onClick={() => decideStoreWithdrawal(item._id, "reject")}>거절</Button>
              </div>
            )}
          </Card>
        ))}
      </Card>

      <Card>
        <div className="section-heading">
          <h3>기사 출금 요청</h3>
          <Badge tone="primary">{driverWithdrawals.filter((item) => item.status === "pending").length}건</Badge>
        </div>
        {driverWithdrawals.map((item) => (
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
                <Button onClick={() => decideDriverWithdrawal(item._id, "approve")}>승인</Button>
                <Button variant="danger" onClick={() => decideDriverWithdrawal(item._id, "reject")}>거절</Button>
              </div>
            )}
          </Card>
        ))}
      </Card>

      <Card>
        <div className="section-heading">
          <h3>거래내역</h3>
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
