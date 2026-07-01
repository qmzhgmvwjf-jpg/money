import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../layouts/AppShell";
import Header from "../components/common/Header";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import LoadingState from "../components/ui/LoadingState";
import OrdersTab from "./admin/OrdersTab";
import StoresTab from "./admin/StoresTab";
import DriversTab from "./admin/DriversTab";
import CustomersTab from "./admin/CustomersTab";
import NoticesTab from "./admin/NoticesTab";
import RolesTab from "./admin/RolesTab";
import FinanceTab from "./admin/FinanceTab";
import EventsTab from "./admin/EventsTab";
import { adminService } from "../services/adminService";

const tabs = [
  { key: "orders", label: "주문 모니터링" },
  { key: "stores", label: "가맹점 관리" },
  { key: "drivers", label: "기사 관리" },
  { key: "customers", label: "고객 관리" },
  { key: "finance", label: "돈 관리" },
  { key: "events", label: "이벤트 관리" },
  { key: "notices", label: "공지사항" },
  { key: "roles", label: "권한 관리" },
];

function AdminPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("orders");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const data = await adminService.getStats();
      setStats(data);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (localStorage.getItem("role") !== "admin") {
      navigate("/");
      return;
    }
    fetchStats();
  }, [navigate, fetchStats]);

  const logout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <AppShell>
      <Header
        title="배달 관제센터"
        subtitle="접수부터 배차, 진행, 완료까지 실시간으로 운영 상태를 통합 관리합니다."
        actionLabel="로그아웃"
        onAction={logout}
      />

      {loading ? (
        <Card>
          <LoadingState label="운영 현황을 불러오는 중입니다" />
        </Card>
      ) : (
        <div className="dashboard-grid">
          <Card className="metric-card metric-card--primary">
            <h3>{stats?.todayOrders ?? 0}건</h3>
            <p>오늘 총 주문</p>
          </Card>
          <Card className="metric-card">
            <h3>{(stats?.dispatchReadyOrders ?? 0).toLocaleString()}건</h3>
            <p>배차 대기</p>
          </Card>
          <Card className="metric-card">
            <h3>{(stats?.deliveringOrders ?? 0).toLocaleString()}건</h3>
            <p>현재 배달중</p>
          </Card>
          <Card className="metric-card">
            <h3>{(stats?.onlineDrivers ?? 0).toLocaleString()}명</h3>
            <p>온라인 기사 수</p>
          </Card>
          <Card className="metric-card">
            <h3>{(stats?.todayDeliveryFeeRevenue ?? 0).toLocaleString()}원</h3>
            <p>오늘 배달료 수익</p>
          </Card>
        </div>
      )}

      <Card>
        <div className="admin-tab-grid">
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? "primary" : "secondary"}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </Card>

      {activeTab === "orders" && <OrdersTab />}
      {activeTab === "stores" && <StoresTab />}
      {activeTab === "drivers" && <DriversTab />}
      {activeTab === "customers" && <CustomersTab />}
      {activeTab === "finance" && <FinanceTab />}
      {activeTab === "events" && <EventsTab />}
      {activeTab === "notices" && <NoticesTab />}
      {activeTab === "roles" && <RolesTab />}
    </AppShell>
  );
}

export default AdminPage;
