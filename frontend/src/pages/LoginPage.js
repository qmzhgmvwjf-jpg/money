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

      if (res.data.role === "admin") navigate("/admin");
      else navigate("/rider");

    } catch {
      alert("로그인 실패");
    }
  };

  return (
    <div className="container">
      <h2>🚚 배달 서비스</h2>

      <div className="card">
        <input placeholder="아이디" onChange={(e)=>setUsername(e.target.value)} />
        <input type="password" placeholder="비밀번호" onChange={(e)=>setPassword(e.target.value)} />
        <button className="btn-primary" onClick={login}>로그인</button>
      </div>
    </div>
  );
}

export default LoginPage;