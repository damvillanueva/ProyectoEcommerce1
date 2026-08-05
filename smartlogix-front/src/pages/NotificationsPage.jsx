import { useEffect, useMemo, useState } from "react";
import {
  FiAlertTriangle,
  FiBell,
  FiCheck,
  FiClock,
  FiCreditCard,
  FiRefreshCw,
  FiSearch,
  FiShoppingBag,
  FiTruck,
  FiX,
  FiXCircle,
} from "react-icons/fi";
import Navbar from "../components/Navbar";
import { useAuth } from "../hooks/useAuth";
import { loadManagedNotifications, retryNotification } from "../services/notificationService";

const TYPE_META = {
  ORDER_CONFIRMED: ["Pedido", FiShoppingBag, "sky"],
  PAYMENT_CONFIRMED: ["Pago aprobado", FiCreditCard, "emerald"],
  PAYMENT_REJECTED: ["Pago rechazado", FiXCircle, "red"],
  SHIPMENT_UPDATED: ["Despacho", FiTruck, "violet"],
  ORDER_CANCELLED: ["Cancelacion", FiXCircle, "slate"],
};

const STATUS_META = {
  PENDING: ["Pendiente", FiClock, "amber"],
  SENT: ["Enviado", FiCheck, "emerald"],
  FAILED: ["Fallido", FiAlertTriangle, "red"],
};

const TONES = {
  amber: "bg-amber-500/15 text-amber-300",
  emerald: "bg-emerald-500/15 text-emerald-300",
  red: "bg-red-500/15 text-red-300",
  sky: "bg-sky-500/15 text-sky-300",
  slate: "bg-slate-500/15 text-slate-300",
  violet: "bg-violet-500/15 text-violet-300",
};

const formatDate = (value) => value
  ? new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  : "Pendiente";

function NotificationsPage() {
  const { role } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const canRetry = role === "ROLE_ADMIN";

  async function refresh() {
    try {
      setError("");
      const data = await loadManagedNotifications();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (loadError) {
      console.error(loadError);
      setError("No se pudo cargar la bandeja de notificaciones.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return notifications.filter((notification) => {
      const matchesSearch = !query || [
        notification.orderNumber,
        notification.customerUsername,
        notification.recipientEmail,
        notification.title,
      ].some((value) => String(value || "").toLowerCase().includes(query));
      return matchesSearch
        && (!typeFilter || notification.type === typeFilter)
        && (!statusFilter || notification.deliveryStatus === statusFilter);
    });
  }, [notifications, search, statusFilter, typeFilter]);

  const stats = {
    pending: notifications.filter((item) => item.deliveryStatus === "PENDING").length,
    sent: notifications.filter((item) => item.deliveryStatus === "SENT").length,
    failed: notifications.filter((item) => item.deliveryStatus === "FAILED").length,
  };

  async function handleRetry(notificationId) {
    try {
      setRetryingId(notificationId);
      setError("");
      await retryNotification(notificationId);
      await refresh();
      setMessage("Reintento procesado. Revisa el estado actualizado.");
      window.setTimeout(() => setMessage(""), 3500);
    } catch (retryError) {
      console.error(retryError);
      setError(retryError.response?.data?.message || "No se pudo reintentar el correo.");
    } finally {
      setRetryingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase text-sky-300">Comunicaciones transaccionales</p>
            <h1 className="mt-1 text-3xl font-black">Bandeja de notificaciones</h1>
            <p className="mt-2 max-w-3xl font-semibold text-slate-400">Supervisa correos de compra, pago, despacho y cancelacion sin afectar el procesamiento de pedidos.</p>
          </div>
          <button type="button" onClick={refresh} className="flex h-11 items-center justify-center gap-2 rounded-md border border-white/10 px-4 text-sm font-black text-slate-300 hover:bg-white/5">
            <FiRefreshCw /> Actualizar
          </button>
        </div>

        <section className="mt-6 grid grid-cols-3 gap-3" aria-label="Resumen de entrega">
          <Metric label="Pendientes" value={stats.pending} tone="amber" />
          <Metric label="Enviadas" value={stats.sent} tone="emerald" />
          <Metric label="Fallidas" value={stats.failed} tone="red" />
        </section>

        {(error || message) && (
          <div className={`mt-5 flex items-center justify-between gap-3 rounded-md border p-4 text-sm font-bold ${error ? "border-red-400/25 bg-red-500/10 text-red-200" : "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"}`}>
            <span>{error || message}</span>
            <button type="button" onClick={() => { setError(""); setMessage(""); }} title="Cerrar" className="flex h-10 w-10 shrink-0 items-center justify-center"><FiX /></button>
          </div>
        )}

        <section className="mt-6">
          <div className="grid gap-3 rounded-md border border-white/10 bg-slate-900 p-3 md:grid-cols-[minmax(0,1fr)_220px_180px]">
            <label className="relative">
              <span className="sr-only">Buscar notificaciones</span>
              <FiSearch className="pointer-events-none absolute left-3 top-3.5 text-slate-500" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pedido, cliente o correo..." className="h-11 w-full rounded-md border border-white/10 bg-slate-950 pl-10 pr-3 text-sm font-bold outline-none focus:border-sky-400" />
            </label>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="h-11 rounded-md border border-white/10 bg-slate-950 px-3 text-sm font-bold outline-none">
              <option value="">Todos los eventos</option>
              {Object.entries(TYPE_META).map(([id, [label]]) => <option key={id} value={id}>{label}</option>)}
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-11 rounded-md border border-white/10 bg-slate-950 px-3 text-sm font-bold outline-none">
              <option value="">Todos los estados</option>
              {Object.entries(STATUS_META).map(([id, [label]]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </div>

          <div className="mt-3 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center gap-3 rounded-md border border-white/10 p-10 font-black text-slate-500"><FiRefreshCw className="animate-spin" /> Cargando notificaciones...</div>
            ) : filtered.length === 0 ? (
              <div className="rounded-md border border-dashed border-white/15 p-10 text-center text-slate-500"><FiBell className="mx-auto" size={28} /><p className="mt-3 font-black">No hay notificaciones para estos filtros.</p></div>
            ) : filtered.map((notification) => (
              <NotificationRow key={notification.id} canRetry={canRetry} notification={notification} onRetry={handleRetry} retrying={retryingId === notification.id} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function Metric({ label, tone, value }) {
  return <article className="min-w-0 rounded-md border border-white/10 bg-slate-900 p-3 sm:p-4"><p className="truncate text-[10px] font-black uppercase text-slate-500 sm:text-xs">{label}</p><p className={`mt-2 text-2xl font-black ${TONES[tone].split(" ")[1]}`}>{value}</p></article>;
}

function NotificationRow({ canRetry, notification, onRetry, retrying }) {
  const [typeLabel, TypeIcon, typeTone] = TYPE_META[notification.type] || [notification.type, FiBell, "slate"];
  const [statusLabel, StatusIcon, statusTone] = STATUS_META[notification.deliveryStatus] || [notification.deliveryStatus, FiClock, "slate"];
  return (
    <article className="grid gap-4 rounded-md border border-white/10 bg-slate-900 p-4 lg:grid-cols-[minmax(0,1fr)_220px_auto] lg:items-center">
      <div className="flex min-w-0 gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md ${TONES[typeTone]}`}><TypeIcon /></span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-black">{notification.title}</h2>
            <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${TONES[typeTone]}`}>{typeLabel}</span>
          </div>
          <p className="mt-1 text-sm font-semibold leading-5 text-slate-400">{notification.message}</p>
          <p className="mt-2 text-xs font-bold text-slate-500">Pedido {notification.orderNumber} | {formatDate(notification.createdAt)}</p>
        </div>
      </div>
      <div className="min-w-0 lg:text-right">
        <p className="truncate text-sm font-black text-slate-300">{notification.customerUsername || "Compra asistida"}</p>
        <p className="mt-1 truncate text-xs font-bold text-slate-500">{notification.recipientEmail}</p>
        {notification.failureReason && <p className="mt-2 break-words text-xs font-bold text-red-300">{notification.failureReason}</p>}
      </div>
      <div className="flex items-center gap-2 lg:justify-end">
        <span className={`flex min-h-10 items-center gap-2 rounded-md px-3 text-xs font-black uppercase ${TONES[statusTone]}`}><StatusIcon /> {statusLabel}</span>
        {notification.deliveryStatus === "FAILED" && canRetry && (
          <button type="button" disabled={retrying} onClick={() => onRetry(notification.id)} className="flex h-10 items-center gap-2 rounded-md border border-sky-400/30 px-3 text-xs font-black text-sky-200 hover:bg-sky-500/10 disabled:opacity-40"><FiRefreshCw className={retrying ? "animate-spin" : ""} /> Reintentar</button>
        )}
      </div>
    </article>
  );
}

export default NotificationsPage;
