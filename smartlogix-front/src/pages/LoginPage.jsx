import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, saveLoginSession } from "../services/authService";
import logoLogin from "../assets/logo-login.png";

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");

    try {
      const response = await login({
        credential: username,
        password,
      });
      saveLoginSession(response);
      navigate(response.role === "ROLE_CUSTOMER" ? "/shop" : "/dashboard");
    } catch (error) {
      setErrorMessage(
        error.response?.status === 401
          ? "Usuario o contrasena incorrectos"
          : error.message || "No fue posible iniciar sesion"
      );
    }
  }

    return (
      <div className="min-h-screen bg-gradient-to-br from-[#08142d] via-[#07152f] to-[#020617] text-white flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950 border border-white/10 shadow-2xl p-10">
          <div className="flex flex-col items-center mb-8">
            <img src={logoLogin} alt="SmartLogix" className="h-32 w-auto mb-4"/>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">
                Usuario o email
              </label>

              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ingrese su usuario"
                className="w-full bg-slate-950/80 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-400 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">
                Contraseña
              </label>

              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingrese su contraseña"
                className="w-full bg-slate-950/80 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-400 outline-none"
              />
            </div>

            {errorMessage && (
              <p
                role="alert"
                className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200"
              >
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-indigo-600 px-6 py-3 text-white font-bold shadow-lg hover:bg-indigo-500 transition"
            >
              Iniciar sesión
            </button>
          </form>

          <button
            type="button"
            onClick={() => navigate("/shop")}
            className="mt-4 w-full rounded-xl border border-white/10 px-6 py-3 font-bold text-slate-200 transition hover:bg-white/10"
          >
            Ir a la tienda online
          </button>
        </div>
      </div>
    );
}

export default LoginPage;
