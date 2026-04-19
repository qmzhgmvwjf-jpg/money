import React, { useState, useEffect } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (token) {
      if (role === "admin") navigate("/admin");
      else navigate("/rider");
    }
  }, [navigate]); // ⭐ 이거 반드시 있어야 함

  const login = async () => {
    try {
      const res = await API.post("/login", {
        username,
        password
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role);

      if (res.data.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/rider");
      }

    } catch (err) {
      alert("로그인 실패");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>로그인</h1>

      <input
        placeholder="아이디"
        onChange={(e) => setUsername(e.target.value)}
      />

      <input
        type="password"
        placeholder="비밀번호"
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={login}>로그인</button>
    </div>
  );
}

export default LoginPage;