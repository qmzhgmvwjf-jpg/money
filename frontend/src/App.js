import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AdminPage from "./pages/AdminPage";
import RiderPage from "./pages/RiderPage";
import CustomerPage from "./pages/CustomerPage";
import StorePage from "./pages/StorePage";
import TrackingPage from "./pages/TrackingPage";
import CustomerStoreDetailPage from "./pages/CustomerStoreDetailPage";
import CartPage from "./pages/CartPage";
import CustomerOrdersPage from "./pages/CustomerOrdersPage";
import CustomerProfilePage from "./pages/CustomerProfilePage";
import CustomerSearchPage from "./pages/CustomerSearchPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/rider" element={<RiderPage />} />
        <Route path="/customer" element={<CustomerPage />} />
        <Route path="/customer/search" element={<CustomerSearchPage />} />
        <Route path="/customer/store/:storeId" element={<CustomerStoreDetailPage />} />
        <Route path="/customer/cart" element={<CartPage />} />
        <Route path="/customer/orders" element={<CustomerOrdersPage />} />
        <Route path="/customer/profile" element={<CustomerProfilePage />} />
        <Route path="/store" element={<StorePage />} />
        <Route path="/tracking" element={<TrackingPage />} />
      </Routes>
    </Router>
  );
}

export default App;
