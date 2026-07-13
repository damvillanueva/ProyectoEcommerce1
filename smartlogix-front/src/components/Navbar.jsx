import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getRoleLabel } from "../utils/roleUtils";
import logo from "../assets/logo-smartlogix.png";
import Button from "../components/Button";

function Navbar({
  title = "SmartLogix",
  showBack = false,
  backTo = "/dashboard",
  variant = "dashboard",
}) {
  const { role, username } = useAuth();
  const roleLabel = getRoleLabel(role);
  const navigate = useNavigate();

  function logout() {
    localStorage.clear();
    navigate("/");
  }

  const isService = variant === "service";

  if (isService) {
    return (
      <header className="flex justify-between items-center bg-white/80 shadow-lg mb-6 px-5 py-3 rounded-2xl">
        <div className="flex items-center gap-6">
          <img src={logo} alt="SmartLogix" className="w-20 h-20 object-contain" />

          <div>
            {showBack && (
              <Link to={backTo} className="text-blue-600 font-semibold hover:text-blue-800 text-sm">
                ← Volver al Dashboard
              </Link>
            )}

            <h1 className="text-2xl font-black text-slate-900">{title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-blue-50 rounded-full font-semibold text-blue-600 shadow-sm px-4 py-2">
            {roleLabel}
          </div>

          <Button variant="delete" size="sm" onClick={logout}>
            Cerrar sesión
          </Button>
        </div>
      </header>
    );
  }

  return (
    <header className="overflow-hidden bg-gradient-to-r from-indigo-950 via-indigo-900 to-slate-800 border-b border-white/10">
      <div className="flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-3 min-w-[280px] h-14 overflow-hidden">
          <img
            src={logo}
            alt="SmartLogix"
            className="max-h-7 w-auto object-contain scale-[2.2] origin-left"
          />
        </div>

        <nav className="hidden md:flex items-center gap-4 text-white font-semibold">
          <NavItem to="/dashboard">Dashboard</NavItem>

          <NavItem to="/inventory">Inventario</NavItem>

          {role !== "ROLE_USER" && <NavItem to="/inventory/movements">Movimientos</NavItem>}

          {role !== "ROLE_WAREHOUSE_MANAGER" && <NavItem to="/orders">Pedidos</NavItem>}

          {role !== "ROLE_USER" && <NavItem to="/shipments">Envíos</NavItem>}

          {role === "ROLE_ADMIN" && <NavItem to="/users">Usuarios</NavItem>}
        </nav>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-white font-bold">{username}</span>
            <span className="text-slate-300 text-sm">{roleLabel}</span>
          </div>

          <button
            onClick={logout}
            className="rounded-full bg-red-500 px-5 py-3 text-white font-bold hover:bg-red-400 transition"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  );
}

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `px-5 py-3 rounded-2xl transition ${
          isActive
            ? "bg-white/10 text-white shadow-inner border-b-2 border-indigo-300"
            : "text-slate-200 hover:bg-white/10"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export default Navbar;
