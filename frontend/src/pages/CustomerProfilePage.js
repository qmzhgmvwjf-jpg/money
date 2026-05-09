import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../layouts/AppShell";
import Header from "../components/common/Header";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import BottomNavigation from "../components/navigation/BottomNavigation";

const navItems = [
  { key: "home", label: "홈", icon: "🏠" },
  { key: "cart", label: "장바구니", icon: "🛒" },
  { key: "orders", label: "주문내역", icon: "🧾" },
  { key: "profile", label: "마이", icon: "👤" },
];

function CustomerProfilePage() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState(localStorage.getItem("phone") || "");
  const [address, setAddress] = useState(localStorage.getItem("address") || "");

  return (
    <AppShell mobile>
      <Header
        title="마이페이지"
        subtitle="자주 쓰는 연락처와 주소를 저장해 두세요"
        actionLabel="로그아웃"
        onAction={() => {
          localStorage.clear();
          navigate("/");
        }}
      />

      <Card>
        <div className="section-heading">
          <h3>고객 정보</h3>
          <Badge tone="secondary">customer</Badge>
        </div>
        <div className="auth-form" style={{ marginTop: 16 }}>
          <Input label="전화번호" value={phone} onChange={(event) => setPhone(event.target.value)} />
          <Input label="주소" value={address} onChange={(event) => setAddress(event.target.value)} />
          <Button
            block
            onClick={() => {
              localStorage.setItem("phone", phone);
              localStorage.setItem("address", address);
            }}
          >
            저장하기
          </Button>
        </div>
      </Card>

      <BottomNavigation
        items={navItems}
        activeKey="profile"
        onChange={(key) => {
          if (key === "home") navigate("/customer");
          if (key === "cart") navigate("/customer/cart");
          if (key === "orders") navigate("/customer/orders");
          if (key === "profile") navigate("/customer/profile");
        }}
      />
    </AppShell>
  );
}

export default CustomerProfilePage;
