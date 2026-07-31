import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import AccessibilityWidget from "./components/AccessibilityWidget";
import ProtectedRoute from "./components/ProtectedRoute";

const AccountActionPage = lazy(() => import("./pages/AccountActionPage"));
const CartPage = lazy(() => import("./pages/CartPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const CustomerAccountPage = lazy(() => import("./pages/CustomerAccountPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const DiscountsPage = lazy(() => import("./pages/DiscountsPage"));
const InventoryMovementsPage = lazy(() => import("./pages/InventoryMovementsPage"));
const InventoryPage = lazy(() => import("./pages/InventoryPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const OrderSuccessPage = lazy(() => import("./pages/OrderSuccessPage"));
const OrdersPage = lazy(() => import("./pages/OrderPage"));
const ProductDetailPage = lazy(() => import("./pages/ProductDetailPage"));
const ShipmentPage = lazy(() => import("./pages/ShipmentsPage"));
const ShopPage = lazy(() => import("./pages/ShopPage"));
const StoreAuthPage = lazy(() => import("./pages/StoreAuthPage"));
const UsersPage = lazy(() => import("./pages/UsersPage"));

function RouteLoadingFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#07111f] px-5 text-white">
      <div role="status" aria-live="polite" className="w-full max-w-sm text-center">
        <p className="text-xl font-black">SmartLogix</p>
        <div className="mx-auto mt-5 flex h-2 w-32 overflow-hidden rounded-full bg-white/10">
          <span className="h-full w-1/2 animate-pulse rounded-full bg-sky-400" />
        </div>
        <p className="mt-4 text-sm font-bold text-slate-400">Cargando modulo...</p>
      </div>
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AccessibilityWidget />
      <Suspense fallback={<RouteLoadingFallback />}>
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
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
