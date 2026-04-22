import React, { useState } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";
import "./login.css";

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const login = async () => {
    if (!username || !password) {
      alert("입력하세요");
      return;
    }

    try {
      setLoading(true);

      const res = await API.post("/login", {
        username,
        password
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role);
      localStorage.setItem("username", username);

      if (res.data.role === "admin") navigate("/admin");
      else if (res.data.role === "driver") navigate("/rider");
      else if (res.data.role === "customer") navigate("/customer");
      else if (res.data.role === "store") {
        localStorage.setItem("storeName", "김밥천국");
        navigate("/store");
      }

    } catch (err) {
      console.log(err);
      alert("로그인 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">

      {/* 🔥 배경 그라데이션 */}
      <div className="bg"></div>

      {/* 🔥 글로우 효과 */}
      <div className="glow"></div>

      {/* 🔥 카드 */}
      <div className="login-card">

        <div className="logo">🚀</div>

        <h1>Delivery OS</h1>
        <p className="subtitle">
          빠르고 정확한 배달 플랫폼
        </p>

        <div className="input-group">
          <input
            placeholder="아이디"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div className="input-group">
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          className="login-btn"
          onClick={login}
          disabled={loading}
        >
          {loading ? "접속 중..." : "로그인"}
        </button>

        <p className="footer">
          © 2026 Delivery Platform
        </p>

      </div>
    </div>
  );
}

export default LoginPage;