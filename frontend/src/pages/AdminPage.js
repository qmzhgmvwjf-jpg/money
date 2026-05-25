import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../layouts/AppShell";
import Header from "../components/common/Header";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import LoadingState from "../components/ui/LoadingState";
import OrdersTab from "./admin/OrdersTab";
import StoresTab from "./admin/StoresTab";
import DriversTab from "./admin/DriversTab";
import CustomersTab from "./admin/CustomersTab";
import NoticesTab from "./admin/NoticesTab";
import RolesTab from "./admin/RolesTab";
import FinanceTab from "./admin/FinanceTab";
import { adminService } from "../services/adminService";

const tabs = [
  { key: "orders", label: "주문 모니터링" },
  { key: "stores", label: "가맹점 관리" },
  { key: "drivers", label: "기사 관리" },
  { key: "customers", label: "고객 관리" },
  { key: "finance", label: "돈 관리" },
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
        title="운영 대시보드"
        subtitle="주문, 가게, 기사, 고객 운영 현황을 한 화면에서 관리합니다."
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
            <h3>{stats?.totalOrders ?? 0}건</h3>
            <p>누적 주문</p>
          </Card>
          <Card className="metric-card">
            <h3>{(stats?.todayOrders ?? 0).toLocaleString()}건</h3>
            <p>오늘 주문</p>
          </Card>
          <Card className="metric-card">
            <h3>{(stats?.totalSales ?? 0).toLocaleString()}원</h3>
            <p>누적 매출</p>
          </Card>
          <Card className="metric-card">
            <div className="section-heading">
              <h3>실시간 운영</h3>
              <Badge tone="success">Live</Badge>
            </div>
            <p>중요한 승인과 상태 변경은 각 탭에서 처리합니다.</p>
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
      {activeTab === "notices" && <NoticesTab />}
      {activeTab === "roles" && <RolesTab />}
    </AppShell>
  );
}

export default AdminPage;
