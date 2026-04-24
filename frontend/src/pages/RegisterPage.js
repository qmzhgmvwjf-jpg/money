import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../layouts/AuthLayout";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { authService } from "../services/authService";

function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    password: "",
    phone: "",
    role: "customer",
    storeName: "",
  });
  const [loading, setLoading] = useState(false);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const register = async () => {
    if (!form.username || !form.password || !form.phone) {
      alert("필수 항목을 입력하세요.");
      return;
    }

    if (form.role === "store" && !form.storeName) {
      alert("가게명을 입력하세요.");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        username: form.username,
        password: form.password,
        phone: form.phone,
        role: form.role,
      };

      if (form.role === "store") {
        payload.storeName = form.storeName;
      }

      const data = await authService.register(payload);
      alert(
        data.approved
          ? "회원가입이 완료되었습니다. 로그인해 주세요."
          : "회원가입이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다."
      );
      navigate("/");
    } catch (error) {
      alert(error.response?.data?.detail || "회원가입 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Card className="hero-card">
        <div className="auth-brand">
          <div className="auth-brand__logo">+</div>
          <h1>새 계정 만들기</h1>
          <p>고객, 가게, 기사 계정을 하나의 흐름으로 시작할 수 있습니다.</p>
        </div>

        <div className="auth-form">
          <Input
            label="아이디"
            placeholder="아이디"
            value={form.username}
            onChange={(event) => updateField("username", event.target.value)}
          />
          <Input
            label="비밀번호"
            type="password"
            placeholder="비밀번호"
            value={form.password}
            onChange={(event) => updateField("password", event.target.value)}
          />
          <Input
            label="전화번호"
            placeholder="010-0000-0000"
            value={form.phone}
            onChange={(event) => updateField("phone", event.target.value)}
          />
          <Input
            label="역할"
            as="select"
            value={form.role}
            onChange={(event) => updateField("role", event.target.value)}
          >
            <option value="customer">customer</option>
            <option value="store">store</option>
            <option value="driver">driver</option>
          </Input>
          {form.role === "store" && (
            <Input
              label="가게명"
              placeholder="가게명을 입력하세요"
              value={form.storeName}
              onChange={(event) => updateField("storeName", event.target.value)}
            />
          )}
          <Button block loading={loading} onClick={register}>
            회원가입 완료
          </Button>
          <Button block variant="secondary" onClick={() => navigate("/")}>
            로그인으로 돌아가기
          </Button>
        </div>
      </Card>
    </AuthLayout>
  );
}

export default RegisterPage;
