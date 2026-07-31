import { useEffect, useState } from "react";
import { FiAlertTriangle, FiX } from "react-icons/fi";

function CancelOrderModal({ error, loading, onClose, onConfirm, orderNumber }) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    setReason("");
  }, [orderNumber]);

  if (!orderNumber) return null;

  const cleanReason = reason.trim();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 p-4" role="presentation">
      <section className="max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-md border border-white/15 bg-slate-900 p-4 text-white shadow-2xl sm:p-5" role="dialog" aria-modal="true" aria-labelledby="cancel-order-title">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-red-500/15 text-red-300"><FiAlertTriangle /></span>
            <div>
              <h2 id="cancel-order-title" className="text-xl font-black">Cancelar pedido</h2>
              <p className="mt-1 text-sm font-semibold text-slate-400">{orderNumber}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={loading} title="Cerrar" className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-slate-400 hover:text-white disabled:opacity-50"><FiX /></button>
        </div>

        <p className="mt-5 text-sm font-semibold leading-6 text-slate-300">Se cancelara el envio, se liberara el inventario reservado y, si el pago fue aprobado, se registrara el reembolso.</p>
        {error && <p className="mt-4 rounded-md border border-red-400/25 bg-red-500/10 p-3 text-sm font-bold text-red-200">{error}</p>}
        <label className="mt-5 block text-xs font-black uppercase text-slate-500" htmlFor="cancellation-reason">Motivo de cancelacion</label>
        <textarea id="cancellation-reason" value={reason} onChange={(event) => setReason(event.target.value)} disabled={loading} maxLength={250} rows={4} placeholder="Ej: seleccione el producto equivocado" className="mt-2 w-full resize-none rounded-md border border-white/10 bg-slate-950 px-4 py-3 text-sm font-semibold outline-none placeholder:text-slate-600 focus:border-sky-400 disabled:opacity-50" />
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={onClose} disabled={loading} className="h-11 rounded-md border border-white/15 text-sm font-black text-slate-300 hover:bg-white/5 disabled:opacity-50">Volver</button>
          <button type="button" onClick={() => onConfirm(cleanReason)} disabled={loading || cleanReason.length < 5} className="h-11 rounded-md bg-red-500 text-sm font-black text-white hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50">{loading ? "Cancelando..." : "Confirmar cancelacion"}</button>
        </div>
      </section>
    </div>
  );
}

export default CancelOrderModal;
