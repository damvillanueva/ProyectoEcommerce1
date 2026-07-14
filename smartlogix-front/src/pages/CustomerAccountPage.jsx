import { useEffect, useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiBox,
  FiCamera,
  FiCheck,
  FiChevronRight,
  FiEdit2,
  FiHome,
  FiLogOut,
  FiMapPin,
  FiPackage,
  FiPlus,
  FiRefreshCw,
  FiSave,
  FiShoppingBag,
  FiTrash2,
  FiTruck,
  FiUser,
  FiX,
} from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/logo-smartlogix.png";
import { clearLogin } from "../services/authService";
import {
  createCustomerAddress,
  deleteCustomerAddress,
  loadCustomerProfile,
  saveCustomerProfile,
  updateCustomerAddress,
} from "../services/customerAccountService";
import { getPublicCatalogProducts } from "../services/inventoryService";
import { loadMyOrders } from "../services/orderService";

const CART_STORAGE_KEY = "smartlogix-store-cart";

const EMPTY_ADDRESS = {
  label: "Casa",
  recipientName: "",
  street: "",
  commune: "",
  region: "Region Metropolitana",
  phone: "",
  defaultAddress: false,
};

const STATUS_META = {
  PENDING: { label: "Pedido recibido", tone: "amber", step: 0 },
  APPROVED: { label: "Pago confirmado", tone: "sky", step: 1 },
  SHIPMENT_REQUESTED: { label: "Preparando despacho", tone: "violet", step: 2 },
  SHIPPED: { label: "En camino", tone: "sky", step: 3 },
  DELIVERED: { label: "Entregado", tone: "emerald", step: 4 },
  REJECTED: { label: "Pedido rechazado", tone: "red", step: -1 },
  FAILED: { label: "Requiere revision", tone: "red", step: -1 },
};

const TRACKING_STEPS = [
  { icon: FiShoppingBag, label: "Recibido" },
  { icon: FiCheck, label: "Confirmado" },
  { icon: FiPackage, label: "Preparando" },
  { icon: FiTruck, label: "En camino" },
  { icon: FiHome, label: "Entregado" },
];

function formatCurrency(value) {
  return new Intl.NumberFormat("es-CL", {
    currency: "CLP",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusMeta(status) {
  return STATUS_META[status] || { label: status || "Sin estado", tone: "slate", step: 0 };
}

function CustomerAccountPage() {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState("summary");
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState(null);
  const [orders, setOrders] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [selectedOrderNumber, setSelectedOrderNumber] = useState(null);
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function fetchAccount() {
      try {
        const [profileData, orderData, catalogData] = await Promise.all([
          loadCustomerProfile(),
          loadMyOrders(),
          getPublicCatalogProducts(),
        ]);
        if (!active) return;

        setProfile(profileData);
        setProfileForm({
          displayName: profileData.displayName || profileData.username,
          email: profileData.email || "",
          phone: profileData.phone || "",
          avatarUrl: profileData.avatarUrl || "",
        });
        setOrders(Array.isArray(orderData) ? orderData : []);
        setCatalog(Array.isArray(catalogData) ? catalogData : []);
        setSelectedOrderNumber(orderData?.[0]?.orderNumber || null);
        setError("");
      } catch (loadError) {
        console.error(loadError);
        if (!active) return;
        if (loadError.response?.status === 401 || loadError.response?.status === 403) {
          clearLogin();
          navigate("/shop/login");
          return;
        }
        setError("No se pudo cargar tu cuenta.");
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchAccount();
    return () => { active = false; };
  }, [navigate]);

  const productsBySku = useMemo(
    () => new Map(catalog.map((product) => [product.sku, product])),
    [catalog]
  );

  const selectedOrder = orders.find((order) => order.orderNumber === selectedOrderNumber) || null;
  const completedOrders = orders.filter((order) => order.status === "DELIVERED").length;
  const activeOrders = orders.filter((order) =>
    ["PENDING", "APPROVED", "SHIPMENT_REQUESTED", "SHIPPED"].includes(order.status)
  ).length;
  const totalSpent = orders
    .filter((order) => !["REJECTED", "FAILED"].includes(order.status))
    .reduce((total, order) => total + Number(order.totalAmount || 0), 0);

  function showMessage(nextMessage) {
    setError("");
    setMessage(nextMessage);
    window.setTimeout(() => setMessage(""), 3500);
  }

  function handleLogout() {
    clearLogin();
    navigate("/shop");
  }

  function updateProfileField(event) {
    const { name, value } = event.target;
    setProfileForm((current) => ({ ...current, [name]: value }));
  }

  function handleAvatar(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 500_000) {
      setError("La foto debe ser PNG, JPG o WEBP y pesar menos de 500 KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setProfileForm((current) => ({ ...current, avatarUrl: String(reader.result) }));
      setError("");
    };
    reader.readAsDataURL(file);
  }

  async function handleSaveProfile(event) {
    event.preventDefault();
    try {
      setSaving(true);
      const savedProfile = await saveCustomerProfile(profileForm);
      setProfile(savedProfile);
      setProfileForm({
        displayName: savedProfile.displayName,
        email: savedProfile.email,
        phone: savedProfile.phone || "",
        avatarUrl: savedProfile.avatarUrl || "",
      });
      showMessage("Perfil actualizado correctamente.");
    } catch (saveError) {
      console.error(saveError);
      setError(saveError.response?.data?.message || "No se pudo actualizar el perfil.");
    } finally {
      setSaving(false);
    }
  }

  function updateAddressField(event) {
    const { checked, name, type, value } = event.target;
    setAddressForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function editAddress(address) {
    setEditingAddressId(address.id);
    setAddressForm({
      label: address.label,
      recipientName: address.recipientName,
      street: address.street,
      commune: address.commune,
      region: address.region,
      phone: address.phone || "",
      defaultAddress: address.defaultAddress,
    });
    setConfirmDeleteId(null);
  }

  function resetAddressForm() {
    setEditingAddressId(null);
    setAddressForm({
      ...EMPTY_ADDRESS,
      recipientName: profile?.displayName || "",
      phone: profile?.phone || "",
      defaultAddress: !(profile?.addresses?.length > 0),
    });
  }

  async function handleSaveAddress(event) {
    event.preventDefault();
    try {
      setSaving(true);
      if (editingAddressId) {
        await updateCustomerAddress(editingAddressId, addressForm);
      } else {
        await createCustomerAddress(addressForm);
      }
      const refreshedProfile = await loadCustomerProfile();
      setProfile(refreshedProfile);
      resetAddressForm();
      showMessage(editingAddressId ? "Direccion actualizada." : "Direccion agregada.");
    } catch (saveError) {
      console.error(saveError);
      setError(saveError.response?.data?.message || "No se pudo guardar la direccion.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAddress(addressId) {
    try {
      setSaving(true);
      await deleteCustomerAddress(addressId);
      const refreshedProfile = await loadCustomerProfile();
      setProfile(refreshedProfile);
      setConfirmDeleteId(null);
      showMessage("Direccion eliminada.");
    } catch (deleteError) {
      console.error(deleteError);
      setError(deleteError.response?.data?.message || "No se pudo eliminar la direccion.");
    } finally {
      setSaving(false);
    }
  }

  function reorder(order) {
    const nextCart = order.lines
      .map((line) => {
        const product = productsBySku.get(line.sku);
        const available = Number(product?.availableQuantity || 0);
        if (available <= 0) return null;
        return { sku: line.sku, quantity: Math.min(line.quantity, available) };
      })
      .filter(Boolean);

    if (nextCart.length === 0) {
      setError("Los productos de este pedido ya no tienen stock disponible.");
      return;
    }

    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(nextCart));
    navigate("/shop");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex items-center gap-3 font-black text-slate-300">
          <FiRefreshCw className="animate-spin" />
          Cargando tu cuenta...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <AccountHeader onLogout={handleLogout} profile={profile} />

      <div className="mx-auto grid max-w-[1500px] gap-6 px-4 py-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:px-6">
        <AccountSidebar
          activeView={activeView}
          onChange={setActiveView}
          orderCount={orders.length}
          profile={profile}
        />

        <main className="min-w-0">
          {(error || message) && (
            <div className={`mb-5 flex items-center justify-between gap-4 rounded-md border p-4 text-sm font-bold ${
              error
                ? "border-red-400/30 bg-red-500/10 text-red-200"
                : "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
            }`}>
              <span>{error || message}</span>
              <button type="button" onClick={() => { setError(""); setMessage(""); }} title="Cerrar">
                <FiX />
              </button>
            </div>
          )}

          {activeView === "summary" && (
            <SummaryView
              activeOrders={activeOrders}
              addresses={profile?.addresses || []}
              completedOrders={completedOrders}
              onOpenOrders={() => setActiveView("orders")}
              orders={orders}
              productsBySku={productsBySku}
              profile={profile}
              totalSpent={totalSpent}
            />
          )}

          {activeView === "orders" && (
            <OrdersView
              onReorder={reorder}
              onSelect={setSelectedOrderNumber}
              orders={orders}
              productsBySku={productsBySku}
              selectedOrder={selectedOrder}
            />
          )}

          {activeView === "profile" && profileForm && (
            <ProfileView
              form={profileForm}
              onAvatar={handleAvatar}
              onChange={updateProfileField}
              onSave={handleSaveProfile}
              saving={saving}
              username={profile.username}
            />
          )}

          {activeView === "addresses" && (
            <AddressesView
              addressForm={addressForm}
              addresses={profile?.addresses || []}
              confirmDeleteId={confirmDeleteId}
              editingAddressId={editingAddressId}
              onCancel={resetAddressForm}
              onChange={updateAddressField}
              onConfirmDelete={handleDeleteAddress}
              onDelete={setConfirmDeleteId}
              onEdit={editAddress}
              onSave={handleSaveAddress}
              saving={saving}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function AccountHeader({ onLogout, profile }) {
  return (
    <header className="border-b border-white/10 bg-indigo-950">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-4 lg:px-6">
        <Link to="/shop" className="flex items-center gap-4">
          <img src={logo} alt="SmartLogix" className="h-7 w-auto" />
          <span className="hidden border-l border-white/15 pl-4 text-sm font-black uppercase text-sky-300 sm:block">
            Mi cuenta
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            to="/shop"
            className="flex h-10 items-center gap-2 rounded-md border border-white/15 px-3 text-sm font-black text-slate-200 transition hover:bg-white/10"
          >
            <FiArrowLeft />
            <span className="hidden sm:inline">Volver a la tienda</span>
          </Link>
          <Avatar profile={profile} size="small" />
          <button
            type="button"
            onClick={onLogout}
            title="Cerrar sesion"
            className="flex h-10 w-10 items-center justify-center rounded-md border border-white/15 text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <FiLogOut />
          </button>
        </div>
      </div>
    </header>
  );
}

function AccountSidebar({ activeView, onChange, orderCount, profile }) {
  const items = [
    { id: "summary", icon: FiHome, label: "Resumen" },
    { id: "orders", icon: FiShoppingBag, label: "Mis compras", count: orderCount },
    { id: "addresses", icon: FiMapPin, label: "Direcciones" },
    { id: "profile", icon: FiUser, label: "Mi perfil" },
  ];

  return (
    <aside className="h-fit overflow-hidden rounded-md border border-white/10 bg-slate-900 lg:sticky lg:top-6">
      <div className="border-b border-white/10 p-5 text-center">
        <div className="mx-auto w-fit"><Avatar profile={profile} /></div>
        <p className="mt-3 truncate font-black">{profile?.displayName}</p>
        <p className="mt-1 truncate text-xs font-bold text-slate-500">{profile?.email}</p>
      </div>
      <nav className="grid grid-cols-2 p-2 sm:grid-cols-4 lg:grid-cols-1">
        {items.map(({ count, icon: Icon, id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`flex min-h-11 items-center gap-2 rounded-md px-2 text-left text-xs font-black transition sm:gap-3 sm:px-3 sm:text-sm ${
              activeView === id
                ? "bg-sky-500 text-white"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon className="shrink-0" />
            <span className="min-w-0 flex-1 whitespace-nowrap">{label}</span>
            {count > 0 && <span className="rounded-full bg-slate-950/30 px-2 py-0.5 text-xs">{count}</span>}
          </button>
        ))}
      </nav>
    </aside>
  );
}

function SummaryView({ activeOrders, addresses, completedOrders, onOpenOrders, orders, productsBySku, profile, totalSpent }) {
  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-black uppercase text-sky-300">Cuenta SmartLogix</p>
        <h1 className="mt-1 text-3xl font-black">Hola, {profile?.displayName}</h1>
        <p className="mt-2 font-semibold text-slate-400">Revisa tus compras, despachos y datos personales.</p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AccountMetric icon={FiTruck} label="Pedidos activos" tone="sky" value={activeOrders} />
        <AccountMetric icon={FiCheck} label="Entregados" tone="emerald" value={completedOrders} />
        <AccountMetric icon={FiMapPin} label="Direcciones" tone="amber" value={addresses.length} />
        <AccountMetric icon={FiShoppingBag} label="Total comprado" tone="violet" value={formatCurrency(totalSpent)} />
      </section>

      <section className="mt-7 border-t border-white/10 pt-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black">Compras recientes</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">Tus ultimos movimientos en la tienda.</p>
          </div>
          <button type="button" onClick={onOpenOrders} className="text-sm font-black text-sky-300 hover:text-sky-200">
            Ver todas
          </button>
        </div>

        {orders.length === 0 ? (
          <EmptyOrders />
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {orders.slice(0, 4).map((order) => (
              <CompactOrder key={order.orderNumber} order={order} productsBySku={productsBySku} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function AccountMetric({ icon: Icon, label, tone, value }) {
  const colors = {
    amber: "bg-amber-500/15 text-amber-300",
    emerald: "bg-emerald-500/15 text-emerald-300",
    sky: "bg-sky-500/15 text-sky-300",
    violet: "bg-violet-500/15 text-violet-300",
  };
  return (
    <div className="flex min-h-28 items-center gap-4 rounded-md border border-white/10 bg-slate-900 p-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md ${colors[tone]}`}><Icon /></div>
      <div className="min-w-0">
        <p className="text-xs font-black uppercase text-slate-500">{label}</p>
        <p className="mt-2 truncate text-xl font-black">{value}</p>
      </div>
    </div>
  );
}

function CompactOrder({ order, productsBySku }) {
  const meta = statusMeta(order.status);
  const firstLine = order.lines?.[0];
  const firstProduct = firstLine ? productsBySku.get(firstLine.sku) : null;
  return (
    <article className="flex items-center gap-4 rounded-md border border-white/10 bg-slate-900 p-4">
      <ProductThumb product={firstProduct} sku={firstLine?.sku} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-black">{order.orderNumber}</p>
          <StatusBadge meta={meta} />
        </div>
        <p className="mt-1 text-xs font-bold text-slate-500">{formatDate(order.createdAt)}</p>
        <p className="mt-2 text-sm font-black text-sky-200">{formatCurrency(order.totalAmount)}</p>
      </div>
    </article>
  );
}

function OrdersView({ onReorder, onSelect, orders, productsBySku, selectedOrder }) {
  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-black uppercase text-sky-300">Historial privado</p>
        <h1 className="mt-1 text-3xl font-black">Mis compras</h1>
        <p className="mt-2 font-semibold text-slate-400">Solo tu cuenta puede consultar estos pedidos.</p>
      </div>

      {orders.length === 0 ? (
        <EmptyOrders />
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-3">
            {orders.map((order) => {
              const meta = statusMeta(order.status);
              const selected = selectedOrder?.orderNumber === order.orderNumber;
              return (
                <button
                  key={order.orderNumber}
                  type="button"
                  onClick={() => onSelect(order.orderNumber)}
                  className={`flex w-full items-center gap-4 rounded-md border p-4 text-left transition ${
                    selected
                      ? "border-sky-400/60 bg-sky-500/10"
                      : "border-white/10 bg-slate-900 hover:border-white/20"
                  }`}
                >
                  <ProductThumb product={productsBySku.get(order.lines?.[0]?.sku)} sku={order.lines?.[0]?.sku} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black">{order.orderNumber}</p>
                      <StatusBadge meta={meta} />
                    </div>
                    <p className="mt-1 text-xs font-bold text-slate-500">{formatDate(order.createdAt)}</p>
                    <p className="mt-2 text-sm font-bold text-slate-300">
                      {order.lines?.length || 0} producto(s) | {order.salesChannel === "STORE" ? "Tienda fisica" : "Compra online"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-sky-200">{formatCurrency(order.totalAmount)}</p>
                    <FiChevronRight className="ml-auto mt-2 text-slate-500" />
                  </div>
                </button>
              );
            })}
          </div>

          {selectedOrder && (
            <OrderDetail order={selectedOrder} productsBySku={productsBySku} onReorder={onReorder} />
          )}
        </div>
      )}
    </div>
  );
}

function OrderDetail({ onReorder, order, productsBySku }) {
  const meta = statusMeta(order.status);
  const failed = ["REJECTED", "FAILED"].includes(order.status);
  return (
    <aside className="overflow-hidden rounded-md border border-white/10 bg-slate-900 xl:sticky xl:top-6">
      <div className="border-b border-white/10 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase text-slate-500">Pedido</p>
            <h2 className="mt-1 text-xl font-black">{order.orderNumber}</h2>
          </div>
          <StatusBadge meta={meta} />
        </div>
        <p className="mt-2 text-xs font-bold text-slate-500">{formatDate(order.createdAt)}</p>
      </div>

      <div className="p-5">
        {failed ? (
          <div className="rounded-md border border-red-400/25 bg-red-500/10 p-4 text-sm font-bold text-red-200">
            {order.rejectionReason || "Este pedido necesita revision del equipo."}
          </div>
        ) : (
          <TrackingTimeline currentStep={meta.step} />
        )}

        <div className="mt-6 space-y-3 border-t border-white/10 pt-5">
          {order.lines?.map((line) => {
            const product = productsBySku.get(line.sku);
            return (
              <div key={line.sku} className="flex items-center gap-3">
                <ProductThumb product={product} sku={line.sku} small />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black">{product?.productName || line.sku}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{line.quantity} x {formatCurrency(line.unitPrice)}</p>
                </div>
                <p className="text-sm font-black text-slate-200">{formatCurrency(line.lineAmount)}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-5 space-y-2 border-t border-white/10 pt-5 text-sm">
          <SummaryLine label="Subtotal" value={formatCurrency(order.subtotalAmount)} />
          <SummaryLine label="Descuento" value={`-${formatCurrency(order.discountAmount)}`} />
          <SummaryLine label="Total" value={formatCurrency(order.totalAmount)} strong />
        </div>

        <div className="mt-5 border-t border-white/10 pt-5">
          <p className="text-xs font-black uppercase text-slate-500">Entrega</p>
          <p className="mt-2 text-sm font-bold text-slate-300">{order.shippingAddress}</p>
          {order.trackingCode && (
            <p className="mt-2 text-xs font-black text-sky-300">Seguimiento: {order.trackingCode}</p>
          )}
        </div>

        <button
          type="button"
          onClick={() => onReorder(order)}
          className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-sky-500 px-4 text-sm font-black transition hover:bg-sky-400"
        >
          <FiRefreshCw />
          Comprar nuevamente
        </button>
      </div>
    </aside>
  );
}

function TrackingTimeline({ currentStep }) {
  return (
    <div className="grid grid-cols-5 gap-1">
      {TRACKING_STEPS.map(({ icon: Icon, label }, index) => {
        const done = index <= currentStep;
        return (
          <div key={label} className="min-w-0 text-center">
            <div className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full border ${
              done
                ? "border-emerald-400 bg-emerald-500 text-slate-950"
                : "border-white/10 bg-slate-950 text-slate-600"
            }`}><Icon size={14} /></div>
            <p className={`mt-2 truncate text-[10px] font-black ${done ? "text-emerald-300" : "text-slate-600"}`}>
              {label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function ProfileView({ form, onAvatar, onChange, onSave, saving, username }) {
  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <p className="text-sm font-black uppercase text-sky-300">Datos personales</p>
        <h1 className="mt-1 text-3xl font-black">Mi perfil</h1>
      </div>

      <form onSubmit={onSave} className="rounded-md border border-white/10 bg-slate-900 p-5 sm:p-7">
        <div className="flex flex-col gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-center">
          <Avatar profile={{ displayName: form.displayName, avatarUrl: form.avatarUrl }} size="large" />
          <div>
            <p className="font-black">Foto del cliente</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">PNG, JPG o WEBP. Maximo 500 KB.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <label className="flex h-10 cursor-pointer items-center gap-2 rounded-md bg-sky-500 px-4 text-sm font-black hover:bg-sky-400">
                <FiCamera /> Cambiar foto
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onAvatar} className="hidden" />
              </label>
              {form.avatarUrl && (
                <button
                  type="button"
                  onClick={() => onChange({ target: { name: "avatarUrl", value: "" } })}
                  title="Quitar foto"
                  className="flex h-10 w-10 items-center justify-center rounded-md border border-white/10 text-slate-400 hover:text-white"
                >
                  <FiTrash2 />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <FormField label="Nombre visible" name="displayName" onChange={onChange} value={form.displayName} />
          <FormField label="Usuario" value={username} readOnly />
          <FormField label="Correo electronico" name="email" onChange={onChange} type="email" value={form.email} />
          <FormField label="Telefono" name="phone" onChange={onChange} value={form.phone} placeholder="+56 9 1234 5678" />
        </div>

        <div className="mt-6 flex justify-end">
          <button disabled={saving} className="flex h-11 items-center gap-2 rounded-md bg-emerald-500 px-5 text-sm font-black hover:bg-emerald-400 disabled:opacity-60">
            <FiSave /> {saving ? "Guardando..." : "Guardar perfil"}
          </button>
        </div>
      </form>
    </div>
  );
}

function AddressesView({ addressForm, addresses, confirmDeleteId, editingAddressId, onCancel, onChange, onConfirmDelete, onDelete, onEdit, onSave, saving }) {
  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-black uppercase text-sky-300">Entrega y retiro</p>
        <h1 className="mt-1 text-3xl font-black">Mis direcciones</h1>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section>
          {addresses.length === 0 ? (
            <div className="rounded-md border border-dashed border-white/15 p-8 text-center text-slate-400">
              <FiMapPin className="mx-auto" size={28} />
              <p className="mt-3 font-black">Aun no tienes direcciones guardadas.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {addresses.map((address) => (
                <article key={address.id} className="rounded-md border border-white/10 bg-slate-900 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-black">{address.label}</h2>
                        {address.defaultAddress && (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-black uppercase text-emerald-300">Principal</span>
                        )}
                      </div>
                      <p className="mt-3 text-sm font-bold text-slate-300">{address.recipientName}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-500">{address.street}</p>
                      <p className="text-sm font-semibold text-slate-500">{address.commune}, {address.region}</p>
                      {address.phone && <p className="mt-2 text-xs font-bold text-slate-500">{address.phone}</p>}
                    </div>
                    <button type="button" onClick={() => onEdit(address)} title="Editar direccion" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 text-slate-400 hover:text-white">
                      <FiEdit2 />
                    </button>
                  </div>

                  {confirmDeleteId === address.id ? (
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-red-400/20 pt-4">
                      <p className="text-xs font-bold text-red-200">Eliminar esta direccion?</p>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => onDelete(null)} title="Cancelar" className="flex h-8 w-8 items-center justify-center rounded-md border border-white/10"><FiX /></button>
                        <button type="button" disabled={saving} onClick={() => onConfirmDelete(address.id)} title="Confirmar eliminacion" className="flex h-8 w-8 items-center justify-center rounded-md bg-red-500 text-white"><FiTrash2 /></button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => onDelete(address.id)} className="mt-4 flex items-center gap-2 text-xs font-black text-red-300 hover:text-red-200">
                      <FiTrash2 /> Eliminar
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <form onSubmit={onSave} className="rounded-md border border-white/10 bg-slate-900 p-5 xl:sticky xl:top-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-sky-300">{editingAddressId ? "Editar" : "Nueva"}</p>
              <h2 className="text-xl font-black">Direccion de entrega</h2>
            </div>
            {editingAddressId && (
              <button type="button" onClick={onCancel} title="Cancelar edicion" className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-slate-400"><FiX /></button>
            )}
          </div>

          <div className="grid gap-3">
            <FormField label="Etiqueta" name="label" onChange={onChange} value={addressForm.label} placeholder="Casa, trabajo..." />
            <FormField label="Persona que recibe" name="recipientName" onChange={onChange} value={addressForm.recipientName} />
            <FormField label="Calle y numero" name="street" onChange={onChange} value={addressForm.street} />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <FormField label="Comuna" name="commune" onChange={onChange} value={addressForm.commune} />
              <FormField label="Region" name="region" onChange={onChange} value={addressForm.region} />
            </div>
            <FormField label="Telefono" name="phone" onChange={onChange} value={addressForm.phone} />
            <label className="flex items-center gap-3 rounded-md border border-white/10 bg-slate-950 p-3 text-sm font-bold text-slate-300">
              <input type="checkbox" name="defaultAddress" checked={addressForm.defaultAddress} onChange={onChange} className="h-4 w-4 accent-sky-500" />
              Usar como direccion principal
            </label>
          </div>

          <button disabled={saving} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-sky-500 px-4 text-sm font-black hover:bg-sky-400 disabled:opacity-60">
            {editingAddressId ? <FiSave /> : <FiPlus />}
            {saving ? "Guardando..." : editingAddressId ? "Actualizar direccion" : "Agregar direccion"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Avatar({ profile, size = "default" }) {
  const classes = size === "large" ? "h-24 w-24 text-3xl" : size === "small" ? "h-10 w-10 text-sm" : "h-20 w-20 text-2xl";
  const initial = String(profile?.displayName || "C").trim().charAt(0).toUpperCase();
  if (profile?.avatarUrl) {
    return <img src={profile.avatarUrl} alt={profile.displayName || "Cliente"} className={`${classes} rounded-full border-2 border-sky-400/40 object-cover`} />;
  }
  return <div className={`${classes} flex items-center justify-center rounded-full border-2 border-sky-400/40 bg-sky-500/15 font-black text-sky-200`}>{initial}</div>;
}

function ProductThumb({ product, sku, small = false }) {
  const classes = small ? "h-11 w-11" : "h-14 w-14";
  if (product?.imageUrl) {
    return <img src={product.imageUrl} alt={product.productName} className={`${classes} shrink-0 rounded-md border border-white/10 object-cover`} />;
  }
  return <div className={`${classes} flex shrink-0 items-center justify-center rounded-md bg-slate-800 text-xs font-black text-slate-500`}>{String(sku || "P").slice(0, 3)}</div>;
}

function StatusBadge({ meta }) {
  const colors = {
    amber: "bg-amber-500/15 text-amber-300",
    emerald: "bg-emerald-500/15 text-emerald-300",
    red: "bg-red-500/15 text-red-300",
    sky: "bg-sky-500/15 text-sky-300",
    slate: "bg-slate-500/15 text-slate-300",
    violet: "bg-violet-500/15 text-violet-300",
  };
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${colors[meta.tone]}`}>{meta.label}</span>;
}

function SummaryLine({ label, strong, value }) {
  return (
    <div className={`flex items-center justify-between gap-4 ${strong ? "border-t border-white/10 pt-3 text-base font-black" : "font-bold text-slate-400"}`}>
      <span>{label}</span><span className={strong ? "text-sky-200" : "text-slate-200"}>{value}</span>
    </div>
  );
}

function FormField({ label, name, onChange, placeholder, readOnly = false, type = "text", value }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase text-slate-500">{label}</span>
      <input
        required={!readOnly}
        name={name}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        type={type}
        value={value || ""}
        className="h-11 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none placeholder:text-slate-600 read-only:cursor-not-allowed read-only:text-slate-500 focus:border-sky-400"
      />
    </label>
  );
}

function EmptyOrders() {
  return (
    <div className="rounded-md border border-dashed border-white/15 p-10 text-center">
      <FiBox className="mx-auto text-slate-600" size={32} />
      <p className="mt-4 font-black text-slate-300">Todavia no tienes compras.</p>
      <Link to="/shop" className="mt-4 inline-flex h-10 items-center rounded-md bg-sky-500 px-4 text-sm font-black hover:bg-sky-400">Explorar productos</Link>
    </div>
  );
}

export default CustomerAccountPage;
