import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import AdminPage from "./pages/AdminPage";
import RiderPage from "./pages/RiderPage";

// 로그인 여부 확인
const isLoggedIn = () => {
  return !!localStorage.getItem("token");
};

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />

      {/* 보호 라우팅 */}
      <Route
        path="/admin"
        element={isLoggedIn() ? <AdminPage /> : <Navigate to="/" />}
      />

      <Route
        path="/rider"
        element={isLoggedIn() ? <RiderPage /> : <Navigate to="/" />}
      />
    </Routes>
  );
}

export default App;