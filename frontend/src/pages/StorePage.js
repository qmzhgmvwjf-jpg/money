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
import { noticeService } from "../services/noticeService";
import { formatCurrency, formatDateTime } from "../utils/format";
import { usePolling } from "../hooks/usePolling";
import { useToast } from "../hooks/useToast";

const tabs = [
  { key: "home", label: "메인", icon: "🏪" },
  { key: "menus", label: "메뉴", icon: "🍽️" },
  { key: "content", label: "쇼츠", icon: "🎬" },
  { key: "community", label: "커뮤니티", icon: "❤️" },
  { key: "finance", label: "정산", icon: "💰" },
  { key: "settings", label: "설정", icon: "⚙️" },
];

function StorePage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [storeInfo, setStoreInfo] = useState(null);
  const [finance, setFinance] = useState(null);
  const [tab, setTab] = useState("home");
  const [menuForm, setMenuForm] = useState({ name: "", price: "" });
  const [editingMenuId, setEditingMenuId] = useState(null);
  const [contentPosts, setContentPosts] = useState([]);
  const [community, setCommunity] = useState(null);
  const [contentForm, setContentForm] = useState({
    title: "",
    caption: "",
    videoUrl: "",
    thumbnailUrl: "",
    contentType: "food",
    menuName: "",
    price: "",
    eventLabel: "",
  });
  const [editingContentId, setEditingContentId] = useState(null);
  const [storyForm, setStoryForm] = useState({
    title: "",
    content: "",
    imageUrl: "",
    storyType: "today",
  });
  const [editingStoryId, setEditingStoryId] = useState(null);
  const [albumEntryForm, setAlbumEntryForm] = useState({
    title: "",
    caption: "",
    imageUrl: "",
  });
  const [settingsForm, setSettingsForm] = useState({
    name: "",
    description: "",
    phone: "",
    minOrderAmount: 0,
    deliveryFee: 0,
    bankName: "",
    accountNumber: "",
    accountHolder: "",
    openTime: "09:00",
    closeTime: "21:00",
  });
  const [topupForm, setTopupForm] = useState({ amount: "", depositorName: "", note: "" });
  const [withdrawForm, setWithdrawForm] = useState({ amount: "", note: "" });
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast, ToastViewport } = useToast();

  const logout = () => {
    localStorage.clear();
    navigate("/");
  };

  const fetchOrders = useCallback(async () => {
    try {
      const data = await orderService.getStoreOrders("all");
      setOrders(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    const data = await orderService.getStoreStats();
    setStats(data);
  }, []);

  const fetchStoreInfo = useCallback(async () => {
    const data = await orderService.getStoreMyInfo();
    setStoreInfo(data);
    setSettingsForm({
      name: data.name || "",
      description: data.description || "",
      phone: data.phone || "",
      minOrderAmount: data.minOrderAmount || 0,
      deliveryFee: data.deliveryFee || 0,
      bankName: data.bankName || "",
      accountNumber: data.accountNumber || "",
      accountHolder: data.accountHolder || "",
      openTime: data.openTime || "09:00",
      closeTime: data.closeTime || "21:00",
    });
  }, []);

  const fetchFinance = useCallback(async () => {
    const data = await orderService.getStoreFinance();
    setFinance(data);
  }, []);

  const fetchNotices = useCallback(async () => {
    const data = await noticeService.getNotices();
    setNotices(data);
  }, []);

  const fetchContentPosts = useCallback(async () => {
    const data = await orderService.getStoreContentPosts();
    setContentPosts(data);
  }, []);

  const fetchCommunity = useCallback(async () => {
    const storeId = localStorage.getItem("storeId");
    if (!storeId) return;
    const data = await orderService.getStoreCommunity(storeId);
    setCommunity(data);
  }, []);

  usePolling(fetchOrders, 3000);
  usePolling(fetchStats, 5000);
  usePolling(fetchStoreInfo, 5000);
  usePolling(fetchFinance, 7000);
  usePolling(fetchNotices, 7000);
  usePolling(fetchContentPosts, 7000);
  usePolling(fetchCommunity, 7000);

  const currentOrders = useMemo(
    () => orders.filter((order) => order.status === "pending"),
    [orders]
  );
  const inProgressOrders = useMemo(
    () => orders.filter((order) => ["accepted", "dispatch_ready", "assigned", "delivering"].includes(order.status)),
    [orders]
  );
  const completedOrders = useMemo(
    () => orders.filter((order) => ["completed", "cancelled"].includes(order.status)),
    [orders]
  );

  const orderAction = async (type, id) => {
    if (type === "accept") await orderService.storeAccept(id);
    if (type === "reject") await orderService.storeReject(id);
    if (type === "dispatch") await orderService.requestDispatch(id);
    showToast(type === "reject" ? "주문을 거절했습니다" : "요청이 처리되었습니다", type === "reject" ? "danger" : "success");
    fetchOrders();
    fetchStats();
    fetchFinance();
  };

  const saveSettings = async () => {
    await orderService.updateStoreSettings({
      ...settingsForm,
      minOrderAmount: Number(settingsForm.minOrderAmount),
      deliveryFee: Number(settingsForm.deliveryFee),
    });
    showToast("가게 설정을 저장했습니다", "success");
    fetchStoreInfo();
  };

  const toggleOpen = async () => {
    await orderService.toggleStoreOpen({ isOpen: !storeInfo?.isOpen });
    showToast(storeInfo?.isOpen ? "영업을 중지했습니다" : "영업을 시작했습니다", "success");
    fetchStoreInfo();
  };

  const submitMenu = async () => {
    if (!storeInfo?._id) return;
    if (!menuForm.name || !menuForm.price) {
      showToast("메뉴명과 가격을 입력하세요", "danger");
      return;
    }
    if (editingMenuId) {
      await orderService.updateMenu(editingMenuId, { name: menuForm.name, price: Number(menuForm.price) });
    } else {
      await orderService.createMenu({
        store_id: storeInfo._id,
        name: menuForm.name,
        price: Number(menuForm.price),
      });
    }
    setMenuForm({ name: "", price: "" });
    setEditingMenuId(null);
    showToast(editingMenuId ? "메뉴를 수정했습니다" : "메뉴를 추가했습니다", "success");
    fetchStoreInfo();
  };

  const requestTopup = async () => {
    await orderService.requestStoreTopup({
      amount: Number(topupForm.amount),
      depositorName: topupForm.depositorName,
      note: topupForm.note,
    });
    setTopupForm({ amount: "", depositorName: "", note: "" });
    showToast("입금 요청을 보냈습니다", "success");
    fetchFinance();
  };

  const requestWithdrawal = async () => {
    await orderService.requestStoreWithdrawal({
      amount: Number(withdrawForm.amount),
      note: withdrawForm.note,
    });
    setWithdrawForm({ amount: "", note: "" });
    showToast("출금 요청을 보냈습니다", "success");
    fetchFinance();
  };

  const submitContentPost = async () => {
    if (!contentForm.title || !contentForm.caption || !contentForm.videoUrl) {
      showToast("제목, 소개, 영상 URL을 입력하세요", "danger");
      return;
    }

    const payload = {
      ...contentForm,
      price: contentForm.price ? Number(contentForm.price) : null,
    };

    if (editingContentId) {
      await orderService.updateStoreContentPost(editingContentId, payload);
    } else {
      await orderService.createStoreContentPost(payload);
    }

    setEditingContentId(null);
    setContentForm({
      title: "",
      caption: "",
      videoUrl: "",
      thumbnailUrl: "",
      contentType: "food",
      menuName: "",
      price: "",
      eventLabel: "",
    });
    showToast(editingContentId ? "쇼츠를 수정했습니다" : "쇼츠를 등록했습니다", "success");
    fetchContentPosts();
  };

  const submitStory = async () => {
    if (!storeInfo?._id) return;
    if (!storyForm.title.trim() || !storyForm.content.trim()) {
      showToast("제목과 이야기를 입력하세요", "danger");
      return;
    }

    if (editingStoryId) {
      await orderService.updateStoreStory(storeInfo._id, editingStoryId, storyForm);
    } else {
      await orderService.createStoreStory(storeInfo._id, storyForm);
    }

    setEditingStoryId(null);
    setStoryForm({
      title: "",
      content: "",
      imageUrl: "",
      storyType: "today",
    });
    showToast(editingStoryId ? "가게 이야기를 수정했습니다" : "가게 이야기를 등록했습니다", "success");
    fetchCommunity();
  };

  const submitAlbumEntry = async () => {
    if (!storeInfo?._id) return;
    if (!albumEntryForm.title.trim() || !albumEntryForm.caption.trim()) {
      showToast("제목과 추억 내용을 입력하세요", "danger");
      return;
    }

    await orderService.createAlbumEntry(storeInfo._id, albumEntryForm);
    setAlbumEntryForm({ title: "", caption: "", imageUrl: "" });
    showToast("가게 추억 앨범에 등록했습니다", "success");
    fetchCommunity();
  };

  const renderOrderCard = (order) => (
    <Card key={order._id} className="mini-card order-card">
      <div className="section-heading">
        <div>
          <strong>{order.order_id}</strong>
          <p>{order.customer_name} · {formatDateTime(order.created_at)}</p>
        </div>
        <Badge status={order.status}>{order.status}</Badge>
      </div>
      <div className="order-card__meta">{order.address}</div>
      <div className="order-card__price">{formatCurrency(order.total_price)}</div>
      <div className="list-actions" style={{ marginTop: 12 }}>
        {order.status === "pending" && (
          <>
            <Button onClick={() => orderAction("accept", order._id)}>수락</Button>
            <Button variant="danger" onClick={() => orderAction("reject", order._id)}>거절</Button>
          </>
        )}
        {order.status === "accepted" && (
          <Button onClick={() => orderAction("dispatch", order._id)}>배차 요청</Button>
        )}
      </div>
    </Card>
  );

  return (
    <AppShell mobile>
      <Header
        title={storeInfo?.name || "가게 운영"}
        subtitle="주문은 간결하게, 설정과 정산은 분리해서 운영할 수 있게 정리했습니다"
        actionLabel="로그아웃"
        onAction={logout}
      />

      <div className="dashboard-grid">
        <Card className="metric-card metric-card--primary">
          <h3>{currentOrders.length}건</h3>
          <p>현재 주문</p>
        </Card>
        <Card className="metric-card">
          <h3>{inProgressOrders.length}건</h3>
          <p>진행중 주문</p>
        </Card>
        <Card className="metric-card">
          <h3>{completedOrders.length}건</h3>
          <p>완료 주문</p>
        </Card>
        <Card className="metric-card">
          <h3>{formatCurrency(finance?.balance || 0)}</h3>
          <p>현재 잔액</p>
        </Card>
      </div>

      {loading ? (
        <Card>
          <LoadingState label="가게 주문 현황을 불러오는 중입니다" />
        </Card>
      ) : tab === "home" && (
        <div className="page-stack">
          <Card>
            <div className="section-heading">
              <div>
                <h3>현재 주문</h3>
                <p>즉시 처리할 주문만 먼저 모아봤어요.</p>
              </div>
              <Badge tone="primary">{currentOrders.length}건</Badge>
            </div>
            {currentOrders.length === 0 ? <EmptyState title="현재 주문이 없습니다" description="새 주문이 들어오면 가장 먼저 여기에 표시됩니다." /> : currentOrders.map(renderOrderCard)}
          </Card>

          <Card>
            <div className="section-heading">
              <h3>진행중 주문</h3>
              <Badge tone="secondary">{inProgressOrders.length}건</Badge>
            </div>
            {inProgressOrders.length === 0 ? <EmptyState title="진행중 주문이 없습니다" description="수락한 주문과 배차 요청이 여기에 모입니다." /> : inProgressOrders.map(renderOrderCard)}
          </Card>

          <Card>
            <div className="section-heading">
              <h3>완료 주문</h3>
              <Badge tone="secondary">{completedOrders.length}건</Badge>
            </div>
            {completedOrders.length === 0 ? <EmptyState title="완료 주문이 없습니다" description="완료/취소된 주문은 최근 10건만 보여드립니다." /> : completedOrders.slice(0, 10).map(renderOrderCard)}
          </Card>

          <Card>
            <div className="section-heading">
              <h3>운영 메시지</h3>
              <Badge tone="primary">{notices.length}건</Badge>
            </div>
            {notices.length === 0 && <EmptyState title="운영 메시지가 없습니다" description="새 공지는 이 영역에 표시됩니다." />}
            {notices.slice(0, 3).map((notice) => (
              <Card key={notice._id} className="mini-card">
                <strong>{notice.title}</strong>
                <p>{notice.content}</p>
              </Card>
            ))}
          </Card>
        </div>
      )}

      {tab === "menus" && (
        <div className="page-stack">
          <Card>
            <div className="section-heading">
              <h3>메뉴 관리</h3>
              <p>메뉴 추가/수정/삭제를 이 페이지에서만 관리합니다.</p>
            </div>
            <div className="two-column-grid" style={{ marginTop: 16 }}>
              <Input label="메뉴명" value={menuForm.name} onChange={(event) => setMenuForm((prev) => ({ ...prev, name: event.target.value }))} />
              <Input label="가격" type="number" value={menuForm.price} onChange={(event) => setMenuForm((prev) => ({ ...prev, price: event.target.value }))} />
            </div>
            <div className="list-actions" style={{ marginTop: 16 }}>
              <Button onClick={submitMenu}>{editingMenuId ? "메뉴 수정" : "메뉴 추가"}</Button>
            </div>
          </Card>
          {(storeInfo?.menus || []).map((menu) => (
            <Card key={menu._id} className="menu-item">
              <div className="menu-item__meta">
                <div>
                  <strong>{menu.name}</strong>
                  <div>{formatCurrency(menu.price)}</div>
                </div>
                <div className="list-actions">
                  <Button variant="secondary" onClick={() => {
                    setEditingMenuId(menu._id);
                    setMenuForm({ name: menu.name, price: String(menu.price) });
                  }}>
                    수정
                  </Button>
                  <Button variant="danger" onClick={async () => {
                    await orderService.deleteMenu(menu._id);
                    showToast("메뉴를 삭제했습니다", "success");
                    fetchStoreInfo();
                  }}>
                    삭제
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "content" && (
        <div className="page-stack">
          <Card>
            <div className="section-heading">
              <div>
                <h3>쇼츠 업로드</h3>
                <p>가게 홍보 영상, 인기 메뉴 영상, 리뷰형 영상을 직접 피드에 올릴 수 있어요.</p>
              </div>
              <Badge tone="primary">{contentPosts.length}개</Badge>
            </div>
            <div className="auth-form" style={{ marginTop: 16 }}>
              <Input label="제목" value={contentForm.title} onChange={(event) => setContentForm((prev) => ({ ...prev, title: event.target.value }))} />
              <Input label="설명" as="textarea" rows={4} value={contentForm.caption} onChange={(event) => setContentForm((prev) => ({ ...prev, caption: event.target.value }))} />
              <Input label="영상 URL" value={contentForm.videoUrl} onChange={(event) => setContentForm((prev) => ({ ...prev, videoUrl: event.target.value }))} />
              <Input label="썸네일 URL" value={contentForm.thumbnailUrl} onChange={(event) => setContentForm((prev) => ({ ...prev, thumbnailUrl: event.target.value }))} />
              <Input label="콘텐츠 타입" as="select" value={contentForm.contentType} onChange={(event) => setContentForm((prev) => ({ ...prev, contentType: event.target.value }))}>
                <option value="food">음식 쇼츠</option>
                <option value="promo">가게 홍보 영상</option>
                <option value="event">할인 이벤트</option>
                <option value="review">리뷰 영상</option>
              </Input>
              <Input label="대표 메뉴명" value={contentForm.menuName} onChange={(event) => setContentForm((prev) => ({ ...prev, menuName: event.target.value }))} />
              <Input label="가격" type="number" value={contentForm.price} onChange={(event) => setContentForm((prev) => ({ ...prev, price: event.target.value }))} />
              <Input label="이벤트 라벨" value={contentForm.eventLabel} onChange={(event) => setContentForm((prev) => ({ ...prev, eventLabel: event.target.value }))} />
              <div className="list-actions">
                <Button onClick={submitContentPost}>{editingContentId ? "쇼츠 수정" : "쇼츠 등록"}</Button>
                {editingContentId && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditingContentId(null);
                      setContentForm({
                        title: "",
                        caption: "",
                        videoUrl: "",
                        thumbnailUrl: "",
                        contentType: "food",
                        menuName: "",
                        price: "",
                        eventLabel: "",
                      });
                    }}
                  >
                    취소
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {contentPosts.length === 0 && (
            <Card>
              <EmptyState title="등록된 쇼츠가 없습니다" description="첫 홍보 영상을 올려서 고객 홈 피드에 노출해보세요." />
            </Card>
          )}

          {contentPosts.map((post) => (
            <Card key={post._id} className="mini-card">
              <div className="section-heading">
                <div>
                  <strong>{post.title}</strong>
                  <p>{post.content_type} · {post.menu_name || "가게 홍보"}</p>
                </div>
                <Badge tone="secondary">{post.views?.toLocaleString() || 0} views</Badge>
              </div>
              <p>{post.caption}</p>
              <div className="list-actions" style={{ marginTop: 12 }}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditingContentId(post._id);
                    setContentForm({
                      title: post.title || "",
                      caption: post.caption || "",
                      videoUrl: post.video_url || "",
                      thumbnailUrl: post.thumbnail_url || "",
                      contentType: post.content_type || "food",
                      menuName: post.menu_name || "",
                      price: post.price ? String(post.price) : "",
                      eventLabel: post.event_label || "",
                    });
                    setTab("content");
                  }}
                >
                  수정
                </Button>
                <Button
                  variant="danger"
                  onClick={async () => {
                    await orderService.deleteStoreContentPost(post._id);
                    showToast("쇼츠를 삭제했습니다", "success");
                    fetchContentPosts();
                  }}
                >
                  삭제
                </Button>
                <Button variant="secondary" onClick={() => window.open(post.video_url, "_blank", "noopener,noreferrer")}>
                  미리보기
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "community" && (
        <div className="page-stack">
          <div className="dashboard-grid">
            <Card className="metric-card">
              <h3>{storeInfo?.communityStats?.likes || 0}</h3>
              <p>좋아요</p>
            </Card>
            <Card className="metric-card">
              <h3>{storeInfo?.communityStats?.cheers || 0}</h3>
              <p>응원</p>
            </Card>
            <Card className="metric-card">
              <h3>{storeInfo?.communityStats?.regulars || 0}</h3>
              <p>단골 수</p>
            </Card>
            <Card className="metric-card">
              <h3>{storeInfo?.communityStats?.albums || 0}</h3>
              <p>추억 앨범</p>
            </Card>
          </div>

          <Card>
            <div className="section-heading">
              <div>
                <h3>우리 가게 이야기</h3>
                <p>가게를 시작한 이유, 오늘의 이야기, 감사 인사를 따뜻하게 전해보세요.</p>
              </div>
              <Badge tone="primary">{community?.ownerStories?.length || 0}편</Badge>
            </div>
            <div className="auth-form" style={{ marginTop: 16 }}>
              <Input
                label="이야기 제목"
                value={storyForm.title}
                onChange={(event) => setStoryForm((prev) => ({ ...prev, title: event.target.value }))}
              />
              <Input
                label="이야기 성격"
                as="select"
                value={storyForm.storyType}
                onChange={(event) => setStoryForm((prev) => ({ ...prev, storyType: event.target.value }))}
              >
                <option value="today">오늘의 이야기</option>
                <option value="history">가게 역사</option>
                <option value="menu">신메뉴 개발</option>
                <option value="thanks">감사 인사</option>
              </Input>
              <Input
                label="사진 URL"
                value={storyForm.imageUrl}
                onChange={(event) => setStoryForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
              />
              <Input
                label="본문"
                as="textarea"
                rows={5}
                value={storyForm.content}
                onChange={(event) => setStoryForm((prev) => ({ ...prev, content: event.target.value }))}
              />
              <div className="list-actions">
                <Button onClick={submitStory}>{editingStoryId ? "이야기 수정" : "이야기 등록"}</Button>
                {editingStoryId && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditingStoryId(null);
                      setStoryForm({
                        title: "",
                        content: "",
                        imageUrl: "",
                        storyType: "today",
                      });
                    }}
                  >
                    취소
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {(community?.ownerStories || []).map((story) => (
            <Card key={story._id} className="mini-card">
              <div className="section-heading">
                <div>
                  <strong>{story.title}</strong>
                  <p>{story.story_type} · {formatDateTime(story.created_at)}</p>
                </div>
                <Badge tone="primary">스토리</Badge>
              </div>
              {story.image_url && <div className="community-image" style={{ backgroundImage: `url(${story.image_url})` }} />}
              <p>{story.content}</p>
              <div className="list-actions" style={{ marginTop: 12 }}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditingStoryId(story._id);
                    setStoryForm({
                      title: story.title || "",
                      content: story.content || "",
                      imageUrl: story.image_url || "",
                      storyType: story.story_type || "today",
                    });
                  }}
                >
                  수정
                </Button>
                <Button
                  variant="danger"
                  onClick={async () => {
                    await orderService.deleteStoreStory(storeInfo._id, story._id);
                    showToast("이야기를 삭제했습니다", "success");
                    fetchCommunity();
                  }}
                >
                  삭제
                </Button>
              </div>
            </Card>
          ))}

          <Card>
            <div className="section-heading">
              <h3>추억 앨범 올리기</h3>
              <p>단골과 함께 쌓인 장면을 사진과 짧은 이야기로 남겨보세요.</p>
            </div>
            <div className="auth-form" style={{ marginTop: 16 }}>
              <Input
                label="제목"
                value={albumEntryForm.title}
                onChange={(event) => setAlbumEntryForm((prev) => ({ ...prev, title: event.target.value }))}
              />
              <Input
                label="짧은 글"
                as="textarea"
                rows={3}
                value={albumEntryForm.caption}
                onChange={(event) => setAlbumEntryForm((prev) => ({ ...prev, caption: event.target.value }))}
              />
              <Input
                label="사진 URL"
                value={albumEntryForm.imageUrl}
                onChange={(event) => setAlbumEntryForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
              />
              <Button onClick={submitAlbumEntry}>추억 등록</Button>
            </div>
          </Card>

          <Card>
            <div className="section-heading">
              <h3>손님이 남긴 이야기</h3>
              <Badge tone="secondary">{community?.regularNotes?.length || 0}개</Badge>
            </div>
            {(community?.regularNotes || []).length === 0 && (
              <EmptyState title="아직 단골 한마디가 없습니다" description="손님이 마음을 남기면 이곳에 모입니다." />
            )}
            {(community?.regularNotes || []).map((note) => (
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
          </Card>

          <Card>
            <div className="section-heading">
              <h3>방명록</h3>
              <Badge tone="secondary">{community?.guestbookEntries?.length || 0}개</Badge>
            </div>
            {(community?.guestbookEntries || []).length === 0 && (
              <EmptyState title="아직 방명록이 없습니다" description="첫 손님의 인사가 도착하면 여기서 볼 수 있어요." />
            )}
            {(community?.guestbookEntries || []).map((entry) => (
              <Card key={entry._id} className="mini-card">
                <div className="section-heading">
                  <strong>{entry.author_name}</strong>
                  <Badge tone="secondary">{formatDateTime(entry.created_at)}</Badge>
                </div>
                <p>{entry.message}</p>
              </Card>
            ))}
          </Card>
        </div>
      )}

      {tab === "finance" && (
        <div className="page-stack">
          <div className="dashboard-grid">
            <Card className="metric-card">
              <h3>{formatCurrency(finance?.balance || 0)}</h3>
              <p>현재 잔액</p>
            </Card>
            <Card className="metric-card">
              <h3>{formatCurrency(stats?.totalSales || 0)}</h3>
              <p>총 매출</p>
            </Card>
          </div>

          <Card>
            <div className="section-heading">
              <h3>입금 요청</h3>
              <p>관리자 계좌 입금 후 충전을 요청할 수 있어요.</p>
            </div>
            <div className="auth-form" style={{ marginTop: 16 }}>
              <Input label="입금 금액" type="number" value={topupForm.amount} onChange={(event) => setTopupForm((prev) => ({ ...prev, amount: event.target.value }))} />
              <Input label="입금자명" value={topupForm.depositorName} onChange={(event) => setTopupForm((prev) => ({ ...prev, depositorName: event.target.value }))} />
              <Input label="메모" value={topupForm.note} onChange={(event) => setTopupForm((prev) => ({ ...prev, note: event.target.value }))} />
              <Button block onClick={requestTopup}>입금 요청</Button>
            </div>
          </Card>

          <Card>
            <div className="section-heading">
              <h3>출금 요청</h3>
              <p>설정에 등록한 계좌로 정산 출금을 요청할 수 있어요.</p>
            </div>
            <div className="auth-form" style={{ marginTop: 16 }}>
              <Input label="출금 금액" type="number" value={withdrawForm.amount} onChange={(event) => setWithdrawForm((prev) => ({ ...prev, amount: event.target.value }))} />
              <Input label="메모" value={withdrawForm.note} onChange={(event) => setWithdrawForm((prev) => ({ ...prev, note: event.target.value }))} />
              <Button block onClick={requestWithdrawal}>출금 요청</Button>
            </div>
          </Card>

          <Card>
            <h3>거래 내역</h3>
            {(finance?.transactions || []).map((item) => (
              <Card key={item._id} className="mini-card">
                <div className="section-heading">
                  <div>
                    <strong>{item.type}</strong>
                    <p>{item.description}</p>
                  </div>
                  <Badge tone="secondary">{formatCurrency(item.amount)}</Badge>
                </div>
              </Card>
            ))}
          </Card>
        </div>
      )}

      {tab === "settings" && (
        <Card>
          <div className="section-heading">
            <h3>가게 설정</h3>
            <Badge tone={storeInfo?.currentlyOpen ? "success" : "secondary"}>
              {storeInfo?.currentlyOpen ? "영업중" : "영업중지"}
            </Badge>
          </div>
          <div className="auth-form" style={{ marginTop: 16 }}>
            <Input label="가게명" value={settingsForm.name} onChange={(event) => setSettingsForm((prev) => ({ ...prev, name: event.target.value }))} />
            <Input label="가게 정보" value={settingsForm.description} onChange={(event) => setSettingsForm((prev) => ({ ...prev, description: event.target.value }))} />
            <Input label="전화번호" value={settingsForm.phone} onChange={(event) => setSettingsForm((prev) => ({ ...prev, phone: event.target.value }))} />
            <Input label="최소주문금액" type="number" value={settingsForm.minOrderAmount} onChange={(event) => setSettingsForm((prev) => ({ ...prev, minOrderAmount: event.target.value }))} />
            <Input label="배달비" type="number" value={settingsForm.deliveryFee} onChange={(event) => setSettingsForm((prev) => ({ ...prev, deliveryFee: event.target.value }))} />
            <Input label="은행명" value={settingsForm.bankName} onChange={(event) => setSettingsForm((prev) => ({ ...prev, bankName: event.target.value }))} />
            <Input label="계좌번호" value={settingsForm.accountNumber} onChange={(event) => setSettingsForm((prev) => ({ ...prev, accountNumber: event.target.value }))} />
            <Input label="예금주" value={settingsForm.accountHolder} onChange={(event) => setSettingsForm((prev) => ({ ...prev, accountHolder: event.target.value }))} />
            <div className="two-column-grid">
              <Input label="영업 시작" type="time" value={settingsForm.openTime} onChange={(event) => setSettingsForm((prev) => ({ ...prev, openTime: event.target.value }))} />
              <Input label="영업 종료" type="time" value={settingsForm.closeTime} onChange={(event) => setSettingsForm((prev) => ({ ...prev, closeTime: event.target.value }))} />
            </div>
            <div className="list-actions">
              <Button variant={storeInfo?.isOpen ? "secondary" : "primary"} onClick={toggleOpen}>
                {storeInfo?.isOpen ? "영업 OFF" : "영업 ON"}
              </Button>
              <Button variant={storeInfo?.autoAccept ? "primary" : "secondary"} onClick={async () => {
                await orderService.toggleStoreAutoAccept({ autoAccept: !storeInfo?.autoAccept });
                showToast(storeInfo?.autoAccept ? "자동수락을 껐습니다" : "자동수락을 켰습니다", "success");
                fetchStoreInfo();
              }}>
                자동수락 {storeInfo?.autoAccept ? "ON" : "OFF"}
              </Button>
            </div>
            <Button block onClick={saveSettings}>설정 저장</Button>
          </div>
        </Card>
      )}

      <BottomNavigation items={tabs} activeKey={tab} onChange={setTab} />
      <ToastViewport />
    </AppShell>
  );
}

export default StorePage;
