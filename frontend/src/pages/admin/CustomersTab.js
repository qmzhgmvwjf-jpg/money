import React, { useEffect, useState } from "react";
import API from "../../api";

function CustomersTab() {
  const [customers, setCustomers] = useState([]);
  const [expandedCustomerId, setExpandedCustomerId] = useState(null);

  const fetchCustomers = async () => {
    const res = await API.get("/customers");
    setCustomers(res.data);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  return (
    <>
      <h3>👤 고객 관리</h3>

      {customers.map((customer) => (
        <div key={customer._id} className="card">
          <div className="admin-row">
            <div>
              <b>{customer.username}</b>
              <p>전화번호: {customer.phone || "-"}</p>
              <p>주소: {customer.address || "-"}</p>
              <p>주문 수: {customer.orderCount || 0}</p>
            </div>
            <button
              onClick={() =>
                setExpandedCustomerId(
                  expandedCustomerId === customer._id ? null : customer._id
                )
              }
            >
              주문 내역
            </button>
          </div>

          {expandedCustomerId === customer._id && (
            <div>
              <h4>고객 주문 내역</h4>
              {customer.orders?.length > 0 ? (
                customer.orders.map((order) => (
                  <div key={order._id} className="mini-card">
                    {order.store} - {order.status} - {order.address || "-"}
                  </div>
                ))
              ) : (
                <p>주문 내역 없음</p>
              )}
            </div>
          )}
        </div>
      ))}
    </>
  );
}

export default CustomersTab;
