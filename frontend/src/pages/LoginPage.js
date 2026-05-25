import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../layouts/AuthLayout";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { authService } from "../services/authService";
import { useToast } from "../hooks/useToast";

function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { showToast, ToastViewport } = useToast();

  const login = async () => {
    if (!username || !password) {
      showToast("아이디와 비밀번호를 입력하세요", "danger");
      return;
    }

    try {
      setLoading(true);
      const data = await authService.login({ username, password });

      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("username", data.username || username);

      if (data.phone) localStorage.setItem("phone", data.phone);
      if (data.address) localStorage.setItem("address", data.address);
      if (data.storeName) localStorage.setItem("storeName", data.storeName);
      if (data.storeId) localStorage.setItem("storeId", data.storeId);
      if (data.onlineStatus) localStorage.setItem("onlineStatus", data.onlineStatus);
      if (typeof data.dispatchEnabled !== "undefined") {
        localStorage.setItem("dispatchEnabled", String(data.dispatchEnabled));
      }
      if (typeof data.balance !== "undefined") {
        localStorage.setItem("balance", String(data.balance));
      }

      if (data.role === "admin") navigate("/admin");
      else if (data.role === "driver") navigate("/rider");
      else if (data.role === "store") navigate("/store");
      else navigate("/customer");
    } catch (error) {
      showToast(error.response?.data?.detail || "로그인 실패", "danger");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Card className="hero-card">
        <div className="auth-brand">
          <div className="auth-brand__logo">D</div>
          <h1>Delivery OS</h1>
          <p>배달 운영과 주문 경험을 하나의 흐름으로 연결하는 프리미엄 플랫폼</p>
        </div>

        <div className="auth-form">
          <Input
            label="아이디"
            placeholder="아이디를 입력하세요"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
          <Input
            label="비밀번호"
            type="password"
            placeholder="비밀번호를 입력하세요"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Button block loading={loading} onClick={login}>
            로그인
          </Button>
          <Button block variant="secondary" onClick={() => navigate("/register")}>
            회원가입
          </Button>
        </div>
      </Card>
      <ToastViewport />
    </AuthLayout>
  );
}

export default LoginPage;
