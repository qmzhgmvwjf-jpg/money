import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import AdminPage from "./pages/AdminPage";
import RiderPage from "./pages/RiderPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/rider" element={<RiderPage />} />
    </Routes>
  );
}

export default App;