import { useEffect, useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiCheck,
  FiClock,
  FiCreditCard,
  FiHome,
  FiLock,
  FiMapPin,
  FiPackage,
  FiShield,
  FiShoppingBag,
  FiTruck,
} from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/logo-smartlogix.png";
import { loadCustomerProfile } from "../services/customerAccountService";
import { getPublicCatalogProducts } from "../services/inventoryService";
import { saveOrder } from "../services/orderService";

const CART_STORAGE_KEY = "smartlogix-store-cart";
const DELIVERY_FEE = 4990;
const FREE_SHIPPING_THRESHOLD = 150000;
const STEPS = ["Entrega", "Pago", "Confirmacion"];
const PICKUP_LOCATIONS = [
  "Sucursal Santiago Centro - Alameda 1234",
  "Sucursal Providencia - Nueva Providencia 2040",
  "Sucursal Las Condes - Apoquindo 4501",
];

function readCart() {
  try {
    const value = JSON.parse(localStorage.getItem(CART_STORAGE_KEY));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function formatCurrency(value) {
  return new Intl.NumberFormat("es-CL", {
    currency: "CLP",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(Number(value) || 0);
}

function composeShippingAddress(street, commune) {
  return `${street.trim()}, ${commune.trim()}`;
}

function CheckoutPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [cart, setCart] = useState(readCart);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [fulfillmentMethod, setFulfillmentMethod] = useState("DELIVERY");
  const [paymentMethod, setPaymentMethod] = useState("WEBPAY_SIMULATED");
  const [pickupLocation, setPickupLocation] = useState(PICKUP_LOCATIONS[0]);
  const [customer, setCustomer] = useState({
    name: "",
    email: "",
    street: "",
    commune: "",
  });
  const [order, setOrder] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([getPublicCatalogProducts(), loadCustomerProfile()])
      .then(([catalog, profile]) => {
        if (!active) return;
        const defaultAddress = profile.addresses?.find((address) => address.defaultAddress)
          || profile.addresses?.[0];
        setProducts(Array.isArray(catalog) ? catalog : []);
        setCustomer({
          name: profile.displayName || profile.username || "",
          email: profile.email || "",
          street: defaultAddress?.street || "",
          commune: defaultAddress?.commune || "",
        });
      })
      .catch((loadError) => {
        console.error(loadError);
        if (active) setError("No se pudo preparar el checkout. Intenta nuevamente.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  const cartProducts = useMemo(
    () => cart.map((cartItem) => {
      const product = products.find((item) => item.sku === cartItem.sku);
      if (!product) return null;
      const price = Number(product.salePrice || 0);
      return {
        ...product,
        availableUnits: Number(product.availableQuantity || 0),
        cartQuantity: cartItem.quantity,
        lineTotal: price * cartItem.quantity,
        price,
      };
    }).filter(Boolean),
    [cart, products]
  );

  const subtotal = cartProducts.reduce((total, product) => total + product.lineTotal, 0);
  const shippingAmount = fulfillmentMethod === "PICKUP" || subtotal >= FREE_SHIPPING_THRESHOLD
    ? 0
    : DELIVERY_FEE;
  const estimatedTotal = subtotal + shippingAmount;

  function updateCustomer(event) {
    const { name, value } = event.target;
    setCustomer((current) => ({ ...current, [name]: value }));
  }

  function validateStep(currentStep) {
    if (currentStep === 1) {
      if (cartProducts.length === 0) return "Tu carrito esta vacio.";
      const unavailable = cartProducts.find((product) => product.cartQuantity > product.availableUnits);
      if (unavailable) return `No hay stock suficiente para ${unavailable.productName}.`;
      if (!customer.name.trim() || !customer.email.trim()) return "Completa el nombre y correo del cliente.";
      if (fulfillmentMethod === "DELIVERY" && (!customer.street.trim() || !customer.commune.trim())) {
        return "Completa la direccion y comuna de despacho.";
      }
      if (fulfillmentMethod === "PICKUP" && !pickupLocation) return "Selecciona una sucursal de retiro.";
    }
    if (currentStep === 2 && !paymentMethod) return "Selecciona un medio de pago.";
    return "";
  }

  function goNext() {
    const validationError = validateStep(step);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setStep((current) => Math.min(current + 1, 2));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function confirmOrder() {
    const validationError = validateStep(2);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      const response = await saveOrder({
        customerName: customer.name.trim(),
        customerEmail: customer.email.trim(),
        discountCode: discountCode.trim() || null,
        fulfillmentMethod,
        lines: cartProducts.map((product) => ({
          quantity: product.cartQuantity,
          sku: product.sku,
        })),
        paymentMethod,
        pickupLocation: fulfillmentMethod === "PICKUP" ? pickupLocation : null,
        shippingAddress: fulfillmentMethod === "DELIVERY"
          ? composeShippingAddress(customer.street, customer.commune)
          : null,
      });
      setOrder(response);
      setCart([]);
      setStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (checkoutError) {
      console.error(checkoutError);
      setError(checkoutError.response?.data?.message
        || "No se pudo completar la compra. Revisa el stock y el codigo de descuento.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <CheckoutHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
        <div className="mb-8">
          <p className="text-xs font-black uppercase text-sky-300">Checkout protegido</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Finaliza tu compra</h1>
        </div>

        <StepIndicator currentStep={step} />

        {loading ? (
          <div className="mt-8 border border-white/10 bg-slate-900 p-8 text-center font-bold text-slate-400">Preparando tu carrito...</div>
        ) : step === 3 && order ? (
          <Confirmation order={order} />
        ) : (
          <div className="mt-8 grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="border border-white/10 bg-slate-900 p-5 sm:p-7">
              {error && <ErrorMessage>{error}</ErrorMessage>}
              {step === 1 && (
                <DeliveryStep
                  customer={customer}
                  fulfillmentMethod={fulfillmentMethod}
                  onCustomerChange={updateCustomer}
                  onFulfillmentChange={(value) => {
                    setFulfillmentMethod(value);
                    if (value === "DELIVERY" && paymentMethod === "PAY_ON_PICKUP") {
                      setPaymentMethod("WEBPAY_SIMULATED");
                    }
                  }}
                  onPickupChange={setPickupLocation}
                  pickupLocation={pickupLocation}
                />
              )}
              {step === 2 && (
                <PaymentStep
                  fulfillmentMethod={fulfillmentMethod}
                  onPaymentChange={setPaymentMethod}
                  paymentMethod={paymentMethod}
                />
              )}

              <div className="mt-8 flex flex-col-reverse gap-3 border-t border-white/10 pt-6 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={() => step === 1 ? navigate("/shop/cart") : setStep((current) => current - 1)}
                  className="flex h-11 items-center justify-center gap-2 rounded-md border border-white/15 px-5 text-sm font-black text-slate-300 hover:bg-white/5"
                >
                  <FiArrowLeft /> {step === 1 ? "Volver al carrito" : "Volver"}
                </button>
                {step < 2 ? (
                  <button type="button" onClick={goNext} className="h-11 rounded-md bg-sky-500 px-7 text-sm font-black hover:bg-sky-400">
                    Continuar
                  </button>
                ) : (
                  <button type="button" disabled={submitting} onClick={confirmOrder} className="flex h-11 items-center justify-center gap-2 rounded-md bg-emerald-500 px-7 text-sm font-black text-slate-950 hover:bg-emerald-400 disabled:opacity-60">
                    <FiLock /> {submitting ? "Procesando..." : "Confirmar y pagar"}
                  </button>
                )}
              </div>
            </section>

            <OrderSummary
              discountCode={discountCode}
              fulfillmentMethod={fulfillmentMethod}
              onDiscountChange={setDiscountCode}
              shippingAmount={shippingAmount}
              subtotal={subtotal}
              total={estimatedTotal}
            />
          </div>
        )}
      </main>
    </div>
  );
}

function CheckoutHeader() {
  return (
    <header className="border-b border-white/10 bg-indigo-950">
      <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-4 py-3 lg:px-6">
        <Link to="/shop" className="flex items-center gap-3">
          <img src={logo} alt="SmartLogix" className="h-8 w-auto" />
          <span className="hidden border-l border-white/15 pl-3 text-xs font-black uppercase text-sky-300 sm:block">Pago seguro</span>
        </Link>
        <div className="flex items-center gap-2 text-xs font-black text-emerald-300"><FiShield size={18} /> Sesion protegida</div>
      </div>
    </header>
  );
}

function StepIndicator({ currentStep }) {
  return (
    <ol className="grid grid-cols-4 border border-white/10 bg-slate-900">
      {STEPS.map((label, index) => {
        const number = index + 1;
        const done = number < currentStep;
        const active = number === currentStep;
        return (
          <li key={label} className={`flex min-h-20 items-center justify-center gap-2 border-r border-white/10 px-2 last:border-r-0 ${active ? "bg-sky-500/10" : ""}`}>
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${done ? "bg-emerald-400 text-slate-950" : active ? "bg-sky-500 text-white" : "bg-slate-800 text-slate-500"}`}>
              {done ? <FiCheck /> : number}
            </span>
            <span className={`hidden text-xs font-black sm:block ${active || done ? "text-white" : "text-slate-600"}`}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function DeliveryStep({ customer, fulfillmentMethod, onCustomerChange, onFulfillmentChange, onPickupChange, pickupLocation }) {
  return (
    <div>
      <StepHeading eyebrow="Paso 1" title="Como quieres recibirlo" description="Elige despacho a domicilio o retiro gratis en una sucursal." />
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <ChoiceButton active={fulfillmentMethod === "DELIVERY"} icon={FiTruck} label="Despacho a domicilio" note="$4.990 o gratis sobre $150.000" onClick={() => onFulfillmentChange("DELIVERY")} />
        <ChoiceButton active={fulfillmentMethod === "PICKUP"} icon={FiHome} label="Retiro en tienda" note="Gratis, sin generar despacho" onClick={() => onFulfillmentChange("PICKUP")} />
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        <CheckoutInput label="Nombre de quien recibe" name="name" onChange={onCustomerChange} value={customer.name} />
        <CheckoutInput label="Correo de contacto" name="email" onChange={onCustomerChange} type="email" value={customer.email} />
        {fulfillmentMethod === "DELIVERY" ? (
          <>
            <CheckoutInput label="Direccion" name="street" onChange={onCustomerChange} value={customer.street} />
            <CheckoutInput label="Comuna" name="commune" onChange={onCustomerChange} value={customer.commune} />
          </>
        ) : (
          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-black text-slate-300">Sucursal de retiro</span>
            <span className="relative block">
              <FiMapPin className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sky-300" />
              <select value={pickupLocation} onChange={(event) => onPickupChange(event.target.value)} className="field-control pl-11">
                {PICKUP_LOCATIONS.map((location) => <option key={location} value={location} className="bg-slate-900">{location}</option>)}
              </select>
            </span>
          </label>
        )}
      </div>
    </div>
  );
}

function PaymentStep({ fulfillmentMethod, onPaymentChange, paymentMethod }) {
  return (
    <div>
      <StepHeading eyebrow="Paso 2" title="Elige como pagar" description="Esta demo simula la aprobacion sin solicitar datos bancarios reales." />
      <div className="mt-6 space-y-3">
        <ChoiceButton active={paymentMethod === "WEBPAY_SIMULATED"} icon={FiCreditCard} label="Webpay simulado" note="Pago aprobado al confirmar" onClick={() => onPaymentChange("WEBPAY_SIMULATED")} wide />
        <ChoiceButton active={paymentMethod === "BANK_TRANSFER_SIMULATED"} icon={FiShoppingBag} label="Transferencia simulada" note="Genera una referencia de transaccion" onClick={() => onPaymentChange("BANK_TRANSFER_SIMULATED")} wide />
        {fulfillmentMethod === "PICKUP" && <ChoiceButton active={paymentMethod === "PAY_ON_PICKUP"} icon={FiClock} label="Pagar al retirar" note="El pago queda pendiente hasta la entrega" onClick={() => onPaymentChange("PAY_ON_PICKUP")} wide />}
      </div>
      <div className="mt-7 flex gap-3 border border-sky-400/20 bg-sky-500/10 p-4 text-sm font-bold text-sky-100">
        <FiShield className="mt-0.5 shrink-0" />
        <p>No se solicitan numeros de tarjeta, claves ni datos bancarios. Solo se guarda el medio elegido y una referencia ficticia.</p>
      </div>
    </div>
  );
}

function OrderSummary({ discountCode, fulfillmentMethod, onDiscountChange, shippingAmount, subtotal, total }) {
  const remaining = Math.max(FREE_SHIPPING_THRESHOLD - subtotal, 0);
  return (
    <aside className="border border-white/10 bg-slate-900 p-5 lg:sticky lg:top-6">
      <h2 className="text-lg font-black">Resumen</h2>
      <label className="mt-5 block">
        <span className="mb-2 block text-[11px] font-black uppercase text-slate-500">Codigo de descuento</span>
        <input value={discountCode} onChange={(event) => onDiscountChange(event.target.value.toUpperCase())} placeholder="Ej: BIENVENIDA10" className="field-control" />
      </label>
      <div className="mt-5 space-y-3 border-y border-white/10 py-5 text-sm font-bold">
        <SummaryLine label="Subtotal" value={formatCurrency(subtotal)} />
        <SummaryLine label="Descuento" value={discountCode ? "Se calcula al pagar" : "-"} />
        <SummaryLine label={fulfillmentMethod === "PICKUP" ? "Retiro" : "Despacho"} value={shippingAmount ? formatCurrency(shippingAmount) : "Gratis"} />
      </div>
      <div className="flex items-center justify-between py-5">
        <span className="text-sm font-black uppercase text-slate-400">Total estimado</span>
        <span className="text-2xl font-black text-sky-200">{formatCurrency(total)}</span>
      </div>
      {fulfillmentMethod === "DELIVERY" && remaining > 0 && (
        <div className="border-t border-white/10 pt-4 text-xs font-bold text-slate-500">
          Agrega {formatCurrency(remaining)} para obtener despacho gratis.
        </div>
      )}
      <div className="mt-5 space-y-3 border-t border-white/10 pt-5 text-xs font-bold text-slate-500">
        <p className="flex items-center gap-2"><FiLock className="text-emerald-300" /> Compra asociada a tu cuenta</p>
        <p className="flex items-center gap-2"><FiPackage className="text-amber-300" /> Stock validado por el backend</p>
      </div>
    </aside>
  );
}

function Confirmation({ order }) {
  const pickup = order.fulfillmentMethod === "PICKUP";
  return (
    <section className="mx-auto mt-8 max-w-3xl border border-emerald-400/25 bg-slate-900 p-6 text-center sm:p-10">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400 text-2xl text-slate-950"><FiCheck /></div>
      <p className="mt-6 text-xs font-black uppercase text-emerald-300">Compra confirmada</p>
      <h2 className="mt-2 text-3xl font-black">Pedido {order.orderNumber}</h2>
      <p className="mx-auto mt-3 max-w-xl font-semibold text-slate-400">
        {pickup
          ? `Prepararemos tu compra para retiro en ${order.pickupLocation}.`
          : "Tu pedido fue enviado al flujo de preparacion y despacho."}
      </p>
      <div className="mx-auto mt-7 grid max-w-xl gap-3 border-y border-white/10 py-6 text-left sm:grid-cols-2">
        <ResultFact label="Total" value={formatCurrency(order.totalAmount)} />
        <ResultFact label="Pago" value={order.paymentStatus === "PAID" ? "Pagado" : "Pendiente al retirar"} />
        <ResultFact label="Entrega" value={pickup ? "Retiro en tienda" : "Despacho a domicilio"} />
        <ResultFact label="Referencia" value={order.transactionReference || "Pago presencial"} />
      </div>
      <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
        <Link to="/shop/account" className="flex h-11 items-center justify-center rounded-md bg-sky-500 px-6 text-sm font-black hover:bg-sky-400">Ver mis compras</Link>
        <Link to="/shop" className="flex h-11 items-center justify-center rounded-md border border-white/15 px-6 text-sm font-black text-slate-300 hover:bg-white/5">Volver a la tienda</Link>
      </div>
    </section>
  );
}

function StepHeading({ description, eyebrow, title }) {
  return <div><p className="text-xs font-black uppercase text-sky-300">{eyebrow}</p><h2 className="mt-2 text-2xl font-black">{title}</h2><p className="mt-2 font-semibold text-slate-400">{description}</p></div>;
}

function ChoiceButton({ active, icon: Icon, label, note, onClick, wide }) {
  return (
    <button type="button" onClick={onClick} className={`flex min-h-24 w-full items-center gap-4 rounded-md border p-4 text-left ${active ? "border-sky-400 bg-sky-500/10" : "border-white/10 bg-slate-950 hover:border-white/25"} ${wide ? "sm:px-5" : ""}`}>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md ${active ? "bg-sky-500 text-white" : "bg-slate-800 text-slate-400"}`}><Icon size={20} /></span>
      <span className="min-w-0 flex-1"><strong className="block text-sm text-white">{label}</strong><span className="mt-1 block text-xs font-bold text-slate-500">{note}</span></span>
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${active ? "border-sky-400 bg-sky-400 text-slate-950" : "border-slate-600"}`}>{active && <FiCheck size={12} />}</span>
    </button>
  );
}

function CheckoutInput({ label, name, onChange, type = "text", value }) {
  return <label className="block"><span className="mb-2 block text-sm font-black text-slate-300">{label}</span><input className="field-control" name={name} onChange={onChange} type={type} value={value} /></label>;
}

function SummaryLine({ label, value }) {
  return <div className="flex items-center justify-between gap-4"><span className="text-slate-500">{label}</span><span className="text-right text-slate-200">{value}</span></div>;
}

function ResultFact({ label, value }) {
  return <div><p className="text-[11px] font-black uppercase text-slate-500">{label}</p><p className="mt-1 break-words font-black text-slate-200">{value}</p></div>;
}

function ErrorMessage({ children }) {
  return <div className="mb-6 border border-red-400/30 bg-red-500/10 p-4 text-sm font-bold text-red-200">{children}</div>;
}

export default CheckoutPage;
