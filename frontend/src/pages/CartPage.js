import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../layouts/AppShell";
import Header from "../components/common/Header";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Badge from "../components/ui/Badge";
import EmptyState from "../components/ui/EmptyState";
import BottomNavigation from "../components/navigation/BottomNavigation";
import { orderService } from "../services/orderService";
import { clearCartItems, getCartItems, setCartItems } from "../utils/cart";
import { formatCurrency } from "../utils/format";
import { useToast } from "../hooks/useToast";

const navItems = [
  { key: "home", label: "홈", icon: "🏠" },
  { key: "shorts", label: "쇼츠", icon: "▶" },
  { key: "cart", label: "장바구니", icon: "🛒" },
  { key: "search", label: "검색", icon: "🔎" },
  { key: "profile", label: "마이", icon: "👤" },
];

function CartPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState(getCartItems());
  const [phone, setPhone] = useState(localStorage.getItem("phone") || "");
  const [address, setAddress] = useState(localStorage.getItem("address") || "");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [rewards, setRewards] = useState([]);
  const [selectedRewardId, setSelectedRewardId] = useState("");
  const [loading, setLoading] = useState(false);
  const { showToast, ToastViewport } = useToast();

  useEffect(() => {
    orderService.getMyRewards().then(setRewards).catch(() => setRewards([]));
  }, []);

  const menuTotal = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.price || 0), 0),
    [cart]
  );
  const deliveryFee = Number(cart[0]?.deliveryFee || 0);
  const selectedReward = rewards.find((reward) => reward._id === selectedRewardId) || null;
  const rewardDiscount = useMemo(() => {
    if (!selectedReward) return 0;
    if (selectedReward.reward_type === "discount") return Number(selectedReward.reward_value || 0);
    if (["free_delivery", "store_fee_free"].includes(selectedReward.reward_type)) return deliveryFee;
    return 0;
  }, [selectedReward, deliveryFee]);
  const totalPrice = Math.max(0, menuTotal + deliveryFee - rewardDiscount);

  const removeItem = (index) => {
    const next = cart.filter((_, itemIndex) => itemIndex !== index);
    setCart(next);
    setCartItems(next);
    showToast("메뉴를 장바구니에서 삭제했습니다", "success");
  };

  const submitOrder = async () => {
    if (cart.length === 0) {
      showToast("장바구니가 비어 있습니다", "danger");
      return;
    }
    if (!address) {
      showToast("배달 주소를 입력하세요", "danger");
      return;
    }
    try {
      setLoading(true);
      localStorage.setItem("phone", phone);
      localStorage.setItem("address", address);
      await orderService.createOrder({
        store_id: cart[0].store_id,
        address,
        phone,
        paymentMethod,
        rewardId: selectedRewardId || null,
        items: cart.map((item) => ({ _id: item._id, name: item.name, price: item.price })),
      });
      clearCartItems();
      setCart([]);
      navigate("/customer/profile");
    } catch (error) {
      showToast(error.response?.data?.detail || "주문 실패", "danger");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell mobile>
      <Header
        title="장바구니"
        subtitle={cart[0]?.store_name || "선택한 메뉴를 확인하고 결제하세요"}
        actionLabel="홈"
        onAction={() => navigate("/customer")}
      />

      {cart.length === 0 ? (
        <Card>
          <EmptyState
            title="장바구니가 비어 있습니다"
            description="가게에서 메뉴를 담으면 결제 정보가 표시됩니다."
            action={<Button variant="secondary" onClick={() => navigate("/customer")}>가게 보러가기</Button>}
          />
        </Card>
      ) : (
        <>
          {cart.map((item, index) => (
            <Card key={`${item._id}-${index}`} className="cart-item">
              <div>
                <strong>{item.name}</strong>
                <div>{formatCurrency(item.price)}</div>
              </div>
              <Button variant="danger" onClick={() => removeItem(index)}>
                삭제
              </Button>
            </Card>
          ))}

          <Card>
            <div className="hero-card__title">
              <div>
                <h3>결제 정보</h3>
                <p className="hero-card__subtitle">결제 완료 후 주문이 생성됩니다.</p>
              </div>
              <Badge tone="primary">{formatCurrency(totalPrice)}</Badge>
            </div>
            <div className="auth-form" style={{ marginTop: 16 }}>
              <Input label="전화번호" value={phone} onChange={(event) => setPhone(event.target.value)} />
              <Input label="주소" value={address} onChange={(event) => setAddress(event.target.value)} />
              <Input
                label="결제수단"
                as="select"
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
              >
                <option value="card">카드</option>
                <option value="kakao_pay">카카오페이</option>
                <option value="naver_pay">네이버페이</option>
              </Input>
              <Input
                label="사용할 혜택"
                as="select"
                value={selectedRewardId}
                onChange={(event) => setSelectedRewardId(event.target.value)}
              >
                <option value="">혜택 사용 안 함</option>
                {rewards.map((reward) => (
                  <option key={reward._id} value={reward._id}>
                    {reward.emoji} {reward.title}
                  </option>
                ))}
              </Input>
              <Card className="mini-card">
                <div>메뉴 금액: {formatCurrency(menuTotal)}</div>
                <div>배달비: {formatCurrency(deliveryFee)}</div>
                <div>혜택 할인: {formatCurrency(rewardDiscount)}</div>
                <div>총 결제금액: {formatCurrency(totalPrice)}</div>
              </Card>
              <Button block loading={loading} onClick={submitOrder}>
                결제 후 주문하기
              </Button>
            </div>
          </Card>
        </>
      )}

      <BottomNavigation
        items={navItems}
        activeKey="cart"
        onChange={(key) => {
          if (key === "home") navigate("/customer");
          if (key === "shorts") navigate("/customer/shorts");
          if (key === "cart") navigate("/customer/cart");
          if (key === "search") navigate("/customer/search");
          if (key === "profile") navigate("/customer/profile");
        }}
      />
      <ToastViewport />
    </AppShell>
  );
}

export default CartPage;
