import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  const [stores, setStores] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeStore, setActiveStore] = useState(null);
  const [storeMenus, setStoreMenus] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [activeTab, setActiveTab] = useState("home");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [phone, setPhone] = useState(localStorage.getItem("phone") || "");
  const [address, setAddress] = useState(localStorage.getItem("address") || "");

  const fetchStores = useCallback(async () => {
    const data = await orderService.getPublicStores();
    setStores(data);
  }, []);

  const fetchOrders = useCallback(async () => {
    const data = await orderService.getMyOrders();
    setOrders(data);
  }, []);

  usePolling(fetchStores, 8000);
  usePolling(fetchOrders, 5000);

  useEffect(() => {
    if (!activeStore?._id) {
      setStoreMenus([]);
      return;
    }

    let active = true;

    const loadMenus = async () => {
      try {
        const data = await orderService.getMenus(activeStore._id);
        if (active) setStoreMenus(data);
      } catch {
        if (active) setStoreMenus([]);
      }
    };

    loadMenus();
    return () => {
      active = false;
    };
  }, [activeStore?._id]);

  const categories = useMemo(() => {
    return ["전체", ...new Set(stores.map((store) => inferCategory(store.name)))];
  }, [stores]);

  const filteredStores = useMemo(() => {
    return stores.filter((store) => {
      const category = inferCategory(store.name);
      const matchCategory = selectedCategory === "전체" || category === selectedCategory;
      const keyword = `${store.name} ${category}`.toLowerCase();
      return matchCategory && keyword.includes(search.toLowerCase());
    });
  }, [stores, selectedCategory, search]);

  const addToCart = (menu) => {
    if (cart.length > 0 && cart[0].store_id !== menu.store_id) {
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
        store_id: cart[0].store_id,
        address,
        items: cart.map((item) => ({
          _id: item._id,
          name: item.name,
          price: item.price,
        })),
      });

      setCart([]);
      setShowCart(false);
      fetchOrders();
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

  const handleStoreOpen = (store) => {
    if (!store.currentlyOpen) return;
    setActiveStore(store);
  };

  return (
    <AppShell mobile>
      <Header
        title="오늘은 어떤 가게에서 주문할까요?"
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
                  <h2>승인된 가게만 안전하게 주문</h2>
                  <p className="hero-card__subtitle">
                    현재 영업 중인 가게를 중심으로 메뉴와 주문 흐름을 빠르게 이어갑니다.
                  </p>
                </div>
                <Badge tone="primary">{stores.length}개 가맹점</Badge>
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
            <h3>가게 목록</h3>
            <p>승인된 가게만 보이고, 영업시간 외에는 자동으로 주문이 막힙니다.</p>
          </div>

          <div className="store-list">
            {filteredStores.map((store) => {
              const category = inferCategory(store.name);

              return (
                <Card
                  key={store._id}
                  interactive={store.currentlyOpen}
                  className="store-card"
                  onClick={() => handleStoreOpen(store)}
                  style={{
                    opacity: store.currentlyOpen ? 1 : 0.62,
                    cursor: store.currentlyOpen ? "pointer" : "not-allowed",
                  }}
                >
                  <div
                    className="store-card__media"
                    style={{ background: getStoreVisual(store.name) }}
                  />
                  <div className="store-card__body">
                    <h3>{store.name}</h3>
                    <p>
                      {category} · 영업시간 {store.openTime} - {store.closeTime}
                    </p>
                    <div className="store-card__footer">
                      <div className="status-row">
                        <Badge tone={store.currentlyOpen ? "success" : "secondary"}>
                          {store.currentlyOpen ? "영업중" : "영업 종료"}
                        </Badge>
                        <Badge tone="secondary">{store.autoAccept ? "자동 수락" : "일반 접수"}</Badge>
                      </div>
                      <Button
                        variant="secondary"
                        disabled={!store.currentlyOpen}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleStoreOpen(store);
                        }}
                      >
                        {store.currentlyOpen ? "메뉴 보기" : "주문 불가"}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}

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
                  <h3>{order.store_name || order.store}</h3>
                  <p className="hero-card__subtitle">{order.order_id || order._id}</p>
                </div>
                <Badge status={order.status}>{order.status}</Badge>
              </div>
              <div className="two-column-grid" style={{ marginTop: 16 }}>
                <div>
                  <p><strong>주소</strong> {order.address || "-"}</p>
                  <p><strong>연락처</strong> {order.phone || "-"}</p>
                </div>
                <div>
                  <p><strong>금액</strong> {formatCurrency(order.total_price)}</p>
                  <p><strong>메뉴 수</strong> {order.items?.length || 0}개</p>
                </div>
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
        title={activeStore?.name || "가게 상세"}
        onClose={() => setActiveStore(null)}
      >
        {activeStore && (
          <Card className="mini-card" style={{ marginBottom: 16 }}>
            <div className="section-heading">
              <div>
                <strong>{activeStore.name}</strong>
                <p>
                  영업시간 {activeStore.openTime} - {activeStore.closeTime}
                </p>
              </div>
              <Badge tone={activeStore.currentlyOpen ? "success" : "secondary"}>
                {activeStore.currentlyOpen ? "주문 가능" : "영업 종료"}
              </Badge>
            </div>
          </Card>
        )}

        {storeMenus.map((menu) => (
          <Card key={menu._id} className="menu-item">
            <div className="menu-item__meta">
              <strong>{menu.name}</strong>
              <span>{formatCurrency(menu.price)}</span>
            </div>
            <Button disabled={!activeStore?.currentlyOpen} onClick={() => addToCart(menu)}>
              담기
            </Button>
          </Card>
        ))}

        {activeStore && storeMenus.length === 0 && (
          <div className="empty-state">등록된 메뉴가 없습니다.</div>
        )}
      </Modal>

      <Modal open={showCart} title="장바구니" onClose={() => setShowCart(false)}>
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
                  <h3>{cart[0]?.store_name || "선택 가게"}</h3>
                  <p className="hero-card__subtitle">{cart.length}개 메뉴</p>
                </div>
                <Badge tone="primary">{formatCurrency(totalPrice)}</Badge>
              </div>
              <div className="auth-form" style={{ marginTop: 16 }}>
                <Input
                  label="연락처"
                  placeholder="010-0000-0000"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
                <Input
                  label="배달 주소"
                  placeholder="상세 주소를 입력하세요"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                />
                <Button block loading={isOrdering} onClick={submitOrder}>
                  주문하기
                </Button>
              </div>
            </Card>
          </>
        )}
      </Modal>

      <BottomNavigation items={navItems} activeKey={activeTab} onChange={setActiveTab} />
    </AppShell>
  );
}

export default CustomerPage;
