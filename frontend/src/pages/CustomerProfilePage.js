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
import { formatCurrency, formatDateTime } from "../utils/format";
import { usePolling } from "../hooks/usePolling";
import { useToast } from "../hooks/useToast";

const navItems = [
  { key: "home", label: "홈", icon: "🏠" },
  { key: "shorts", label: "쇼츠", icon: "▶" },
  { key: "cart", label: "장바구니", icon: "🛒" },
  { key: "search", label: "검색", icon: "🔎" },
  { key: "profile", label: "마이", icon: "👤" },
];

const defaultPayments = ["카드", "카카오페이"];

function CustomerProfilePage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState(localStorage.getItem("phone") || "");
  const [address, setAddress] = useState(localStorage.getItem("address") || "");
  const [orders, setOrders] = useState([]);
  const [paymentInput, setPaymentInput] = useState("");
  const [retention, setRetention] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("paymentMethods") || "null");
      return Array.isArray(saved) && saved.length > 0 ? saved : defaultPayments;
    } catch {
      return defaultPayments;
    }
  });
  const { showToast, ToastViewport } = useToast();

  const fetchOrders = useCallback(async () => {
    const data = await orderService.getMyOrders();
    setOrders(data);
  }, []);

  const fetchProfile = useCallback(async () => {
    const data = await orderService.getMyProfile();
    setPhone(data.phone || "");
    setAddress(data.address || "");
  }, []);

  const fetchRetention = useCallback(async () => {
    const data = await orderService.getRetentionSummary();
    setRetention(data);
  }, []);

  usePolling(fetchOrders, 5000);
  usePolling(fetchProfile, 10000);
  usePolling(fetchRetention, 8000);

  const inProgressOrders = useMemo(
    () => orders.filter((order) => !["completed", "cancelled"].includes(order.status)),
    [orders]
  );
  const completedOrders = useMemo(
    () => orders.filter((order) => ["completed", "cancelled"].includes(order.status)),
    [orders]
  );

  const saveProfile = async () => {
    await orderService.updateMyProfile({ phone, address });
    localStorage.setItem("phone", phone);
    localStorage.setItem("address", address);
    localStorage.setItem("paymentMethods", JSON.stringify(paymentMethods));
    showToast("기본 정보를 저장했습니다", "success");
  };

  const addPaymentMethod = () => {
    const trimmed = paymentInput.trim();
    if (!trimmed) return;
    const next = Array.from(new Set([...paymentMethods, trimmed]));
    setPaymentMethods(next);
    setPaymentInput("");
    localStorage.setItem("paymentMethods", JSON.stringify(next));
  };

  return (
    <AppShell mobile>
      <Header
        title="마이페이지"
        subtitle="주문내역과 주소, 결제수단을 한곳에서 관리하세요"
        actionLabel="로그아웃"
        onAction={() => {
          localStorage.clear();
          navigate("/");
        }}
      />

      <Card>
        <div className="section-heading">
          <h3>기본 정보</h3>
          <Badge tone="secondary">customer</Badge>
        </div>
        <div className="auth-form" style={{ marginTop: 16 }}>
          <Input label="전화번호" value={phone} onChange={(event) => setPhone(event.target.value)} />
          <Input label="주소" value={address} onChange={(event) => setAddress(event.target.value)} />
          <Button block onClick={saveProfile}>저장하기</Button>
        </div>
      </Card>

      <Card>
        <div className="section-heading">
          <h3>결제수단 관리</h3>
          <Badge tone="primary">{paymentMethods.length}개</Badge>
        </div>
        <div className="auth-form" style={{ marginTop: 16 }}>
          <Input
            label="결제수단 추가"
            placeholder="예: 네이버페이"
            value={paymentInput}
            onChange={(event) => setPaymentInput(event.target.value)}
          />
          <Button block onClick={addPaymentMethod}>추가</Button>
        </div>
        <div className="chip-row" style={{ marginTop: 16 }}>
          {paymentMethods.map((method) => (
            <Button
              key={method}
              variant="secondary"
              onClick={() => {
                const next = paymentMethods.filter((item) => item !== method);
                setPaymentMethods(next);
                localStorage.setItem("paymentMethods", JSON.stringify(next));
              }}
            >
              {method} 삭제
            </Button>
          ))}
        </div>
      </Card>

      <Card>
        <div className="section-heading">
          <h3>스티커북과 혜택</h3>
          <Badge tone="secondary">{retention?.availableRewards?.length || 0}개 혜택</Badge>
        </div>
        <div className="chip-row" style={{ marginTop: 16 }}>
          <Badge tone="primary">스티커 {retention?.stickerBook?.earned?.length || 0}장</Badge>
          <Badge tone="secondary">팔로우한 가게 {retention?.followedStores?.length || 0}곳</Badge>
          <Badge tone="secondary">오늘 럭키박스 {retention?.todayLuckyBoxClaimed ? "완료" : "미수령"}</Badge>
        </div>
        <div className="list-actions" style={{ marginTop: 16 }}>
          <Button onClick={() => navigate("/customer/stickers")}>스티커북 열기</Button>
          <Button variant="secondary" onClick={async () => {
            const data = await orderService.claimLuckyBox();
            showToast(data.alreadyClaimed ? "오늘 보상은 이미 받았어요" : `${data.reward?.title} 획득!`, "success");
            fetchRetention();
          }}>
            럭키박스 열기
          </Button>
        </div>
      </Card>

      <Card>
        <div className="section-heading">
          <h3>팔로우한 가게</h3>
          <Badge tone="secondary">{retention?.followedStores?.length || 0}곳</Badge>
        </div>
        {(retention?.followedStores || []).slice(0, 4).map((follow) => (
          <Card key={follow._id} className="mini-card">
            <div className="section-heading">
              <div>
                <strong>{follow.store_name}</strong>
                <p>{follow.latest_story?.title || "아직 새 스토리가 없습니다."}</p>
              </div>
              <Button variant="secondary" onClick={() => navigate(`/customer/store/${follow.store_id}`)}>
                보러가기
              </Button>
            </div>
          </Card>
        ))}
        {(retention?.followedStores || []).length === 0 && <div className="empty-state">팔로우한 가게가 아직 없습니다.</div>}
      </Card>

      <Card>
        <div className="section-heading">
          <h3>진행중 주문</h3>
          <Badge tone="primary">{inProgressOrders.length}건</Badge>
        </div>
        {inProgressOrders.length === 0 && <div className="empty-state">진행중 주문이 없습니다.</div>}
        {inProgressOrders.map((order) => (
          <Card key={order._id} className="mini-card">
            <div className="section-heading">
              <div>
                <strong>{order.store_name || order.store}</strong>
                <p>{order.order_id} · {formatDateTime(order.created_at)}</p>
              </div>
              <Badge status={order.status}>{order.status}</Badge>
            </div>
            <p>{formatCurrency(order.total_price)}</p>
            <div className="list-actions" style={{ marginTop: 12 }}>
              <Button variant="secondary" onClick={() => navigate("/tracking")}>상태 추적</Button>
            </div>
          </Card>
        ))}
      </Card>

      <Card>
        <div className="section-heading">
          <h3>완료 주문</h3>
          <Badge tone="secondary">{completedOrders.length}건</Badge>
        </div>
        {completedOrders.length === 0 && <div className="empty-state">완료된 주문이 없습니다.</div>}
        {completedOrders.map((order) => (
          <Card key={order._id} className="mini-card">
            <div className="section-heading">
              <div>
                <strong>{order.store_name || order.store}</strong>
                <p>{order.order_id} · {formatDateTime(order.created_at)}</p>
              </div>
              <Badge status={order.status}>{order.status}</Badge>
            </div>
            <p>{formatCurrency(order.total_price)}</p>
          </Card>
        ))}
      </Card>

      <BottomNavigation
        items={navItems}
        activeKey="profile"
        onChange={(key) => {
          if (key === "home") navigate("/customer");
          if (key === "shorts") navigate("/customer/shorts");
          if (key === "search") navigate("/customer/search");
          if (key === "cart") navigate("/customer/cart");
          if (key === "profile") navigate("/customer/profile");
        }}
      />
      <ToastViewport />
    </AppShell>
  );
}

export default CustomerProfilePage;
