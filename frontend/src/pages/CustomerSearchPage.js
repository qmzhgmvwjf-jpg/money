import React, { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../layouts/AppShell";
import Header from "../components/common/Header";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import LoadingState from "../components/ui/LoadingState";
import EmptyState from "../components/ui/EmptyState";
import BottomNavigation from "../components/navigation/BottomNavigation";
import { orderService } from "../services/orderService";
import { getCartItems } from "../utils/cart";
import { formatCurrency, getStoreVisual } from "../utils/format";
import { usePolling } from "../hooks/usePolling";

const navItems = [
  { key: "home", label: "홈", icon: "🏠" },
  { key: "shorts", label: "쇼츠", icon: "▶" },
  { key: "cart", label: "장바구니", icon: "🛒" },
  { key: "search", label: "검색", icon: "🔎" },
  { key: "profile", label: "마이", icon: "👤" },
];

const defaultPopular = ["마라탕", "치킨", "피자", "분식", "버거"];

function CustomerSearchPage() {
  const navigate = useNavigate();
  const [stores, setStores] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [recentKeywords, setRecentKeywords] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("recentStoreSearches") || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });

  const fetchStores = useCallback(async () => {
    try {
      const data = await orderService.getPublicStores();
      setStores(data);
    } finally {
      setLoading(false);
    }
  }, []);

  usePolling(fetchStores, 8000);

  const filteredStores = useMemo(() => {
    const search = keyword.trim().toLowerCase();
    if (!search) return stores;
    return stores.filter((store) => store.name.toLowerCase().includes(search));
  }, [keyword, stores]);

  const persistRecentKeyword = (value) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const next = [trimmed, ...recentKeywords.filter((item) => item !== trimmed)].slice(0, 6);
    setRecentKeywords(next);
    localStorage.setItem("recentStoreSearches", JSON.stringify(next));
  };

  const openStore = (storeId, name) => {
    if (name) persistRecentKeyword(name);
    navigate(`/customer/store/${storeId}`);
  };

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
            onChange={(event) => {
              setKeyword(event.target.value);
              if (event.target.value.trim()) persistRecentKeyword(event.target.value);
            }}
          />
          <p className="hero-card__subtitle">입력 즉시 실시간으로 가게 목록이 필터링됩니다.</p>
        </div>
      </Card>

      <Card>
        <div className="section-heading">
          <h3>최근 검색어</h3>
          <Badge tone="secondary">{recentKeywords.length}개</Badge>
        </div>
        <div className="chip-row" style={{ marginTop: 16 }}>
          {recentKeywords.length === 0 ? (
            <span className="hero-card__subtitle">최근 검색한 가게가 아직 없습니다.</span>
          ) : (
            recentKeywords.map((item) => (
              <Button key={item} variant="secondary" onClick={() => setKeyword(item)}>
                {item}
              </Button>
            ))
          )}
        </div>
      </Card>

      <Card>
        <div className="section-heading">
          <h3>인기 검색어</h3>
          <Badge tone="primary">Live</Badge>
        </div>
        <div className="chip-row" style={{ marginTop: 16 }}>
          {defaultPopular.map((item) => (
            <Button key={item} variant="secondary" onClick={() => setKeyword(item)}>
              {item}
            </Button>
          ))}
        </div>
      </Card>

      <div className="panel-list">
        {loading && (
          <Card>
            <LoadingState label="검색할 가게를 불러오는 중입니다" />
          </Card>
        )}
        {filteredStores.map((store) => (
          <Card
            key={store._id}
            interactive={store.currentlyOpen}
            className="store-card"
            onClick={() => store.currentlyOpen && openStore(store._id, store.name)}
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
        {!loading && filteredStores.length === 0 && (
          <Card>
            <EmptyState title="검색 결과가 없습니다" description="가게 이름을 다르게 입력해보세요." />
          </Card>
        )}
      </div>

      <BottomNavigation
        items={navItems}
        activeKey="search"
        onChange={(key) => {
          if (key === "home") navigate("/customer");
          if (key === "shorts") navigate("/customer/shorts");
          if (key === "search") navigate("/customer/search");
          if (key === "cart") navigate("/customer/cart");
          if (key === "profile") navigate("/customer/profile");
        }}
      />
    </AppShell>
  );
}

export default CustomerSearchPage;
