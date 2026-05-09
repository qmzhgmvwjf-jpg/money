import React, { useCallback, useState } from "react";
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
  { key: "orders", label: "주문", icon: "📦" },
  { key: "menus", label: "메뉴", icon: "🍽️" },
  { key: "settings", label: "설정", icon: "⚙️" },
  { key: "finance", label: "정산", icon: "💰" },
  { key: "messages", label: "메시지", icon: "💬" },
];

const filters = [
  { value: "all", label: "전체" },
  { value: "in_progress", label: "진행중" },
  { value: "completed", label: "완료" },
  { value: "cancelled", label: "취소" },
];

function StorePage() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username");
  const [tab, setTab] = useState("orders");
  const [filter, setFilter] = useState("all");
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [storeInfo, setStoreInfo] = useState(null);
  const [finance, setFinance] = useState(null);
  const [notices, setNotices] = useState([]);
  const [menuForm, setMenuForm] = useState({ name: "", price: "" });
  const [settingsForm, setSettingsForm] = useState({
    name: "",
    description: "",
    phone: "",
    minOrderAmount: 0,
    deliveryFee: 3000,
    openTime: "09:00",
    closeTime: "21:00",
  });
  const [topupForm, setTopupForm] = useState({ amount: "", depositorName: "", note: "" });
  const [editingMenuId, setEditingMenuId] = useState(null);

  const logout = () => {
    localStorage.clear();
    navigate("/");
  };

  const fetchOrders = useCallback(async () => {
    const data = await orderService.getStoreOrders(filter);
    setOrders(data);
  }, [filter]);

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

  const orderAction = async (type, id) => {
    if (type === "accept") await orderService.storeAccept(id);
    if (type === "reject") await orderService.storeReject(id);
    if (type === "dispatch") await orderService.requestDispatch(id);
    fetchOrders();
    fetchStats();
    fetchStoreInfo();
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

  const toggleAutoAccept = async () => {
    await orderService.toggleStoreAutoAccept({ autoAccept: !storeInfo?.autoAccept });
    fetchStoreInfo();
  };

  const submitMenu = async () => {
    if (!storeInfo?._id) return;
    if (!menuForm.name || !menuForm.price) {
      alert("메뉴명과 가격을 입력하세요.");
      return;
    }
    if (editingMenuId) {
      await orderService.updateMenu(editingMenuId, {
        name: menuForm.name,
        price: Number(menuForm.price),
      });
    } else {
      await orderService.createMenu({
        store_id: storeInfo._id,
        name: menuForm.name,
        price: Number(menuForm.price),
      });
    }
    setEditingMenuId(null);
    setMenuForm({ name: "", price: "" });
    fetchStoreInfo();
  };

  const requestTopup = async () => {
    if (!topupForm.amount || !topupForm.depositorName) {
      alert("충전 금액과 입금자명을 입력하세요.");
      return;
    }
    await orderService.requestStoreTopup({
      amount: Number(topupForm.amount),
      depositorName: topupForm.depositorName,
      note: topupForm.note,
    });
    setTopupForm({ amount: "", depositorName: "", note: "" });
    fetchFinance();
    fetchStoreInfo();
  };

  return (
    <AppShell mobile>
      <Header
        title={storeInfo?.name || "가게 운영"}
        subtitle="주문 흐름은 간결하게, 설정과 정산은 별도 화면처럼 분리했습니다."
        actionLabel="로그아웃"
        onAction={logout}
      />

      <div className="dashboard-grid">
        <Card className="metric-card">
          <h3>{storeInfo?.currentOrderCount || 0}건</h3>
          <p>현재 주문</p>
        </Card>
        <Card className="metric-card">
          <h3>{stats?.completedOrders || 0}건</h3>
          <p>완료 주문</p>
        </Card>
        <Card className="metric-card">
          <h3>{formatCurrency(finance?.pendingSettlement || 0)}</h3>
          <p>정산 예정액</p>
        </Card>
        <Card className="metric-card">
          <h3>{storeInfo?.currentlyOpen ? "영업중" : "중지"}</h3>
          <p>현재 영업 상태</p>
        </Card>
      </div>

      {tab === "orders" && (
        <>
          <Card>
            <div className="chip-row">
              {filters.map((item) => (
                <Button
                  key={item.value}
                  variant={filter === item.value ? "primary" : "secondary"}
                  onClick={() => setFilter(item.value)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </Card>

          {orders.map((order) => (
            <Card key={order._id}>
              <div className="section-heading">
                <div>
                  <h3>{order.order_id}</h3>
                  <p>{formatDateTime(order.created_at)}</p>
                </div>
                <Badge status={order.status}>{order.status}</Badge>
              </div>
              <div className="two-column-grid" style={{ marginTop: 16 }}>
                <div>
                  <p><strong>고객명</strong> {order.customer_name || "-"}</p>
                  <p><strong>전화번호</strong> {order.phone || "-"}</p>
                  <p><strong>주소</strong> {order.address || "-"}</p>
                </div>
                <div>
                  <p><strong>금액</strong> {formatCurrency(order.total_price)}</p>
                  <p><strong>결제</strong> {order.payment_method || "-"}</p>
                  <p><strong>기사</strong> {order.driver_id || "-"}</p>
                </div>
              </div>
              <Card className="mini-card" style={{ marginTop: 16 }}>
                <strong>주문 메뉴</strong>
                {order.items?.map((item, index) => (
                  <div key={index}>
                    {item.name} - {formatCurrency(item.price)}
                  </div>
                ))}
              </Card>
              <div className="list-actions" style={{ marginTop: 16 }}>
                {order.status === "pending" && (
                  <>
                    <Button onClick={() => orderAction("accept", order._id)}>주문 수락</Button>
                    <Button variant="danger" onClick={() => orderAction("reject", order._id)}>
                      주문 거절
                    </Button>
                  </>
                )}
                {order.status === "accepted" && (
                  <Button onClick={() => orderAction("dispatch", order._id)}>배차 요청</Button>
                )}
              </div>
            </Card>
          ))}
        </>
      )}

      {tab === "menus" && (
        <div className="page-stack">
          <Card>
            <div className="section-heading">
              <h3>메뉴 관리</h3>
              <p>메인 주문 화면과 분리된 전용 메뉴 관리 영역입니다.</p>
            </div>
            <div className="two-column-grid" style={{ marginTop: 16 }}>
              <Input label="메뉴명" value={menuForm.name} onChange={(event) => setMenuForm((prev) => ({ ...prev, name: event.target.value }))} />
              <Input label="가격" type="number" value={menuForm.price} onChange={(event) => setMenuForm((prev) => ({ ...prev, price: event.target.value }))} />
            </div>
            <div className="list-actions" style={{ marginTop: 16 }}>
              <Button onClick={submitMenu}>{editingMenuId ? "메뉴 수정" : "메뉴 추가"}</Button>
              {editingMenuId && (
                <Button variant="secondary" onClick={() => {
                  setEditingMenuId(null);
                  setMenuForm({ name: "", price: "" });
                }}>
                  수정 취소
                </Button>
              )}
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

      {tab === "settings" && (
        <Card>
          <div className="section-heading">
            <h3>가게 설정</h3>
            <Badge tone="secondary">{storeInfo?.approved ? "승인 완료" : "승인 대기"}</Badge>
          </div>
          <div className="auth-form" style={{ marginTop: 16 }}>
            <Input label="가게명" value={settingsForm.name} onChange={(event) => setSettingsForm((prev) => ({ ...prev, name: event.target.value }))} />
            <Input label="가게 소개" value={settingsForm.description} onChange={(event) => setSettingsForm((prev) => ({ ...prev, description: event.target.value }))} />
            <Input label="전화번호" value={settingsForm.phone} onChange={(event) => setSettingsForm((prev) => ({ ...prev, phone: event.target.value }))} />
            <Input label="최소주문금액" type="number" value={settingsForm.minOrderAmount} onChange={(event) => setSettingsForm((prev) => ({ ...prev, minOrderAmount: event.target.value }))} />
            <Input label="배달비" type="number" value={settingsForm.deliveryFee} onChange={(event) => setSettingsForm((prev) => ({ ...prev, deliveryFee: event.target.value }))} />
            <div className="two-column-grid">
              <Input label="영업 시작" type="time" value={settingsForm.openTime} onChange={(event) => setSettingsForm((prev) => ({ ...prev, openTime: event.target.value }))} />
              <Input label="영업 종료" type="time" value={settingsForm.closeTime} onChange={(event) => setSettingsForm((prev) => ({ ...prev, closeTime: event.target.value }))} />
            </div>
            <div className="list-actions">
              <Button variant={storeInfo?.isOpen ? "secondary" : "primary"} onClick={toggleOpen}>
                {storeInfo?.isOpen ? "영업 OFF" : "영업 ON"}
              </Button>
              <Button variant={storeInfo?.autoAccept ? "primary" : "secondary"} onClick={toggleAutoAccept}>
                자동주문수락 {storeInfo?.autoAccept ? "ON" : "OFF"}
              </Button>
            </div>
            <Button block onClick={saveSettings}>설정 저장</Button>
          </div>
        </Card>
      )}

      {tab === "finance" && (
        <div className="page-stack">
          <div className="dashboard-grid">
            <Card className="metric-card">
              <h3>{formatCurrency(finance?.balance || 0)}</h3>
              <p>충전 잔액</p>
            </Card>
            <Card className="metric-card">
              <h3>{formatCurrency(finance?.pendingSettlement || 0)}</h3>
              <p>정산 예정액</p>
            </Card>
          </div>
          <Card>
            <div className="section-heading">
              <h3>충전 요청</h3>
              <p>관리자 계좌 입금 후 승인 요청을 남겨주세요.</p>
            </div>
            <div className="auth-form" style={{ marginTop: 16 }}>
              <Input label="충전 금액" type="number" value={topupForm.amount} onChange={(event) => setTopupForm((prev) => ({ ...prev, amount: event.target.value }))} />
              <Input label="입금자명" value={topupForm.depositorName} onChange={(event) => setTopupForm((prev) => ({ ...prev, depositorName: event.target.value }))} />
              <Input label="메모" value={topupForm.note} onChange={(event) => setTopupForm((prev) => ({ ...prev, note: event.target.value }))} />
              <Button block onClick={requestTopup}>충전 요청</Button>
            </div>
          </Card>
          <Card>
            <h3>최근 결제 내역</h3>
            {(finance?.payments || []).map((payment) => (
              <Card key={payment._id} className="mini-card">
                <div className="section-heading">
                  <div>
                    <strong>{payment.order_id || payment.payment_id}</strong>
                    <p>{payment.method} · {payment.status}</p>
                  </div>
                  <Badge tone="primary">{formatCurrency(payment.amount)}</Badge>
                </div>
              </Card>
            ))}
          </Card>
          <Card>
            <h3>충전 요청 내역</h3>
            {(finance?.topupRequests || []).map((item) => (
              <Card key={item._id} className="mini-card">
                <div className="section-heading">
                  <div>
                    <strong>{formatCurrency(item.amount)}</strong>
                    <p>{item.depositorName}</p>
                  </div>
                  <Badge tone={item.status === "approved" ? "success" : item.status === "rejected" ? "danger" : "secondary"}>
                    {item.status}
                  </Badge>
                </div>
              </Card>
            ))}
          </Card>
        </div>
      )}

      {tab === "messages" && (
        <Card>
          <h3>메시지함</h3>
          {notices.map((notice) => {
            const isRead = notice.read_by?.includes(username);
            return (
              <Card key={notice._id} className="mini-card">
                <div className="section-heading">
                  <div>
                    <strong>{notice.title}</strong>
                    <p>{notice.content}</p>
                  </div>
                  <Badge tone={isRead ? "secondary" : "primary"}>
                    {isRead ? "읽음" : "새 공지"}
                  </Badge>
                </div>
                {!isRead && (
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      await noticeService.readNotice(notice._id);
                      fetchNotices();
                    }}
                  >
                    읽음 처리
                  </Button>
                )}
              </Card>
            );
          })}
        </Card>
      )}

      <BottomNavigation items={tabs} activeKey={tab} onChange={setTab} />
    </AppShell>
  );
}

export default StorePage;
