import { FiCheckCircle, FiClock, FiPackage, FiRotateCcw, FiShield, FiXCircle } from "react-icons/fi";

const STATUS = {
  REQUESTED: ["En revision", "amber", FiClock],
  APPROVED: ["Aprobada para entrega", "sky", FiPackage],
  REJECTED: ["Rechazada", "red", FiXCircle],
  RECEIVED: ["Recibida en bodega", "violet", FiPackage],
  RESOLVED: ["Resuelta", "emerald", FiCheckCircle],
  CANCELLED: ["Cancelada", "slate", FiXCircle],
};

const TYPES = {
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

function CustomerPostSalesPanel({ cancelling, onCancel, requests }) {
  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-black uppercase text-sky-300">Seguimiento posterior a la compra</p>
        <h1 className="mt-1 text-3xl font-black">Mi postventa</h1>
        <p className="mt-2 font-semibold text-slate-400">Devoluciones, cambios y garantias asociados a tu cuenta.</p>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-md border border-dashed border-white/15 p-10 text-center text-slate-400">
          <FiRotateCcw className="mx-auto" size={30} />
          <p className="mt-4 font-black">No tienes solicitudes de postventa.</p>
          <p className="mt-2 text-sm font-semibold text-slate-500">Puedes iniciarlas desde el detalle de una compra entregada.</p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {requests.map((request) => {
            const [statusLabel, tone, StatusIcon] = STATUS[request.status] || [request.status, "slate", FiClock];
            const [typeLabel, TypeIcon] = TYPES[request.type] || [request.type, FiPackage];
            return (
              <article key={request.requestNumber} className="rounded-md border border-white/10 bg-slate-900 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase text-slate-500">{request.requestNumber}</p>
                    <h2 className="mt-1 flex items-center gap-2 text-lg font-black"><TypeIcon className="text-sky-300" /> {typeLabel}</h2>
                    <p className="mt-1 text-xs font-bold text-slate-500">Pedido {request.orderNumber} | {date(request.requestedAt)}</p>
                  </div>
                  <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${TONES[tone]}`}><StatusIcon /> {statusLabel}</span>
                </div>

                <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
                  {request.lines.map((line) => (
                    <div key={line.sku} className="flex items-center justify-between gap-3 text-sm">
                      <div className="min-w-0"><p className="truncate font-black">{line.productName}</p><p className="text-xs font-bold text-slate-500">{line.sku}</p></div>
                      <span className="shrink-0 font-black text-slate-300">{line.requestedQuantity} un.</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-md bg-slate-950 p-3 text-sm">
                  <p className="font-black text-slate-300">{request.reason}</p>
                  {request.staffResponse && <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">Respuesta: {request.staffResponse}</p>}
                  {Number(request.refundAmount || 0) > 0 && <p className="mt-2 text-xs font-black text-emerald-300">Reembolso: {money(request.refundAmount)}</p>}
                  {request.replacementTrackingCode && <p className="mt-2 text-xs font-black text-sky-300">Seguimiento reemplazo: {request.replacementTrackingCode}</p>}
                </div>

                {request.status === "REQUESTED" && (
                  <button type="button" disabled={cancelling} onClick={() => onCancel(request.requestNumber)} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-md border border-red-400/25 text-sm font-black text-red-200 hover:bg-red-500/10 disabled:opacity-50"><FiXCircle /> Cancelar solicitud</button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default CustomerPostSalesPanel;
