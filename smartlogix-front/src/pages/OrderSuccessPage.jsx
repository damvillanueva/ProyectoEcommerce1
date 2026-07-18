import { useEffect, useMemo, useState } from "react";
import {
  FiAlertCircle,
  FiArrowLeft,
  FiCalendar,
  FiCheck,
  FiClock,
  FiCreditCard,
  FiFileText,
  FiHome,
  FiMapPin,
  FiPackage,
  FiPrinter,
  FiRefreshCw,
  FiShield,
  FiShoppingBag,
  FiTruck,
  FiXCircle,
} from "react-icons/fi";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import logo from "../assets/logo-smartlogix.png";
import { clearLogin } from "../services/authService";
import { getPublicCatalogProducts } from "../services/inventoryService";
import { loadMyOrder, loadMyOrderTracking } from "../services/orderService";
import "../styles/order-success.css";

const DELIVERY_STEPS = [
  { icon: FiShoppingBag, label: "Pedido recibido" },
  { icon: FiCreditCard, label: "Pago confirmado" },
  { icon: FiPackage, label: "Preparando" },
  { icon: FiTruck, label: "En camino" },
  { icon: FiHome, label: "Entregado" },
];

const PICKUP_STEPS = [
  { icon: FiShoppingBag, label: "Pedido recibido" },
  { icon: FiPackage, label: "Preparando retiro" },
  { icon: FiMapPin, label: "Retiro en sucursal" },
];

function formatCurrency(value) {
  return new Intl.NumberFormat("es-CL", {
    currency: "CLP",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(Number(value) || 0);
}

function formatDate(value, includeTime = true) {
  if (!value) return "Sin fecha";
  const options = includeTime
    ? { dateStyle: "long", timeStyle: "short" }
    : { dateStyle: "long" };
  return new Intl.DateTimeFormat("es-CL", options).format(new Date(value));
}

function paymentMethodLabel(value) {
  return {
    BANK_TRANSFER_SIMULATED: "Transferencia simulada",
    PAY_ON_PICKUP: "Pago al retirar",
    WEBPAY_SIMULATED: "Webpay simulado",
  }[value] || value || "Sin informacion";
}

function paymentStatusLabel(value) {
  return {
    PAID: "Pago confirmado",
    PENDING: "Pago pendiente",
    REJECTED: "Pago rechazado",
  }[value] || value || "Sin informacion";
}

function paymentStatusTone(value) {
  if (value === "PAID") return "text-emerald-300";
  if (value === "REJECTED") return "text-red-300";
  return "text-amber-300";
}

function deliveryLabel(order) {
  if (order.fulfillmentMethod === "PICKUP") return "Retiro en sucursal";
  return order.shippingMethod === "EXPRESS" ? "Despacho express" : "Despacho estandar";
}

function currentTrackingStep(order, tracking) {
  if (["REJECTED", "FAILED"].includes(order.status)) return -1;
  if (order.fulfillmentMethod === "PICKUP") {
    return order.status === "PENDING" ? 0 : 1;
  }
  if (tracking?.shipmentStatus === "DELIVERED") return 4;
  if (["PICKED_UP", "IN_TRANSIT"].includes(tracking?.shipmentStatus)) return 3;
  if (tracking?.shipmentStatus === "PLANNED" || order.status === "SHIPMENT_REQUESTED") return 2;
  if (order.status === "APPROVED") return 1;
  return 0;
}

function statusMeta(order, tracking) {
  if (order.paymentStatus === "REJECTED") {
    return {
      label: "Pago rechazado",
      tone: "red",
      detail: order.paymentFailureReason || order.rejectionReason,
    };
  }
  if (order.status === "REJECTED") {
    return { label: "Pedido rechazado", tone: "red", detail: order.rejectionReason };
  }
  if (order.status === "FAILED") {
    return { label: "Requiere revision", tone: "red", detail: order.rejectionReason };
  }
  if (order.fulfillmentMethod === "PICKUP") {
    return {
      label: "Preparando retiro",
      tone: "amber",
      detail: `Te avisaremos cuando puedas acercarte a ${order.pickupLocation}.`,
    };
  }
  if (tracking?.shipmentStatus === "DELIVERED") {
    return { label: "Pedido entregado", tone: "emerald", detail: "El transportista marco la entrega como completada." };
  }
  if (["PICKED_UP", "IN_TRANSIT"].includes(tracking?.shipmentStatus)) {
    return { label: "Pedido en camino", tone: "sky", detail: "Tu compra ya fue recibida por el transportista." };
  }
  return {
    label: "Preparando despacho",
    tone: "violet",
    detail: "Estamos preparando y verificando los productos de tu pedido.",
  };
}

function OrderSuccessPage() {
  const { orderNumber } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [tracking, setTracking] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    let active = true;

    Promise.all([
      loadMyOrder(orderNumber),
      loadMyOrderTracking(orderNumber),
      getPublicCatalogProducts().catch(() => []),
    ])
      .then(([orderData, trackingData, catalogData]) => {
        if (!active) return;
        setOrder(orderData);
        setTracking(trackingData);
        setCatalog(Array.isArray(catalogData) ? catalogData : []);
        setLastUpdated(new Date());
      })
      .catch((loadError) => {
        console.error(loadError);
        if (!active) return;
        if ([401, 403].includes(loadError.response?.status)) {
          clearLogin();
          navigate("/shop/login", { replace: true, state: { returnTo: location.pathname } });
          return;
        }
        setError(loadError.response?.data?.message || "No pudimos cargar este pedido.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [location.pathname, navigate, orderNumber]);

  useEffect(() => {
    if (!orderNumber) return undefined;
    const intervalId = window.setInterval(() => {
      Promise.all([loadMyOrder(orderNumber), loadMyOrderTracking(orderNumber)])
        .then(([orderData, trackingData]) => {
          setOrder(orderData);
          setTracking(trackingData);
          setLastUpdated(new Date());
        })
        .catch(() => {});
    }, 30000);
    return () => window.clearInterval(intervalId);
  }, [orderNumber]);

  const productsBySku = useMemo(
    () => new Map(catalog.map((product) => [product.sku, product])),
    [catalog]
  );

  async function refreshTracking() {
    try {
      setRefreshing(true);
      const [orderData, trackingData] = await Promise.all([
        loadMyOrder(orderNumber),
        loadMyOrderTracking(orderNumber),
      ]);
      setOrder(orderData);
      setTracking(trackingData);
      setLastUpdated(new Date());
      setError("");
    } catch (refreshError) {
      console.error(refreshError);
      setError("No se pudo actualizar el seguimiento en este momento.");
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return <PageState icon={FiPackage} message="Cargando tu pedido..." />;
  }
  if (!order || error) {
    return <PageState error icon={FiAlertCircle} message={error || "El pedido no esta disponible."} />;
  }

  const meta = statusMeta(order, tracking);
  const newOrder = Boolean(location.state?.newOrder);
  const paymentRejected = order.paymentStatus === "REJECTED";

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <OrderHeader />
      <main className="mx-auto max-w-[1450px] px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="no-print">
          <Link to="/shop/account" className="inline-flex items-center gap-2 text-sm font-black text-slate-400 hover:text-white"><FiArrowLeft /> Volver a mis compras</Link>
          {newOrder && (
            <div className={`mt-6 flex items-start gap-3 rounded-md border p-4 ${paymentRejected ? "border-red-400/25 bg-red-500/10 text-red-200" : "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"}`}>
              {paymentRejected ? <FiXCircle className="mt-0.5 shrink-0" size={20} /> : <FiCheck className="mt-0.5 shrink-0" size={20} />}
              <div>
                <p className="font-black">{paymentRejected ? "El pago fue rechazado" : "Compra confirmada correctamente"}</p>
                <p className="mt-1 text-sm font-semibold opacity-75">{paymentRejected ? "No descontamos stock y conservamos tu carrito para que puedas intentarlo nuevamente." : "Guardamos tu pedido y ya puedes revisar su avance desde esta pagina."}</p>
              </div>
            </div>
          )}
          <div className="mt-7 flex flex-col gap-5 border-b border-white/10 pb-7 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase text-sky-300">Pedido {order.orderNumber}</p>
              <h1 className="mt-2 text-3xl font-black sm:text-4xl">Seguimiento de tu compra</h1>
              <p className="mt-2 font-semibold text-slate-400">Realizado el {formatDate(order.createdAt)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge meta={meta} />
              <button type="button" disabled={refreshing} onClick={refreshTracking} className="flex h-11 items-center gap-2 rounded-md border border-white/15 px-4 text-sm font-black text-slate-200 hover:bg-white/5 disabled:opacity-50"><FiRefreshCw className={refreshing ? "animate-spin" : ""} /> Actualizar</button>
            </div>
          </div>
        </div>

        <div className="mt-7 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
          <div className="space-y-6 no-print">
            <TrackingPanel lastUpdated={lastUpdated} meta={meta} order={order} tracking={tracking} />
            <ProductsPanel order={order} productsBySku={productsBySku} />
            <OrderInformation order={order} tracking={tracking} />
          </div>

          <div className="xl:sticky xl:top-6">
            <Receipt order={order} productsBySku={productsBySku} tracking={tracking} />
            <div className="mt-4 grid gap-3 no-print sm:grid-cols-2 xl:grid-cols-1">
              {paymentRejected ? (
                <Link to="/shop/checkout" className="flex h-12 items-center justify-center gap-2 rounded-md bg-emerald-500 px-5 text-sm font-black text-slate-950 hover:bg-emerald-400"><FiRefreshCw /> Intentar el pago nuevamente</Link>
              ) : (
                <button type="button" onClick={() => window.print()} className="flex h-12 items-center justify-center gap-2 rounded-md bg-sky-500 px-5 text-sm font-black hover:bg-sky-400"><FiPrinter /> Imprimir o guardar PDF</button>
              )}
              <Link to="/shop" className="flex h-12 items-center justify-center gap-2 rounded-md border border-white/15 px-5 text-sm font-black text-slate-200 hover:bg-white/5"><FiShoppingBag /> Seguir comprando</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function OrderHeader() {
  return (
    <header className="no-print border-b border-white/10 bg-indigo-950">
      <div className="mx-auto flex min-h-20 max-w-[1500px] items-center justify-between gap-4 px-4 py-3 sm:px-8 lg:px-12">
        <Link to="/shop" className="flex items-center gap-3"><img src={logo} alt="SmartLogix" className="h-8 w-auto" /><span className="hidden border-l border-white/15 pl-3 text-xs font-black uppercase text-sky-300 sm:block">Mi pedido</span></Link>
        <div className="flex items-center gap-2 text-xs font-black text-emerald-300"><FiShield size={18} /> Consulta privada</div>
      </div>
    </header>
  );
}

function TrackingPanel({ lastUpdated, meta, order, tracking }) {
  const pickup = order.fulfillmentMethod === "PICKUP";
  const steps = pickup ? PICKUP_STEPS : DELIVERY_STEPS;
  const currentStep = currentTrackingStep(order, tracking);
  return (
    <section className="rounded-md border border-white/10 bg-slate-900 p-5 sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><p className="text-xs font-black uppercase text-slate-500">Estado actual</p><h2 className="mt-1 text-2xl font-black">{meta.label}</h2><p className="mt-2 max-w-2xl text-sm font-semibold text-slate-400">{meta.detail}</p></div>
        {lastUpdated && <p className="flex shrink-0 items-center gap-2 text-xs font-bold text-slate-500"><FiClock /> Actualizado {lastUpdated.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}</p>}
      </div>

      {currentStep >= 0 && <TrackingSteps currentStep={currentStep} steps={steps} />}

      {!pickup && tracking?.trackingCode && (
        <div className="mt-7 grid gap-4 border-t border-white/10 pt-5 sm:grid-cols-3">
          <InfoBlock icon={FiTruck} label="Transportista" value={tracking.carrier || "Por asignar"} />
          <InfoBlock icon={FiFileText} label="Seguimiento" value={tracking.trackingCode} />
          <InfoBlock icon={FiCalendar} label="Entrega estimada" value={tracking.estimatedDeliveryDate ? formatDate(`${tracking.estimatedDeliveryDate}T12:00:00`, false) : "Por confirmar"} />
        </div>
      )}
    </section>
  );
}

function TrackingSteps({ currentStep, steps }) {
  return (
    <div className={`mt-8 grid gap-3 ${steps.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-5"}`}>
      {steps.map(({ icon: Icon, label }, index) => {
        const done = index < currentStep;
        const current = index === currentStep;
        return (
          <div key={label} className={`flex min-w-0 items-center gap-3 rounded-md border p-3 sm:block sm:text-center ${current ? "border-sky-400/60 bg-sky-500/10" : done ? "border-emerald-400/20 bg-emerald-500/5" : "border-white/10 bg-slate-950/50"}`}>
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border sm:mx-auto ${done ? "border-emerald-400 bg-emerald-500 text-slate-950" : current ? "border-sky-400 bg-sky-500 text-white" : "border-white/10 bg-slate-900 text-slate-600"}`}>{done ? <FiCheck /> : <Icon />}</span>
            <p className={`min-w-0 text-xs font-black sm:mt-3 ${done ? "text-emerald-300" : current ? "text-sky-200" : "text-slate-600"}`}>{label}</p>
          </div>
        );
      })}
    </div>
  );
}

function ProductsPanel({ order, productsBySku }) {
  return (
    <section className="rounded-md border border-white/10 bg-slate-900 p-5 sm:p-7">
      <div><p className="text-xs font-black uppercase text-sky-300">Contenido</p><h2 className="mt-1 text-xl font-black">Productos del pedido</h2></div>
      <div className="mt-5 divide-y divide-white/10 border-y border-white/10">
        {order.lines?.map((line) => {
          const product = productsBySku.get(line.sku);
          return (
            <div key={line.sku} className="flex items-center gap-4 py-4">
              {product?.imageUrl ? <img src={product.imageUrl} alt={product.productName} className="h-16 w-16 shrink-0 rounded-md bg-white object-cover" /> : <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-slate-800 text-slate-500"><FiPackage /></span>}
              <div className="min-w-0 flex-1"><p className="font-black">{product?.productName || line.sku}</p><p className="mt-1 text-xs font-bold text-slate-500">{line.sku} | {line.quantity} x {formatCurrency(line.unitPrice)}</p></div>
              <p className="shrink-0 font-black text-sky-200">{formatCurrency(line.lineAmount)}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function OrderInformation({ order, tracking }) {
  const pickup = order.fulfillmentMethod === "PICKUP";
  return (
    <section className="grid gap-4 md:grid-cols-2">
      <div className="rounded-md border border-white/10 bg-slate-900 p-5"><InfoHeading icon={pickup ? FiMapPin : FiTruck} title="Entrega" /><p className="mt-4 text-sm font-black text-slate-200">{deliveryLabel(order)}</p><p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{pickup ? order.pickupLocation : order.shippingAddress}</p>{order.deliveryInstructions && <p className="mt-3 text-xs font-bold text-slate-500">Indicaciones: {order.deliveryInstructions}</p>}{tracking?.routeCode && <p className="mt-3 text-xs font-black text-sky-300">Ruta {tracking.routeCode}</p>}</div>
      <div className="rounded-md border border-white/10 bg-slate-900 p-5">
        <InfoHeading icon={FiCreditCard} title="Pago" />
        <p className="mt-4 text-sm font-black text-slate-200">{paymentMethodLabel(order.paymentMethod)}</p>
        <p className={`mt-2 text-xs font-black ${paymentStatusTone(order.paymentStatus)}`}>{paymentStatusLabel(order.paymentStatus)}</p>
        {order.paymentFailureReason && <p className="mt-3 text-xs font-bold leading-5 text-red-200">{order.paymentFailureReason}</p>}
        {order.transactionReference && <p className="mt-3 break-all text-xs font-bold text-slate-500">Referencia {order.transactionReference}</p>}
        {order.paymentAuthorizationCode && <p className="mt-2 text-xs font-bold text-slate-500">Autorizacion {order.paymentAuthorizationCode}</p>}
        {order.paymentProcessedAt && <p className="mt-2 text-xs font-bold text-slate-500">Procesado {formatDate(order.paymentProcessedAt)}</p>}
      </div>
    </section>
  );
}

function Receipt({ order, productsBySku, tracking }) {
  return (
    <section className="receipt-print rounded-md border border-white/10 bg-slate-900 p-5 sm:p-7">
      <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5 receipt-divider">
        <div><img src={logo} alt="SmartLogix" className="h-8 w-auto" /><p className="mt-3 text-xs font-black uppercase text-sky-300 receipt-accent">{order.paymentStatus === "REJECTED" ? "Comprobante de intento de pago" : "Comprobante de compra"}</p></div>
        <div className="text-right"><p className="text-xs font-black text-slate-500 receipt-muted">Documento no tributario</p><p className="mt-2 font-black">{order.orderNumber}</p></div>
      </div>

      <div className="grid gap-4 border-b border-white/10 py-5 text-sm sm:grid-cols-2 receipt-divider">
        <ReceiptFact label="Fecha" value={formatDate(order.createdAt)} />
        <ReceiptFact label="Cliente" value={order.customerName} />
        <ReceiptFact label="Correo" value={order.customerEmail} />
        <ReceiptFact label="RUT" value={order.customerDocument || "No informado"} />
      </div>

      <div className="divide-y divide-white/10 border-b border-white/10 py-2 receipt-divider">
        {order.lines?.map((line) => <div key={line.sku} className="flex gap-3 py-3 text-sm"><div className="min-w-0 flex-1"><p className="font-black">{productsBySku.get(line.sku)?.productName || line.sku}</p><p className="mt-1 text-xs font-bold text-slate-500 receipt-muted">{line.quantity} x {formatCurrency(line.unitPrice)}</p></div><p className="shrink-0 font-black">{formatCurrency(line.lineAmount)}</p></div>)}
      </div>

      <div className="space-y-2 border-b border-white/10 py-5 text-sm receipt-divider">
        <ReceiptLine label="Subtotal" value={formatCurrency(order.subtotalAmount)} />
        {Number(order.discountAmount || 0) > 0 && <ReceiptLine label={`Descuento${order.discountCode ? ` (${order.discountCode})` : ""}`} value={`-${formatCurrency(order.discountAmount)}`} />}
        <ReceiptLine label={deliveryLabel(order)} value={Number(order.shippingAmount || 0) > 0 ? formatCurrency(order.shippingAmount) : "Gratis"} />
        <ReceiptLine strong label="Total" value={formatCurrency(order.totalAmount)} />
      </div>

      <div className="space-y-4 py-5 text-sm">
        <ReceiptFact label="Entrega" value={order.fulfillmentMethod === "PICKUP" ? order.pickupLocation : order.shippingAddress} />
        <ReceiptFact label="Pago" value={`${paymentMethodLabel(order.paymentMethod)} | ${paymentStatusLabel(order.paymentStatus)}`} />
        {tracking?.trackingCode && <ReceiptFact label="Seguimiento" value={`${tracking.trackingCode}${tracking.carrier ? ` | ${tracking.carrier}` : ""}`} />}
        {order.transactionReference && <ReceiptFact label="Referencia de transaccion" value={order.transactionReference} />}
        {order.paymentAuthorizationCode && <ReceiptFact label="Codigo de autorizacion" value={order.paymentAuthorizationCode} />}
        {order.paymentProcessedAt && <ReceiptFact label="Fecha del pago" value={formatDate(order.paymentProcessedAt)} />}
        {order.paymentFailureReason && <ReceiptFact label="Motivo del rechazo" value={order.paymentFailureReason} />}
      </div>

      <p className="border-t border-white/10 pt-4 text-[11px] font-semibold leading-5 text-slate-500 receipt-divider receipt-muted">Este comprobante registra el pedido y el resultado de su pago en SmartLogix. No reemplaza una boleta o factura tributaria.</p>
    </section>
  );
}

function PageState({ error = false, icon: Icon, message }) {
  return <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white"><div className="max-w-md text-center"><Icon className={`mx-auto ${error ? "text-red-300" : "animate-pulse text-sky-300"}`} size={34} /><p className="mt-4 font-black">{message}</p><Link to="/shop/account" className="mt-5 inline-flex h-11 items-center rounded-md border border-white/15 px-5 text-sm font-black">Volver a mi cuenta</Link></div></div>;
}

function StatusBadge({ meta }) {
  const colors = { amber: "bg-amber-500/15 text-amber-300", emerald: "bg-emerald-500/15 text-emerald-300", red: "bg-red-500/15 text-red-300", sky: "bg-sky-500/15 text-sky-300", violet: "bg-violet-500/15 text-violet-300" };
  return <span className={`inline-flex h-10 items-center rounded-full px-4 text-xs font-black uppercase ${colors[meta.tone]}`}>{meta.label}</span>;
}

function InfoBlock({ icon: Icon, label, value }) {
  return <div className="min-w-0"><p className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500"><Icon /> {label}</p><p className="mt-2 break-words text-sm font-black text-slate-200">{value}</p></div>;
}

function InfoHeading({ icon: Icon, title }) {
  return <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-sky-500/15 text-sky-300"><Icon /></span><h2 className="font-black">{title}</h2></div>;
}

function ReceiptFact({ label, value }) {
  return <div><p className="text-[10px] font-black uppercase text-slate-500 receipt-muted">{label}</p><p className="mt-1 break-words font-bold">{value}</p></div>;
}

function ReceiptLine({ label, strong, value }) {
  return <div className={`flex items-center justify-between gap-4 ${strong ? "border-t border-white/10 pt-3 text-lg font-black receipt-divider" : "font-bold text-slate-400 receipt-muted"}`}><span>{label}</span><span className={strong ? "text-sky-200 receipt-accent" : "text-slate-200"}>{value}</span></div>;
}

export default OrderSuccessPage;
