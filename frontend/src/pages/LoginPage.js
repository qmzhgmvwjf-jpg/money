import React, { useState } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const login = async () => {
    if (!username || !password) {
      alert("입력하세요");
      return;
    }

    try {
      const res = await API.post("/login", {
        username,
        password
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role);
      localStorage.setItem("username", username);

      // 🔥 역할 분기
      if (res.data.role === "admin") {
        navigate("/admin");
      } else if (res.data.role === "driver") {
        navigate("/rider");
      } else if (res.data.role === "customer") {
        navigate("/customer");
      } else if (res.data.role === "store") {
        // 🔥 가게 이름 저장 (지금은 고정)
        localStorage.setItem("storeName", "김밥천국");
        navigate("/store");
      }

    } catch (err) {
      console.log(err);
      alert("로그인 실패");
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>🚚 Delivery App</h2>

        <input
          placeholder="아이디"
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          type="password"
          placeholder="비밀번호"
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="login-btn" onClick={login}>
          로그인
        </button>
      </div>
    </div>
  );
}

export default LoginPage;