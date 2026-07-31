import { useEffect, useState } from "react";
import {
  FiArrowLeft,
  FiLogOut,
  FiMenu,
  FiUser,
  FiX,
} from "react-icons/fi";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/logo-smartlogix.png";
import { useAuth } from "../hooks/useAuth";
import { clearLogin } from "../services/authService";
import { getRoleLabel } from "../utils/roleUtils";
import Button from "./Button";

function Navbar({
  title = "SmartLogix",
  showBack = false,
  backTo = "/dashboard",
  variant = "dashboard",
}) {
  const { role, username } = useAuth();
  const roleLabel = getRoleLabel(role);
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  function logout() {
    clearLogin();
    navigate("/");
  }

  if (variant === "service") {
    return (
      <header className="mb-6 flex flex-col gap-4 rounded-2xl bg-white/80 px-4 py-3 shadow-lg sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-center gap-4 sm:gap-6">
          <img src={logo} alt="SmartLogix" className="h-16 w-16 shrink-0 object-contain sm:h-20 sm:w-20" />
          <div className="min-w-0">
            {showBack && (
              <Link to={backTo} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800">
                <FiArrowLeft aria-hidden="true" />
                Volver al Dashboard
              </Link>
            )}
            <h1 className="break-words text-xl font-black text-slate-900 sm:text-2xl">{title}</h1>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <div className="rounded-full bg-blue-50 px-4 py-2 font-semibold text-blue-600 shadow-sm">
            {roleLabel}
          </div>
          <Button variant="delete" size="sm" onClick={logout}>
            Cerrar sesion
          </Button>
        </div>
      </header>
    );
  }

  const navigation = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/inventory", label: "Inventario" },
    role !== "ROLE_USER" && { to: "/inventory/movements", label: "Movimientos" },
    role !== "ROLE_WAREHOUSE_MANAGER" && { to: "/shop", label: "Tienda" },
    role !== "ROLE_WAREHOUSE_MANAGER" && { to: "/orders", label: "Pedidos" },
    role !== "ROLE_WAREHOUSE_MANAGER" && { to: "/pos", label: "POS" },
    { to: "/returns", label: "Postventa" },
    role !== "ROLE_USER" && { to: "/shipments", label: "Envios" },
    role !== "ROLE_USER" && { to: "/procurement", label: "Compras" },
    role === "ROLE_ADMIN" && { to: "/users", label: "Usuarios" },
    role === "ROLE_ADMIN" && { to: "/discounts", label: "Descuentos" },
  ].filter(Boolean);

  return (
    <header className="overflow-hidden border-b border-white/10 bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-800">
      <div className="flex min-h-20 items-center justify-between gap-3 px-3 py-3 sm:px-6 lg:px-8">
        <Link to="/dashboard" className="flex h-12 min-w-0 flex-1 items-center sm:max-w-[220px] xl:flex-none" aria-label="Ir al dashboard">
          <img
            src={logo}
            alt="SmartLogix"
            className="h-8 w-auto object-contain"
          />
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 text-sm font-semibold text-white xl:flex">
          {navigation.map((item) => (
            <NavItem key={item.to} to={item.to}>{item.label}</NavItem>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="hidden flex-col text-right 2xl:flex">
            <span className="max-w-36 truncate font-bold text-white">{username}</span>
            <span className="text-sm text-slate-300">{roleLabel}</span>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((current) => !current)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            aria-label={mobileOpen ? "Cerrar menu" : "Abrir menu"}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-xl text-white transition hover:bg-white/10 xl:hidden"
          >
            {mobileOpen ? <FiX aria-hidden="true" /> : <FiMenu aria-hidden="true" />}
          </button>

          <button
            type="button"
            onClick={logout}
            className="hidden h-11 items-center gap-2 rounded-lg bg-red-500 px-4 text-sm font-bold text-white transition hover:bg-red-400 xl:inline-flex"
          >
            <FiLogOut aria-hidden="true" />
            Cerrar sesion
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div id="mobile-navigation" className="border-t border-white/10 bg-slate-950/70 px-3 py-4 sm:px-6 xl:hidden">
          <div className="mb-3 flex min-w-0 items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-200">
              <FiUser aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-white">{username}</p>
              <p className="truncate text-xs font-semibold text-slate-400">{roleLabel}</p>
            </div>
          </div>

          <nav className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {navigation.map((item) => (
              <MobileNavItem key={item.to} to={item.to}>{item.label}</MobileNavItem>
            ))}
          </nav>

          <button
            type="button"
            onClick={logout}
            className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-red-300/25 bg-red-500/10 text-sm font-black text-red-200 transition hover:bg-red-500/20"
          >
            <FiLogOut aria-hidden="true" />
            Cerrar sesion
          </button>
        </div>
      )}
    </header>
  );
}

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-lg px-2.5 py-2.5 transition ${
          isActive
            ? "border-b-2 border-indigo-300 bg-white/10 text-white shadow-inner"
            : "text-slate-200 hover:bg-white/10"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

function MobileNavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex min-h-11 items-center justify-center rounded-lg border px-3 py-2 text-center text-sm font-black transition ${
          isActive
            ? "border-sky-300/40 bg-sky-500/20 text-sky-100"
            : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export default Navbar;
