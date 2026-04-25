import React, { useCallback, useMemo, useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Badge from "../../components/ui/Badge";
import { adminService } from "../../services/adminService";
import { orderService } from "../../services/orderService";
import { formatCurrency, formatDateTime } from "../../utils/format";
import { usePolling } from "../../hooks/usePolling";

function StoresTab() {
  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [form, setForm] = useState({
    username: "",
    password: "",
    phone: "",
    name: "",
    openTime: "09:00",
    closeTime: "21:00",
  });
  const [menuForm, setMenuForm] = useState({
    name: "",
    price: "",
  });
  const [editingMenuId, setEditingMenuId] = useState(null);

  const fetchStores = useCallback(async () => {
    const data = await adminService.getStores();
    setStores(data);
    if (!selectedStoreId && data[0]?._id) {
      setSelectedStoreId(data[0]._id);
    }
  }, [selectedStoreId]);

  usePolling(fetchStores, 5000);

  const selectedStore = useMemo(
    () => stores.find((store) => store._id === selectedStoreId) || null,
    [stores, selectedStoreId]
  );

  const createStore = async () => {
    if (!form.username || !form.password || !form.phone || !form.name) {
      alert("가게 정보를 모두 입력하세요.");
      return;
    }
    const created = await adminService.createStore(form);
    setForm({
      username: "",
      password: "",
      phone: "",
      name: "",
      openTime: "09:00",
      closeTime: "21:00",
    });
    setSelectedStoreId(created._id);
    fetchStores();
  };

  const updateStoreFlags = async (store, payload) => {
    await adminService.updateStore(store._id, payload);
    fetchStores();
  };

  const deleteStore = async (id) => {
    if (!window.confirm("가게와 소속 메뉴를 삭제할까요?")) return;
    await adminService.deleteStore(id);
    if (selectedStoreId === id) {
      setSelectedStoreId("");
      setEditingMenuId(null);
      setMenuForm({ name: "", price: "" });
    }
    fetchStores();
  };

  const submitMenu = async () => {
    if (!selectedStore?._id) {
      alert("메뉴를 관리할 가게를 먼저 선택하세요.");
      return;
    }
    if (!menuForm.name || !menuForm.price) {
      alert("메뉴명과 가격을 입력하세요.");
      return;
    }

    if (editingMenuId) {
      await orderService.updateMenu(editingMenuId, {
        name: menuForm.name,
        price: Number(menuForm.price),
      });
    } else {
      await orderService.createMenu({
        store_id: selectedStore._id,
        name: menuForm.name,
        price: Number(menuForm.price),
      });
    }

    setEditingMenuId(null);
    setMenuForm({ name: "", price: "" });
    fetchStores();
  };

  const startEditMenu = (menu) => {
    setSelectedStoreId(menu.store_id);
    setEditingMenuId(menu._id);
    setMenuForm({
      name: menu.name,
      price: String(menu.price),
    });
  };

  const removeMenu = async (menuId) => {
    if (!window.confirm("메뉴를 삭제할까요?")) return;
    await orderService.deleteMenu(menuId);
    fetchStores();
  };

  return (
    <div className="page-stack">
      <Card>
        <div className="section-heading">
          <div>
            <h3>가맹점 등록</h3>
            <p>가게 계정과 `stores` 컬렉션 문서를 함께 생성합니다.</p>
          </div>
        </div>
        <div className="two-column-grid" style={{ marginTop: 16 }}>
          <Input
            label="계정 아이디"
            value={form.username}
            onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
          />
          <Input
            label="가게명"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          />
          <Input
            label="비밀번호"
            type="password"
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
          />
          <Input
            label="전화번호"
            value={form.phone}
            onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
          />
          <Input
            label="오픈 시간"
            type="time"
            value={form.openTime}
            onChange={(event) => setForm((prev) => ({ ...prev, openTime: event.target.value }))}
          />
          <Input
            label="마감 시간"
            type="time"
            value={form.closeTime}
            onChange={(event) => setForm((prev) => ({ ...prev, closeTime: event.target.value }))}
          />
        </div>
        <div className="list-actions" style={{ marginTop: 16 }}>
          <Button onClick={createStore}>가게 등록</Button>
        </div>
      </Card>

      <Card>
        <div className="section-heading">
          <div>
            <h3>메뉴 관리</h3>
            <p>특정 가게를 선택한 뒤 해당 가게 메뉴만 수정할 수 있습니다.</p>
          </div>
          <Badge tone="secondary">{selectedStore ? selectedStore.name : "가게 선택 필요"}</Badge>
        </div>
        <Input
          label="가게 선택"
          as="select"
          value={selectedStoreId}
          onChange={(event) => {
            setSelectedStoreId(event.target.value);
            setEditingMenuId(null);
            setMenuForm({ name: "", price: "" });
          }}
          style={{ marginTop: 16 }}
        >
          <option value="">가게를 선택하세요</option>
          {stores.map((store) => (
            <option key={store._id} value={store._id}>
              {store.name}
            </option>
          ))}
        </Input>
        <div className="two-column-grid" style={{ marginTop: 16 }}>
          <Input
            label="메뉴명"
            value={menuForm.name}
            onChange={(event) => setMenuForm((prev) => ({ ...prev, name: event.target.value }))}
          />
          <Input
            label="가격"
            type="number"
            value={menuForm.price}
            onChange={(event) => setMenuForm((prev) => ({ ...prev, price: event.target.value }))}
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

      {stores.map((store) => (
        <Card key={store._id}>
          <div className="section-heading">
            <div>
              <h3>{store.name}</h3>
              <p>
                {store.owner} · {store.ownerPhone || "-"} · {store.openTime} - {store.closeTime}
              </p>
            </div>
            <div className="status-row">
              <Badge tone={store.approved ? "success" : "secondary"}>
                {store.approved ? "승인됨" : "승인대기"}
              </Badge>
              <Badge tone={store.isOpen ? "primary" : "secondary"}>
                {store.isOpen ? "영업 ON" : "영업 OFF"}
              </Badge>
              <Badge tone={store.currentlyOpen ? "success" : "secondary"}>
                {store.currentlyOpen ? "현재 주문 가능" : "영업 종료"}
              </Badge>
            </div>
          </div>

          <div className="dashboard-grid" style={{ marginTop: 16 }}>
            <Card className="mini-card metric-card">
              <h3>{formatCurrency(store.sales)}</h3>
              <p>누적 매출</p>
            </Card>
            <Card className="mini-card metric-card">
              <h3>{store.orderCount || 0}건</h3>
              <p>전체 주문</p>
            </Card>
            <Card className="mini-card metric-card">
              <h3>{store.menus?.length || 0}개</h3>
              <p>메뉴 수</p>
            </Card>
          </div>

          <div className="list-actions" style={{ marginTop: 16 }}>
            <Button
              variant={store.approved ? "secondary" : "primary"}
              onClick={() => updateStoreFlags(store, { approved: !store.approved })}
            >
              {store.approved ? "승인 해제" : "승인"}
            </Button>
            <Button
              variant={store.isOpen ? "secondary" : "primary"}
              onClick={() => updateStoreFlags(store, { isOpen: !store.isOpen })}
            >
              {store.isOpen ? "영업 중지" : "영업 재개"}
            </Button>
            <Button
              variant={store.autoAccept ? "primary" : "secondary"}
              onClick={() => updateStoreFlags(store, { autoAccept: !store.autoAccept })}
            >
              자동수락 {store.autoAccept ? "끄기" : "켜기"}
            </Button>
            <Button variant="secondary" onClick={() => setSelectedStoreId(store._id)}>
              메뉴 선택
            </Button>
            <Button variant="danger" onClick={() => deleteStore(store._id)}>
              삭제
            </Button>
          </div>

          <div className="two-column-grid" style={{ marginTop: 16 }}>
            <Card className="mini-card">
              <strong>메뉴 목록</strong>
              {(store.menus || []).map((menu) => (
                <div
                  key={menu._id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    marginTop: 12,
                    alignItems: "center",
                  }}
                >
                  <span>
                    {menu.name} - {formatCurrency(menu.price)}
                  </span>
                  <span className="status-row">
                    <Button variant="secondary" onClick={() => startEditMenu(menu)}>
                      수정
                    </Button>
                    <Button variant="danger" onClick={() => removeMenu(menu._id)}>
                      삭제
                    </Button>
                  </span>
                </div>
              ))}
              {(store.menus || []).length === 0 && <div className="empty-state">등록된 메뉴가 없습니다.</div>}
            </Card>
            <Card className="mini-card">
              <strong>최근 주문 내역</strong>
              {(store.orders || []).slice(0, 5).map((order) => (
                <div key={order._id} style={{ marginTop: 12 }}>
                  {order.order_id} · {formatDateTime(order.created_at)} · {formatCurrency(order.total_price)}
                </div>
              ))}
              {(store.orders || []).length === 0 && <div className="empty-state">주문 내역이 없습니다.</div>}
            </Card>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default StoresTab;
