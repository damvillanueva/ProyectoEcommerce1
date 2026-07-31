import { useEffect, useMemo, useState } from "react";
import {
  FiAlertTriangle,
  FiArchive,
  FiCheck,
  FiClipboard,
  FiEdit2,
  FiPackage,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiShoppingCart,
  FiTrash2,
  FiTruck,
  FiX,
} from "react-icons/fi";
import Navbar from "../components/Navbar";
import ToastStack from "../components/ToastStack";
import { useToasts } from "../hooks/useToasts";
import PageContainer from "../layout/PageContainer";
import {
  fetchWarehouses,
  getInventoryItemsWithAvailable,
} from "../services/inventoryService";
import {
  approvePurchaseOrder,
  cancelPurchaseOrder,
  deactivateSupplier,
  editSupplier,
  fetchPurchaseOrders,
  fetchReplenishmentProposals,
  fetchSuppliers,
  receivePurchaseOrder,
  removeSupplierProduct,
  savePurchaseOrder,
  saveSupplier,
  saveSupplierProduct,
} from "../services/procurementService";

const TABS = [
  { id: "suppliers", label: "Proveedores", icon: FiTruck },
  { id: "orders", label: "Ordenes de compra", icon: FiClipboard },
  { id: "replenishment", label: "Reposicion", icon: FiAlertTriangle },
];

const STATUS_META = {
  DRAFT: { label: "Borrador", style: "border-slate-400/30 bg-slate-400/10 text-slate-200" },
  APPROVED: { label: "Aprobada", style: "border-sky-400/30 bg-sky-400/10 text-sky-200" },
  PARTIALLY_RECEIVED: { label: "Recepcion parcial", style: "border-amber-400/30 bg-amber-400/10 text-amber-200" },
  RECEIVED: { label: "Recibida", style: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" },
  CANCELLED: { label: "Cancelada", style: "border-red-400/30 bg-red-400/10 text-red-200" },
};

const EMPTY_SUPPLIER = {
  code: "",
  businessName: "",
  taxId: "",
  contactName: "",
  email: "",
  phone: "",
  address: "",
  paymentTermsDays: "30",
  leadTimeDays: "5",
  active: true,
};

const EMPTY_PRODUCT = {
  sku: "",
  supplierSku: "",
  unitCost: "",
  minimumOrderQuantity: "1",
  preferred: true,
};

function futureDate(days = 5) {
  const date = new Date();
  date.setDate(date.getDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function getErrorMessage(error) {
  return error?.response?.data?.message
    || error?.response?.data?.error
    || "No se pudo completar la operacion.";
}

function ProcurementPage() {
  const [activeTab, setActiveTab] = useState("suppliers");
  const [suppliers, setSuppliers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState(null);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [supplierForm, setSupplierForm] = useState(EMPTY_SUPPLIER);
  const [editingSupplierId, setEditingSupplierId] = useState(null);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT);
  const [orderForm, setOrderForm] = useState({
    supplierId: "",
    warehouseCode: "",
    expectedAt: futureDate(),
    notes: "",
    lines: [{ sku: "", quantity: "1" }],
  });
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const { dismissToast, showToast, toasts } = useToasts();

  const selectedSupplier = suppliers.find((supplier) => supplier.id === selectedSupplierId) || null;
  const filteredSuppliers = useMemo(() => {
    const query = supplierSearch.trim().toLowerCase();
    if (!query) return suppliers;
    return suppliers.filter((supplier) =>
      [supplier.code, supplier.businessName, supplier.taxId, supplier.contactName]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [supplierSearch, suppliers]);

  async function loadAll() {
    try {
      setLoading(true);
      const [supplierData, orderData, proposalData, inventoryData, warehouseData] = await Promise.all([
        fetchSuppliers(),
        fetchPurchaseOrders(),
        fetchReplenishmentProposals(),
        getInventoryItemsWithAvailable(),
        fetchWarehouses(),
      ]);
      setSuppliers(supplierData);
      setOrders(orderData);
      setProposals(proposalData);
      setInventory(inventoryData);
      setWarehouses(warehouseData.filter((warehouse) => warehouse.active));
      setSelectedSupplierId((current) =>
        supplierData.some((supplier) => supplier.id === current)
          ? current
          : supplierData[0]?.id || null,
      );
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  }

  async function refreshProcurement(message) {
    const [supplierData, orderData, proposalData] = await Promise.all([
      fetchSuppliers(),
      fetchPurchaseOrders(),
      fetchReplenishmentProposals(),
    ]);
    setSuppliers(supplierData);
    setOrders(orderData);
    setProposals(proposalData);
    if (message) showToast(message, "success");
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function runAction(action, successMessage) {
    try {
      setBusy(true);
      await action();
      await refreshProcurement(successMessage);
      return true;
    } catch (error) {
      showToast(getErrorMessage(error), "error");
      return false;
    } finally {
      setBusy(false);
      setConfirmAction(null);
    }
  }

  function openNewSupplier() {
    setEditingSupplierId(null);
    setSupplierForm(EMPTY_SUPPLIER);
    setShowSupplierForm(true);
  }

  function openEditSupplier(supplier) {
    setEditingSupplierId(supplier.id);
    setSupplierForm({
      code: supplier.code,
      businessName: supplier.businessName,
      taxId: supplier.taxId,
      contactName: supplier.contactName || "",
      email: supplier.email,
      phone: supplier.phone || "",
      address: supplier.address || "",
      paymentTermsDays: String(supplier.paymentTermsDays),
      leadTimeDays: String(supplier.leadTimeDays),
      active: supplier.active,
    });
    setShowSupplierForm(true);
  }

  async function submitSupplier(event) {
    event.preventDefault();
    const payload = {
      ...supplierForm,
      paymentTermsDays: Number(supplierForm.paymentTermsDays),
      leadTimeDays: Number(supplierForm.leadTimeDays),
    };
    const saved = await runAction(
      () => editingSupplierId
        ? editSupplier(editingSupplierId, payload)
        : saveSupplier(payload),
      editingSupplierId ? "Proveedor actualizado." : "Proveedor creado.",
    );
    if (saved) setShowSupplierForm(false);
  }

  async function submitProduct(event) {
    event.preventDefault();
    if (!selectedSupplier) return;
    const saved = await runAction(
      () => saveSupplierProduct(selectedSupplier.id, {
        ...productForm,
        unitCost: Number(productForm.unitCost),
        minimumOrderQuantity: Number(productForm.minimumOrderQuantity),
      }),
      "Producto asociado al proveedor.",
    );
    if (saved) setProductForm(EMPTY_PRODUCT);
  }

  function changeOrderLine(index, field, value) {
    setOrderForm((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [field]: value } : line,
      ),
    }));
  }

  function addOrderLine() {
    setOrderForm((current) => ({
      ...current,
      lines: [...current.lines, { sku: "", quantity: "1" }],
    }));
  }

  function removeOrderLine(index) {
    setOrderForm((current) => ({
      ...current,
      lines: current.lines.length === 1
        ? current.lines
        : current.lines.filter((_, lineIndex) => lineIndex !== index),
    }));
  }

  async function submitOrder(event) {
    event.preventDefault();
    const saved = await runAction(
      () => savePurchaseOrder({
        supplierId: Number(orderForm.supplierId),
        warehouseCode: orderForm.warehouseCode,
        expectedAt: orderForm.expectedAt,
        notes: orderForm.notes,
        lines: orderForm.lines.map((line) => ({
          sku: line.sku,
          quantity: Number(line.quantity),
        })),
      }),
      "Orden de compra creada en borrador.",
    );
    if (saved) setShowOrderForm(false);
  }

  function prepareOrder(proposal) {
    const supplier = suppliers.find((current) => current.id === proposal.supplierId);
    setOrderForm({
      supplierId: String(proposal.supplierId || ""),
      warehouseCode: proposal.warehouseCode || warehouses[0]?.code || "",
      expectedAt: futureDate(supplier?.leadTimeDays || 5),
      notes: `Reposicion sugerida para ${proposal.sku}`,
      lines: [{ sku: proposal.sku, quantity: String(proposal.suggestedQuantity) }],
    });
    setActiveTab("orders");
    setShowOrderForm(true);
  }

  const activeSuppliers = suppliers.filter((supplier) => supplier.active);
  const pendingOrders = orders.filter((order) =>
    ["DRAFT", "APPROVED", "PARTIALLY_RECEIVED"].includes(order.status),
  );
  const quotedProducts = new Set(
    suppliers.flatMap((supplier) => supplier.products.map((product) => product.sku)),
  ).size;

  return (
    <div className="min-h-screen bg-[#07111f] p-2 text-white sm:p-5">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <PageContainer>
        <div className="overflow-hidden rounded-lg border border-white/10 bg-slate-950 shadow-2xl">
          <Navbar />

          <main className="bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.09),transparent_30%),linear-gradient(145deg,#07111f,#0f172a_55%,#111827)] px-3 py-5 sm:px-6 lg:px-8">
            <header className="flex flex-col gap-4 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase text-sky-300">Abastecimiento</p>
                <h1 className="mt-1 text-2xl font-black sm:text-3xl">Proveedores y compras</h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-400">
                  Controla costos, ordenes, recepciones y reposicion conectadas al stock por bodega.
                </p>
              </div>
              <button
                type="button"
                onClick={loadAll}
                disabled={loading || busy}
                title="Actualizar datos"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 text-sm font-black text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
              >
                <FiRefreshCw aria-hidden="true" className={loading ? "animate-spin" : ""} />
                Actualizar
              </button>
            </header>

            <section aria-label="Resumen de abastecimiento" className="grid grid-cols-2 gap-2 border-b border-white/10 py-5 lg:grid-cols-4">
              <Metric label="Proveedores activos" value={activeSuppliers.length} tone="sky" icon={FiTruck} />
              <Metric label="Ordenes abiertas" value={pendingOrders.length} tone="amber" icon={FiClipboard} />
              <Metric label="Alertas de reposicion" value={proposals.length} tone="red" icon={FiAlertTriangle} />
              <Metric label="Productos cotizados" value={quotedProducts} tone="emerald" icon={FiArchive} />
            </section>

            <div className="mt-5 overflow-x-auto pb-1">
              <div role="tablist" aria-label="Vistas de abastecimiento" className="inline-flex min-w-max gap-1 rounded-lg border border-white/10 bg-black/20 p-1">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setActiveTab(tab.id)}
                      className={`inline-flex h-11 items-center gap-2 rounded-md px-4 text-sm font-black transition ${
                        active ? "bg-sky-500 text-slate-950" : "text-slate-300 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon aria-hidden="true" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {loading ? (
              <div role="status" className="flex min-h-80 items-center justify-center text-sm font-bold text-slate-400">
                Cargando abastecimiento...
              </div>
            ) : (
              <div className="mt-5">
                {activeTab === "suppliers" && (
                  <SupplierView
                    suppliers={filteredSuppliers}
                    inventory={inventory}
                    search={supplierSearch}
                    onSearch={setSupplierSearch}
                    selected={selectedSupplier}
                    onSelect={setSelectedSupplierId}
                    onNew={openNewSupplier}
                    onEdit={openEditSupplier}
                    onDeactivate={(supplier) => setConfirmAction({
                      title: "Desactivar proveedor",
                      description: `${supplier.businessName} dejara de estar disponible para nuevas compras.`,
                      confirmLabel: "Desactivar",
                      danger: true,
                      action: () => runAction(
                        () => deactivateSupplier(supplier.id),
                        "Proveedor desactivado.",
                      ),
                    })}
                    productForm={productForm}
                    setProductForm={setProductForm}
                    onSubmitProduct={submitProduct}
                    onRemoveProduct={(product) => setConfirmAction({
                      title: "Quitar producto",
                      description: `Se eliminara la relacion comercial de ${product.sku}.`,
                      confirmLabel: "Quitar",
                      danger: true,
                      action: () => runAction(
                        () => removeSupplierProduct(selectedSupplier.id, product.sku),
                        "Producto retirado del proveedor.",
                      ),
                    })}
                    busy={busy}
                  />
                )}

                {activeTab === "orders" && (
                  <OrdersView
                    orders={orders}
                    inventory={inventory}
                    suppliers={activeSuppliers}
                    warehouses={warehouses}
                    orderForm={orderForm}
                    setOrderForm={setOrderForm}
                    showForm={showOrderForm}
                    setShowForm={setShowOrderForm}
                    expandedOrderId={expandedOrderId}
                    setExpandedOrderId={setExpandedOrderId}
                    onChangeLine={changeOrderLine}
                    onAddLine={addOrderLine}
                    onRemoveLine={removeOrderLine}
                    onSubmit={submitOrder}
                    onApprove={(order) => runAction(
                      () => approvePurchaseOrder(order.id),
                      `${order.orderNumber} aprobada.`,
                    )}
                    onReceive={(order) => setConfirmAction({
                      title: "Recibir mercaderia pendiente",
                      description: `Se ingresaran ${order.orderedUnits - order.receivedUnits} unidades a ${order.warehouseName}.`,
                      confirmLabel: "Recibir stock",
                      action: () => runAction(
                        () => receivePurchaseOrder(order.id, {
                          lines: order.lines
                            .filter((line) => line.pendingQuantity > 0)
                            .map((line) => ({ lineId: line.id, quantity: line.pendingQuantity })),
                        }),
                        `${order.orderNumber} recibida y stock actualizado.`,
                      ),
                    })}
                    onCancel={(order) => setConfirmAction({
                      title: "Cancelar orden",
                      description: `${order.orderNumber} quedara cerrada sin recibir mercaderia.`,
                      confirmLabel: "Cancelar orden",
                      danger: true,
                      action: () => runAction(
                        () => cancelPurchaseOrder(order.id),
                        `${order.orderNumber} cancelada.`,
                      ),
                    })}
                    busy={busy}
                  />
                )}

                {activeTab === "replenishment" && (
                  <ReplenishmentView proposals={proposals} onPrepareOrder={prepareOrder} />
                )}
              </div>
            )}
          </main>
        </div>
      </PageContainer>

      {showSupplierForm && (
        <SupplierDialog
          form={supplierForm}
          setForm={setSupplierForm}
          editing={Boolean(editingSupplierId)}
          busy={busy}
          onClose={() => setShowSupplierForm(false)}
          onSubmit={submitSupplier}
        />
      )}

      {confirmAction && (
        <ConfirmDialog
          {...confirmAction}
          busy={busy}
          onClose={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}

function Metric({ compact = false, icon: Icon, label, tone, value }) {
  const tones = {
    sky: "bg-sky-400/10 text-sky-300",
    amber: "bg-amber-400/10 text-amber-300",
    red: "bg-red-400/10 text-red-300",
    emerald: "bg-emerald-400/10 text-emerald-300",
  };
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-3 sm:p-4">
      <span className={`hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg sm:flex ${tones[tone]}`}>
        <Icon aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-black uppercase text-slate-500">{label}</p>
        <p className={`${compact ? "text-base sm:text-lg" : "text-xl sm:text-2xl"} mt-1 truncate font-black text-white`}>{value}</p>
      </div>
    </div>
  );
}

function SupplierView({
  busy,
  inventory,
  onDeactivate,
  onEdit,
  onNew,
  onRemoveProduct,
  onSearch,
  onSelect,
  onSubmitProduct,
  productForm,
  search,
  selected,
  setProductForm,
  suppliers,
}) {
  return (
    <section aria-labelledby="suppliers-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="suppliers-title" className="text-xl font-black">Directorio de proveedores</h2>
          <p className="mt-1 text-sm text-slate-400">Contactos, condiciones, costos y catalogo comercial.</p>
        </div>
        <button type="button" onClick={onNew} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-sky-500 px-4 text-sm font-black text-slate-950 hover:bg-sky-400">
          <FiPlus aria-hidden="true" /> Nuevo proveedor
        </button>
      </div>

      <div className="relative mt-4 max-w-lg">
        <FiSearch aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 text-slate-500" />
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Buscar por nombre, codigo, RUT o contacto"
          aria-label="Buscar proveedores"
          className="h-11 w-full rounded-lg border border-white/10 bg-black/20 pl-10 pr-4 text-sm text-white outline-none focus:border-sky-400"
        />
      </div>

      <div className="mt-5 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(240px,0.72fr)_minmax(0,1.28fr)]">
        <div className="min-w-0 space-y-2" aria-label="Proveedores registrados">
          {suppliers.length === 0 && <EmptyState text="No se encontraron proveedores." />}
          {suppliers.map((supplier) => (
            <button
              key={supplier.id}
              type="button"
              onClick={() => onSelect(supplier.id)}
              className={`w-full min-w-0 overflow-hidden rounded-lg border p-4 text-left transition ${
                selected?.id === supplier.id
                  ? "border-sky-400/60 bg-sky-400/10"
                  : "border-white/10 bg-white/[0.035] hover:border-white/20 hover:bg-white/[0.06]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-black text-white">{supplier.businessName}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{supplier.code} · {supplier.taxId}</p>
                </div>
                <StatusPill active={supplier.active} />
              </div>
              <div className="mt-3 flex gap-4 text-xs font-bold text-slate-400">
                <span>{supplier.products.length} productos</span>
                <span>{supplier.leadTimeDays} dias entrega</span>
              </div>
            </button>
          ))}
        </div>

        <div className="min-w-0 border-t border-white/10 pt-5 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          {!selected ? (
            <EmptyState text="Selecciona un proveedor para revisar su ficha." />
          ) : (
            <>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-black">{selected.businessName}</h3>
                    <StatusPill active={selected.active} />
                  </div>
                  <p className="mt-2 break-words text-sm text-slate-400">
                    {selected.contactName || "Sin contacto"} · {selected.email} · {selected.phone || "Sin telefono"}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    Pago a {selected.paymentTermsDays} dias · Entrega estimada {selected.leadTimeDays} dias
                  </p>
                </div>
                <div className="flex gap-2">
                  <IconButton label="Editar proveedor" onClick={() => onEdit(selected)} icon={FiEdit2} />
                  {selected.active && <IconButton label="Desactivar proveedor" onClick={() => onDeactivate(selected)} icon={FiArchive} danger />}
                </div>
              </div>

              <form onSubmit={onSubmitProduct} className="mt-6 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 border-y border-white/10 py-5 sm:grid-cols-2 xl:grid-cols-5">
                <Field label="Producto" className="sm:col-span-2 xl:col-span-1">
                  <select required value={productForm.sku} onChange={(event) => setProductForm((current) => ({ ...current, sku: event.target.value }))} className={controlClass}>
                    <option value="">Seleccionar SKU</option>
                    {inventory.map((item) => <option key={item.sku} value={item.sku}>{item.sku} · {item.productName}</option>)}
                  </select>
                </Field>
                <Field label="Codigo proveedor">
                  <input required value={productForm.supplierSku} onChange={(event) => setProductForm((current) => ({ ...current, supplierSku: event.target.value }))} className={controlClass} />
                </Field>
                <Field label="Costo unitario">
                  <input required min="1" type="number" value={productForm.unitCost} onChange={(event) => setProductForm((current) => ({ ...current, unitCost: event.target.value }))} className={controlClass} />
                </Field>
                <Field label="Compra minima">
                  <input required min="1" type="number" value={productForm.minimumOrderQuantity} onChange={(event) => setProductForm((current) => ({ ...current, minimumOrderQuantity: event.target.value }))} className={controlClass} />
                </Field>
                <div className="flex flex-col justify-end gap-2">
                  <label className="relative flex min-h-11 cursor-pointer items-center gap-2 text-xs font-bold text-slate-300">
                    <input type="checkbox" checked={productForm.preferred} onChange={(event) => setProductForm((current) => ({ ...current, preferred: event.target.checked }))} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                    <span aria-hidden="true" className={`flex h-5 w-5 items-center justify-center rounded border ${productForm.preferred ? "border-sky-400 bg-sky-500 text-slate-950" : "border-white/25 bg-black/20"}`}>
                      {productForm.preferred && <FiCheck />}
                    </span>
                    Preferido
                  </label>
                  <button disabled={busy || !selected.active} className="h-11 rounded-lg bg-indigo-500 px-3 text-sm font-black hover:bg-indigo-400 disabled:opacity-50">Asociar</button>
                </div>
              </form>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[780px] text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr>
                      <th className="pb-3">Producto</th>
                      <th className="pb-3">Codigo proveedor</th>
                      <th className="pb-3">Costo</th>
                      <th className="pb-3">Margen</th>
                      <th className="pb-3">Precio sugerido</th>
                      <th className="pb-3">Minimo</th>
                      <th className="pb-3 text-right">Accion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {selected.products.map((product) => (
                      <tr key={product.id}>
                        <td className="py-3 pr-3"><p className="font-black text-white">{product.productName}</p><p className="text-xs text-slate-500">{product.sku}{product.preferred ? " · Preferido" : ""}</p></td>
                        <td className="py-3 pr-3 font-bold text-slate-300">{product.supplierSku}</td>
                        <td className="py-3 pr-3 font-black text-white">{formatCurrency(product.unitCost)}</td>
                        <td className="py-3 pr-3 font-black text-emerald-300">{product.marginPercentage}%</td>
                        <td className="py-3 pr-3 font-black text-sky-300">{formatCurrency(product.suggestedSalePrice)}</td>
                        <td className="py-3 pr-3 text-slate-300">{product.minimumOrderQuantity}</td>
                        <td className="py-3 text-right"><IconButton label={`Quitar ${product.sku}`} onClick={() => onRemoveProduct(product)} icon={FiTrash2} danger /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {selected.products.length === 0 && <EmptyState text="Este proveedor aun no tiene productos asociados." />}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function OrdersView({
  busy,
  expandedOrderId,
  inventory,
  onAddLine,
  onApprove,
  onCancel,
  onChangeLine,
  onReceive,
  onRemoveLine,
  onSubmit,
  orderForm,
  orders,
  setExpandedOrderId,
  setOrderForm,
  setShowForm,
  showForm,
  suppliers,
  warehouses,
}) {
  const supplier = suppliers.find((current) => String(current.id) === String(orderForm.supplierId));
  const availableProducts = (supplier?.products || []).filter((product) => {
    if (!orderForm.warehouseCode) return true;
    const item = inventory.find((current) => current.sku === product.sku);
    return item?.stocks?.some((stock) => stock.warehouseCode === orderForm.warehouseCode)
      || item?.warehouseCode === orderForm.warehouseCode;
  });
  return (
    <section aria-labelledby="purchase-orders-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="purchase-orders-title" className="text-xl font-black">Ordenes de compra</h2>
          <p className="mt-1 text-sm text-slate-400">Aprueba compras y recibe existencias directamente en su bodega.</p>
        </div>
        <button type="button" onClick={() => setShowForm((current) => !current)} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-sky-500 px-4 text-sm font-black text-slate-950 hover:bg-sky-400">
          {showForm ? <FiX aria-hidden="true" /> : <FiPlus aria-hidden="true" />}
          {showForm ? "Cerrar formulario" : "Nueva orden"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="mt-5 border-y border-white/10 py-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Proveedor">
              <select required value={orderForm.supplierId} onChange={(event) => setOrderForm((current) => ({ ...current, supplierId: event.target.value, lines: [{ sku: "", quantity: "1" }] }))} className={controlClass}>
                <option value="">Seleccionar proveedor</option>
                {suppliers.map((item) => <option key={item.id} value={item.id}>{item.businessName}</option>)}
              </select>
            </Field>
            <Field label="Bodega de recepcion">
              <select required value={orderForm.warehouseCode} onChange={(event) => setOrderForm((current) => ({ ...current, warehouseCode: event.target.value, lines: [{ sku: "", quantity: "1" }] }))} className={controlClass}>
                <option value="">Seleccionar bodega</option>
                {warehouses.map((warehouse) => <option key={warehouse.code} value={warehouse.code}>{warehouse.name}</option>)}
              </select>
            </Field>
            <Field label="Fecha esperada">
              <input required min={new Date().toISOString().slice(0, 10)} type="date" value={orderForm.expectedAt} onChange={(event) => setOrderForm((current) => ({ ...current, expectedAt: event.target.value }))} className={controlClass} />
            </Field>
            <Field label="Nota interna">
              <input maxLength="500" value={orderForm.notes} onChange={(event) => setOrderForm((current) => ({ ...current, notes: event.target.value }))} className={controlClass} />
            </Field>
          </div>

          <div className="mt-4 space-y-2">
            {orderForm.lines.map((line, index) => (
              <div key={`line-${index}`} className="grid gap-2 rounded-lg border border-white/10 bg-black/15 p-3 sm:grid-cols-[minmax(0,1fr)_140px_44px]">
                <select required aria-label={`Producto linea ${index + 1}`} value={line.sku} onChange={(event) => onChangeLine(index, "sku", event.target.value)} className={controlClass}>
                  <option value="">Seleccionar producto asociado</option>
                  {availableProducts.map((product) => <option key={product.sku} value={product.sku}>{product.sku} · {product.productName} · min. {product.minimumOrderQuantity}</option>)}
                </select>
                <input required aria-label={`Cantidad linea ${index + 1}`} min="1" type="number" value={line.quantity} onChange={(event) => onChangeLine(index, "quantity", event.target.value)} className={controlClass} />
                <IconButton label={`Quitar linea ${index + 1}`} onClick={() => onRemoveLine(index)} icon={FiTrash2} danger />
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-between">
            <button type="button" onClick={onAddLine} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 text-sm font-black hover:bg-white/10"><FiPlus /> Agregar linea</button>
            <button disabled={busy} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-indigo-500 px-5 text-sm font-black hover:bg-indigo-400 disabled:opacity-50"><FiClipboard /> Crear borrador</button>
          </div>
        </form>
      )}

      <div className="mt-5 space-y-3">
        {orders.length === 0 && <EmptyState text="Todavia no hay ordenes de compra." />}
        {orders.map((order) => {
          const meta = STATUS_META[order.status] || STATUS_META.DRAFT;
          const expanded = expandedOrderId === order.id;
          return (
            <article key={order.id} className="rounded-lg border border-white/10 bg-white/[0.035]">
              <button type="button" onClick={() => setExpandedOrderId(expanded ? null : order.id)} aria-expanded={expanded} className="grid w-full gap-3 p-4 text-left sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><span className="font-black text-white">{order.orderNumber}</span><span className={`rounded-full border px-2 py-1 text-[11px] font-black ${meta.style}`}>{meta.label}</span></div>
                  <p className="mt-1 truncate text-sm text-slate-400">{order.supplierName} · {order.warehouseName}</p>
                </div>
                <div className="text-sm"><p className="font-black text-white">{formatCurrency(order.total)}</p><p className="text-xs text-slate-500">{order.receivedUnits}/{order.orderedUnits} unidades recibidas</p></div>
                <span className="text-xs font-black text-sky-300">{expanded ? "Ocultar" : "Ver detalle"}</span>
              </button>

              {expanded && (
                <div className="border-t border-white/10 p-4">
                  <div className="grid gap-2 text-xs text-slate-400 sm:grid-cols-3">
                    <p><span className="font-black text-slate-200">Entrega:</span> {order.expectedAt}</p>
                    <p><span className="font-black text-slate-200">Creada por:</span> {order.createdBy}</p>
                    <p><span className="font-black text-slate-200">Aprobada por:</span> {order.approvedBy || "Pendiente"}</p>
                  </div>
                  {order.notes && <p className="mt-3 text-sm text-slate-300">{order.notes}</p>}
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[620px] text-left text-sm">
                      <thead className="text-xs uppercase text-slate-500"><tr><th className="pb-2">Producto</th><th className="pb-2">Costo</th><th className="pb-2">Pedido</th><th className="pb-2">Recibido</th><th className="pb-2">Pendiente</th></tr></thead>
                      <tbody className="divide-y divide-white/10">
                        {order.lines.map((line) => <tr key={line.id}><td className="py-2 pr-3"><strong className="text-white">{line.productName}</strong><span className="block text-xs text-slate-500">{line.sku} · {line.supplierSku}</span></td><td className="py-2 pr-3">{formatCurrency(line.unitCost)}</td><td className="py-2 pr-3">{line.orderedQuantity}</td><td className="py-2 pr-3 text-emerald-300">{line.receivedQuantity}</td><td className="py-2 pr-3 text-amber-300">{line.pendingQuantity}</td></tr>)}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    {order.status === "DRAFT" && <ActionButton onClick={() => onApprove(order)} icon={FiCheck} label="Aprobar" disabled={busy} />}
                    {["APPROVED", "PARTIALLY_RECEIVED"].includes(order.status) && <ActionButton onClick={() => onReceive(order)} icon={FiPackage} label="Recibir pendiente" disabled={busy} tone="success" />}
                    {["DRAFT", "APPROVED"].includes(order.status) && <ActionButton onClick={() => onCancel(order)} icon={FiX} label="Cancelar" disabled={busy} tone="danger" />}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ReplenishmentView({ onPrepareOrder, proposals }) {
  return (
    <section aria-labelledby="replenishment-title">
      <h2 id="replenishment-title" className="text-xl font-black">Propuestas de reposicion</h2>
      <p className="mt-1 text-sm text-slate-400">Prioriza productos cercanos a su nivel critico y calcula una compra sugerida.</p>
      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {proposals.length === 0 && <EmptyState text="No hay productos que requieran reposicion preventiva." />}
        {proposals.map((proposal) => {
          const critical = proposal.availableQuantity <= proposal.reorderLevel;
          return (
            <article key={proposal.sku} className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-1 text-[11px] font-black ${critical ? "bg-red-500/15 text-red-200" : "bg-amber-500/15 text-amber-200"}`}>{critical ? "Stock critico" : "Reponer pronto"}</span>
                    <span className="text-xs font-black text-slate-500">{proposal.warehouseCode}</span>
                  </div>
                  <h3 className="mt-3 font-black text-white">{proposal.productName}</h3>
                  <p className="mt-1 text-xs font-bold text-slate-500">{proposal.sku} · {proposal.supplierName || "Sin proveedor asociado"}</p>
                </div>
                <button type="button" disabled={!proposal.supplierId} onClick={() => onPrepareOrder(proposal)} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 text-sm font-black hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40">
                  <FiShoppingCart aria-hidden="true" /> Preparar orden
                </button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <MiniStat label="Disponible" value={proposal.availableQuantity} />
                <MiniStat label="Nivel critico" value={proposal.reorderLevel} />
                <MiniStat label="Compra sugerida" value={proposal.suggestedQuantity} />
                <MiniStat label="Costo estimado" value={proposal.estimatedTotal ? formatCurrency(proposal.estimatedTotal) : "Pendiente"} compact />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function SupplierDialog({ busy, editing, form, onClose, onSubmit, setForm }) {
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-3" role="dialog" aria-modal="true" aria-labelledby="supplier-form-title">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-white/15 bg-slate-900 p-4 shadow-2xl sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 id="supplier-form-title" className="text-xl font-black text-white">{editing ? "Editar proveedor" : "Nuevo proveedor"}</h2>
          <IconButton label="Cerrar formulario" onClick={onClose} icon={FiX} />
        </div>
        <form onSubmit={onSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Codigo"><input required maxLength="30" value={form.code} onChange={(event) => update("code", event.target.value)} className={controlClass} /></Field>
          <Field label="Razon social"><input required maxLength="140" value={form.businessName} onChange={(event) => update("businessName", event.target.value)} className={controlClass} /></Field>
          <Field label="RUT"><input required placeholder="76.123.456-0" value={form.taxId} onChange={(event) => update("taxId", event.target.value)} className={controlClass} /></Field>
          <Field label="Contacto"><input maxLength="120" value={form.contactName} onChange={(event) => update("contactName", event.target.value)} className={controlClass} /></Field>
          <Field label="Correo"><input required type="email" value={form.email} onChange={(event) => update("email", event.target.value)} className={controlClass} /></Field>
          <Field label="Telefono"><input maxLength="30" value={form.phone} onChange={(event) => update("phone", event.target.value)} className={controlClass} /></Field>
          <Field label="Direccion" className="sm:col-span-2"><input maxLength="240" value={form.address} onChange={(event) => update("address", event.target.value)} className={controlClass} /></Field>
          <Field label="Condicion de pago (dias)"><input required min="0" max="365" type="number" value={form.paymentTermsDays} onChange={(event) => update("paymentTermsDays", event.target.value)} className={controlClass} /></Field>
          <Field label="Tiempo de entrega (dias)"><input required min="0" max="365" type="number" value={form.leadTimeDays} onChange={(event) => update("leadTimeDays", event.target.value)} className={controlClass} /></Field>
          <label className="relative flex min-h-11 cursor-pointer items-center gap-3 text-sm font-bold text-slate-200">
            <input type="checkbox" checked={form.active} onChange={(event) => update("active", event.target.checked)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
            <span aria-hidden="true" className={`flex h-5 w-5 items-center justify-center rounded border ${form.active ? "border-sky-400 bg-sky-500 text-slate-950" : "border-white/25 bg-black/20"}`}>
              {form.active && <FiCheck />}
            </span>
            Proveedor activo
          </label>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button type="button" onClick={onClose} className="h-11 rounded-lg border border-white/10 px-4 text-sm font-black hover:bg-white/5">Cancelar</button>
            <button disabled={busy} className="h-11 rounded-lg bg-sky-500 px-5 text-sm font-black text-slate-950 hover:bg-sky-400 disabled:opacity-50">{editing ? "Guardar cambios" : "Crear proveedor"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmDialog({ action, busy, confirmLabel, danger = false, description, onClose, title }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="w-full max-w-md rounded-lg border border-white/15 bg-slate-900 p-5 shadow-2xl">
        <h2 id="confirm-title" className="text-lg font-black text-white">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" disabled={busy} onClick={onClose} className="h-11 rounded-lg border border-white/10 px-4 text-sm font-black hover:bg-white/5">Volver</button>
          <button type="button" disabled={busy} onClick={action} className={`h-11 rounded-lg px-4 text-sm font-black disabled:opacity-50 ${danger ? "bg-red-500 hover:bg-red-400" : "bg-emerald-500 text-slate-950 hover:bg-emerald-400"}`}>{busy ? "Procesando..." : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ active }) {
  return <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black uppercase ${active ? "bg-emerald-400/15 text-emerald-300" : "bg-slate-500/15 text-slate-400"}`}>{active ? "Activo" : "Inactivo"}</span>;
}

function MiniStat({ compact = false, label, value }) {
  return <div className="rounded-lg bg-black/20 p-3"><p className="text-[10px] font-black uppercase text-slate-500">{label}</p><p className={`${compact ? "text-sm" : "text-lg"} mt-1 truncate font-black text-white`}>{value}</p></div>;
}

function Field({ children, className = "", label }) {
  return <label className={`block min-w-0 text-xs font-black text-slate-400 ${className}`}><span className="mb-2 block">{label}</span>{children}</label>;
}

function IconButton({ danger = false, icon: Icon, label, onClick }) {
  return <button type="button" onClick={onClick} aria-label={label} title={label} className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border transition ${danger ? "border-red-400/20 bg-red-500/10 text-red-300 hover:bg-red-500/20" : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"}`}><Icon aria-hidden="true" /></button>;
}

function ActionButton({ disabled, icon: Icon, label, onClick, tone = "primary" }) {
  const tones = { primary: "bg-sky-500 text-slate-950 hover:bg-sky-400", success: "bg-emerald-500 text-slate-950 hover:bg-emerald-400", danger: "bg-red-500 text-white hover:bg-red-400" };
  return <button type="button" disabled={disabled} onClick={onClick} className={`inline-flex h-11 items-center gap-2 rounded-lg px-4 text-sm font-black disabled:opacity-50 ${tones[tone]}`}><Icon aria-hidden="true" />{label}</button>;
}

function EmptyState({ text }) {
  return <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed border-white/10 px-4 text-center text-sm font-bold text-slate-500">{text}</div>;
}

const controlClass = "h-11 w-full min-w-0 rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20";

export default ProcurementPage;
