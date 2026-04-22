import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import AdminPage from "./pages/AdminPage";
import RiderPage from "./pages/RiderPage";
import CustomerPage from "./pages/CustomerPage";
import StorePage from "./pages/StorePage";
import TrackingPage from "./pages/TrackingPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/rider" element={<RiderPage />} />
        <Route path="/customer" element={<CustomerPage />} />
        <Route path="/store" element={<StorePage />} />
        <Route path="/tracking" element={<TrackingPage />} />
      </Routes>
    </Router>
  );
}

export default App;