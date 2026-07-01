import React, { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../layouts/AppShell";
import Header from "../components/common/Header";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import EmptyState from "../components/ui/EmptyState";
import LoadingState from "../components/ui/LoadingState";
import BottomNavigation from "../components/navigation/BottomNavigation";
import ShortFeedCard from "../components/feed/ShortFeedCard";
import { orderService } from "../services/orderService";
import { getCartItems } from "../utils/cart";
import { formatCurrency, getStoreVisual, inferCategory } from "../utils/format";
import { usePolling } from "../hooks/usePolling";
import { useToast } from "../hooks/useToast";

const navItems = [
  { key: "home", label: "홈", icon: "🏠" },
  { key: "shorts", label: "쇼츠", icon: "▶" },
  { key: "cart", label: "장바구니", icon: "🛒" },
  { key: "search", label: "검색", icon: "🔎" },
  { key: "profile", label: "마이", icon: "👤" },
];

function CustomerPage() {
  const navigate = useNavigate();
  const [stores, setStores] = useState([]);
  const [feed, setFeed] = useState([]);
  const [retention, setRetention] = useState(null);
  const [loading, setLoading] = useState(true);
  const { showToast, ToastViewport } = useToast();

  const fetchHome = useCallback(async () => {
    try {
      const [storeData, feedData, retentionData] = await Promise.all([
        orderService.getPublicStores(),
        orderService.getFeed(),
        orderService.getRetentionSummary(),
      ]);
      setStores(storeData);
      setFeed(feedData);
      setRetention(retentionData);
    } finally {
      setLoading(false);
    }
  }, []);

  usePolling(fetchHome, 8000);

  const cartCount = getCartItems().length;
  const address = localStorage.getItem("address") || "주소를 설정하면 근처 인기 피드를 더 정확하게 추천해드려요";

  const categories = useMemo(
    () => ["전체", ...new Set(stores.map((store) => inferCategory(store.name)))],
    [stores]
  );

  const recommendedStores = useMemo(() => stores.slice(0, 5), [stores]);

  const handleNav = (key) => {
    if (key === "home") navigate("/customer");
    if (key === "shorts") navigate("/customer/shorts");
    if (key === "search") navigate("/customer/search");
    if (key === "cart") navigate("/customer/cart");
    if (key === "profile") navigate("/customer/profile");
  };

  const openStore = (storeId) => navigate(`/customer/store/${storeId}`);

  const claimLuckyBox = async () => {
    try {
      const data = await orderService.claimLuckyBox();
      await fetchHome();
      showToast(
        data.alreadyClaimed
          ? `${data.reward?.title || "오늘의 보상"}은 이미 받았어요`
          : `${data.reward?.title || "행운 보상"} 획득!`,
        "success"
      );
    } catch (error) {
      showToast(error.response?.data?.detail || "럭키박스를 여는 데 실패했습니다", "danger");
    }
  };

  return (
    <AppShell mobile>
      <div className="feed-search-shell">
        <Header
          title="오늘 뭐 먹지?"
          subtitle="음식 쇼츠를 보다 보면 주문하고 싶어지는 피드형 홈"
          actionLabel={`장바구니 ${cartCount}`}
          onAction={() => navigate("/customer/cart")}
        />

        <Card className="feed-search-bar" interactive onClick={() => navigate("/customer/search")}>
          <div className="feed-search-bar__row">
            <span className="feed-search-bar__icon">🔎</span>
            <div>
              <strong>가게 검색</strong>
              <p>가게 이름으로 바로 탐색하기</p>
            </div>
            <Badge tone="secondary">실시간</Badge>
          </div>
        </Card>
      </div>

      {loading ? (
        <Card>
          <LoadingState label="맞춤 음식 피드를 불러오는 중입니다" />
        </Card>
      ) : (
        <>
          <Card className="hero-card">
            <div className="hero-card__content">
              <div className="hero-card__title">
                <div>
                  <h2>추천 피드</h2>
                  <p className="hero-card__subtitle">{address}</p>
                </div>
                <Badge tone="primary">{feed.length}개 피드</Badge>
              </div>
              <div className="chip-row">
                {categories.map((category) => (
                  <Button key={category} variant="secondary" onClick={() => navigate("/customer/search")}>
                    {category}
                  </Button>
                ))}
              </div>
            </div>
          </Card>

          <Card className="retro-event-card">
            <div className="section-heading">
              <div>
                <h3>오늘의 럭키박스</h3>
                <p>오늘은 어떤 무료 혜택이나 스티커가 뜰지 확인해보세요.</p>
              </div>
              <Badge tone="primary">{retention?.todayLuckyBoxClaimed ? "수령 완료" : "열기 가능"}</Badge>
            </div>
            <div className="dashboard-grid" style={{ marginTop: 16 }}>
              <Card className="mini-card metric-card">
                <h3>{retention?.stickerBook?.earned?.length || 0}</h3>
                <p>모은 스티커</p>
              </Card>
              <Card className="mini-card metric-card">
                <h3>{retention?.availableRewards?.length || 0}</h3>
                <p>사용 가능한 혜택</p>
              </Card>
              <Card className="mini-card metric-card">
                <h3>{retention?.followedStores?.length || 0}</h3>
                <p>팔로우한 가게</p>
              </Card>
            </div>
            <div className="list-actions" style={{ marginTop: 16 }}>
              <Button onClick={claimLuckyBox}>
                {retention?.todayLuckyBoxClaimed ? "오늘 보상 다시 보기" : "럭키박스 열기"}
              </Button>
              <Button variant="secondary" onClick={() => navigate("/customer/stickers")}>
                스티커북 보기
              </Button>
            </div>
            {retention?.todayLuckyReward && (
              <Card className="mini-card" style={{ marginTop: 16 }}>
                <strong>{retention.todayLuckyReward.emoji} {retention.todayLuckyReward.title}</strong>
                <p>{retention.todayLuckyReward.description}</p>
              </Card>
            )}
          </Card>

          {!!retention?.events?.length && (
            <>
              <div className="section-heading">
                <h3>오늘의 이벤트</h3>
                <p>가볍게 눌러보고 혜택을 챙길 수 있는 이벤트만 모아뒀어요.</p>
              </div>
              <div className="reco-rail">
                {retention.events.map((event) => (
                  <Card key={event._id} className="reco-rail__card retro-chip-card">
                    <strong>{event.emoji} {event.title}</strong>
                    <p>{event.description}</p>
                    <Badge tone={event.is_active ? "success" : "secondary"}>{event.reward_label}</Badge>
                  </Card>
                ))}
              </div>
            </>
          )}

          <div className="section-heading">
            <h3>오늘 추천 가게</h3>
            <p>근처 인기 가게와 시간대 추천을 먼저 보여드려요.</p>
          </div>

          <div className="reco-rail">
            {recommendedStores.map((store) => (
              <Card
                key={store._id}
                className="reco-rail__card"
                interactive={store.currentlyOpen}
                onClick={() => store.currentlyOpen && openStore(store._id)}
              >
                <div className="reco-rail__media" style={{ background: getStoreVisual(store.name) }} />
                <strong>{store.name}</strong>
                <p>{inferCategory(store.name)} · 배달비 {formatCurrency(store.deliveryFee)}</p>
                <div className="status-row">
                  <Badge tone={store.currentlyOpen ? "success" : "secondary"}>
                    {store.currentlyOpen ? "영업중" : "영업 종료"}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>

          <div className="section-heading">
            <h3>쇼츠 피드</h3>
            <p>릴스처럼 넘겨보다가 마음에 들면 바로 가게로 들어갈 수 있어요.</p>
          </div>

          <section className="short-feed">
            {feed.length === 0 ? (
              <Card>
                <EmptyState
                  title="아직 보여줄 쇼츠가 없습니다"
                  description="가게가 올린 홍보 영상이나 자동 생성 추천 피드가 이 영역에 표시됩니다."
                />
              </Card>
            ) : (
              feed.slice(0, 2).map((post) => (
                <ShortFeedCard
                  key={post._id}
                  post={post}
                  onOpenStore={openStore}
                  onOrder={(storeId) => navigate(`/customer/store/${storeId}`)}
                />
              ))
            )}
          </section>

          {feed.length > 2 && (
            <Card className="short-feed-cta" interactive onClick={() => navigate("/customer/shorts")}>
              <div className="section-heading">
                <div>
                  <h3>쇼츠 더 보기</h3>
                  <p>지금 인기 음식 릴스를 전체 화면으로 이어서 감상하세요.</p>
                </div>
                <Button>쇼츠 열기</Button>
              </div>
            </Card>
          )}
        </>
      )}

      <BottomNavigation items={navItems} activeKey="home" onChange={handleNav} />
      <ToastViewport />
    </AppShell>
  );
}

export default CustomerPage;
