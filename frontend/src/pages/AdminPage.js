import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import OrdersTab from "./admin/OrdersTab";
import StoresTab from "./admin/StoresTab";
import DriversTab from "./admin/DriversTab";
import CustomersTab from "./admin/CustomersTab";
import NoticesTab from "./admin/NoticesTab";
import RolesTab from "./admin/RolesTab";

const tabs = [
  { key: "orders", label: "주문 모니터링" },
  { key: "stores", label: "가맹점 관리" },
  { key: "drivers", label: "배달기사 관리" },
  { key: "customers", label: "고객 관리" },
  { key: "notices", label: "공지사항" },
  { key: "roles", label: "권한 관리" },
];

function AdminPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("orders");

  const logout = useCallback(() => {
    localStorage.clear();
    navigate("/");
  }, [navigate]);

  useEffect(() => {
    const role = localStorage.getItem("role");

    if (role !== "admin") {
      navigate("/");
    }
  }, [navigate]);

  return (
    <div className="container admin-container">
      <div className="header">
        <h2>🧑‍💼 관리자 시스템</h2>
        <button onClick={logout}>로그아웃</button>
      </div>

      <div className="admin-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={activeTab === tab.key ? "primary" : ""}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "orders" && <OrdersTab />}
      {activeTab === "stores" && <StoresTab />}
      {activeTab === "drivers" && <DriversTab />}
      {activeTab === "customers" && <CustomersTab />}
      {activeTab === "notices" && <NoticesTab />}
      {activeTab === "roles" && <RolesTab />}
    </div>
  );
}

export default AdminPage;
