import { BrowserRouter, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AccountActionPage from "./pages/AccountActionPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import CustomerAccountPage from "./pages/CustomerAccountPage";
import DashboardPage from "./pages/DashboardPage";
import DiscountsPage from "./pages/DiscountsPage";
import InventoryMovementsPage from "./pages/InventoryMovementsPage";
import InventoryPage from "./pages/InventoryPage";
import LoginPage from "./pages/LoginPage";
import OrderSuccessPage from "./pages/OrderSuccessPage";
import OrdersPage from "./pages/OrderPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import ShipmentPage from "./pages/ShipmentsPage";
import ShopPage from "./pages/ShopPage";
import StoreAuthPage from "./pages/StoreAuthPage";
import UsersPage from "./pages/UsersPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<ProtectedRoute allowedRoles={["ROLE_ADMIN", "ROLE_WAREHOUSE_MANAGER", "ROLE_USER"]}><DashboardPage /></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute allowedRoles={["ROLE_ADMIN", "ROLE_WAREHOUSE_MANAGER", "ROLE_USER"]}><InventoryPage /></ProtectedRoute>} />
        <Route path="/inventory/movements" element={<ProtectedRoute allowedRoles={["ROLE_ADMIN", "ROLE_WAREHOUSE_MANAGER"]}><InventoryMovementsPage /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute allowedRoles={["ROLE_ADMIN", "ROLE_USER"]}><OrdersPage /></ProtectedRoute>} />
        <Route path="/shipments" element={<ProtectedRoute allowedRoles={["ROLE_ADMIN", "ROLE_WAREHOUSE_MANAGER"]}><ShipmentPage /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute allowedRoles={["ROLE_ADMIN"]}><UsersPage /></ProtectedRoute>} />
        <Route path="/discounts" element={<ProtectedRoute allowedRoles={["ROLE_ADMIN"]}><DiscountsPage /></ProtectedRoute>} />

        <Route path="/shop" element={<ShopPage />} />
        <Route path="/shop/product/:sku" element={<ProductDetailPage />} />
        <Route path="/shop/login" element={<StoreAuthPage />} />
        <Route path="/shop/verify-email" element={<AccountActionPage action="verify" />} />
        <Route path="/shop/reset-password" element={<AccountActionPage action="reset" />} />
        <Route path="/shop/cart" element={<CartPage />} />
        <Route path="/shop/checkout" element={<ProtectedRoute allowedRoles={["ROLE_CUSTOMER"]} loginPath="/shop/login"><CheckoutPage /></ProtectedRoute>} />
        <Route path="/shop/account" element={<ProtectedRoute allowedRoles={["ROLE_CUSTOMER"]} loginPath="/shop/login"><CustomerAccountPage /></ProtectedRoute>} />
        <Route path="/shop/order/:orderNumber" element={<ProtectedRoute allowedRoles={["ROLE_CUSTOMER"]} loginPath="/shop/login"><OrderSuccessPage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
