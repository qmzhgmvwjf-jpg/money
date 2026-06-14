import React, { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "../layouts/AppShell";
import Header from "../components/common/Header";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Input from "../components/ui/Input";
import LoadingState from "../components/ui/LoadingState";
import BottomNavigation from "../components/navigation/BottomNavigation";
import { orderService } from "../services/orderService";
import { addCartItem, replaceCartWithItem } from "../utils/cart";
import { formatCurrency, formatDateTime, getStoreVisual } from "../utils/format";
import { usePolling } from "../hooks/usePolling";
import { useToast } from "../hooks/useToast";

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
  const [community, setCommunity] = useState(null);
  const [tab, setTab] = useState("menu");
  const [loading, setLoading] = useState(true);
  const [regularNote, setRegularNote] = useState("");
  const [guestbookMessage, setGuestbookMessage] = useState("");
  const [albumForm, setAlbumForm] = useState({ title: "", caption: "", imageUrl: "" });
  const role = localStorage.getItem("role");
  const { showToast, ToastViewport } = useToast();

  const fetchData = useCallback(async () => {
    try {
      const [stores, menuList, communityData] = await Promise.all([
        orderService.getPublicStores(),
        orderService.getMenus(storeId),
        orderService.getStoreCommunity(storeId),
      ]);
      setStore(stores.find((item) => item._id === storeId) || communityData?.store || null);
      setMenus(menuList);
      setCommunity(communityData);
    } finally {
      setLoading(false);
    }
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

  const refreshCommunity = async () => {
    const data = await orderService.getStoreCommunity(storeId);
    setCommunity(data);
  };

  const toggleSupport = async (supportType) => {
    try {
      const data = await orderService.toggleStoreSupport(storeId, supportType);
      setCommunity(data.community);
      showToast(
        supportType === "regular"
          ? data.active
            ? "단골 등록이 완료됐습니다"
            : "단골 등록을 해제했습니다"
          : data.active
            ? "응원을 남겼습니다"
            : "응원을 해제했습니다",
        "success"
      );
    } catch (error) {
      showToast(error.response?.data?.detail || "처리 중 오류가 발생했습니다", "danger");
    }
  };

  const submitRegularNote = async () => {
    if (!regularNote.trim()) return;
    try {
      await orderService.createRegularNote(storeId, { message: regularNote });
      setRegularNote("");
      showToast("단골 한마디를 남겼습니다", "success");
      refreshCommunity();
    } catch (error) {
      showToast(error.response?.data?.detail || "등록 실패", "danger");
    }
  };

  const submitAlbumEntry = async () => {
    if (!albumForm.title.trim() || !albumForm.caption.trim()) {
      showToast("제목과 추억 이야기를 입력하세요", "danger");
      return;
    }
    try {
      await orderService.createAlbumEntry(storeId, albumForm);
      setAlbumForm({ title: "", caption: "", imageUrl: "" });
      showToast("추억 앨범에 사진을 남겼습니다", "success");
      refreshCommunity();
    } catch (error) {
      showToast(error.response?.data?.detail || "등록 실패", "danger");
    }
  };

  const submitGuestbook = async () => {
    if (!guestbookMessage.trim()) return;
    try {
      await orderService.createGuestbookEntry(storeId, { message: guestbookMessage });
      setGuestbookMessage("");
      showToast("방명록을 남겼습니다", "success");
      refreshCommunity();
    } catch (error) {
      showToast(error.response?.data?.detail || "등록 실패", "danger");
    }
  };

  return (
    <AppShell mobile>
      <Header
        title={store?.name || "가게 상세"}
        subtitle={
          store
            ? `${store.openTime} - ${store.closeTime} · 배달비 ${formatCurrency(store.deliveryFee)}`
            : "메뉴와 커뮤니티를 불러오는 중입니다"
        }
        actionLabel="홈"
        onAction={() => navigate("/customer")}
      />

      {loading ? (
        <Card>
          <LoadingState label="가게와 커뮤니티를 불러오는 중입니다" />
        </Card>
      ) : (
        <>
          {store && (
            <Card className="hero-card">
              <div className="hero-card__content">
                <div className="store-card__media" style={{ background: getStoreVisual(store.name), minHeight: 160 }} />
                <div className="hero-card__title" style={{ marginTop: 16 }}>
                  <div>
                    <h2>{store.name}</h2>
                    <p className="hero-card__subtitle">
                      {store.description || "이 가게의 이야기를 천천히 둘러보고 마음에 드는 메뉴를 담아보세요."}
                    </p>
                  </div>
                  <Badge tone={store.currentlyOpen ? "success" : "secondary"}>
                    {store.currentlyOpen ? "주문 가능" : "영업 종료"}
                  </Badge>
                </div>
                <div className="status-row">
                  <Badge tone="secondary">최소주문 {formatCurrency(store.minOrderAmount)}</Badge>
                  <Badge tone="secondary">배달비 {formatCurrency(store.deliveryFee)}</Badge>
                  <Badge tone="secondary">{community?.viewer?.regularLevel || "일반 손님"}</Badge>
                </div>
              </div>
            </Card>
          )}

          <div className="section-heading">
            <div>
              <h3>가게 둘러보기</h3>
              <p>메뉴 주문과 커뮤니티 탐색을 한 공간에서 이어갈 수 있어요.</p>
            </div>
            <div className="chip-row">
              <Button variant={tab === "menu" ? "primary" : "secondary"} onClick={() => setTab("menu")}>
                메뉴
              </Button>
              <Button variant={tab === "community" ? "primary" : "secondary"} onClick={() => setTab("community")}>
                커뮤니티
              </Button>
            </div>
          </div>

          {tab === "menu" && (
            <>
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
            </>
          )}

          {tab === "community" && community && (
            <div className="page-stack">
              <Card className="community-hero">
                <div className="section-heading">
                  <div>
                    <h3>우리 가게 커뮤니티</h3>
                    <p>좋아하는 가게와 함께 추억을 만들고 응원하는 공간입니다.</p>
                  </div>
                  <Badge tone="primary">{community.stats.regulars}명 단골</Badge>
                </div>
                <div className="dashboard-grid" style={{ marginTop: 16 }}>
                  <Card className="mini-card metric-card">
                    <h3>{community.stats.likes}</h3>
                    <p>좋아요</p>
                  </Card>
                  <Card className="mini-card metric-card">
                    <h3>{community.stats.cheers}</h3>
                    <p>응원</p>
                  </Card>
                  <Card className="mini-card metric-card">
                    <h3>{community.viewer.orderCount}</h3>
                    <p>내 주문 횟수</p>
                  </Card>
                  <Card className="mini-card metric-card">
                    <h3>{community.viewer.regularLevel}</h3>
                    <p>내 단골 레벨</p>
                  </Card>
                </div>
                {role === "customer" && (
                  <div className="list-actions" style={{ marginTop: 16 }}>
                    <Button
                      variant={community.viewer.liked ? "primary" : "secondary"}
                      onClick={() => toggleSupport("like")}
                    >
                      {community.viewer.liked ? "좋아요 취소" : "좋아요"}
                    </Button>
                    <Button
                      variant={community.viewer.cheered ? "primary" : "secondary"}
                      onClick={() => toggleSupport("cheer")}
                    >
                      {community.viewer.cheered ? "응원 취소" : "응원하기"}
                    </Button>
                    <Button
                      variant={community.viewer.isRegular ? "primary" : "secondary"}
                      onClick={() => toggleSupport("regular")}
                    >
                      {community.viewer.isRegular ? "단골 해제" : "단골 등록"}
                    </Button>
                  </div>
                )}
              </Card>

              <Card>
                <div className="section-heading">
                  <h3>우리 가게 이야기</h3>
                  <Badge tone="secondary">{community.ownerStories.length}편</Badge>
                </div>
                {community.ownerStories.length === 0 && <div className="empty-state">사장님 이야기가 아직 없습니다.</div>}
                {community.ownerStories.map((story) => (
                  <Card key={story._id} className="mini-card community-story-card">
                    <div className="section-heading">
                      <div>
                        <strong>{story.title}</strong>
                        <p>{story.story_type} · {formatDateTime(story.created_at)}</p>
                      </div>
                      <Badge tone="primary">사장님</Badge>
                    </div>
                    {story.image_url && <div className="community-image" style={{ backgroundImage: `url(${story.image_url})` }} />}
                    <p>{story.content}</p>
                  </Card>
                ))}
              </Card>

              <Card>
                <div className="section-heading">
                  <h3>단골 랭킹</h3>
                  <Badge tone="secondary">Top {community.topRegulars.length}</Badge>
                </div>
                {community.topRegulars.length === 0 && <div className="empty-state">아직 단골 랭킹이 없습니다.</div>}
                {community.topRegulars.map((person, index) => (
                  <Card key={person.username} className="mini-card">
                    <div className="section-heading">
                      <div>
                        <strong>{index + 1}. {person.author_name}</strong>
                        <p>{person.order_count}회 주문 · {person.regular_level}</p>
                      </div>
                      <Badge tone="primary">{person.regular_level}</Badge>
                    </div>
                  </Card>
                ))}
              </Card>

              <Card>
                <div className="section-heading">
                  <h3>단골 한마디</h3>
                  <p>별점이 아닌, 추억과 마음을 남기는 공간입니다.</p>
                </div>
                {role === "customer" && (
                  <div className="auth-form" style={{ marginTop: 16 }}>
                    <Input
                      label="나의 한마디"
                      as="textarea"
                      rows={3}
                      value={regularNote}
                      onChange={(event) => setRegularNote(event.target.value)}
                      placeholder="이 가게와 함께한 나만의 이야기를 적어보세요"
                    />
                    <Button onClick={submitRegularNote}>한마디 남기기</Button>
                  </div>
                )}
                <div className="panel-list" style={{ marginTop: 16 }}>
                  {community.regularNotes.length === 0 && <div className="empty-state">아직 단골 한마디가 없습니다.</div>}
                  {community.regularNotes.map((note) => (
                    <Card key={note._id} className="mini-card">
                      <div className="section-heading">
                        <div>
                          <strong>{note.author_name}</strong>
                          <p>{formatDateTime(note.created_at)}</p>
                        </div>
                        <Badge tone="secondary">{note.regular_level}</Badge>
                      </div>
                      <p>{note.message}</p>
                    </Card>
                  ))}
                </div>
              </Card>

              <Card>
                <div className="section-heading">
                  <h3>추억 앨범</h3>
                  <Badge tone="secondary">{community.albumEntries.length}장</Badge>
                </div>
                {(role === "customer" || role === "store") && (
                  <div className="auth-form" style={{ marginTop: 16 }}>
                    <Input
                      label="앨범 제목"
                      value={albumForm.title}
                      onChange={(event) => setAlbumForm((prev) => ({ ...prev, title: event.target.value }))}
                      placeholder="예: 졸업날 함께한 떡볶이"
                    />
                    <Input
                      label="짧은 이야기"
                      as="textarea"
                      rows={3}
                      value={albumForm.caption}
                      onChange={(event) => setAlbumForm((prev) => ({ ...prev, caption: event.target.value }))}
                      placeholder="음식과 함께한 추억을 남겨보세요"
                    />
                    <Input
                      label="사진 URL"
                      value={albumForm.imageUrl}
                      onChange={(event) => setAlbumForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
                      placeholder="https://..."
                    />
                    <Button onClick={submitAlbumEntry}>추억 올리기</Button>
                  </div>
                )}
                <div className="panel-list" style={{ marginTop: 16 }}>
                  {community.albumEntries.length === 0 && <div className="empty-state">아직 추억 앨범이 없습니다.</div>}
                  {community.albumEntries.map((entry) => (
                    <Card key={entry._id} className="mini-card">
                      <div className="section-heading">
                        <div>
                          <strong>{entry.title}</strong>
                          <p>{entry.author_name} · {formatDateTime(entry.created_at)}</p>
                        </div>
                        <Badge tone={entry.author_role === "store" ? "primary" : "secondary"}>
                          {entry.author_role === "store" ? "가게" : "손님"}
                        </Badge>
                      </div>
                      {entry.image_url && <div className="community-image" style={{ backgroundImage: `url(${entry.image_url})` }} />}
                      <p>{entry.caption}</p>
                    </Card>
                  ))}
                </div>
              </Card>

              <Card>
                <div className="section-heading">
                  <h3>방명록</h3>
                  <p>짧지만 따뜻한 한 줄을 남겨보세요.</p>
                </div>
                {role === "customer" && (
                  <div className="auth-form" style={{ marginTop: 16 }}>
                    <Input
                      label="방명록"
                      value={guestbookMessage}
                      onChange={(event) => setGuestbookMessage(event.target.value)}
                      placeholder="오늘도 맛있게 먹었습니다"
                    />
                    <Button onClick={submitGuestbook}>남기기</Button>
                  </div>
                )}
                <div className="panel-list" style={{ marginTop: 16 }}>
                  {community.guestbookEntries.length === 0 && <div className="empty-state">첫 방명록을 남겨보세요.</div>}
                  {community.guestbookEntries.map((entry) => (
                    <Card key={entry._id} className="mini-card">
                      <div className="section-heading">
                        <strong>{entry.author_name}</strong>
                        <Badge tone="secondary">{formatDateTime(entry.created_at)}</Badge>
                      </div>
                      <p>{entry.message}</p>
                    </Card>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </>
      )}

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
      <ToastViewport />
    </AppShell>
  );
}

export default CustomerStoreDetailPage;
