import React, { useState, useEffect } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  // 🔐 이미 로그인 되어 있으면 자동 이동
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (token) {
      if (role === "admin") navigate("/admin");
      else navigate("/rider");
    }
  }, [navigate]);

  // 🔐 로그인 함수
  const login = async () => {
    // ⭐ 입력값 체크 (400 방지)
    if (!username || !password) {
      alert("아이디와 비밀번호 입력하세요");
      return;
    }

    try {
      const res = await API.post("/login", {
        username,
        password
      });

      // 토큰 저장
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role);

      // 역할에 따라 이동
      if (res.data.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/rider");
      }

    } catch (err) {
      console.log(err.response);
      alert(err.response?.data?.detail || "로그인 실패");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>로그인</h1>

      <div style={{ marginBottom: 10 }}>
        <input
          placeholder="아이디"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <button onClick={login}>로그인</button>
    </div>
  );
}

export default LoginPage;