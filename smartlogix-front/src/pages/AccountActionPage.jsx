import { useState } from "react";
import { FiArrowLeft, FiCheckCircle, FiLock, FiMail } from "react-icons/fi";
import { Link, useSearchParams } from "react-router-dom";
import logo from "../assets/logo-smartlogix.png";
import { resetPasswordRequest, verifyEmailRequest } from "../api/authApi";

function AccountActionPage({ action }) {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const token = searchParams.get("token") || "";
  const isVerification = action === "verify";

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!token) {
      setError("El enlace no contiene un token valido.");
      return;
    }
    if (!isVerification && password !== confirmation) {
      setError("Las contrasenas no coinciden.");
      return;
    }

    try {
      setSubmitting(true);
      const response = isVerification
        ? await verifyEmailRequest(token)
        : await resetPasswordRequest(token, password);
      setMessage(response.message);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "No fue posible completar la solicitud.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-5 text-white">
      <section className="w-full max-w-lg rounded-lg border border-white/10 bg-slate-900 p-7 shadow-2xl sm:p-10">
        <img src={logo} alt="SmartLogix" className="h-9 w-auto object-contain" />
        <div className="mt-8 flex h-12 w-12 items-center justify-center rounded-lg bg-sky-500/15 text-2xl text-sky-300">
          {isVerification ? <FiMail /> : <FiLock />}
        </div>
        <h1 className="mt-5 text-3xl font-black">
          {isVerification ? "Verifica tu correo" : "Crea una nueva contrasena"}
        </h1>
        <p className="mt-2 font-semibold text-slate-400">
          {isVerification
            ? "Confirma que este correo pertenece a tu cuenta SmartLogix."
            : "La nueva contrasena debe tener al menos 8 caracteres."}
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          {!isVerification && (
            <>
              <PasswordField
                label="Nueva contrasena"
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
              />
              <PasswordField
                label="Repite la contrasena"
                value={confirmation}
                onChange={setConfirmation}
                autoComplete="new-password"
              />
            </>
          )}

          {error && <Status tone="error">{error}</Status>}
          {message && (
            <Status tone="success">
              <FiCheckCircle className="shrink-0" />
              {message}
            </Status>
          )}

          {!message && (
            <button
              type="submit"
              disabled={submitting}
              className="h-12 w-full rounded-lg bg-sky-500 px-5 font-black transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? "Procesando..."
                : isVerification
                  ? "Verificar correo"
                  : "Guardar nueva contrasena"}
            </button>
          )}
        </form>

        <Link
          to="/shop/login"
          className="mt-6 inline-flex items-center gap-2 text-sm font-black text-slate-400 transition hover:text-white"
        >
          <FiArrowLeft /> Volver al inicio de sesion
        </Link>
      </section>
    </main>
  );
}

function PasswordField({ autoComplete, label, onChange, value }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-slate-300">{label}</span>
      <input
        required
        minLength={8}
        maxLength={100}
        type="password"
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-lg border border-white/10 bg-slate-950 px-4 font-bold outline-none focus:border-sky-400"
      />
    </label>
  );
}

function Status({ children, tone }) {
  const toneClass = tone === "error"
    ? "border-red-400/30 bg-red-500/10 text-red-200"
    : "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex items-center gap-2 rounded-lg border p-3 text-sm font-bold ${toneClass}`}>
      {children}
    </div>
  );
}

export default AccountActionPage;
