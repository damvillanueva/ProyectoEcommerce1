import { useState } from "react";
import { FiArrowLeft, FiLock, FiMail, FiUser } from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/logo-smartlogix.png";
import {
  clearLogin,
  login,
  registerCustomer,
  saveLoginSession,
} from "../services/authService";

const EMPTY_FORM = {
  username: "",
  email: "",
  password: "",
};

function StoreAuthPage() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setError("");
    setMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError("");
      setMessage("");

      if (mode === "register") {
        await registerCustomer(form);
        setMode("login");
        setForm((current) => ({ ...current, username: current.email }));
        setMessage("Cuenta creada. Ya puedes iniciar sesion.");
        return;
      }

      const response = await login({
        credential: form.username,
        password: form.password,
      });

      if (response.role !== "ROLE_CUSTOMER") {
        clearLogin();
        setError("Esta pantalla es solo para clientes. Usa el acceso del equipo.");
        return;
      }

      saveLoginSession(response);
      navigate("/shop");
    } catch (authError) {
      console.error(authError);
      setError(
        authError.response?.data?.message
          || authError.message
          || "No fue posible completar el acceso."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 p-5 text-white">
      <div className="mx-auto grid min-h-[calc(100vh-2.5rem)] max-w-6xl overflow-hidden rounded-lg border border-white/10 bg-slate-900 shadow-2xl lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative hidden overflow-hidden border-r border-white/10 bg-indigo-950 p-12 lg:flex lg:flex-col lg:justify-between">
          <div className="relative">
            <img src={logo} alt="SmartLogix" className="h-10 w-auto object-contain" />
          </div>

          <div className="relative max-w-xl">
            <p className="text-sm font-black uppercase text-sky-300">SmartLogix Commerce</p>
            <h1 className="mt-4 text-5xl font-black leading-tight">
              Tus compras y pedidos en un solo lugar.
            </h1>
            <p className="mt-5 max-w-lg text-lg font-semibold text-slate-300">
              Compra con stock actualizado, descuentos y seguimiento conectado a nuestra operacion.
            </p>
          </div>

          <p className="relative text-sm font-semibold text-slate-400">
            Catalogo publico y acceso privado para clientes.
          </p>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            <Link
              to="/shop"
              className="mb-8 inline-flex items-center gap-2 text-sm font-black text-slate-400 transition hover:text-white"
            >
              <FiArrowLeft />
              Volver a la tienda
            </Link>

            <div className="mb-7 flex rounded-lg border border-white/10 bg-slate-950 p-1">
              <ModeButton active={mode === "login"} onClick={() => changeMode("login")}>
                Iniciar sesion
              </ModeButton>
              <ModeButton active={mode === "register"} onClick={() => changeMode("register")}>
                Crear cuenta
              </ModeButton>
            </div>

            <h2 className="text-3xl font-black">
              {mode === "login" ? "Bienvenido de vuelta" : "Crea tu cuenta"}
            </h2>
            <p className="mt-2 font-semibold text-slate-400">
              {mode === "login"
                ? "Ingresa para finalizar tu compra."
                : "Tus nuevas cuentas se crean solo con permisos de cliente."}
            </p>

            <form onSubmit={handleSubmit} className="mt-7 space-y-4">
              <AuthInput
                icon={FiUser}
                label={mode === "login" ? "Usuario o email" : "Nombre de usuario"}
                name="username"
                onChange={updateField}
                placeholder={mode === "login" ? "cliente@correo.cl" : "damian.cliente"}
                value={form.username}
              />

              {mode === "register" && (
                <AuthInput
                  icon={FiMail}
                  label="Correo electronico"
                  name="email"
                  onChange={updateField}
                  placeholder="cliente@correo.cl"
                  type="email"
                  value={form.email}
                />
              )}

              <AuthInput
                icon={FiLock}
                label="Contrasena"
                name="password"
                onChange={updateField}
                placeholder="Minimo 6 caracteres"
                type="password"
                value={form.password}
              />

              {error && (
                <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm font-bold text-red-200">
                  {error}
                </div>
              )}

              {message && (
                <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm font-bold text-emerald-200">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="h-12 w-full rounded-lg bg-sky-500 px-5 font-black text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting
                  ? "Procesando..."
                  : mode === "login"
                    ? "Entrar a mi cuenta"
                    : "Crear cuenta de cliente"}
              </button>
            </form>

            <Link
              to="/"
              className="mt-6 block text-center text-sm font-bold text-slate-500 transition hover:text-slate-300"
            >
              Acceso para administracion y equipo
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function ModeButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 flex-1 rounded-md text-sm font-black transition ${
        active ? "bg-sky-500 text-white" : "text-slate-400 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function AuthInput({ icon: Icon, label, name, onChange, placeholder, type = "text", value }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-slate-300">{label}</span>
      <span className="relative block">
        <Icon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          required
          minLength={type === "password" ? 6 : undefined}
          name={name}
          onChange={onChange}
          placeholder={placeholder}
          type={type}
          value={value}
          className="h-12 w-full rounded-lg border border-white/10 bg-slate-950 pl-11 pr-4 font-bold text-white outline-none placeholder:text-slate-600 focus:border-sky-400"
        />
      </span>
    </label>
  );
}

export default StoreAuthPage;
