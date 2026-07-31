import { useEffect, useMemo, useState } from "react";
import { FiPackage, FiRotateCcw, FiShield, FiX } from "react-icons/fi";

const TYPE_OPTIONS = [
  { id: "RETURN", label: "Devolucion", icon: FiRotateCcw, help: "Reembolso de productos recibidos." },
  { id: "EXCHANGE", label: "Cambio", icon: FiPackage, help: "Reemplazo por otra unidad del mismo producto." },
  { id: "WARRANTY", label: "Garantia", icon: FiShield, help: "Revision por falla, reparacion o reemplazo." },
];

const REASONS = {
  RETURN: ["No era lo que esperaba", "Compra por error", "Producto sin uso", "Otro motivo"],
  EXCHANGE: ["Producto incorrecto", "Incompatibilidad", "Falla al recibir", "Otro motivo"],
  WARRANTY: ["No enciende", "Falla intermitente", "Danado durante uso normal", "Otro motivo"],
};

function PostSaleRequestModal({ error, loading, onClose, onSubmit, order, productsBySku }) {
  const [type, setType] = useState("RETURN");
  const [reason, setReason] = useState(REASONS.RETURN[0]);
  const [notes, setNotes] = useState("");
  const [quantities, setQuantities] = useState({});

  useEffect(() => {
    if (!order) return;
    setType("RETURN");
    setReason(REASONS.RETURN[0]);
    setNotes("");
    setQuantities({});
  }, [order]);

  const selectedLines = useMemo(() => (order?.lines || [])
    .filter((line) => Number(quantities[line.sku] || 0) > 0)
    .map((line) => ({ sku: line.sku, quantity: Number(quantities[line.sku]) })), [order, quantities]);

  if (!order) return null;

  function changeType(nextType) {
    setType(nextType);
    setReason(REASONS[nextType][0]);
  }

  function submit(event) {
    event.preventDefault();
    if (selectedLines.length === 0) return;
    const preferredResolution = type === "RETURN"
      ? "REFUND"
      : type === "EXCHANGE" ? "REPLACEMENT" : "REPAIR";
    onSubmit({ type, preferredResolution, reason, notes, lines: selectedLines });
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/85 p-3 backdrop-blur-sm" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="post-sale-title" className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-md border border-white/15 bg-slate-900 text-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/10 bg-slate-900 p-5">
          <div>
            <p className="text-xs font-black uppercase text-sky-300">Pedido {order.orderNumber}</p>
            <h2 id="post-sale-title" className="mt-1 text-xl font-black">Solicitar postventa</h2>
          </div>
          <button type="button" onClick={onClose} disabled={loading} title="Cerrar" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-white/10 text-slate-300 hover:bg-white/5"><FiX /></button>
        </div>

        <form onSubmit={submit} className="p-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {TYPE_OPTIONS.map(({ id, label, icon: Icon, help }) => (
              <button key={id} type="button" onClick={() => changeType(id)} className={`min-h-28 rounded-md border p-4 text-left transition ${type === id ? "border-sky-400 bg-sky-500/10" : "border-white/10 bg-slate-950 hover:border-white/20"}`}>
                <Icon className={type === id ? "text-sky-300" : "text-slate-500"} size={20} />
                <p className="mt-3 text-sm font-black">{label}</p>
                <p className="mt-1 text-xs font-semibold leading-4 text-slate-500">{help}</p>
              </button>
            ))}
          </div>

          <fieldset className="mt-6">
            <legend className="text-xs font-black uppercase text-slate-500">Productos y cantidades</legend>
            <div className="mt-3 space-y-2">
              {order.lines.map((line) => {
                const product = productsBySku.get(line.sku);
                const quantity = Number(quantities[line.sku] || 0);
                return (
                  <div key={line.sku} className="grid grid-cols-[minmax(0,1fr)_88px] items-center gap-3 rounded-md border border-white/10 bg-slate-950 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black">{product?.productName || line.sku}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">{line.sku} | Compraste {line.quantity}</p>
                    </div>
                    <select aria-label={`Cantidad de ${line.sku}`} value={quantity} onChange={(event) => setQuantities((current) => ({ ...current, [line.sku]: Number(event.target.value) }))} className="h-11 rounded-md border border-white/10 bg-slate-900 px-2 text-sm font-black outline-none focus:border-sky-400">
                      {Array.from({ length: line.quantity + 1 }, (_, index) => <option key={index} value={index}>{index}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>
          </fieldset>

          <label className="mt-5 block">
            <span className="mb-2 block text-xs font-black uppercase text-slate-500">Motivo</span>
            <select value={reason} onChange={(event) => setReason(event.target.value)} className="h-11 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-sm font-bold outline-none focus:border-sky-400">
              {REASONS[type].map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>

          <label className="mt-4 block">
            <span className="mb-2 block text-xs font-black uppercase text-slate-500">Describe el caso</span>
            <textarea required maxLength={500} rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Cuenta brevemente que ocurrio y el estado del producto..." className="w-full resize-none rounded-md border border-white/10 bg-slate-950 p-3 text-sm font-semibold outline-none placeholder:text-slate-600 focus:border-sky-400" />
          </label>

          <p className="mt-4 rounded-md border border-amber-400/20 bg-amber-500/10 p-3 text-xs font-bold leading-5 text-amber-100">
            Conserva el producto y sus accesorios. El equipo revisara tu solicitud antes de autorizar la entrega en bodega.
          </p>
          {error && <p className="mt-3 rounded-md border border-red-400/20 bg-red-500/10 p-3 text-sm font-bold text-red-200">{error}</p>}

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={loading} className="h-11 rounded-md border border-white/10 px-5 text-sm font-black text-slate-300 hover:bg-white/5">Cancelar</button>
            <button disabled={loading || selectedLines.length === 0 || !notes.trim()} className="h-11 rounded-md bg-sky-500 px-5 text-sm font-black text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50">{loading ? "Enviando..." : "Enviar solicitud"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PostSaleRequestModal;
