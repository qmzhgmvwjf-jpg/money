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
import { formatCurrency, getStoreVisual } from "../utils/format";
import { usePolling } from "../hooks/usePolling";

const navItems = [
  { key: "home", label: "홈", icon: "🏠" },
  { key: "search", label: "검색", icon: "🔎" },
  { key: "cart", label: "장바구니", icon: "🛒" },
  { key: "profile", label: "마이", icon: "👤" },
];

function CustomerSearchPage() {
  const navigate = useNavigate();
  const [stores, setStores] = useState([]);
  const [keyword, setKeyword] = useState("");

  const fetchStores = useCallback(async () => {
    const data = await orderService.getPublicStores();
    setStores(data);
  }, []);

  usePolling(fetchStores, 8000);

  const filteredStores = useMemo(() => {
    const search = keyword.trim().toLowerCase();
    if (!search) return stores;
    return stores.filter((store) => store.name.toLowerCase().includes(search));
  }, [keyword, stores]);

  return (
    <AppShell mobile>
      <Header
        title="가게 검색"
        subtitle="가게 이름만 빠르게 검색할 수 있어요"
        actionLabel={`장바구니 ${getCartItems().length}`}
        onAction={() => navigate("/customer/cart")}
      />

      <Card className="hero-card">
        <div className="hero-card__content">
          <Input
            autoFocus
            placeholder="가게 이름을 입력하세요"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <p className="hero-card__subtitle">입력 즉시 실시간으로 가게 목록이 필터링됩니다.</p>
        </div>
      </Card>

      <div className="panel-list">
        {filteredStores.map((store) => (
          <Card
            key={store._id}
            interactive={store.currentlyOpen}
            className="store-card"
            onClick={() => store.currentlyOpen && navigate(`/customer/store/${store._id}`)}
            style={{ opacity: store.currentlyOpen ? 1 : 0.65 }}
          >
            <div className="store-card__media" style={{ background: getStoreVisual(store.name) }} />
            <div className="store-card__body">
              <h3>{store.name}</h3>
              <p>{store.description || "가게 소개가 아직 없습니다."}</p>
              <div className="store-card__footer">
                <div className="status-row">
                  <Badge tone={store.currentlyOpen ? "success" : "secondary"}>
                    {store.currentlyOpen ? "영업중" : "영업 종료"}
                  </Badge>
                  <Badge tone="secondary">배달비 {formatCurrency(store.deliveryFee)}</Badge>
                </div>
                <Button variant="secondary" disabled={!store.currentlyOpen}>
                  상세 보기
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {filteredStores.length === 0 && (
          <Card>
            <div className="empty-state">검색 결과가 없습니다.</div>
          </Card>
        )}
      </div>

      <BottomNavigation
        items={navItems}
        activeKey="search"
        onChange={(key) => {
          if (key === "home") navigate("/customer");
          if (key === "search") navigate("/customer/search");
          if (key === "cart") navigate("/customer/cart");
          if (key === "profile") navigate("/customer/profile");
        }}
      />
    </AppShell>
  );
}

export default CustomerSearchPage;
