import React, { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../layouts/AppShell";
import Header from "../components/common/Header";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import LoadingState from "../components/ui/LoadingState";
import BottomNavigation from "../components/navigation/BottomNavigation";
import ShortFeedCard from "../components/feed/ShortFeedCard";
import { orderService } from "../services/orderService";
import { getCartItems } from "../utils/cart";
import { usePolling } from "../hooks/usePolling";

const navItems = [
  { key: "home", label: "홈", icon: "🏠" },
  { key: "shorts", label: "쇼츠", icon: "▶" },
  { key: "cart", label: "장바구니", icon: "🛒" },
  { key: "search", label: "검색", icon: "🔎" },
  { key: "profile", label: "마이", icon: "👤" },
];

function CustomerShortsPage() {
  const navigate = useNavigate();
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFeed = useCallback(async () => {
    try {
      const data = await orderService.getFeed();
      setFeed(data);
    } finally {
      setLoading(false);
    }
  }, []);

  usePolling(fetchFeed, 8000);

  const handleNav = (key) => {
    if (key === "home") navigate("/customer");
    if (key === "shorts") navigate("/customer/shorts");
    if (key === "cart") navigate("/customer/cart");
    if (key === "search") navigate("/customer/search");
    if (key === "profile") navigate("/customer/profile");
  };

  const openStore = (storeId) => navigate(`/customer/store/${storeId}`);

  return (
    <AppShell mobile>
      <Header
        title="푸드 쇼츠"
        subtitle="세로형 음식 릴스를 넘기며 바로 주문까지 이어가세요"
        actionLabel={`장바구니 ${getCartItems().length}`}
        onAction={() => navigate("/customer/cart")}
      />

      {loading ? (
        <Card>
          <LoadingState label="쇼츠 피드를 불러오는 중입니다" />
        </Card>
      ) : (
        <section className="short-feed">
          {feed.length === 0 ? (
            <Card>
              <EmptyState
                title="아직 보여줄 쇼츠가 없습니다"
                description="가게가 등록한 음식 쇼츠가 이 공간을 채우게 됩니다."
              />
            </Card>
          ) : (
            feed.map((post) => (
              <ShortFeedCard
                key={post._id}
                post={post}
                onOpenStore={openStore}
                onOrder={(storeId) => navigate(`/customer/store/${storeId}`)}
              />
            ))
          )}
        </section>
      )}

      <BottomNavigation items={navItems} activeKey="shorts" onChange={handleNav} />
    </AppShell>
  );
}

export default CustomerShortsPage;
