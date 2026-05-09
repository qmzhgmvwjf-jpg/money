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
import { getCartItems } from "../utils/cart";
import { getStoreVisual, inferCategory } from "../utils/format";
import { usePolling } from "../hooks/usePolling";

const navItems = [
  { key: "home", label: "홈", icon: "🏠" },
  { key: "search", label: "검색", icon: "🔎" },
  { key: "cart", label: "장바구니", icon: "🛒" },
  { key: "orders", label: "주문내역", icon: "🧾" },
  { key: "profile", label: "마이", icon: "👤" },
];

function CustomerPage() {
  const navigate = useNavigate();
  const [stores, setStores] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("전체");

  const fetchStores = useCallback(async () => {
    const data = await orderService.getPublicStores();
    setStores(data);
  }, []);

  usePolling(fetchStores, 8000);

  const categories = useMemo(
    () => ["전체", ...new Set(stores.map((store) => inferCategory(store.name)))],
    [stores]
  );

  const filteredStores = useMemo(() => {
    return stores.filter((store) => {
      const category = inferCategory(store.name);
      const matchCategory = selectedCategory === "전체" || category === selectedCategory;
      const text = `${store.name} ${store.description || ""} ${category}`.toLowerCase();
      return matchCategory && text.includes(search.toLowerCase());
    });
  }, [search, selectedCategory, stores]);

  const handleNav = (key) => {
    if (key === "home" || key === "search") navigate("/customer");
    if (key === "cart") navigate("/customer/cart");
    if (key === "orders") navigate("/customer/orders");
    if (key === "profile") navigate("/customer/profile");
  };

  const cartCount = getCartItems().length;

  return (
    <AppShell mobile>
      <Header
        title="지금 주문 가능한 가게"
        subtitle="승인되고 영업 중인 가게만 빠르게 찾아 주문할 수 있어요"
        actionLabel={`장바구니 ${cartCount}`}
        onAction={() => navigate("/customer/cart")}
      />

      <Card className="hero-card">
        <div className="hero-card__content">
          <div className="hero-card__title">
            <div>
              <h2>배달앱처럼 가볍게 탐색</h2>
              <p className="hero-card__subtitle">
                가게 상세는 새 페이지로, 주문은 결제 후 바로 생성됩니다.
              </p>
            </div>
            <Badge tone="primary">{stores.length}개 가게</Badge>
          </div>

          <Input
            placeholder="가게 이름 또는 메뉴 카테고리를 검색하세요"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <div className="chip-row">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "primary" : "secondary"}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      <div className="section-heading">
        <h3>가게 리스트</h3>
        <p>영업 종료 가게는 표시되지만 주문은 막아 두었습니다.</p>
      </div>

      <div className="store-list">
        {filteredStores.map((store) => (
          <Card
            key={store._id}
            interactive={store.currentlyOpen}
            className="store-card"
            onClick={() => store.currentlyOpen && navigate(`/customer/store/${store._id}`)}
            style={{
              opacity: store.currentlyOpen ? 1 : 0.62,
              cursor: store.currentlyOpen ? "pointer" : "not-allowed",
            }}
          >
            <div className="store-card__media" style={{ background: getStoreVisual(store.name) }} />
            <div className="store-card__body">
              <h3>{store.name}</h3>
              <p>
                {inferCategory(store.name)} · 최소주문 {Number(store.minOrderAmount || 0).toLocaleString()}원
              </p>
              <p>
                배달비 {Number(store.deliveryFee || 0).toLocaleString()}원 · {store.openTime} - {store.closeTime}
              </p>
              <div className="store-card__footer">
                <div className="status-row">
                  <Badge tone={store.currentlyOpen ? "success" : "secondary"}>
                    {store.currentlyOpen ? "영업중" : "영업 종료"}
                  </Badge>
                  <Badge tone="secondary">{store.autoAccept ? "자동수락" : "일반접수"}</Badge>
                </div>
                <Button
                  variant="secondary"
                  disabled={!store.currentlyOpen}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (store.currentlyOpen) navigate(`/customer/store/${store._id}`);
                  }}
                >
                  {store.currentlyOpen ? "가게 보기" : "주문 불가"}
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {filteredStores.length === 0 && (
          <Card>
            <div className="empty-state">조건에 맞는 가게가 없습니다.</div>
          </Card>
        )}
      </div>

      <BottomNavigation items={navItems} activeKey={search ? "search" : "home"} onChange={handleNav} />
    </AppShell>
  );
}

export default CustomerPage;
