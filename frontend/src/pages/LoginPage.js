import React from "react";
import { useNavigate } from "react-router-dom";

function LoginPage() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: 20 }}>
      <h1>로그인 선택</h1>

      <button onClick={() => navigate("/admin")}>
        관리자
      </button>

      <button onClick={() => navigate("/rider")}>
        기사
      </button>
    </div>
  );
}

export default LoginPage;