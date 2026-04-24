import React, { useCallback, useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Badge from "../../components/ui/Badge";
import { adminService } from "../../services/adminService";
import { formatCurrency, formatDateTime } from "../../utils/format";
import { usePolling } from "../../hooks/usePolling";

function StoresTab() {
  const [stores, setStores] = useState([]);
  const [form, setForm] = useState({
    username: "",
    password: "",
    phone: "",
    storeName: "",
  });

  const fetchStores = useCallback(async () => {
    const data = await adminService.getStores();
    setStores(data);
  }, []);

  usePolling(fetchStores, 5000);

  const createStore = async () => {
    if (!form.username || !form.password || !form.phone || !form.storeName) {
      alert("가게 정보를 모두 입력하세요.");
      return;
    }
    await adminService.createStore({ ...form, storeStatus: "open" });
    setForm({ username: "", password: "", phone: "", storeName: "" });
    fetchStores();
  };

  const toggleStoreStatus = async (store) => {
    const nextStatus = store.storeStatus === "open" ? "closed" : "open";
    await adminService.updateStore(store._id, { storeStatus: nextStatus });
    fetchStores();
  };

  const deleteStore = async (id) => {
    if (!window.confirm("가게를 삭제할까요?")) return;
    await adminService.deleteStore(id);
    fetchStores();
  };

  return (
    <div className="page-stack">
      <Card>
        <div className="section-heading">
          <div>
            <h3>가맹점 등록</h3>
            <p>운영 중인 신규 가맹점을 즉시 개설합니다.</p>
          </div>
        </div>
        <div className="two-column-grid" style={{ marginTop: 16 }}>
          <Input label="계정 아이디" value={form.username} onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))} />
          <Input label="가게명" value={form.storeName} onChange={(event) => setForm((prev) => ({ ...prev, storeName: event.target.value }))} />
          <Input label="비밀번호" type="password" value={form.password} onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))} />
          <Input label="전화번호" value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} />
        </div>
        <div className="list-actions" style={{ marginTop: 16 }}>
          <Button onClick={createStore}>가게 등록</Button>
        </div>
      </Card>

      {stores.map((store) => (
        <Card key={store._id}>
          <div className="section-heading">
            <div>
              <h3>{store.storeName}</h3>
              <p>{store.username} · {store.phone}</p>
            </div>
            <div className="status-row">
              <Badge status={store.storeStatus}>{store.storeStatus === "open" ? "영업중" : "중지"}</Badge>
              <Badge tone="secondary">주문 {store.orderCount}건</Badge>
            </div>
          </div>

          <div className="dashboard-grid" style={{ marginTop: 16 }}>
            <Card className="mini-card metric-card">
              <h3>{formatCurrency(store.sales)}</h3>
              <p>누적 매출</p>
            </Card>
            <Card className="mini-card metric-card">
              <h3>{store.orders?.length || 0}건</h3>
              <p>누적 주문</p>
            </Card>
          </div>

          <div className="list-actions" style={{ marginTop: 16 }}>
            <Button variant="secondary" onClick={() => toggleStoreStatus(store)}>
              {store.storeStatus === "open" ? "영업 중지" : "영업 재개"}
            </Button>
            <Button variant="danger" onClick={() => deleteStore(store._id)}>
              삭제
            </Button>
          </div>

          <div className="two-column-grid" style={{ marginTop: 16 }}>
            <Card className="mini-card">
              <strong>메뉴 목록</strong>
              {store.menus?.map((menu) => (
                <div key={menu._id}>{menu.name} - {formatCurrency(menu.price)}</div>
              ))}
            </Card>
            <Card className="mini-card">
              <strong>최근 주문 내역</strong>
              {store.orders?.slice(0, 5).map((order) => (
                <div key={order._id}>
                  {order.order_id} · {formatDateTime(order.created_at)} · {formatCurrency(order.total_price)}
                </div>
              ))}
            </Card>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default StoresTab;
