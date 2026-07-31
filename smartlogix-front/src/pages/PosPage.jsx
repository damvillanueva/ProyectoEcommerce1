import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiDollarSign,
  FiLock,
  FiMinus,
  FiPlus,
  FiPrinter,
  FiRefreshCw,
  FiSearch,
  FiShoppingCart,
  FiTag,
  FiTrash2,
  FiUnlock,
  FiX,
} from "react-icons/fi";
import Navbar from "../components/Navbar";
import PageContainer from "../layout/PageContainer";
import { getInventoryItemsWithAvailable } from "../services/inventoryService";
import { validateOrderDiscount } from "../services/orderService";
import {
  finishCashRegister,
  loadCashRegisterHistory,
  loadCurrentCashRegister,
  loadPosSales,
  savePosSale,
  startCashRegister,
} from "../services/posService";
import "../styles/pos.css";

const PAYMENT_OPTIONS = [
  { value: "POS_CASH", label: "Efectivo", Icon: FiDollarSign },
  { value: "POS_DEBIT", label: "Debito", Icon: FiCreditCard },
  { value: "POS_CREDIT", label: "Credito", Icon: FiCreditCard },
  { value: "POS_TRANSFER", label: "Transferencia", Icon: FiRefreshCw },
];

const formatClp = (value) =>
  new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat("es-CL", {
        dateStyle: "short",
        timeStyle: "short",
        hour12: false,
      }).format(new Date(value))
    : "-";

const apiError = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

function PosPage() {
  const searchRef = useRef(null);
  const [session, setSession] = useState(null);
  const [history, setHistory] = useState([]);
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("POS_CASH");
  const [cashReceived, setCashReceived] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [discount, setDiscount] = useState(null);
  const [registerCode, setRegisterCode] = useState("CAJA-01");
  const [openingAmount, setOpeningAmount] = useState("0");
  const [declaredCash, setDeclaredCash] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [closeSummary, setCloseSummary] = useState(null);
  const [showClose, setShowClose] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [activeSession, registerHistory, inventory] = await Promise.all([
        loadCurrentCashRegister(),
        loadCashRegisterHistory(),
        getInventoryItemsWithAvailable(),
      ]);
      setSession(activeSession || null);
      setHistory(Array.isArray(registerHistory) ? registerHistory : []);
      setProducts(Array.isArray(inventory) ? inventory : []);
      if (activeSession?.sessionNumber) {
        const currentSales = await loadPosSales(activeSession.sessionNumber);
        setSales(Array.isArray(currentSales) ? currentSales : []);
      } else {
        setSales([]);
      }
    } catch (error) {
      setMessage({ type: "error", text: apiError(error, "No se pudo cargar el punto de venta.") });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (session && !loading) searchRef.current?.focus();
  }, [session, loading]);

  const subtotal = useMemo(
    () => cart.reduce((total, line) => total + Number(line.salePrice || 0) * line.quantity, 0),
    [cart],
  );
  const discountAmount = Number(discount?.discountAmount || 0);
  const total = Math.max(0, subtotal - discountAmount);
  const cashChange = paymentMethod === "POS_CASH"
    ? Math.max(0, Number(cashReceived || 0) - total)
    : 0;

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products
      .filter((product) => Number(product.salePrice || 0) > 0 && Number(product.availableQuantity || 0) > 0)
      .filter((product) => {
        if (!query) return true;
        return [product.sku, product.productName, product.category, product.brand]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      })
      .sort((left, right) => String(left.productName).localeCompare(String(right.productName)))
      .slice(0, 24);
  }, [products, search]);

  function clearDiscountPreview() {
    setDiscount(null);
  }

  function addProduct(product) {
    setCart((current) => {
      const existing = current.find((line) => line.sku === product.sku);
      if (existing) {
        if (existing.quantity >= Number(product.availableQuantity || 0)) {
          setMessage({ type: "error", text: "No hay mas unidades disponibles de este producto." });
          return current;
        }
        return current.map((line) =>
          line.sku === product.sku ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [...current, { ...product, quantity: 1 }];
    });
    clearDiscountPreview();
    setSearch("");
    setMessage(null);
    searchRef.current?.focus();
  }

  function submitScanner(event) {
    event.preventDefault();
    const query = search.trim().toUpperCase();
    if (!query) return;
    const exact = products.find((product) => product.sku.toUpperCase() === query);
    const selected = exact || filteredProducts[0];
    if (!selected) {
      setMessage({ type: "error", text: "No encontramos un producto disponible con ese codigo." });
      return;
    }
    addProduct(selected);
  }

  function updateQuantity(sku, nextQuantity) {
    setCart((current) => current.map((line) => {
      if (line.sku !== sku) return line;
      const bounded = Math.max(1, Math.min(nextQuantity, Number(line.availableQuantity || 1)));
      return { ...line, quantity: bounded };
    }));
    clearDiscountPreview();
  }

  function removeLine(sku) {
    setCart((current) => current.filter((line) => line.sku !== sku));
    clearDiscountPreview();
  }

  async function handleOpen(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const opened = await startCashRegister({
        registerCode: registerCode.trim(),
        openingAmount: Number(openingAmount || 0),
      });
      setSession(opened);
      setSales([]);
      setMessage({ type: "success", text: `Caja ${opened.registerCode} abierta correctamente.` });
      const updatedHistory = await loadCashRegisterHistory();
      setHistory(Array.isArray(updatedHistory) ? updatedHistory : []);
    } catch (error) {
      setMessage({ type: "error", text: apiError(error, "No se pudo abrir la caja.") });
    } finally {
      setSubmitting(false);
    }
  }

  async function applyDiscount() {
    if (!discountCode.trim() || subtotal <= 0) return;
    setSubmitting(true);
    try {
      const result = await validateOrderDiscount(discountCode.trim(), subtotal);
      setDiscount(result);
      setDiscountCode(result.code);
      setMessage({ type: "success", text: `Descuento ${result.code} aplicado.` });
    } catch (error) {
      setDiscount(null);
      setMessage({ type: "error", text: apiError(error, "El descuento no es valido.") });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSale() {
    if (!session || cart.length === 0) return;
    if (paymentMethod === "POS_CASH" && Number(cashReceived || 0) < total) {
      setMessage({ type: "error", text: "El efectivo recibido no cubre el total." });
      return;
    }
    setSubmitting(true);
    try {
      const result = await savePosSale({
        sessionNumber: session.sessionNumber,
        customerName: customerName.trim() || null,
        customerEmail: customerEmail.trim() || null,
        discountCode: discount?.code || null,
        paymentMethod,
        amountTendered: paymentMethod === "POS_CASH" ? Number(cashReceived) : null,
        lines: cart.map((line) => ({ sku: line.sku, quantity: line.quantity })),
      });
      setReceipt(result);
      setCart([]);
      setCustomerName("");
      setCustomerEmail("");
      setCashReceived("");
      setDiscountCode("");
      setDiscount(null);
      setMessage({ type: "success", text: `Venta ${result.receiptNumber} completada.` });
      const [activeSession, currentSales, inventory] = await Promise.all([
        loadCurrentCashRegister(),
        loadPosSales(session.sessionNumber),
        getInventoryItemsWithAvailable(),
      ]);
      setSession(activeSession);
      setSales(currentSales);
      setProducts(inventory);
    } catch (error) {
      setMessage({ type: "error", text: apiError(error, "No se pudo completar la venta.") });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClose(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const result = await finishCashRegister(session.sessionNumber, {
        declaredCash: Number(declaredCash || 0),
      });
      setCloseSummary(result);
      setShowClose(false);
      setSession(null);
      setSales([]);
      setCart([]);
      setDeclaredCash("");
      const updatedHistory = await loadCashRegisterHistory();
      setHistory(updatedHistory);
    } catch (error) {
      setMessage({ type: "error", text: apiError(error, "No se pudo cerrar la caja.") });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <PosLoading />;
  }

  return (
    <div className="min-h-screen bg-[#07111f] text-slate-100">
      <Navbar />
      <PageContainer>
        <main className="px-3 py-5 sm:px-0">
          <header className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase text-cyan-300">Venta presencial</p>
              <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">Punto de venta</h1>
              <p className="mt-1 text-sm font-semibold text-slate-400">
                Caja, cobros y stock conectados en tiempo real.
              </p>
            </div>
            {session && (
              <button
                type="button"
                onClick={() => {
                  setDeclaredCash(String(session.expectedCash || 0));
                  setShowClose(true);
                }}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-amber-300/30 bg-amber-400/10 px-4 text-sm font-black text-amber-200 hover:bg-amber-400/20"
              >
                <FiLock aria-hidden="true" /> Cerrar y arquear caja
              </button>
            )}
          </header>

          {message && <StatusMessage message={message} onClose={() => setMessage(null)} />}

          {!session ? (
            <RegisterOpening
              registerCode={registerCode}
              setRegisterCode={setRegisterCode}
              openingAmount={openingAmount}
              setOpeningAmount={setOpeningAmount}
              onSubmit={handleOpen}
              submitting={submitting}
              history={history}
            />
          ) : (
            <>
              <SessionMetrics session={session} />
              <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_410px]">
                <section className="min-w-0" aria-labelledby="catalog-title">
                  <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                      <h2 id="catalog-title" className="text-lg font-black text-white">Catalogo disponible</h2>
                      <p className="text-sm font-semibold text-slate-400">Escribe o escanea el SKU y presiona Enter.</p>
                    </div>
                    <form onSubmit={submitScanner} className="flex w-full min-w-0 md:max-w-xl">
                      <label className="sr-only" htmlFor="pos-search">Buscar o escanear producto</label>
                      <div className="relative min-w-0 flex-1">
                        <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                        <input
                          ref={searchRef}
                          id="pos-search"
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder="Nombre, SKU o lector QR"
                          className="min-h-12 w-full rounded-l-lg border border-white/10 bg-slate-900 pl-10 pr-3 text-sm font-bold text-white outline-none focus:border-cyan-400"
                        />
                      </div>
                      <button type="submit" className="min-h-12 rounded-r-lg bg-cyan-500 px-4 font-black text-slate-950 hover:bg-cyan-400">
                        Agregar
                      </button>
                    </form>
                  </div>

                  <div className="grid min-w-0 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                    {filteredProducts.map((product) => (
                      <ProductCard key={product.sku} product={product} onAdd={addProduct} />
                    ))}
                  </div>
                  {filteredProducts.length === 0 && (
                    <div className="rounded-lg border border-dashed border-white/15 px-5 py-14 text-center text-sm font-bold text-slate-400">
                      No hay productos disponibles para esta busqueda.
                    </div>
                  )}
                </section>

                <aside className="min-w-0 rounded-lg border border-white/10 bg-slate-950/70" aria-label="Carrito de venta presencial">
                  <div className="flex min-h-14 items-center justify-between border-b border-white/10 px-4">
                    <div className="flex items-center gap-2">
                      <FiShoppingCart className="text-cyan-300" aria-hidden="true" />
                      <h2 className="font-black text-white">Venta actual</h2>
                    </div>
                    <span className="rounded-lg bg-cyan-400/10 px-2.5 py-1 text-xs font-black text-cyan-200">
                      {cart.reduce((totalUnits, line) => totalUnits + line.quantity, 0)} unidades
                    </span>
                  </div>

                  <div className="pos-scrollbar max-h-[390px] overflow-y-auto px-4">
                    {cart.length === 0 ? (
                      <div className="py-12 text-center">
                        <FiShoppingCart className="mx-auto text-3xl text-slate-600" aria-hidden="true" />
                        <p className="mt-3 text-sm font-bold text-slate-400">Agrega productos para comenzar.</p>
                      </div>
                    ) : cart.map((line) => (
                      <CartLine
                        key={line.sku}
                        line={line}
                        onQuantity={updateQuantity}
                        onRemove={removeLine}
                      />
                    ))}
                  </div>

                  <div className="border-t border-white/10 p-4">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                      <label className="text-xs font-black uppercase text-slate-400">
                        Cliente opcional
                        <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Consumidor final" className="mt-1 min-h-11 w-full rounded-lg border border-white/10 bg-slate-900 px-3 text-sm font-semibold normal-case text-white outline-none focus:border-cyan-400" />
                      </label>
                      <label className="text-xs font-black uppercase text-slate-400">
                        Correo opcional
                        <input type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} placeholder="cliente@correo.cl" className="mt-1 min-h-11 w-full rounded-lg border border-white/10 bg-slate-900 px-3 text-sm font-semibold normal-case text-white outline-none focus:border-cyan-400" />
                      </label>
                    </div>

                    <div className="mt-3 flex min-w-0">
                      <label className="sr-only" htmlFor="pos-discount">Codigo de descuento</label>
                      <div className="relative min-w-0 flex-1">
                        <FiTag className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                        <input id="pos-discount" value={discountCode} onChange={(event) => { setDiscountCode(event.target.value.toUpperCase()); setDiscount(null); }} placeholder="Codigo de descuento" className="min-h-11 w-full rounded-l-lg border border-white/10 bg-slate-900 pl-10 pr-3 text-sm font-bold text-white outline-none focus:border-cyan-400" />
                      </div>
                      <button type="button" onClick={applyDiscount} disabled={!discountCode.trim() || subtotal <= 0 || submitting} className="min-h-11 rounded-r-lg border border-l-0 border-white/10 bg-white/5 px-3 text-sm font-black text-slate-200 disabled:opacity-40">Aplicar</button>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Medio de pago">
                      {PAYMENT_OPTIONS.map(({ value, label, Icon }) => (
                        <button key={value} type="button" role="radio" aria-checked={paymentMethod === value} onClick={() => setPaymentMethod(value)} className={`flex min-h-12 items-center justify-center gap-2 rounded-lg border px-2 text-xs font-black ${paymentMethod === value ? "border-cyan-300 bg-cyan-400/15 text-cyan-100" : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07]"}`}>
                          <Icon aria-hidden="true" /> {label}
                        </button>
                      ))}
                    </div>

                    {paymentMethod === "POS_CASH" && (
                      <div className="mt-3">
                        <label htmlFor="cash-received" className="text-xs font-black uppercase text-slate-400">Efectivo recibido</label>
                        <input id="cash-received" type="number" min="0" step="1" value={cashReceived} onChange={(event) => setCashReceived(event.target.value)} className="mt-1 min-h-12 w-full rounded-lg border border-emerald-300/20 bg-emerald-400/5 px-3 text-lg font-black text-emerald-200 outline-none focus:border-emerald-300" />
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          {[total, total + 5000, total + 10000].map((amount) => (
                            <button key={amount} type="button" onClick={() => setCashReceived(String(Math.ceil(amount)))} className="min-h-10 rounded-lg border border-white/10 bg-white/5 px-1 text-xs font-black text-slate-300 hover:bg-white/10">
                              {formatClp(amount)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm font-bold">
                      <TotalRow label="Subtotal" value={subtotal} />
                      {discountAmount > 0 && <TotalRow label={`Descuento ${discount?.percentage || 0}%`} value={-discountAmount} accent="text-emerald-300" />}
                      <TotalRow label="Total" value={total} strong />
                      {paymentMethod === "POS_CASH" && <TotalRow label="Vuelto" value={cashChange} accent="text-amber-200" />}
                    </div>

                    <button type="button" onClick={handleSale} disabled={submitting || cart.length === 0} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 font-black text-slate-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40">
                      <FiCheckCircle aria-hidden="true" /> {submitting ? "Procesando..." : `Cobrar ${formatClp(total)}`}
                    </button>
                  </div>
                </aside>
              </div>

              <RecentSales sales={sales} onReceipt={setReceipt} />
            </>
          )}
        </main>
      </PageContainer>

      {showClose && session && (
        <CloseRegisterModal
          session={session}
          declaredCash={declaredCash}
          setDeclaredCash={setDeclaredCash}
          onClose={() => setShowClose(false)}
          onSubmit={handleClose}
          submitting={submitting}
        />
      )}
      {receipt && <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />}
      {closeSummary && <CloseSummaryModal summary={closeSummary} onClose={() => setCloseSummary(null)} />}
    </div>
  );
}

function PosLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#07111f] text-white">
      <div role="status" className="text-center">
        <FiRefreshCw className="mx-auto animate-spin text-3xl text-cyan-300" aria-hidden="true" />
        <p className="mt-3 font-black">Preparando punto de venta...</p>
      </div>
    </main>
  );
}

function StatusMessage({ message, onClose }) {
  const success = message.type === "success";
  return (
    <div role={success ? "status" : "alert"} className={`mb-4 flex min-h-12 items-center justify-between gap-3 rounded-lg border px-4 text-sm font-bold ${success ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-200" : "border-red-300/25 bg-red-400/10 text-red-200"}`}>
      <span>{message.text}</span>
      <button type="button" onClick={onClose} aria-label="Cerrar mensaje" title="Cerrar" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg hover:bg-white/10"><FiX aria-hidden="true" /></button>
    </div>
  );
}

function RegisterOpening({ registerCode, setRegisterCode, openingAmount, setOpeningAmount, onSubmit, submitting, history }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,520px)_minmax(0,1fr)]">
      <form onSubmit={onSubmit} className="rounded-lg border border-white/10 bg-slate-950/70 p-5 sm:p-7">
        <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-400/10 text-2xl text-emerald-300"><FiUnlock aria-hidden="true" /></span>
        <h2 className="mt-5 text-xl font-black text-white">Abrir turno de caja</h2>
        <p className="mt-1 text-sm font-semibold text-slate-400">Declara el efectivo inicial antes de comenzar a vender.</p>
        <label className="mt-6 block text-xs font-black uppercase text-slate-400">
          Codigo de caja
          <input required value={registerCode} onChange={(event) => setRegisterCode(event.target.value.toUpperCase())} className="mt-1 min-h-12 w-full rounded-lg border border-white/10 bg-slate-900 px-3 text-base font-black normal-case text-white outline-none focus:border-cyan-400" />
        </label>
        <label className="mt-4 block text-xs font-black uppercase text-slate-400">
          Fondo inicial
          <input required type="number" min="0" step="1" value={openingAmount} onChange={(event) => setOpeningAmount(event.target.value)} className="mt-1 min-h-12 w-full rounded-lg border border-white/10 bg-slate-900 px-3 text-base font-black normal-case text-white outline-none focus:border-cyan-400" />
        </label>
        <button type="submit" disabled={submitting} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 font-black text-slate-950 hover:bg-emerald-300 disabled:opacity-50">
          <FiUnlock aria-hidden="true" /> {submitting ? "Abriendo..." : "Abrir caja"}
        </button>
      </form>

      <section className="min-w-0 pt-12 lg:pt-0" aria-labelledby="register-history-title">
        <h2 id="register-history-title" className="text-lg font-black text-white">Ultimos turnos</h2>
        <div className="mt-3 overflow-hidden rounded-lg border border-white/10">
          {history.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm font-bold text-slate-400">Todavia no hay cierres registrados.</p>
          ) : history.slice(0, 8).map((item) => (
            <div key={item.sessionNumber} className="grid gap-2 border-b border-white/10 bg-slate-950/50 px-4 py-3 last:border-b-0 sm:grid-cols-[1fr_auto_auto] sm:items-center">
              <div className="min-w-0">
                <p className="truncate font-black text-white">{item.registerCode} <span className="text-xs text-slate-500">{item.sessionNumber}</span></p>
                <p className="text-xs font-semibold text-slate-400">{formatDate(item.openedAt)}</p>
              </div>
              <span className={`w-fit rounded-lg px-2 py-1 text-xs font-black ${item.status === "OPEN" ? "bg-emerald-400/10 text-emerald-300" : "bg-slate-700 text-slate-300"}`}>{item.status === "OPEN" ? "Abierta" : "Cerrada"}</span>
              <span className="font-black text-slate-200">{formatClp(item.totalSalesAmount)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SessionMetrics({ session }) {
  const metrics = [
    ["Caja", session.registerCode],
    ["Fondo inicial", formatClp(session.openingAmount)],
    ["Ventas", `${session.saleCount} | ${formatClp(session.totalSalesAmount)}`],
    ["Ventas efectivo", formatClp(session.cashSalesAmount)],
    ["Efectivo esperado", formatClp(session.expectedCash)],
  ];
  return (
    <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5" aria-label="Resumen de caja">
      {metrics.map(([label, value]) => (
        <div key={label} className="min-w-0 rounded-lg border border-white/10 bg-slate-900/70 px-4 py-3">
          <p className="text-xs font-black uppercase text-slate-500">{label}</p>
          <p className="mt-1 break-words text-base font-black text-white">{value}</p>
        </div>
      ))}
    </section>
  );
}

function ProductCard({ product, onAdd }) {
  return (
    <article className="grid min-w-0 grid-cols-[72px_minmax(0,1fr)] gap-3 rounded-lg border border-white/10 bg-slate-900/65 p-3">
      <div className="flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-lg bg-white">
        {product.imageUrl ? <img src={product.imageUrl} alt="" className="h-full w-full object-contain p-1" /> : <FiShoppingCart className="text-2xl text-slate-500" aria-hidden="true" />}
      </div>
      <div className="min-w-0">
        <p className="line-clamp-2 min-h-10 text-sm font-black text-white">{product.productName}</p>
        <p className="truncate text-xs font-bold text-slate-500">{product.sku} | {product.category || "General"}</p>
        <div className="mt-2 flex items-end justify-between gap-2">
          <div>
            <p className="font-black text-cyan-200">{formatClp(product.salePrice)}</p>
            <p className="text-xs font-bold text-emerald-300">{product.availableQuantity} disponibles</p>
          </div>
          <button type="button" onClick={() => onAdd(product)} aria-label={`Agregar ${product.productName}`} title="Agregar al carrito" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-cyan-500 text-lg text-slate-950 hover:bg-cyan-400"><FiPlus aria-hidden="true" /></button>
        </div>
      </div>
    </article>
  );
}

function CartLine({ line, onQuantity, onRemove }) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-white/10 py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-white">{line.productName}</p>
        <p className="text-xs font-bold text-slate-500">{line.sku} | {formatClp(line.salePrice)}</p>
        <div className="mt-2 flex items-center gap-1">
          <button type="button" onClick={() => onQuantity(line.sku, line.quantity - 1)} aria-label={`Restar una unidad de ${line.productName}`} title="Restar" className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-slate-200 hover:bg-white/10"><FiMinus aria-hidden="true" /></button>
          <span className="flex h-10 min-w-10 items-center justify-center font-black text-white">{line.quantity}</span>
          <button type="button" onClick={() => onQuantity(line.sku, line.quantity + 1)} aria-label={`Sumar una unidad de ${line.productName}`} title="Sumar" className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-slate-200 hover:bg-white/10"><FiPlus aria-hidden="true" /></button>
        </div>
      </div>
      <div className="flex flex-col items-end justify-between">
        <button type="button" onClick={() => onRemove(line.sku)} aria-label={`Quitar ${line.productName}`} title="Quitar" className="flex h-10 w-10 items-center justify-center rounded-lg text-red-300 hover:bg-red-400/10"><FiTrash2 aria-hidden="true" /></button>
        <p className="text-sm font-black text-white">{formatClp(Number(line.salePrice) * line.quantity)}</p>
      </div>
    </div>
  );
}

function TotalRow({ label, value, accent = "text-slate-200", strong = false, light = false }) {
  const labelClass = light
    ? (strong ? "font-black text-slate-950" : "text-slate-600")
    : (strong ? "font-black text-white" : "text-slate-400");
  const valueClass = light && strong ? "text-slate-950" : (strong ? "text-cyan-200" : accent);
  return <div className={`flex items-center justify-between gap-3 ${strong ? "border-t border-current/10 pt-3 text-lg" : ""}`}><span className={labelClass}>{label}</span><span className={`font-black ${valueClass}`}>{formatClp(value)}</span></div>;
}

function RecentSales({ sales, onReceipt }) {
  return (
    <section className="mt-6" aria-labelledby="recent-sales-title">
      <div className="flex items-center gap-2"><FiClock className="text-slate-400" aria-hidden="true" /><h2 id="recent-sales-title" className="text-lg font-black text-white">Ventas de este turno</h2></div>
      <div className="mt-3 overflow-hidden rounded-lg border border-white/10">
        {sales.length === 0 ? <p className="px-4 py-8 text-center text-sm font-bold text-slate-400">Aun no hay ventas en esta caja.</p> : sales.slice(0, 10).map((sale) => (
          <button key={sale.receiptNumber} type="button" onClick={() => onReceipt(sale)} className="grid min-h-14 w-full gap-2 border-b border-white/10 bg-slate-950/50 px-4 py-3 text-left last:border-b-0 hover:bg-white/5 sm:grid-cols-[1fr_auto_auto] sm:items-center">
            <span><span className="block font-black text-white">{sale.receiptNumber}</span><span className="text-xs font-semibold text-slate-500">{formatDate(sale.createdAt)} | {sale.customerName}</span></span>
            <span className="text-xs font-black text-emerald-300">Pagado</span>
            <span className="font-black text-white">{formatClp(sale.totalAmount)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function CloseRegisterModal({ session, declaredCash, setDeclaredCash, onClose, onSubmit, submitting }) {
  const difference = Number(declaredCash || 0) - Number(session.expectedCash || 0);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-3" role="dialog" aria-modal="true" aria-labelledby="close-register-title">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-lg border border-white/10 bg-slate-950 p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-3"><div><h2 id="close-register-title" className="text-xl font-black text-white">Cierre y arqueo</h2><p className="mt-1 text-sm font-semibold text-slate-400">{session.registerCode} | {session.saleCount} ventas</p></div><button type="button" onClick={onClose} aria-label="Cerrar dialogo" title="Cerrar" className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10"><FiX aria-hidden="true" /></button></div>
        <div className="mt-5 space-y-3 rounded-lg border border-white/10 bg-slate-900/60 p-4"><TotalRow label="Fondo inicial" value={session.openingAmount} /><TotalRow label="Ventas en efectivo" value={session.cashSalesAmount} /><TotalRow label="Efectivo esperado" value={session.expectedCash} strong /></div>
        <label className="mt-5 block text-xs font-black uppercase text-slate-400">Efectivo contado<input autoFocus required type="number" min="0" step="1" value={declaredCash} onChange={(event) => setDeclaredCash(event.target.value)} className="mt-1 min-h-12 w-full rounded-lg border border-white/10 bg-slate-900 px-3 text-lg font-black normal-case text-white outline-none focus:border-amber-300" /></label>
        <div className={`mt-3 rounded-lg border px-4 py-3 text-sm font-black ${difference === 0 ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-200" : "border-amber-300/20 bg-amber-400/10 text-amber-200"}`}>Diferencia: {formatClp(difference)}</div>
        <button type="submit" disabled={submitting} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-amber-400 px-4 font-black text-slate-950 hover:bg-amber-300 disabled:opacity-50"><FiLock aria-hidden="true" /> {submitting ? "Cerrando..." : "Confirmar cierre"}</button>
      </form>
    </div>
  );
}

function ReceiptModal({ receipt, onClose }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-black/80 p-3" role="dialog" aria-modal="true" aria-labelledby="receipt-title">
      <article className="pos-receipt-print my-auto w-full max-w-md rounded-lg bg-white p-5 text-slate-900 shadow-2xl sm:p-7">
        <header className="border-b border-dashed border-slate-300 pb-4 text-center"><p className="text-xl font-black">SMARTLOGIX</p><h2 id="receipt-title" className="mt-1 text-sm font-black uppercase">Comprobante de venta presencial</h2><p className="mt-2 text-xs text-slate-500">Documento no tributario</p></header>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 border-b border-dashed border-slate-300 py-4 text-xs"><dt className="font-bold text-slate-500">Comprobante</dt><dd className="text-right font-black">{receipt.receiptNumber}</dd><dt className="font-bold text-slate-500">Fecha</dt><dd className="text-right font-bold">{formatDate(receipt.createdAt)}</dd><dt className="font-bold text-slate-500">Caja</dt><dd className="text-right font-bold">{receipt.registerCode}</dd><dt className="font-bold text-slate-500">Cajero</dt><dd className="text-right font-bold">{receipt.cashierUsername}</dd><dt className="font-bold text-slate-500">Cliente</dt><dd className="text-right font-bold">{receipt.customerName}</dd></dl>
        <div className="border-b border-dashed border-slate-300 py-3">{receipt.lines.map((line) => <div key={line.sku} className="mb-3 text-xs last:mb-0"><p className="font-black">{line.productName || line.sku}</p><div className="mt-1 flex justify-between gap-3 text-slate-600"><span>{line.quantity} x {formatClp(line.unitPrice)}</span><span className="font-black text-slate-900">{formatClp(line.lineTotal)}</span></div></div>)}</div>
        <div className="space-y-2 py-4 text-sm"><TotalRow light label="Subtotal" value={receipt.subtotalAmount} />{Number(receipt.discountAmount) > 0 && <TotalRow light label={`Descuento ${receipt.discountCode}`} value={-Number(receipt.discountAmount)} accent="text-emerald-700" />}<TotalRow light label="Total pagado" value={receipt.totalAmount} strong />{receipt.paymentMethod === "POS_CASH" && <><TotalRow light label="Efectivo" value={receipt.amountTendered} /><TotalRow light label="Vuelto" value={receipt.changeAmount} /></>}</div>
        <p className="border-t border-dashed border-slate-300 pt-4 text-center text-xs font-bold text-slate-500">Gracias por tu compra.</p>
        <div className="pos-receipt-actions mt-5 grid grid-cols-2 gap-3"><button type="button" onClick={onClose} className="min-h-11 rounded-lg border border-slate-300 font-black text-slate-700">Cerrar</button><button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-900 font-black text-white"><FiPrinter aria-hidden="true" /> Imprimir</button></div>
      </article>
    </div>
  );
}

function CloseSummaryModal({ summary, onClose }) {
  const difference = Number(summary.cashDifference || 0);
  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/80 p-3" role="dialog" aria-modal="true" aria-labelledby="close-summary-title">
      <div className="w-full max-w-md rounded-lg border border-white/10 bg-slate-950 p-6 text-center"><FiCheckCircle className="mx-auto text-4xl text-emerald-300" aria-hidden="true" /><h2 id="close-summary-title" className="mt-4 text-xl font-black text-white">Caja cerrada</h2><p className="mt-1 text-sm font-semibold text-slate-400">{summary.registerCode} | {summary.saleCount} ventas</p><div className="mt-5 space-y-3 text-left"><TotalRow label="Venta total" value={summary.totalSalesAmount} /><TotalRow label="Efectivo esperado" value={summary.expectedCash} /><TotalRow label="Efectivo declarado" value={summary.declaredCash} /><TotalRow label="Diferencia" value={difference} accent={difference === 0 ? "text-emerald-300" : "text-amber-200"} strong /></div><button type="button" onClick={onClose} className="mt-6 min-h-12 w-full rounded-lg bg-cyan-500 font-black text-slate-950 hover:bg-cyan-400">Finalizar turno</button></div>
    </div>
  );
}

export default PosPage;
