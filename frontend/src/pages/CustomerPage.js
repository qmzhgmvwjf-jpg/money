import React, { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../layouts/AppShell";
import Header from "../components/common/Header";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import BottomNavigation from "../components/navigation/BottomNavigation";
import { orderService } from "../services/orderService";
import { formatCurrency, getStoreVisual, inferCategory } from "../utils/format";
import { usePolling } from "../hooks/usePolling";

const navItems = [
  { key: "home", label: "홈", icon: "🏠" },
  { key: "orders", label: "주문", icon: "🧾" },
  { key: "cart", label: "장바구니", icon: "🛒" },
  { key: "profile", label: "마이", icon: "👤" },
];

function CustomerPage() {
  const navigate = useNavigate();
  const [menus, setMenus] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeStore, setActiveStore] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [activeTab, setActiveTab] = useState("home");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [phone, setPhone] = useState(localStorage.getItem("phone") || "");
  const [address, setAddress] = useState(localStorage.getItem("address") || "");

  const fetchMenus = useCallback(async () => {
    const data = await orderService.getMenus();
    setMenus(data);
  }, []);

  const fetchOrders = useCallback(async () => {
    const data = await orderService.getMyOrders();
    setOrders(data);
  }, []);

  usePolling(fetchMenus, 8000);
  usePolling(fetchOrders, 5000);

  const stores = useMemo(() => {
    const map = new Map();
    menus.forEach((menu) => {
      if (!map.has(menu.store)) {
        map.set(menu.store, {
          store: menu.store,
          category: inferCategory(menu.store),
          menus: [],
        });
      }
      map.get(menu.store).menus.push(menu);
    });
    return Array.from(map.values());
  }, [menus]);

  const categories = useMemo(() => {
    return ["전체", ...new Set(stores.map((store) => store.category))];
  }, [stores]);

  const filteredStores = useMemo(() => {
    return stores.filter((store) => {
      const matchCategory =
        selectedCategory === "전체" || store.category === selectedCategory;
      const matchSearch = store.store.toLowerCase().includes(search.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [stores, selectedCategory, search]);

  const addToCart = (menu) => {
    if (cart.length > 0 && cart[0].store !== menu.store) {
      if (!window.confirm("다른 가게 메뉴가 담겨 있습니다. 장바구니를 비울까요?")) return;
      setCart([menu]);
      setShowCart(true);
      return;
    }

    setCart((prev) => [...prev, menu]);
    setShowCart(true);
  };

  const removeCartItem = (index) => {
    setCart((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const totalPrice = cart.reduce((sum, item) => sum + Number(item.price || 0), 0);

  const submitOrder = async () => {
    if (cart.length === 0) {
      alert("장바구니가 비어 있습니다.");
      return;
    }
    if (!address) {
      alert("주소를 먼저 입력하세요.");
      return;
    }

    try {
      setIsOrdering(true);
      localStorage.setItem("address", address);
      localStorage.setItem("phone", phone);
      await orderService.createOrder({
        store: cart[0].store,
        address,
        items: cart,
      });
      setCart([]);
      setShowCart(false);
      navigate("/tracking");
    } catch (error) {
      alert(error.response?.data?.detail || "주문 실패");
    } finally {
      setIsOrdering(false);
    }
  };

  const logout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <AppShell mobile>
      <Header
        title="오늘은 어떤 메뉴가 끌리나요?"
        subtitle={address || "배송 주소를 설정하면 더 빠르게 주문할 수 있어요"}
        actionLabel="로그아웃"
        onAction={logout}
      />

      {activeTab === "home" && (
        <>
          <Card className="hero-card">
            <div className="hero-card__content">
              <div className="hero-card__title">
                <div>
                  <h2>빠른 배달, 선명한 운영</h2>
                  <p className="hero-card__subtitle">
                    실시간 주문 흐름과 함께 가장 인기 있는 가게를 골라보세요.
                  </p>
                </div>
                <Badge tone="primary">{stores.length}개 가게</Badge>
              </div>

              <Input
                placeholder="가게 이름을 검색하세요"
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
            <h3>추천 가게</h3>
            <p>배민 스타일로 한눈에 보는 카드형 리스트</p>
          </div>

          <div className="store-list">
            {filteredStores.map((store) => (
              <Card
                key={store.store}
                interactive
                className="store-card"
                onClick={() => setActiveStore(store)}
              >
                <div
                  className="store-card__media"
                  style={{ background: getStoreVisual(store.store) }}
                />
                <div className="store-card__body">
                  <h3>{store.store}</h3>
                  <p>{store.category} · 대표 메뉴 {store.menus[0]?.name || "추천 메뉴"}</p>
                  <div className="store-card__footer">
                    <div className="status-row">
                      <Badge tone="success">배달가능</Badge>
                      <Badge tone="secondary">{store.menus.length}개 메뉴</Badge>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={(event) => {
                        event.stopPropagation();
                        setActiveStore(store);
                      }}
                    >
                      보기
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
        </>
      )}

      {activeTab === "orders" && (
        <div className="panel-list">
          <div className="section-heading">
            <h3>최근 주문</h3>
            <p>실시간으로 상태가 갱신됩니다.</p>
          </div>
          {orders.map((order) => (
            <Card key={order._id}>
              <div className="hero-card__title">
                <div>
                  <h3>{order.store}</h3>
                  <p className="hero-card__subtitle">{order.order_id || order._id}</p>
                </div>
                <Badge status={order.status}>{order.status}</Badge>
              </div>
              <div className="list-actions" style={{ marginTop: 16 }}>
                <Button variant="secondary" onClick={() => navigate("/tracking")}>
                  추적 보기
                </Button>
              </div>
            </Card>
          ))}
          {orders.length === 0 && (
            <Card>
              <div className="empty-state">아직 주문 내역이 없습니다.</div>
            </Card>
          )}
        </div>
      )}

      {activeTab === "profile" && (
        <div className="panel-list">
          <Card>
            <div className="section-heading">
              <h3>내 정보</h3>
              <Badge tone="secondary">고객</Badge>
            </div>
            <div className="auth-form" style={{ marginTop: 16 }}>
              <Input
                label="주소"
                placeholder="배달 주소"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
              />
              <Input
                label="전화번호"
                placeholder="010-0000-0000"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
              <Button
                block
                onClick={() => {
                  localStorage.setItem("address", address);
                  localStorage.setItem("phone", phone);
                }}
              >
                저장하기
              </Button>
            </div>
          </Card>
        </div>
      )}

      <Modal
        open={Boolean(activeStore)}
        title={activeStore?.store || "가게 상세"}
        onClose={() => setActiveStore(null)}
      >
        {activeStore?.menus?.map((menu) => (
          <Card key={menu._id} className="menu-item">
            <div className="menu-item__meta">
              <strong>{menu.name}</strong>
              <span>{formatCurrency(menu.price)}</span>
            </div>
            <Button onClick={() => addToCart(menu)}>담기</Button>
          </Card>
        ))}
      </Modal>

      <Modal
        open={showCart}
        title="장바구니"
        onClose={() => setShowCart(false)}
      >
        {cart.length === 0 ? (
          <div className="empty-state">장바구니가 비어 있습니다.</div>
        ) : (
          <>
            {cart.map((item, index) => (
              <Card key={`${item._id}-${index}`} className="cart-item">
                <div>
                  <strong>{item.name}</strong>
                  <div>{formatCurrency(item.price)}</div>
                </div>
                <Button variant="danger" onClick={() => removeCartItem(index)}>
                  삭제
                </Button>
              </Card>
            ))}
            <Card>
              <div className="hero-card__title">
                <div>
                  <h3>총 결제 금액</h3>
                  <p className="hero-card__subtitle">{formatCurrency(totalPrice)}</p>
                </div>
                <Button loading={isOrdering} onClick={submitOrder}>
                  주문하기
                </Button>
              </div>
            </Card>
          </>
        )}
      </Modal>

      <BottomNavigation
        items={navItems}
        activeKey={activeTab === "cart" ? "home" : activeTab}
        onChange={(key) => {
          if (key === "cart") {
            setShowCart(true);
            return;
          }
          setActiveTab(key);
        }}
      />
    </AppShell>
  );
}

export default CustomerPage;
