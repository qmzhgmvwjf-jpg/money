import React, { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../layouts/AppShell";
import Header from "../components/common/Header";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import BottomNavigation from "../components/navigation/BottomNavigation";
import { orderService } from "../services/orderService";
import { noticeService } from "../services/noticeService";
import { formatCurrency, formatDateTime } from "../utils/format";
import { usePolling } from "../hooks/usePolling";

const tabs = [
  { key: "orders", label: "주문", icon: "📦" },
  { key: "menus", label: "메뉴", icon: "🍽️" },
  { key: "messages", label: "메시지", icon: "💬" },
  { key: "stats", label: "통계", icon: "📈" },
];

const filters = [
  { value: "all", label: "전체" },
  { value: "in_progress", label: "진행중" },
  { value: "completed", label: "완료" },
  { value: "cancelled", label: "취소" },
];

function StorePage() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username");
  const [tab, setTab] = useState("orders");
  const [filter, setFilter] = useState("all");
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [storeInfo, setStoreInfo] = useState(null);
  const [notices, setNotices] = useState([]);
  const [menuForm, setMenuForm] = useState({ name: "", price: "" });
  const [timeForm, setTimeForm] = useState({ openTime: "09:00", closeTime: "21:00" });
  const [editingMenuId, setEditingMenuId] = useState(null);

  const logout = () => {
    localStorage.clear();
    navigate("/");
  };

  const fetchOrders = useCallback(async () => {
    const data = await orderService.getStoreOrders(filter);
    setOrders(data);
  }, [filter]);

  const fetchStats = useCallback(async () => {
    const data = await orderService.getStoreStats();
    setStats(data);
  }, []);

  const fetchStoreInfo = useCallback(async () => {
    const data = await orderService.getStoreMyInfo();
    setStoreInfo(data);
    setTimeForm({
      openTime: data.openTime || "09:00",
      closeTime: data.closeTime || "21:00",
    });
    localStorage.setItem("storeName", data.name || "");
    localStorage.setItem("storeId", data._id || "");
  }, []);

  const fetchNotices = useCallback(async () => {
    const data = await noticeService.getNotices();
    setNotices(data);
  }, []);

  usePolling(fetchOrders, 3000);
  usePolling(fetchStats, 5000);
  usePolling(fetchStoreInfo, 5000);
  usePolling(fetchNotices, 7000);

  const orderAction = async (type, id) => {
    if (type === "accept") await orderService.storeAccept(id);
    if (type === "reject") await orderService.storeReject(id);
    if (type === "dispatch") await orderService.requestDispatch(id);
    fetchOrders();
    fetchStats();
    fetchStoreInfo();
  };

  const saveTime = async () => {
    await orderService.setStoreTime(timeForm);
    fetchStoreInfo();
  };

  const toggleOpen = async (nextOpen) => {
    await orderService.toggleStoreOpen({ isOpen: nextOpen });
    fetchStoreInfo();
  };

  const toggleAutoAccept = async (nextAutoAccept) => {
    await orderService.toggleStoreAutoAccept({ autoAccept: nextAutoAccept });
    fetchStoreInfo();
  };

  const submitMenu = async () => {
    if (!storeInfo?._id) {
      alert("가게 정보를 불러오는 중입니다.");
      return;
    }
    if (!menuForm.name || !menuForm.price) {
      alert("메뉴명과 가격을 입력하세요.");
      return;
    }

    const payload = {
      store_id: storeInfo._id,
      name: menuForm.name,
      price: Number(menuForm.price),
    };

    if (editingMenuId) {
      await orderService.updateMenu(editingMenuId, {
        name: payload.name,
        price: payload.price,
      });
    } else {
      await orderService.createMenu(payload);
    }

    setMenuForm({ name: "", price: "" });
    setEditingMenuId(null);
    fetchStoreInfo();
  };

  const startEditMenu = (menu) => {
    setEditingMenuId(menu._id);
    setMenuForm({ name: menu.name, price: String(menu.price) });
    setTab("menus");
  };

  const removeMenu = async (menuId) => {
    if (!window.confirm("메뉴를 삭제할까요?")) return;
    await orderService.deleteMenu(menuId);
    fetchStoreInfo();
  };

  return (
    <AppShell mobile>
      <Header
        title={storeInfo?.name || "가게 운영"}
        subtitle="내 가게 정보, 영업 상태, 주문과 메뉴를 한 화면에서 관리합니다."
        actionLabel="로그아웃"
        onAction={logout}
      />

      <div className="dashboard-grid">
        <Card className="metric-card">
          <h3>{storeInfo?.currentOrderCount || 0}건</h3>
          <p>현재 진행 주문</p>
        </Card>
        <Card className="metric-card">
          <h3>{storeInfo?.currentlyOpen ? "영업중" : "주문불가"}</h3>
          <p>현재 영업 상태</p>
        </Card>
        <Card className="metric-card">
          <h3>{storeInfo?.autoAccept ? "ON" : "OFF"}</h3>
          <p>주문 자동 수락</p>
        </Card>
      </div>

      <Card>
        <div className="section-heading">
          <div>
            <h3>내 가게 정보</h3>
            <p>
              영업시간 {storeInfo?.openTime || "-"} - {storeInfo?.closeTime || "-"} ·
              승인 {storeInfo?.approved ? "완료" : "대기"}
            </p>
          </div>
          <div className="status-row">
            <Badge tone={storeInfo?.currentlyOpen ? "success" : "secondary"}>
              {storeInfo?.currentlyOpen ? "현재 주문 가능" : "영업 종료"}
            </Badge>
            <Badge tone={storeInfo?.isOpen ? "primary" : "secondary"}>
              {storeInfo?.isOpen ? "수동 영업 ON" : "일시 중지"}
            </Badge>
          </div>
        </div>
        <div className="list-actions" style={{ marginTop: 16 }}>
          <Button
            variant={storeInfo?.isOpen ? "secondary" : "primary"}
            onClick={() => toggleOpen(!storeInfo?.isOpen)}
          >
            {storeInfo?.isOpen ? "일시 영업중지" : "영업 재개"}
          </Button>
          <Button
            variant={storeInfo?.autoAccept ? "primary" : "secondary"}
            onClick={() => toggleAutoAccept(!storeInfo?.autoAccept)}
          >
            자동 수락 {storeInfo?.autoAccept ? "끄기" : "켜기"}
          </Button>
        </div>
        <div className="two-column-grid" style={{ marginTop: 16 }}>
          <Input
            label="오픈 시간"
            type="time"
            value={timeForm.openTime}
            onChange={(event) =>
              setTimeForm((prev) => ({ ...prev, openTime: event.target.value }))
            }
          />
          <Input
            label="마감 시간"
            type="time"
            value={timeForm.closeTime}
            onChange={(event) =>
              setTimeForm((prev) => ({ ...prev, closeTime: event.target.value }))
            }
          />
        </div>
        <div className="list-actions" style={{ marginTop: 16 }}>
          <Button onClick={saveTime}>영업시간 저장</Button>
        </div>
      </Card>

      {tab === "orders" && (
        <>
          <Card>
            <div className="chip-row">
              {filters.map((item) => (
                <Button
                  key={item.value}
                  variant={filter === item.value ? "primary" : "secondary"}
                  onClick={() => setFilter(item.value)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </Card>

          {orders.map((order) => (
            <Card key={order._id}>
              <div className="section-heading">
                <div>
                  <h3>{order.order_id}</h3>
                  <p>{formatDateTime(order.created_at)}</p>
                </div>
                <Badge status={order.status}>{order.status}</Badge>
              </div>
              <div className="two-column-grid" style={{ marginTop: 16 }}>
                <div>
                  <p><strong>고객명</strong> {order.customer_name || "-"}</p>
                  <p><strong>전화번호</strong> {order.phone || "-"}</p>
                  <p><strong>주소</strong> {order.address || "-"}</p>
                </div>
                <div>
                  <p><strong>총 금액</strong> {formatCurrency(order.total_price)}</p>
                  <p><strong>기사</strong> {order.driver_id || "-"}</p>
                </div>
              </div>
              <Card className="mini-card" style={{ marginTop: 16 }}>
                <strong>주문 메뉴</strong>
                {order.items?.map((item, index) => (
                  <div key={index}>
                    {item.name} - {formatCurrency(item.price)}
                  </div>
                ))}
              </Card>
              <div className="list-actions" style={{ marginTop: 16 }}>
                {order.status === "pending" && (
                  <>
                    <Button onClick={() => orderAction("accept", order._id)}>주문 수락</Button>
                    <Button variant="danger" onClick={() => orderAction("reject", order._id)}>
                      주문 거절
                    </Button>
                  </>
                )}
                {order.status === "accepted" && (
                  <Button onClick={() => orderAction("dispatch", order._id)}>배차 요청</Button>
                )}
              </div>
            </Card>
          ))}

          {orders.length === 0 && (
            <Card>
              <div className="empty-state">조건에 맞는 주문이 없습니다.</div>
            </Card>
          )}
        </>
      )}

      {tab === "menus" && (
        <div className="panel-list">
          <Card>
            <div className="section-heading">
              <div>
                <h3>메뉴 관리</h3>
                <p>내 가게에 귀속된 메뉴만 등록하고 수정할 수 있습니다.</p>
              </div>
            </div>
            <div className="two-column-grid" style={{ marginTop: 16 }}>
              <Input
                label="메뉴명"
                value={menuForm.name}
                onChange={(event) =>
                  setMenuForm((prev) => ({ ...prev, name: event.target.value }))
                }
              />
              <Input
                label="가격"
                type="number"
                value={menuForm.price}
                onChange={(event) =>
                  setMenuForm((prev) => ({ ...prev, price: event.target.value }))
                }
              />
            </div>
            <div className="list-actions" style={{ marginTop: 16 }}>
              <Button onClick={submitMenu}>{editingMenuId ? "메뉴 수정" : "메뉴 추가"}</Button>
              {editingMenuId && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditingMenuId(null);
                    setMenuForm({ name: "", price: "" });
                  }}
                >
                  수정 취소
                </Button>
              )}
            </div>
          </Card>

          {(storeInfo?.menus || []).map((menu) => (
            <Card key={menu._id} className="menu-item">
              <div className="menu-item__meta">
                <div>
                  <strong>{menu.name}</strong>
                  <div>{formatCurrency(menu.price)}</div>
                </div>
                <Badge tone="secondary">{storeInfo?.name}</Badge>
              </div>
              <div className="list-actions">
                <Button variant="secondary" onClick={() => startEditMenu(menu)}>
                  수정
                </Button>
                <Button variant="danger" onClick={() => removeMenu(menu._id)}>
                  삭제
                </Button>
              </div>
            </Card>
          ))}

          {storeInfo && (storeInfo.menus || []).length === 0 && (
            <Card>
              <div className="empty-state">등록된 메뉴가 없습니다.</div>
            </Card>
          )}
        </div>
      )}

      {tab === "messages" && (
        <Card>
          <h3>메시지함</h3>
          {notices.map((notice) => {
            const isRead = notice.read_by?.includes(username);
            return (
              <Card key={notice._id} className="mini-card">
                <div className="section-heading">
                  <div>
                    <strong>{notice.title}</strong>
                    <p>{notice.content}</p>
                  </div>
                  <Badge tone={isRead ? "secondary" : "primary"}>
                    {isRead ? "읽음" : "새 공지"}
                  </Badge>
                </div>
                {!isRead && (
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      await noticeService.readNotice(notice._id);
                      fetchNotices();
                    }}
                  >
                    읽음 처리
                  </Button>
                )}
              </Card>
            );
          })}
        </Card>
      )}

      {tab === "stats" && (
        <>
          <div className="dashboard-grid">
            <Card className="metric-card">
              <h3>{formatCurrency(stats?.todaySales || 0)}</h3>
              <p>오늘 매출</p>
            </Card>
            <Card className="metric-card">
              <h3>{formatCurrency(stats?.totalSales || 0)}</h3>
              <p>누적 매출</p>
            </Card>
            <Card className="metric-card">
              <h3>{stats?.totalOrders || 0}건</h3>
              <p>전체 주문</p>
            </Card>
            <Card className="metric-card">
              <h3>{stats?.cancelledOrders || 0}건</h3>
              <p>취소 주문</p>
            </Card>
          </div>

          <Card>
            <h3>최근 주문 흐름</h3>
            {stats?.orders?.map((order) => (
              <Card key={order._id} className="mini-card">
                {order.order_id} · {order.customer_name} · {formatCurrency(order.total_price)} · {order.status}
              </Card>
            ))}
          </Card>
        </>
      )}

      <BottomNavigation items={tabs} activeKey={tab} onChange={setTab} />
    </AppShell>
  );
}

export default StorePage;
