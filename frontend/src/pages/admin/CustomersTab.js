import React, { useCallback, useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { adminService } from "../../services/adminService";
import { formatCurrency } from "../../utils/format";
import { usePolling } from "../../hooks/usePolling";

function CustomersTab() {
  const [customers, setCustomers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ phone: "", address: "" });

  const fetchCustomers = useCallback(async () => {
    const data = await adminService.getCustomers();
    setCustomers(data);
  }, []);

  usePolling(fetchCustomers, 5000);

  const startEdit = (customer) => {
    setEditingId(customer._id);
    setEditForm({
      phone: customer.phone || "",
      address: customer.address || "",
    });
  };

  const save = async () => {
    await adminService.updateCustomer(editingId, editForm);
    setEditingId(null);
    fetchCustomers();
  };

  return (
    <div className="page-stack">
      {customers.map((customer) => (
        <Card key={customer._id}>
          <div className="section-heading">
            <div>
              <h3>{customer.username}</h3>
              <p>{customer.phone || "-"} · {customer.address || "주소 없음"}</p>
            </div>
            <div>
              <strong>{formatCurrency(customer.totalSpent)}</strong>
            </div>
          </div>

          {editingId === customer._id ? (
            <div className="auth-form" style={{ marginTop: 16 }}>
              <Input label="전화번호" value={editForm.phone} onChange={(event) => setEditForm((prev) => ({ ...prev, phone: event.target.value }))} />
              <Input label="주소" value={editForm.address} onChange={(event) => setEditForm((prev) => ({ ...prev, address: event.target.value }))} />
              <div className="list-actions">
                <Button onClick={save}>저장</Button>
                <Button variant="secondary" onClick={() => setEditingId(null)}>
                  취소
                </Button>
              </div>
            </div>
          ) : (
            <div className="list-actions" style={{ marginTop: 16 }}>
              <Button variant="secondary" onClick={() => startEdit(customer)}>
                정보 수정
              </Button>
            </div>
          )}

          <Card className="mini-card" style={{ marginTop: 16 }}>
            <strong>주문 내역</strong>
            {customer.orders?.map((order) => (
              <div key={order._id}>
                {order.order_id} · {order.store} · {formatCurrency(order.total_price)} · {order.status}
              </div>
            ))}
          </Card>
        </Card>
      ))}
    </div>
  );
}

export default CustomersTab;
