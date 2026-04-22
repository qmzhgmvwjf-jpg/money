import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";

function RegisterPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("customer");
  const [storeName, setStoreName] = useState("");
  const [loading, setLoading] = useState(false);

  const register = async () => {
    if (!username || !password || !phone) {
      alert("필수 항목을 입력하세요.");
      return;
    }

    if (role === "store" && !storeName) {
      alert("가게명을 입력하세요.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        username,
        password,
        phone,
        role,
      };

      if (role === "store") {
        payload.storeName = storeName;
      }

      const res = await API.post("/register", payload);

      if (res.data.approved) {
        alert("회원가입이 완료되었습니다. 로그인해주세요.");
      } else {
        alert("회원가입이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다.");
      }

      navigate("/");
    } catch (err) {
      alert(err.response?.data?.detail || "회원가입 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 40 }}>
      <div className="header">
        <h2>📝 회원가입</h2>
        <button onClick={() => navigate("/")}>로그인으로</button>
      </div>

      <div className="card">
        <p>배달 서비스 계정을 생성하세요.</p>

        <input
          className="full-input"
          placeholder="아이디"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          className="full-input"
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <input
          className="full-input"
          placeholder="전화번호"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <select
          className="full-input auth-select"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="customer">customer</option>
          <option value="store">store</option>
          <option value="driver">driver</option>
        </select>

        {role === "store" && (
          <input
            className="full-input"
            placeholder="가게명"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
          />
        )}

        <button
          className="primary full-width-btn"
          onClick={register}
          disabled={loading}
        >
          {loading ? "가입 중..." : "회원가입 완료"}
        </button>
      </div>

      <div className="card">
        <p>승인 정책</p>
        <p>`customer`는 즉시 이용할 수 있습니다.</p>
        <p>`store`, `driver`는 관리자 승인 후 로그인할 수 있습니다.</p>
      </div>
    </div>
  );
}

export default RegisterPage;
