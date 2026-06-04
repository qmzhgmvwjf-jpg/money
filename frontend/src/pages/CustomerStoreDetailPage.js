import React, { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "../layouts/AppShell";
import Header from "../components/common/Header";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import BottomNavigation from "../components/navigation/BottomNavigation";
import { orderService } from "../services/orderService";
import { addCartItem, replaceCartWithItem } from "../utils/cart";
import { formatCurrency, getStoreVisual } from "../utils/format";
import { usePolling } from "../hooks/usePolling";

const navItems = [
  { key: "home", label: "홈", icon: "🏠" },
  { key: "shorts", label: "쇼츠", icon: "▶" },
  { key: "cart", label: "장바구니", icon: "🛒" },
  { key: "search", label: "검색", icon: "🔎" },
  { key: "profile", label: "마이", icon: "👤" },
];

function CustomerStoreDetailPage() {
  const navigate = useNavigate();
  const { storeId } = useParams();
  const [store, setStore] = useState(null);
  const [menus, setMenus] = useState([]);

  const fetchData = useCallback(async () => {
    const [stores, menuList] = await Promise.all([
      orderService.getPublicStores(),
      orderService.getMenus(storeId),
    ]);
    setStore(stores.find((item) => item._id === storeId) || null);
    setMenus(menuList);
  }, [storeId]);

  usePolling(fetchData, 6000);

  const totalPreview = useMemo(
    () => menus.reduce((sum, item) => sum + Number(item.price || 0), 0),
    [menus]
  );

  const addMenu = (menu) => {
    const cartItem = {
      ...menu,
      store_name: store?.name,
      deliveryFee: store?.deliveryFee || 0,
    };
    const result = addCartItem(cartItem);
    if (result.conflict) {
      if (!window.confirm("다른 가게 메뉴가 담겨 있습니다. 이 가게 메뉴로 바꿀까요?")) return;
      replaceCartWithItem(cartItem);
    }
    navigate("/customer/cart");
  };

  return (
    <AppShell mobile>
      <Header
        title={store?.name || "가게 상세"}
        subtitle={store ? `${store.openTime} - ${store.closeTime} · 배달비 ${formatCurrency(store.deliveryFee)}` : "메뉴를 불러오는 중입니다"}
        actionLabel="홈"
        onAction={() => navigate("/customer")}
      />

      {store && (
        <Card className="hero-card">
          <div className="hero-card__content">
            <div className="store-card__media" style={{ background: getStoreVisual(store.name), minHeight: 160 }} />
            <div className="hero-card__title" style={{ marginTop: 16 }}>
              <div>
                <h2>{store.name}</h2>
                <p className="hero-card__subtitle">
                  {store.description || "가게 소개가 아직 등록되지 않았습니다."}
                </p>
              </div>
              <Badge tone={store.currentlyOpen ? "success" : "secondary"}>
                {store.currentlyOpen ? "주문 가능" : "영업 종료"}
              </Badge>
            </div>
            <div className="status-row">
              <Badge tone="secondary">최소주문 {formatCurrency(store.minOrderAmount)}</Badge>
              <Badge tone="secondary">배달비 {formatCurrency(store.deliveryFee)}</Badge>
            </div>
          </div>
        </Card>
      )}

      <div className="section-heading">
        <h3>메뉴</h3>
        <p>{menus.length}개 메뉴 · 미리보기 총액 {formatCurrency(totalPreview)}</p>
      </div>

      <div className="panel-list">
        {menus.map((menu) => (
          <Card key={menu._id} className="menu-item">
            <div className="menu-item__meta">
              <div>
                <strong>{menu.name}</strong>
                <div>{formatCurrency(menu.price)}</div>
              </div>
              <Button disabled={!store?.currentlyOpen} onClick={() => addMenu(menu)}>
                담기
              </Button>
            </div>
          </Card>
        ))}
        {menus.length === 0 && (
          <Card>
            <div className="empty-state">등록된 메뉴가 없습니다.</div>
          </Card>
        )}
      </div>

      <BottomNavigation
        items={navItems}
        activeKey="home"
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

export default CustomerStoreDetailPage;
