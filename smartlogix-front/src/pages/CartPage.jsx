import { useEffect, useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiChevronRight,
  FiLock,
  FiMinus,
  FiPackage,
  FiPlus,
  FiShield,
  FiShoppingCart,
  FiTrash2,
  FiTruck,
  FiUser,
} from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/logo-smartlogix.png";
import { getPublicCatalogProducts } from "../services/inventoryService";
import { getRoleFromToken, getUsernameFromToken } from "../utils/authTokenUtils";

const CART_STORAGE_KEY = "smartlogix-store-cart";
const FREE_SHIPPING_THRESHOLD = 150000;

function readCart() {
  try {
    const stored = JSON.parse(localStorage.getItem(CART_STORAGE_KEY));
    return Array.isArray(stored) ? stored : [];
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

function CartPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState(readCart);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const role = getRoleFromToken();
  const username = getUsernameFromToken();

  useEffect(() => {
    getPublicCatalogProducts()
      .then((data) => {
        setCatalog(Array.isArray(data) ? data : []);
        setError("");
      })
      .catch((catalogError) => {
        console.error(catalogError);
        setError("No se pudo actualizar el carrito con el inventario.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  const cartProducts = useMemo(
    () => cart.map((cartItem) => {
      const product = catalog.find((item) => item.sku === cartItem.sku);
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
    [cart, catalog]
  );

  const subtotal = cartProducts.reduce((total, product) => total + product.lineTotal, 0);
  const cartUnits = cartProducts.reduce((total, product) => total + product.cartQuantity, 0);
  const remainingForFreeShipping = Math.max(FREE_SHIPPING_THRESHOLD - subtotal, 0);
  const freeShippingProgress = Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100);
  const recommendations = catalog
    .filter((product) => Number(product.availableQuantity || 0) > 0)
    .filter((product) => !cart.some((item) => item.sku === product.sku))
    .slice(0, 4);

  function updateQuantity(sku, requestedQuantity) {
    const product = cartProducts.find((item) => item.sku === sku);
    const nextQuantity = Math.max(1, Math.min(
      Number(requestedQuantity) || 1,
      product?.availableUnits || 1
    ));
    setCart((current) => current.map((item) => item.sku === sku
      ? { ...item, quantity: nextQuantity }
      : item));
  }

  function removeProduct(sku) {
    setCart((current) => current.filter((item) => item.sku !== sku));
  }

  function addProduct(product) {
    setCart((current) => [...current, { quantity: 1, sku: product.sku }]);
  }

  function continueToCheckout() {
    if (cartProducts.length === 0) return;
    if (!role) {
      navigate("/shop/login", { state: { returnTo: "/shop/checkout" } });
      return;
    }
    if (role !== "ROLE_CUSTOMER") {
      setError("El checkout online requiere una cuenta de cliente.");
      return;
    }
    navigate("/shop/checkout");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <CartHeader cartUnits={cartUnits} role={role} username={username} />

      <main className="mx-auto max-w-7xl px-4 py-7 lg:px-6">
        <Link to="/shop" className="inline-flex items-center gap-2 text-sm font-black text-slate-400 hover:text-white">
          <FiArrowLeft /> Seguir comprando
        </Link>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-6">
          <div>
            <p className="text-xs font-black uppercase text-sky-300">Tu seleccion</p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">Carrito de compras</h1>
          </div>
          <p className="text-sm font-bold text-slate-500">{cartUnits} unidad(es)</p>
        </div>

        {error && <div className="mt-6 border border-red-400/30 bg-red-500/10 p-4 text-sm font-bold text-red-200">{error}</div>}

        {loading ? (
          <div className="mt-7 border border-white/10 bg-slate-900 p-10 text-center font-bold text-slate-400">Actualizando precios y stock...</div>
        ) : cartProducts.length === 0 ? (
          <EmptyCart />
        ) : (
          <div className="mt-7 grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_370px]">
            <section className="border border-white/10 bg-slate-900">
              <div className="border-b border-white/10 px-5 py-4">
                <p className="flex items-center gap-2 text-sm font-black"><FiShield className="text-emerald-300" /> Productos vendidos por SmartLogix</p>
              </div>
              <div className="divide-y divide-white/10">
                {cartProducts.map((product) => (
                  <CartProduct
                    key={product.sku}
                    onQuantityChange={updateQuantity}
                    onRemove={removeProduct}
                    product={product}
                  />
                ))}
              </div>
            </section>

            <CartSummary
              freeShippingProgress={freeShippingProgress}
              onContinue={continueToCheckout}
              remainingForFreeShipping={remainingForFreeShipping}
              subtotal={subtotal}
            />
          </div>
        )}

        {!loading && recommendations.length > 0 && (
          <section className="mt-12 border-t border-white/10 pt-10">
            <p className="text-xs font-black uppercase text-sky-300">Completa tu compra</p>
            <h2 className="mt-2 text-2xl font-black">Tambien te puede interesar</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {recommendations.map((product) => (
                <Recommendation key={product.sku} onAdd={addProduct} product={product} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function CartHeader({ cartUnits, role, username }) {
  return (
    <header className="border-b border-white/10 bg-indigo-950">
      <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-4 py-3 lg:px-6">
        <Link to="/shop" className="flex items-center gap-3">
          <img src={logo} alt="SmartLogix" className="h-8 w-auto" />
          <span className="hidden border-l border-white/15 pl-3 text-xs font-black uppercase text-sky-300 sm:block">Carrito</span>
        </Link>
        <div className="flex items-center gap-2">
          {role === "ROLE_CUSTOMER" ? (
            <Link to="/shop/account" className="flex h-11 items-center gap-2 rounded-md border border-white/15 px-3 text-xs font-black hover:bg-white/10"><FiUser /> <span className="hidden sm:inline">{username}</span></Link>
          ) : !role ? (
            <Link to="/shop/login" className="flex h-11 items-center rounded-md border border-white/15 px-3 text-xs font-black hover:bg-white/10">Ingresar</Link>
          ) : null}
          <span className="relative flex h-11 w-11 items-center justify-center rounded-md bg-sky-500"><FiShoppingCart />{cartUnits > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-emerald-400 px-1 text-center text-[10px] font-black leading-5 text-slate-950">{cartUnits}</span>}</span>
        </div>
      </div>
    </header>
  );
}

function CartProduct({ onQuantityChange, onRemove, product }) {
  return (
    <article className="p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row">
        <Link to={`/shop/product/${encodeURIComponent(product.sku)}`} className="shrink-0">
          {product.imageUrl ? <img src={product.imageUrl} alt={product.productName} className="h-32 w-full rounded-md bg-white object-cover sm:w-32" /> : <div className="flex h-32 w-full items-center justify-center rounded-md bg-slate-800 sm:w-32"><FiPackage size={28} /></div>}
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase text-emerald-300">Disponible</p>
          <Link to={`/shop/product/${encodeURIComponent(product.sku)}`} className="mt-2 block text-lg font-black hover:text-sky-300">{product.productName}</Link>
          <p className="mt-1 text-xs font-bold text-slate-500">SKU {product.sku} | {product.category || "General"}</p>
          <p className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-400"><FiTruck className="text-sky-300" /> Despacho y retiro disponibles</p>
          <button type="button" onClick={() => onRemove(product.sku)} className="mt-4 inline-flex items-center gap-2 text-xs font-black text-red-300 hover:text-red-200"><FiTrash2 /> Eliminar</button>
        </div>
        <div className="flex shrink-0 flex-row items-end justify-between gap-4 sm:flex-col sm:text-right">
          <div>
            {Number(product.originalPrice || 0) > product.price && <p className="text-xs font-bold text-slate-600 line-through">{formatCurrency(product.originalPrice)}</p>}
            <p className="text-xl font-black text-sky-200">{formatCurrency(product.lineTotal)}</p>
            <p className="mt-1 text-xs font-bold text-slate-500">{formatCurrency(product.price)} c/u</p>
          </div>
          <div className="flex items-center rounded-md border border-white/10 bg-slate-950">
            <QuantityButton label="Disminuir" onClick={() => onQuantityChange(product.sku, product.cartQuantity - 1)}><FiMinus /></QuantityButton>
            <input aria-label={`Cantidad de ${product.productName}`} type="number" min="1" max={product.availableUnits} value={product.cartQuantity} onChange={(event) => onQuantityChange(product.sku, event.target.value)} className="h-10 w-12 bg-transparent text-center text-sm font-black outline-none" />
            <QuantityButton label="Aumentar" onClick={() => onQuantityChange(product.sku, product.cartQuantity + 1)}><FiPlus /></QuantityButton>
          </div>
        </div>
      </div>
    </article>
  );
}

function CartSummary({ freeShippingProgress, onContinue, remainingForFreeShipping, subtotal }) {
  return (
    <aside className="border border-white/10 bg-slate-900 p-5 lg:sticky lg:top-6">
      <h2 className="text-xl font-black">Resumen de compra</h2>
      <div className="mt-5 border-y border-white/10 py-5">
        <SummaryLine label="Productos" value={formatCurrency(subtotal)} />
        <SummaryLine label="Descuentos" value="Se aplican en checkout" />
        <SummaryLine label="Entrega" value="Se calcula despues" />
      </div>
      <div className="flex items-center justify-between gap-4 py-5">
        <span className="font-black">Subtotal</span>
        <span className="text-2xl font-black text-sky-200">{formatCurrency(subtotal)}</span>
      </div>

      <div className="border-y border-white/10 py-5">
        <div className="mb-2 flex items-center justify-between gap-3 text-xs font-black">
          <span className={remainingForFreeShipping === 0 ? "text-emerald-300" : "text-slate-400"}>{remainingForFreeShipping === 0 ? "Tienes despacho gratis" : `Te faltan ${formatCurrency(remainingForFreeShipping)}`}</span>
          <FiTruck className="text-emerald-300" />
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-emerald-400 transition-all" style={{ width: `${freeShippingProgress}%` }} /></div>
      </div>

      <button type="button" onClick={onContinue} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-emerald-500 text-sm font-black text-slate-950 hover:bg-emerald-400">
        Continuar al checkout <FiChevronRight />
      </button>
      <p className="mt-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase text-slate-600"><FiLock /> Compra protegida</p>
    </aside>
  );
}

function Recommendation({ onAdd, product }) {
  return (
    <article className="border border-white/10 bg-slate-900 p-4">
      <Link to={`/shop/product/${encodeURIComponent(product.sku)}`}>
        {product.imageUrl ? <img src={product.imageUrl} alt={product.productName} className="aspect-[4/3] w-full rounded-md bg-white object-cover" /> : <div className="flex aspect-[4/3] items-center justify-center rounded-md bg-slate-800"><FiPackage /></div>}
        <p className="mt-4 line-clamp-2 min-h-10 text-sm font-black">{product.productName}</p>
      </Link>
      <p className="mt-2 text-lg font-black text-sky-200">{formatCurrency(product.salePrice)}</p>
      <button type="button" onClick={() => onAdd(product)} className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-md border border-sky-400/30 text-xs font-black text-sky-200 hover:bg-sky-500/10"><FiPlus /> Agregar</button>
    </article>
  );
}

function EmptyCart() {
  return (
    <section className="mt-7 border border-white/10 bg-slate-900 px-5 py-14 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-800 text-slate-500"><FiShoppingCart size={26} /></div>
      <h2 className="mt-5 text-2xl font-black">Tu carrito esta vacio</h2>
      <p className="mt-2 font-semibold text-slate-500">Explora el catalogo y agrega los productos que necesitas.</p>
      <Link to="/shop" className="mt-6 inline-flex h-11 items-center gap-2 rounded-md bg-sky-500 px-6 text-sm font-black hover:bg-sky-400">Ver productos <FiChevronRight /></Link>
    </section>
  );
}

function QuantityButton({ children, label, onClick }) {
  return <button type="button" title={label} aria-label={label} onClick={onClick} className="flex h-10 w-10 items-center justify-center text-slate-400 hover:text-white">{children}</button>;
}

function SummaryLine({ label, value }) {
  return <div className="mb-3 flex items-center justify-between gap-4 text-sm font-bold last:mb-0"><span className="text-slate-500">{label}</span><span className="text-right text-slate-300">{value}</span></div>;
}

export default CartPage;
