import React, { useEffect, useState } from "react";
import API from "../../api";

function CustomersTab() {
  const [customers, setCustomers] = useState([]);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const fetchCustomers = async () => {
    const res = await API.get("/customers");
    setCustomers(res.data);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const updateCustomer = async () => {
    await API.put(`/customers/${editingCustomer._id}`, {
      phone: editingCustomer.phone,
      address: editingCustomer.address,
    });
    setEditingCustomer(null);
    fetchCustomers();
  };

  return (
    <>
      <h3>👤 고객 관리</h3>

      {customers.map((customer) => (
        <div key={customer._id} className="card">
          {editingCustomer?._id === customer._id ? (
            <>
              <input
                value={editingCustomer.phone || ""}
                onChange={(e) =>
                  setEditingCustomer({ ...editingCustomer, phone: e.target.value })
                }
              />
              <input
                value={editingCustomer.address || ""}
                onChange={(e) =>
                  setEditingCustomer({ ...editingCustomer, address: e.target.value })
                }
              />
              <button onClick={updateCustomer}>저장</button>
              <button onClick={() => setEditingCustomer(null)}>취소</button>
            </>
          ) : (
            <>
              <div className="admin-grid">
                <div>
                  <p><b>{customer.username}</b></p>
                  <p>전화번호: {customer.phone || "-"}</p>
                  <p>주소: {customer.address || "-"}</p>
                </div>
                <div>
                  <p>주문 수: {customer.orderCount}건</p>
                  <p>누적 결제: {customer.totalSpent?.toLocaleString()}원</p>
                  <button onClick={() => setEditingCustomer(customer)}>정보 수정</button>
                </div>
              </div>

              <h4>주문 내역</h4>
              {customer.orders?.length > 0 ? (
                customer.orders.map((order) => (
                  <div key={order._id} className="mini-card">
                    <p>{order.order_id}</p>
                    <p>{order.store} / {order.status}</p>
                    <p>{order.total_price?.toLocaleString()}원</p>
                    <p>{order.address || "-"}</p>
                  </div>
                ))
              ) : (
                <p>주문 내역 없음</p>
              )}
            </>
          )}
        </div>
      ))}
    </>
  );
}

export default CustomersTab;
