import { useEffect, useMemo, useState } from "react";
import {
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiPackage,
  FiRefreshCw,
  FiRotateCcw,
  FiSearch,
  FiShield,
  FiX,
  FiXCircle,
} from "react-icons/fi";
import Navbar from "../components/Navbar";
import { useAuth } from "../hooks/useAuth";
import { fetchWarehouses } from "../services/inventoryService";
import {
  loadPostSales,
  receiveManagedPostSale,
  resolveManagedPostSale,
  reviewManagedPostSale,
} from "../services/postSaleService";

const STATUS_META = {
  REQUESTED: ["Pendiente", "amber", FiClock],
  APPROVED: ["Aprobada", "sky", FiCheck],
  REJECTED: ["Rechazada", "red", FiXCircle],
  RECEIVED: ["Recibida", "violet", FiPackage],
  RESOLVED: ["Resuelta", "emerald", FiCheckCircle],
  CANCELLED: ["Cancelada", "slate", FiXCircle],
};

const TYPE_META = {
  RETURN: ["Devolucion", FiRotateCcw],
  EXCHANGE: ["Cambio", FiPackage],
  WARRANTY: ["Garantia", FiShield],
};

const TONES = {
  amber: "bg-amber-500/15 text-amber-300",
  emerald: "bg-emerald-500/15 text-emerald-300",
  red: "bg-red-500/15 text-red-300",
  sky: "bg-sky-500/15 text-sky-300",
  slate: "bg-slate-500/15 text-slate-300",
  violet: "bg-violet-500/15 text-violet-300",
};

const money = (value) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(Number(value) || 0);
const date = (value) => value ? new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Pendiente";

function ReturnsPage() {
  const { role } = useAuth();
  const [requests, setRequests] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedNumber, setSelectedNumber] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [warehouseCode, setWarehouseCode] = useState("");
  const [receiveLines, setReceiveLines] = useState([]);
  const [resolution, setResolution] = useState("REFUND");
  const [resolutionNotes, setResolutionNotes] = useState("");

  const canReview = role === "ROLE_ADMIN" || role === "ROLE_USER";
  const canReceive = role === "ROLE_ADMIN" || role === "ROLE_WAREHOUSE_MANAGER";
  const canResolve = role === "ROLE_ADMIN" || role === "ROLE_USER";

  useEffect(() => {
    let active = true;
    Promise.all([loadPostSales(), fetchWarehouses()])
      .then(([postSaleData, warehouseData]) => {
        if (!active) return;
        const nextRequests = Array.isArray(postSaleData) ? postSaleData : [];
        const nextWarehouses = (Array.isArray(warehouseData) ? warehouseData : []).filter((warehouse) => warehouse.active !== false);
        setRequests(nextRequests);
        setWarehouses(nextWarehouses);
        setSelectedNumber(nextRequests[0]?.requestNumber || "");
        setWarehouseCode(nextWarehouses[0]?.code || "");
      })
      .catch((loadError) => {
        console.error(loadError);
        if (active) setError("No se pudo cargar la bandeja de postventa.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter((request) => {
      const matchesSearch = !query || [request.requestNumber, request.orderNumber, request.customerName, request.customerEmail]
        .some((value) => String(value || "").toLowerCase().includes(query));
      return matchesSearch && (!statusFilter || request.status === statusFilter) && (!typeFilter || request.type === typeFilter);
    });
  }, [requests, search, statusFilter, typeFilter]);

  const selected = requests.find((request) => request.requestNumber === selectedNumber) || filteredRequests[0] || null;

  useEffect(() => {
    if (!selected) return;
    setReviewText(selected.staffResponse || "");
    setReceiveLines(selected.lines.map((line) => ({
      sku: line.sku,
      receivedQuantity: line.requestedQuantity,
      restockQuantity: line.requestedQuantity,
      condition: "OPENED",
    })));
    const options = resolutionOptions(selected.type);
    setResolution(options[0].id);
    setResolutionNotes("");
  }, [selected?.requestNumber]);

  function replaceRequest(updated) {
    setRequests((current) => current.map((request) => request.requestNumber === updated.requestNumber ? updated : request));
  }

  function showSuccess(text) {
    setError("");
    setMessage(text);
    window.setTimeout(() => setMessage(""), 3500);
  }

  async function runAction(action, successText) {
    try {
      setSaving(true);
      setError("");
      const updated = await action();
      replaceRequest(updated);
      showSuccess(successText);
    } catch (actionError) {
      console.error(actionError);
      setError(actionError.response?.data?.message || "No se pudo completar la operacion.");
    } finally {
      setSaving(false);
    }
  }

  function updateReceiveLine(sku, field, value) {
    setReceiveLines((current) => current.map((line) => {
      if (line.sku !== sku) return line;
      if (field === "condition") {
        const noRestock = ["DEFECTIVE", "DAMAGED"].includes(value);
        return { ...line, condition: value, restockQuantity: noRestock ? 0 : line.receivedQuantity };
      }
      return { ...line, [field]: Number(value) };
    }));
  }

  const stats = {
    requested: requests.filter((request) => request.status === "REQUESTED").length,
    approved: requests.filter((request) => request.status === "APPROVED").length,
    received: requests.filter((request) => request.status === "RECEIVED").length,
    resolved: requests.filter((request) => request.status === "RESOLVED").length,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <main className="mx-auto max-w-[1550px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase text-sky-300">Operacion postventa</p>
            <h1 className="mt-1 text-3xl font-black">Devoluciones y garantias</h1>
            <p className="mt-2 max-w-3xl font-semibold text-slate-400">Gestiona revision, recepcion en bodega, reembolso, cambio o reparacion con trazabilidad completa.</p>
          </div>
          <button type="button" onClick={() => window.location.reload()} title="Actualizar bandeja" className="flex h-11 items-center justify-center gap-2 rounded-md border border-white/10 px-4 text-sm font-black text-slate-300 hover:bg-white/5"><FiRefreshCw /> Actualizar</button>
        </div>

        <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumen de postventa">
          <Metric label="Por revisar" value={stats.requested} tone="amber" />
          <Metric label="Esperando recepcion" value={stats.approved} tone="sky" />
          <Metric label="Por resolver" value={stats.received} tone="violet" />
          <Metric label="Resueltas" value={stats.resolved} tone="emerald" />
        </section>

        {(error || message) && <div className={`mt-5 flex items-center justify-between gap-3 rounded-md border p-4 text-sm font-bold ${error ? "border-red-400/25 bg-red-500/10 text-red-200" : "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"}`}><span>{error || message}</span><button type="button" onClick={() => { setError(""); setMessage(""); }} title="Cerrar"><FiX /></button></div>}

        <section className="mt-6 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_450px]">
          <div className="min-w-0">
            <div className="grid gap-3 rounded-md border border-white/10 bg-slate-900 p-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
              <label className="relative"><span className="sr-only">Buscar</span><FiSearch className="pointer-events-none absolute left-3 top-3.5 text-slate-500" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Solicitud, pedido o cliente..." className="h-11 w-full rounded-md border border-white/10 bg-slate-950 pl-10 pr-3 text-sm font-bold outline-none focus:border-sky-400" /></label>
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="h-11 rounded-md border border-white/10 bg-slate-950 px-3 text-sm font-bold outline-none"><option value="">Todos los tipos</option><option value="RETURN">Devoluciones</option><option value="EXCHANGE">Cambios</option><option value="WARRANTY">Garantias</option></select>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-11 rounded-md border border-white/10 bg-slate-950 px-3 text-sm font-bold outline-none"><option value="">Todos los estados</option>{Object.entries(STATUS_META).map(([id, [label]]) => <option key={id} value={id}>{label}</option>)}</select>
            </div>

            <div className="mt-3 space-y-3">
              {loading ? <Loading /> : filteredRequests.length === 0 ? <Empty /> : filteredRequests.map((request) => <RequestRow key={request.requestNumber} request={request} selected={selected?.requestNumber === request.requestNumber} onSelect={setSelectedNumber} />)}
            </div>
          </div>

          {selected ? (
            <aside className="overflow-hidden rounded-md border border-white/10 bg-slate-900 xl:sticky xl:top-5">
              <RequestDetail request={selected} />
              <div className="border-t border-white/10 p-5">
                {selected.status === "REQUESTED" && canReview && <ReviewAction disabled={saving} onChange={setReviewText} onReview={(approved) => runAction(() => reviewManagedPostSale(selected.requestNumber, { approved, response: reviewText }), approved ? "Solicitud aprobada." : "Solicitud rechazada.")} value={reviewText} />}
                {selected.status === "APPROVED" && canReceive && <ReceiveAction disabled={saving} lines={receiveLines} onChange={updateReceiveLine} onReceive={() => runAction(() => receiveManagedPostSale(selected.requestNumber, { warehouseCode, lines: receiveLines }), "Recepcion registrada y stock actualizado.")} onWarehouse={setWarehouseCode} warehouseCode={warehouseCode} warehouses={warehouses} />}
                {selected.status === "RECEIVED" && canResolve && <ResolveAction disabled={saving} notes={resolutionNotes} onNotes={setResolutionNotes} onResolution={setResolution} onResolve={() => runAction(() => resolveManagedPostSale(selected.requestNumber, { resolution, notes: resolutionNotes }), "Solicitud resuelta correctamente.")} options={resolutionOptions(selected.type)} resolution={resolution} />}
                {!actionAvailable(selected.status, canReview, canReceive, canResolve) && <p className="rounded-md border border-white/10 bg-slate-950 p-4 text-sm font-bold leading-5 text-slate-500">No hay acciones pendientes para tu rol en este estado.</p>}
              </div>
            </aside>
          ) : <div className="rounded-md border border-dashed border-white/15 p-8 text-center text-slate-500">Selecciona una solicitud.</div>}
        </section>
      </main>
    </div>
  );
}

function Metric({ label, tone, value }) { return <article className="rounded-md border border-white/10 bg-slate-900 p-4"><p className="text-xs font-black uppercase text-slate-500">{label}</p><p className={`mt-2 text-2xl font-black ${TONES[tone].split(" ")[1]}`}>{value}</p></article>; }

function RequestRow({ onSelect, request, selected }) {
  const [statusLabel, tone, StatusIcon] = STATUS_META[request.status] || [request.status, "slate", FiClock];
  const [typeLabel, TypeIcon] = TYPE_META[request.type] || [request.type, FiPackage];
  return <button type="button" onClick={() => onSelect(request.requestNumber)} className={`grid w-full gap-3 rounded-md border p-4 text-left transition sm:grid-cols-[minmax(0,1fr)_auto] ${selected ? "border-sky-400/60 bg-sky-500/10" : "border-white/10 bg-slate-900 hover:border-white/20"}`}><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><TypeIcon className="text-sky-300" /><p className="font-black">{request.requestNumber}</p><span className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black uppercase ${TONES[tone]}`}><StatusIcon /> {statusLabel}</span></div><p className="mt-2 truncate text-sm font-bold text-slate-300">{typeLabel} | {request.customerName}</p><p className="mt-1 text-xs font-bold text-slate-500">Pedido {request.orderNumber} | {date(request.requestedAt)}</p></div><div className="sm:text-right"><p className="text-sm font-black text-slate-300">{request.lines.reduce((total, line) => total + line.requestedQuantity, 0)} un.</p><p className="mt-1 text-xs font-bold text-slate-500">{request.lines.length} SKU</p></div></button>;
}

function RequestDetail({ request }) {
  const [statusLabel, tone] = STATUS_META[request.status] || [request.status, "slate"];
  const [typeLabel, TypeIcon] = TYPE_META[request.type] || [request.type, FiPackage];
  return <div className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase text-slate-500">{request.requestNumber}</p><h2 className="mt-1 flex items-center gap-2 text-xl font-black"><TypeIcon className="text-sky-300" /> {typeLabel}</h2></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${TONES[tone]}`}>{statusLabel}</span></div><div className="mt-4 rounded-md bg-slate-950 p-3 text-sm"><p className="font-black">{request.customerName}</p><p className="mt-1 text-xs font-bold text-slate-500">{request.customerEmail}</p><p className="mt-1 text-xs font-bold text-slate-500">Pedido {request.orderNumber}</p></div><div className="mt-4 space-y-2">{request.lines.map((line) => <div key={line.sku} className="flex items-center justify-between gap-3 border-b border-white/5 pb-2 text-sm"><div className="min-w-0"><p className="truncate font-black">{line.productName}</p><p className="text-xs font-bold text-slate-500">{line.sku}{line.condition ? ` | ${line.condition}` : ""}</p></div><span className="shrink-0 font-black">{line.requestedQuantity} x {money(line.unitPrice)}</span></div>)}</div><div className="mt-4 text-sm"><p className="font-black text-slate-300">{request.reason}</p>{request.customerNotes && <p className="mt-2 font-semibold leading-5 text-slate-500">{request.customerNotes}</p>}{request.staffResponse && <p className="mt-3 rounded-md border border-sky-400/15 bg-sky-500/5 p-3 text-xs font-bold leading-5 text-sky-100">Respuesta: {request.staffResponse}</p>}{Number(request.refundAmount || 0) > 0 && <p className="mt-3 font-black text-emerald-300">Reembolso: {money(request.refundAmount)}</p>}{request.replacementTrackingCode && <p className="mt-2 text-xs font-black text-sky-300">Tracking reemplazo: {request.replacementTrackingCode}</p>}</div></div>;
}

function ReviewAction({ disabled, onChange, onReview, value }) { return <div><p className="text-xs font-black uppercase text-slate-500">Revision comercial</p><textarea rows={3} maxLength={500} value={value} onChange={(event) => onChange(event.target.value)} placeholder="Respuesta visible para el cliente..." className="mt-3 w-full resize-none rounded-md border border-white/10 bg-slate-950 p-3 text-sm font-semibold outline-none focus:border-sky-400" /><div className="mt-3 grid grid-cols-2 gap-2"><button type="button" disabled={disabled || !value.trim()} onClick={() => onReview(false)} className="h-11 rounded-md border border-red-400/25 text-sm font-black text-red-200 hover:bg-red-500/10 disabled:opacity-40">Rechazar</button><button type="button" disabled={disabled || !value.trim()} onClick={() => onReview(true)} className="h-11 rounded-md bg-sky-500 text-sm font-black text-slate-950 hover:bg-sky-400 disabled:opacity-40">Aprobar</button></div></div>; }

function ReceiveAction({ disabled, lines, onChange, onReceive, onWarehouse, warehouseCode, warehouses }) { return <div><p className="text-xs font-black uppercase text-slate-500">Recepcion fisica</p><label className="mt-3 block text-xs font-black text-slate-500">Bodega<select value={warehouseCode} onChange={(event) => onWarehouse(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none">{warehouses.map((warehouse) => <option key={warehouse.code} value={warehouse.code}>{warehouse.code} - {warehouse.name}</option>)}</select></label><div className="mt-3 space-y-3">{lines.map((line) => <div key={line.sku} className="rounded-md border border-white/10 bg-slate-950 p-3"><p className="text-sm font-black">{line.sku} | {line.receivedQuantity} un.</p><div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2"><select value={line.condition} onChange={(event) => onChange(line.sku, "condition", event.target.value)} className="h-11 rounded-md border border-white/10 bg-slate-900 px-2 text-xs font-bold"><option value="SEALED">Sellado</option><option value="OPENED">Abierto y apto</option><option value="DEFECTIVE">Defectuoso</option><option value="DAMAGED">Danado</option></select><label className="text-[10px] font-black uppercase text-slate-500">Reponer<input type="number" min="0" max={line.receivedQuantity} disabled={["DEFECTIVE", "DAMAGED"].includes(line.condition)} value={line.restockQuantity} onChange={(event) => onChange(line.sku, "restockQuantity", event.target.value)} className="mt-1 h-8 w-full rounded-md border border-white/10 bg-slate-900 px-2 text-sm text-white disabled:opacity-40" /></label></div></div>)}</div><button type="button" disabled={disabled || !warehouseCode || warehouses.length === 0} onClick={onReceive} className="mt-3 h-11 w-full rounded-md bg-violet-500 text-sm font-black hover:bg-violet-400 disabled:opacity-40">Confirmar recepcion</button></div>; }

function ResolveAction({ disabled, notes, onNotes, onResolution, onResolve, options, resolution }) { return <div><p className="text-xs font-black uppercase text-slate-500">Resolucion final</p><div className="mt-3 grid gap-2 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">{options.map((option) => <button key={option.id} type="button" onClick={() => onResolution(option.id)} className={`min-h-11 rounded-md border px-2 text-xs font-black ${resolution === option.id ? "border-emerald-400 bg-emerald-500/10 text-emerald-200" : "border-white/10 text-slate-400"}`}>{option.label}</button>)}</div><textarea rows={3} maxLength={500} value={notes} onChange={(event) => onNotes(event.target.value)} placeholder="Detalle de la solucion informada al cliente..." className="mt-3 w-full resize-none rounded-md border border-white/10 bg-slate-950 p-3 text-sm font-semibold outline-none focus:border-emerald-400" /><button type="button" disabled={disabled || !notes.trim()} onClick={onResolve} className="mt-3 h-11 w-full rounded-md bg-emerald-500 text-sm font-black text-slate-950 hover:bg-emerald-400 disabled:opacity-40">Cerrar solicitud</button></div>; }

function resolutionOptions(type) { if (type === "RETURN") return [{ id: "REFUND", label: "Reembolso" }]; if (type === "EXCHANGE") return [{ id: "REPLACEMENT", label: "Reemplazo" }, { id: "REFUND", label: "Reembolso" }]; return [{ id: "REPAIR", label: "Reparacion" }, { id: "REPLACEMENT", label: "Reemplazo" }, { id: "REFUND", label: "Reembolso" }]; }
function actionAvailable(status, canReview, canReceive, canResolve) { return (status === "REQUESTED" && canReview) || (status === "APPROVED" && canReceive) || (status === "RECEIVED" && canResolve); }
function Loading() { return <div className="flex items-center justify-center gap-3 rounded-md border border-white/10 p-10 font-black text-slate-500"><FiRefreshCw className="animate-spin" /> Cargando solicitudes...</div>; }
function Empty() { return <div className="rounded-md border border-dashed border-white/15 p-10 text-center text-slate-500"><FiRotateCcw className="mx-auto" size={28} /><p className="mt-3 font-black">No hay solicitudes para estos filtros.</p></div>; }

export default ReturnsPage;
