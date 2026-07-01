import React, { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../layouts/AppShell";
import Header from "../components/common/Header";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import BottomNavigation from "../components/navigation/BottomNavigation";
import LoadingState from "../components/ui/LoadingState";
import { orderService } from "../services/orderService";
import { formatCurrency, formatDateTime } from "../utils/format";
import { usePolling } from "../hooks/usePolling";

const navItems = [
  { key: "home", label: "홈", icon: "🏠" },
  { key: "shorts", label: "쇼츠", icon: "▶" },
  { key: "cart", label: "장바구니", icon: "🛒" },
  { key: "search", label: "검색", icon: "🔎" },
  { key: "profile", label: "마이", icon: "👤" },
];

function CustomerStickerBookPage() {
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [bookData, rewardData] = await Promise.all([
        orderService.getStickerBook(),
        orderService.getMyRewards(),
      ]);
      setBook(bookData);
      setRewards(rewardData);
    } finally {
      setLoading(false);
    }
  }, []);

  usePolling(fetchData, 7000);

  return (
    <AppShell mobile>
      <Header
        title="스티커북"
        subtitle="레트로 감성으로 차곡차곡 모아가는 FEEDY 컬렉션"
        actionLabel="마이"
        onAction={() => navigate("/customer/profile")}
      />

      {loading ? (
        <Card>
          <LoadingState label="스티커북을 불러오는 중입니다" />
        </Card>
      ) : (
        <div className="page-stack">
          <Card className="sticker-book-card">
            <div className="section-heading">
              <div>
                <h3>컬렉션 진행도</h3>
                <p>도감처럼 스티커를 모을수록 칸이 채워집니다.</p>
              </div>
              <Badge tone="primary">{book?.earned?.length || 0}장 보유</Badge>
            </div>
            <div className="dashboard-grid" style={{ marginTop: 16 }}>
              {(book?.collections || []).map((collection) => (
                <Card key={collection.name} className="mini-card metric-card">
                  <h3>{collection.earned}/{collection.total}</h3>
                  <p>{collection.name}</p>
                </Card>
              ))}
            </div>
          </Card>

          <Card>
            <div className="section-heading">
              <h3>획득한 스티커</h3>
              <Badge tone="secondary">{book?.earned?.length || 0}개</Badge>
            </div>
            <div className="sticker-grid" style={{ marginTop: 16 }}>
              {(book?.earned || []).map((sticker) => (
                <Card key={sticker._id} className="mini-card sticker-card">
                  <div className="sticker-card__emoji">{sticker.emoji}</div>
                  <strong>{sticker.title}</strong>
                  <p>{sticker.description}</p>
                  <Badge tone="secondary">{formatDateTime(sticker.earned_at)}</Badge>
                </Card>
              ))}
            </div>
          </Card>

          <Card>
            <div className="section-heading">
              <h3>사용 가능한 혜택</h3>
              <Badge tone="primary">{rewards.length}개</Badge>
            </div>
            {(rewards || []).map((reward) => (
              <Card key={reward._id} className="mini-card">
                <div className="section-heading">
                  <div>
                    <strong>{reward.emoji} {reward.title}</strong>
                    <p>{reward.description}</p>
                  </div>
                  <Badge tone="success">
                    {reward.reward_type === "discount" ? formatCurrency(reward.reward_value) : reward.reward_label}
                  </Badge>
                </div>
              </Card>
            ))}
            {rewards.length === 0 && <div className="empty-state">아직 사용할 수 있는 혜택이 없습니다.</div>}
          </Card>
        </div>
      )}

      <BottomNavigation
        items={navItems}
        activeKey="profile"
        onChange={(key) => {
          if (key === "home") navigate("/customer");
          if (key === "shorts") navigate("/customer/shorts");
          if (key === "cart") navigate("/customer/cart");
          if (key === "search") navigate("/customer/search");
          if (key === "profile") navigate("/customer/profile");
        }}
      />
    </AppShell>
  );
}

export default CustomerStickerBookPage;
