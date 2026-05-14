import React, { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../layouts/AppShell";
import Header from "../components/common/Header";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import BottomNavigation from "../components/navigation/BottomNavigation";
import { orderService } from "../services/orderService";
import { noticeService } from "../services/noticeService";
import { formatCurrency, formatDateTime } from "../utils/format";
import { usePolling } from "../hooks/usePolling";

const tabs = [
  { key: "home", label: "메인", icon: "🏪" },
  { key: "menus", label: "메뉴", icon: "🍽️" },
  { key: "finance", label: "정산", icon: "💰" },
  { key: "settings", label: "설정", icon: "⚙️" },
];

function StorePage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [storeInfo, setStoreInfo] = useState(null);
  const [finance, setFinance] = useState(null);
  const [tab, setTab] = useState("home");
  const [menuForm, setMenuForm] = useState({ name: "", price: "" });
  const [editingMenuId, setEditingMenuId] = useState(null);
  const [settingsForm, setSettingsForm] = useState({
    name: "",
    description: "",
    phone: "",
    minOrderAmount: 0,
    deliveryFee: 0,
    bankName: "",
    accountNumber: "",
    accountHolder: "",
    openTime: "09:00",
    closeTime: "21:00",
  });
  const [topupForm, setTopupForm] = useState({ amount: "", depositorName: "", note: "" });
  const [withdrawForm, setWithdrawForm] = useState({ amount: "", note: "" });
  const [notices, setNotices] = useState([]);

  const logout = () => {
    localStorage.clear();
    navigate("/");
  };

  const fetchOrders = useCallback(async () => {
    const data = await orderService.getStoreOrders("all");
    setOrders(data);
  }, []);

  const fetchStats = useCallback(async () => {
    const data = await orderService.getStoreStats();
    setStats(data);
  }, []);

  const fetchStoreInfo = useCallback(async () => {
    const data = await orderService.getStoreMyInfo();
    setStoreInfo(data);
    setSettingsForm({
      name: data.name || "",
      description: data.description || "",
      phone: data.phone || "",
      minOrderAmount: data.minOrderAmount || 0,
      deliveryFee: data.deliveryFee || 0,
      bankName: data.bankName || "",
      accountNumber: data.accountNumber || "",
      accountHolder: data.accountHolder || "",
      openTime: data.openTime || "09:00",
      closeTime: data.closeTime || "21:00",
    });
  }, []);

  const fetchFinance = useCallback(async () => {
    const data = await orderService.getStoreFinance();
    setFinance(data);
  }, []);

  const fetchNotices = useCallback(async () => {
    const data = await noticeService.getNotices();
    setNotices(data);
  }, []);

  usePolling(fetchOrders, 3000);
  usePolling(fetchStats, 5000);
  usePolling(fetchStoreInfo, 5000);
  usePolling(fetchFinance, 7000);
  usePolling(fetchNotices, 7000);

  const currentOrders = useMemo(
    () => orders.filter((order) => order.status === "pending"),
    [orders]
  );
  const inProgressOrders = useMemo(
    () => orders.filter((order) => ["accepted", "dispatch_ready", "assigned", "delivering"].includes(order.status)),
    [orders]
  );
  const completedOrders = useMemo(
    () => orders.filter((order) => ["completed", "cancelled"].includes(order.status)),
    [orders]
  );

  const orderAction = async (type, id) => {
    if (type === "accept") await orderService.storeAccept(id);
    if (type === "reject") await orderService.storeReject(id);
    if (type === "dispatch") await orderService.requestDispatch(id);
    fetchOrders();
    fetchStats();
    fetchFinance();
  };

  const saveSettings = async () => {
    await orderService.updateStoreSettings({
      ...settingsForm,
      minOrderAmount: Number(settingsForm.minOrderAmount),
      deliveryFee: Number(settingsForm.deliveryFee),
    });
    fetchStoreInfo();
  };

  const toggleOpen = async () => {
    await orderService.toggleStoreOpen({ isOpen: !storeInfo?.isOpen });
    fetchStoreInfo();
  };

  const submitMenu = async () => {
    if (!storeInfo?._id) return;
    if (!menuForm.name || !menuForm.price) {
      alert("메뉴명과 가격을 입력하세요.");
      return;
    }
    if (editingMenuId) {
      await orderService.updateMenu(editingMenuId, { name: menuForm.name, price: Number(menuForm.price) });
    } else {
      await orderService.createMenu({
        store_id: storeInfo._id,
        name: menuForm.name,
        price: Number(menuForm.price),
      });
    }
    setMenuForm({ name: "", price: "" });
    setEditingMenuId(null);
    fetchStoreInfo();
  };

  const requestTopup = async () => {
    await orderService.requestStoreTopup({
      amount: Number(topupForm.amount),
      depositorName: topupForm.depositorName,
      note: topupForm.note,
    });
    setTopupForm({ amount: "", depositorName: "", note: "" });
    fetchFinance();
  };

  const requestWithdrawal = async () => {
    await orderService.requestStoreWithdrawal({
      amount: Number(withdrawForm.amount),
      note: withdrawForm.note,
    });
    setWithdrawForm({ amount: "", note: "" });
    fetchFinance();
  };

  const renderOrderCard = (order) => (
    <Card key={order._id} className="mini-card">
      <div className="section-heading">
        <div>
          <strong>{order.order_id}</strong>
          <p>{order.customer_name} · {formatDateTime(order.created_at)}</p>
        </div>
        <Badge status={order.status}>{order.status}</Badge>
      </div>
      <p>{order.address}</p>
      <p>{formatCurrency(order.total_price)}</p>
      <div className="list-actions" style={{ marginTop: 12 }}>
        {order.status === "pending" && (
          <>
            <Button onClick={() => orderAction("accept", order._id)}>수락</Button>
            <Button variant="danger" onClick={() => orderAction("reject", order._id)}>거절</Button>
          </>
        )}
        {order.status === "accepted" && (
          <Button onClick={() => orderAction("dispatch", order._id)}>배차 요청</Button>
        )}
      </div>
    </Card>
  );

  return (
    <AppShell mobile>
      <Header
        title={storeInfo?.name || "가게 운영"}
        subtitle="주문은 간결하게, 설정과 정산은 분리해서 운영할 수 있게 정리했습니다"
        actionLabel="로그아웃"
        onAction={logout}
      />

      <div className="dashboard-grid">
        <Card className="metric-card">
          <h3>{currentOrders.length}건</h3>
          <p>현재 주문</p>
        </Card>
        <Card className="metric-card">
          <h3>{inProgressOrders.length}건</h3>
          <p>진행중 주문</p>
        </Card>
        <Card className="metric-card">
          <h3>{completedOrders.length}건</h3>
          <p>완료 주문</p>
        </Card>
        <Card className="metric-card">
          <h3>{formatCurrency(finance?.balance || 0)}</h3>
          <p>현재 잔액</p>
        </Card>
      </div>

      {tab === "home" && (
        <div className="page-stack">
          <Card>
            <div className="section-heading">
              <div>
                <h3>현재 주문</h3>
                <p>즉시 처리할 주문만 먼저 모아봤어요.</p>
              </div>
              <Badge tone="primary">{currentOrders.length}건</Badge>
            </div>
            {currentOrders.length === 0 ? <div className="empty-state">현재 주문이 없습니다.</div> : currentOrders.map(renderOrderCard)}
          </Card>

          <Card>
            <div className="section-heading">
              <h3>진행중 주문</h3>
              <Badge tone="secondary">{inProgressOrders.length}건</Badge>
            </div>
            {inProgressOrders.length === 0 ? <div className="empty-state">진행중 주문이 없습니다.</div> : inProgressOrders.map(renderOrderCard)}
          </Card>

          <Card>
            <div className="section-heading">
              <h3>완료 주문</h3>
              <Badge tone="secondary">{completedOrders.length}건</Badge>
            </div>
            {completedOrders.length === 0 ? <div className="empty-state">완료 주문이 없습니다.</div> : completedOrders.slice(0, 10).map(renderOrderCard)}
          </Card>

          <Card>
            <div className="section-heading">
              <h3>운영 메시지</h3>
              <Badge tone="primary">{notices.length}건</Badge>
            </div>
            {notices.slice(0, 3).map((notice) => (
              <Card key={notice._id} className="mini-card">
                <strong>{notice.title}</strong>
                <p>{notice.content}</p>
              </Card>
            ))}
          </Card>
        </div>
      )}

      {tab === "menus" && (
        <div className="page-stack">
          <Card>
            <div className="section-heading">
              <h3>메뉴 관리</h3>
              <p>메뉴 추가/수정/삭제를 이 페이지에서만 관리합니다.</p>
            </div>
            <div className="two-column-grid" style={{ marginTop: 16 }}>
              <Input label="메뉴명" value={menuForm.name} onChange={(event) => setMenuForm((prev) => ({ ...prev, name: event.target.value }))} />
              <Input label="가격" type="number" value={menuForm.price} onChange={(event) => setMenuForm((prev) => ({ ...prev, price: event.target.value }))} />
            </div>
            <div className="list-actions" style={{ marginTop: 16 }}>
              <Button onClick={submitMenu}>{editingMenuId ? "메뉴 수정" : "메뉴 추가"}</Button>
            </div>
          </Card>
          {(storeInfo?.menus || []).map((menu) => (
            <Card key={menu._id} className="menu-item">
              <div className="menu-item__meta">
                <div>
                  <strong>{menu.name}</strong>
                  <div>{formatCurrency(menu.price)}</div>
                </div>
                <div className="list-actions">
                  <Button variant="secondary" onClick={() => {
                    setEditingMenuId(menu._id);
                    setMenuForm({ name: menu.name, price: String(menu.price) });
                  }}>
                    수정
                  </Button>
                  <Button variant="danger" onClick={async () => {
                    await orderService.deleteMenu(menu._id);
                    fetchStoreInfo();
                  }}>
                    삭제
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "finance" && (
        <div className="page-stack">
          <div className="dashboard-grid">
            <Card className="metric-card">
              <h3>{formatCurrency(finance?.balance || 0)}</h3>
              <p>현재 잔액</p>
            </Card>
            <Card className="metric-card">
              <h3>{formatCurrency(stats?.totalSales || 0)}</h3>
              <p>총 매출</p>
            </Card>
          </div>

          <Card>
            <div className="section-heading">
              <h3>입금 요청</h3>
              <p>관리자 계좌 입금 후 충전을 요청할 수 있어요.</p>
            </div>
            <div className="auth-form" style={{ marginTop: 16 }}>
              <Input label="입금 금액" type="number" value={topupForm.amount} onChange={(event) => setTopupForm((prev) => ({ ...prev, amount: event.target.value }))} />
              <Input label="입금자명" value={topupForm.depositorName} onChange={(event) => setTopupForm((prev) => ({ ...prev, depositorName: event.target.value }))} />
              <Input label="메모" value={topupForm.note} onChange={(event) => setTopupForm((prev) => ({ ...prev, note: event.target.value }))} />
              <Button block onClick={requestTopup}>입금 요청</Button>
            </div>
          </Card>

          <Card>
            <div className="section-heading">
              <h3>출금 요청</h3>
              <p>설정에 등록한 계좌로 정산 출금을 요청할 수 있어요.</p>
            </div>
            <div className="auth-form" style={{ marginTop: 16 }}>
              <Input label="출금 금액" type="number" value={withdrawForm.amount} onChange={(event) => setWithdrawForm((prev) => ({ ...prev, amount: event.target.value }))} />
              <Input label="메모" value={withdrawForm.note} onChange={(event) => setWithdrawForm((prev) => ({ ...prev, note: event.target.value }))} />
              <Button block onClick={requestWithdrawal}>출금 요청</Button>
            </div>
          </Card>

          <Card>
            <h3>거래 내역</h3>
            {(finance?.transactions || []).map((item) => (
              <Card key={item._id} className="mini-card">
                <div className="section-heading">
                  <div>
                    <strong>{item.type}</strong>
                    <p>{item.description}</p>
                  </div>
                  <Badge tone="secondary">{formatCurrency(item.amount)}</Badge>
                </div>
              </Card>
            ))}
          </Card>
        </div>
      )}

      {tab === "settings" && (
        <Card>
          <div className="section-heading">
            <h3>가게 설정</h3>
            <Badge tone={storeInfo?.currentlyOpen ? "success" : "secondary"}>
              {storeInfo?.currentlyOpen ? "영업중" : "영업중지"}
            </Badge>
          </div>
          <div className="auth-form" style={{ marginTop: 16 }}>
            <Input label="가게명" value={settingsForm.name} onChange={(event) => setSettingsForm((prev) => ({ ...prev, name: event.target.value }))} />
            <Input label="가게 정보" value={settingsForm.description} onChange={(event) => setSettingsForm((prev) => ({ ...prev, description: event.target.value }))} />
            <Input label="전화번호" value={settingsForm.phone} onChange={(event) => setSettingsForm((prev) => ({ ...prev, phone: event.target.value }))} />
            <Input label="최소주문금액" type="number" value={settingsForm.minOrderAmount} onChange={(event) => setSettingsForm((prev) => ({ ...prev, minOrderAmount: event.target.value }))} />
            <Input label="배달비" type="number" value={settingsForm.deliveryFee} onChange={(event) => setSettingsForm((prev) => ({ ...prev, deliveryFee: event.target.value }))} />
            <Input label="은행명" value={settingsForm.bankName} onChange={(event) => setSettingsForm((prev) => ({ ...prev, bankName: event.target.value }))} />
            <Input label="계좌번호" value={settingsForm.accountNumber} onChange={(event) => setSettingsForm((prev) => ({ ...prev, accountNumber: event.target.value }))} />
            <Input label="예금주" value={settingsForm.accountHolder} onChange={(event) => setSettingsForm((prev) => ({ ...prev, accountHolder: event.target.value }))} />
            <div className="two-column-grid">
              <Input label="영업 시작" type="time" value={settingsForm.openTime} onChange={(event) => setSettingsForm((prev) => ({ ...prev, openTime: event.target.value }))} />
              <Input label="영업 종료" type="time" value={settingsForm.closeTime} onChange={(event) => setSettingsForm((prev) => ({ ...prev, closeTime: event.target.value }))} />
            </div>
            <div className="list-actions">
              <Button variant={storeInfo?.isOpen ? "secondary" : "primary"} onClick={toggleOpen}>
                {storeInfo?.isOpen ? "영업 OFF" : "영업 ON"}
              </Button>
              <Button variant={storeInfo?.autoAccept ? "primary" : "secondary"} onClick={async () => {
                await orderService.toggleStoreAutoAccept({ autoAccept: !storeInfo?.autoAccept });
                fetchStoreInfo();
              }}>
                자동수락 {storeInfo?.autoAccept ? "ON" : "OFF"}
              </Button>
            </div>
            <Button block onClick={saveSettings}>설정 저장</Button>
          </div>
        </Card>
      )}

      <BottomNavigation items={tabs} activeKey={tab} onChange={setTab} />
    </AppShell>
  );
}

export default StorePage;
