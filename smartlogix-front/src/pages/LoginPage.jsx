import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, saveLoginSession } from "../services/authService";
import logoLogin from "../assets/logo-login.png";

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      const response = await login({
        credential: username,
        password,
      });
      console.log("Respuesta login:", response);
      saveLoginSession(response);
      navigate("/dashboard");
    } catch (error) {
      console.error(error);
      alert(error.message || "Credenciales inválidas");
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingrese su contraseña"
                className="w-full bg-slate-950/80 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-400 outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-indigo-600 px-6 py-3 text-white font-bold shadow-lg hover:bg-indigo-500 transition"
            >
              Iniciar sesión
            </button>
          </form>
        </div>
      </div>
    );
}

export default LoginPage;