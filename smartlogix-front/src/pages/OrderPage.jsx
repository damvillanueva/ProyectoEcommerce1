import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { loadOrderService, saveOrder, editOrder, removeOrder } from "../services/orderService";
import { getInventoryItemsWithAvailable } from "../services/inventoryService";
import Navbar from "../components/Navbar";
import PageContainer from "../layout/PageContainer";
import {
  getAvailableUnits,
  getProductStorageLocation,
  productMatchesSearch,
} from "../utils/inventoryLocationUtils";
import { getRoleFromToken } from "../utils/authTokenUtils";

const DEFAULT_CUSTOMER_NAME = "Cliente Demo";
const DEFAULT_CUSTOMER_EMAIL = "cliente@smartlogix.com";
const DEFAULT_SHIPPING_STREET = "Av. Principal 123";
const DEFAULT_SHIPPING_COMMUNE = "Puente Alto";
const DEFAULT_SHIPPING_REGION = "Region Metropolitana";
const DEFAULT_SKU = "SKU-1001";
const DEFAULT_QUANTITY = 1;
const DEFAULT_UNIT_PRICE = 29990;
const CHILEAN_REGIONS = [
  "Arica y Parinacota",
  "Tarapaca",
  "Antofagasta",
  "Atacama",
  "Coquimbo",
  "Valparaiso",
  "Region Metropolitana",
  "O'Higgins",
  "Maule",
  "Nuble",
  "Biobio",
  "La Araucania",
  "Los Rios",
  "Los Lagos",
  "Aysen",
  "Magallanes",
];

const ORDER_STATUS_META = {
  PENDING: {
    label: "Pendiente",
    classes: "bg-slate-500/20 text-slate-200",
  },
  APPROVED: {
    label: "Aprobado",
    classes: "bg-sky-500/20 text-sky-200",
  },
  REJECTED: {
    label: "Rechazado",
    classes: "bg-red-500/20 text-red-200",
  },
  SHIPMENT_REQUESTED: {
    label: "Envio solicitado",
    classes: "bg-emerald-500/20 text-emerald-300",
  },
  FAILED: {
    label: "Requiere revision",
    classes: "bg-amber-500/20 text-amber-200",
  },
};

const PAYMENT_STATUS_META = {
  PAID: { label: "Pagado", classes: "bg-emerald-500/20 text-emerald-300" },
  PENDING: { label: "Pendiente", classes: "bg-amber-500/20 text-amber-200" },
  REJECTED: { label: "Rechazado", classes: "bg-red-500/20 text-red-200" },
};

function composeShippingAddress(street, commune, region) {
  const cleanStreet = (street || "").trim();
  const cleanCommune = (commune || "").trim();
  const cleanRegion = (region || "").trim();
  return [cleanStreet, cleanCommune, cleanRegion].filter(Boolean).join(", ");
}

function splitShippingAddress(address) {
  const cleanAddress = (address || "").trim();

  if (!cleanAddress) {
    return {
      street: DEFAULT_SHIPPING_STREET,
      commune: DEFAULT_SHIPPING_COMMUNE,
      region: DEFAULT_SHIPPING_REGION,
    };
  }

  const [street, commune, ...regionParts] = cleanAddress.split(",");

  return {
    street: street?.trim() || DEFAULT_SHIPPING_STREET,
    commune: commune?.trim() || "",
    region: regionParts.join(",").trim() || DEFAULT_SHIPPING_REGION,
  };
}

function getOrderStatusMeta(status) {
  return (
    ORDER_STATUS_META[status] || {
      label: status || "Sin estado",
      classes: "bg-white/10 text-slate-200",
    }
  );
}

function getPaymentStatusMeta(status) {
  return PAYMENT_STATUS_META[status] || {
    label: status || "Sin estado",
    classes: "bg-white/10 text-slate-200",
  };
}

function formatOrderDate(value) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
    hour12: false,
  }).format(new Date(value));
}

function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [inventoryError, setInventoryError] = useState("");

  const [customerName, setCustomerName] = useState(DEFAULT_CUSTOMER_NAME);
  const [customerEmail, setCustomerEmail] = useState(DEFAULT_CUSTOMER_EMAIL);
  const [shippingStreet, setShippingStreet] = useState(DEFAULT_SHIPPING_STREET);
  const [shippingCommune, setShippingCommune] = useState(DEFAULT_SHIPPING_COMMUNE);
  const [shippingRegion, setShippingRegion] = useState(DEFAULT_SHIPPING_REGION);
  const [productSearch, setProductSearch] = useState("");
  const [sku, setSku] = useState(DEFAULT_SKU);
  const [quantity, setQuantity] = useState(DEFAULT_QUANTITY);
  const [unitPrice, setUnitPrice] = useState(DEFAULT_UNIT_PRICE);
  const [discountCode, setDiscountCode] = useState("");
  const [editingOrderNumber, setEditingOrderNumber] = useState(null);

  const role = getRoleFromToken();
  const canOpenShipments = role === "ROLE_ADMIN" || role === "ROLE_WAREHOUSE_MANAGER";
  const selectedProduct = useMemo(
    () => inventoryItems.find((item) => item.sku === sku.trim().toUpperCase()) || null,
    [inventoryItems, sku]
  );
  const productResults = useMemo(() => {
    const cleanSearch = productSearch.trim();
    const source = cleanSearch
      ? inventoryItems.filter((item) => productMatchesSearch(item, cleanSearch))
      : inventoryItems;

    return source
      .filter((item) => getAvailableUnits(item) > 0)
      .sort((left, right) => {
        const leftAvailable = getAvailableUnits(left);
        const rightAvailable = getAvailableUnits(right);

        if (leftAvailable !== rightAvailable) return rightAvailable - leftAvailable;

        return left.productName.localeCompare(right.productName);
      })
      .slice(0, 8);
  }, [inventoryItems, productSearch]);

  async function loadOrders() {
    try {
      setLoading(true);
      const data = await loadOrderService();
      setOrders(Array.isArray(data) ? data : []);
      setError("");
    } catch (err) {
      console.error(err);
      setError("No se pudieron cargar los pedidos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    async function loadInventoryCatalog() {
      try {
        setInventoryLoading(true);
        const data = await getInventoryItemsWithAvailable();
        setInventoryItems(Array.isArray(data) ? data : []);
        setInventoryError("");
      } catch (err) {
        console.error(err);
        setInventoryError("No se pudo cargar el catalogo de inventario.");
      } finally {
        setInventoryLoading(false);
      }
    }

    loadInventoryCatalog();
  }, []);

  function resetForm() {
    setEditingOrderNumber(null);
    setCustomerName(DEFAULT_CUSTOMER_NAME);
    setCustomerEmail(DEFAULT_CUSTOMER_EMAIL);
    setShippingStreet(DEFAULT_SHIPPING_STREET);
    setShippingCommune(DEFAULT_SHIPPING_COMMUNE);
    setShippingRegion(DEFAULT_SHIPPING_REGION);
    setProductSearch("");
    setSku(DEFAULT_SKU);
    setQuantity(DEFAULT_QUANTITY);
    setUnitPrice(DEFAULT_UNIT_PRICE);
    setDiscountCode("");
  }

  function handleSelectProduct(item) {
    const available = getAvailableUnits(item);

    setSku(item.sku);
    setProductSearch(item.productName);
    setUnitPrice(Number(item.salePrice || 0));
    setQuantity(Math.max(1, Math.min(Number(quantity) || 1, available || 1)));
    setError("");
  }

  async function handleCreateOrder(event) {
    event.preventDefault();

    const cleanCustomerName = customerName.trim();
    const cleanCustomerEmail = customerEmail.trim();
    const cleanStreet = shippingStreet.trim();
    const cleanCommune = shippingCommune.trim();
    const cleanRegion = shippingRegion.trim();
    const cleanSku = sku.trim();
    const parsedQuantity = Number(quantity);

    if (!cleanCustomerName) {
      setError("Ingresa el nombre del cliente.");
      return;
    }

    if (!cleanCustomerEmail) {
      setError("Ingresa el email del cliente.");
      return;
    }

    if (!cleanStreet) {
      setError("Ingresa la direccion de envio.");
      return;
    }

    if (!cleanCommune) {
      setError("Ingresa la comuna de envio.");
      return;
    }

    if (!cleanRegion) {
      setError("Selecciona la region de envio.");
      return;
    }

    if (!cleanSku) {
      setError("Ingresa un SKU valido.");
      return;
    }

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setError("Ingresa una cantidad valida.");
      return;
    }

    const catalogProduct = inventoryItems.find(
      (item) => item.sku === cleanSku.toUpperCase()
    );

    if (catalogProduct) {
      const available = getAvailableUnits(catalogProduct);

      if (parsedQuantity > available) {
        setError(
          `Solo hay ${available} unidad(es) disponibles de ${catalogProduct.productName}.`
        );
        return;
      }
    }

    const orderData = {
      customerName: cleanCustomerName,
      customerEmail: cleanCustomerEmail,
      shippingAddress: composeShippingAddress(cleanStreet, cleanCommune, cleanRegion),
      shippingCommune: cleanCommune,
      shippingRegion: cleanRegion,
      discountCode: discountCode.trim() || null,
      lines: [
        {
          sku: cleanSku,
          quantity: parsedQuantity,
        },
      ],
    };

    try {
      if (editingOrderNumber) {
        await editOrder(editingOrderNumber, orderData);
      } else {
        await saveOrder(orderData);
      }

      await loadOrders();
      setEditingOrderNumber(null);
      setError("");
    } catch (err) {
      console.error(err);
      setError(
        editingOrderNumber
          ? "No se pudo actualizar el pedido o el envio asociado."
          : "No se pudo crear el pedido. Revisa stock, JWT o servicios activos."
      );
    }
  }

  function handleEdit(order) {
    const firstLine = order.lines?.[0];
    const parsedAddress = splitShippingAddress(order.shippingAddress);

    setEditingOrderNumber(order.orderNumber);
    setCustomerName(order.customerName || DEFAULT_CUSTOMER_NAME);
    setCustomerEmail(order.customerEmail || DEFAULT_CUSTOMER_EMAIL);
    setShippingStreet(parsedAddress.street);
    setShippingCommune(order.shippingCommune || parsedAddress.commune);
    setShippingRegion(order.shippingRegion || parsedAddress.region);
    setDiscountCode(order.discountCode || "");

    if (firstLine) {
      setSku(firstLine.sku);
      setProductSearch(firstLine.sku);
      setQuantity(firstLine.quantity);
      setUnitPrice(firstLine.unitPrice);
    }
  }

  async function handleDelete(orderNumber) {
    if (!window.confirm(`Eliminar pedido ${orderNumber}?`)) return;

    try {
      await removeOrder(orderNumber);
      await loadOrders();
    } catch (deleteError) {
      console.error(deleteError);
      setError("No se pudo eliminar el pedido.");
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white">
      <PageContainer>
        <div className="overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
          <Navbar />

          <section className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-8">
            <div className="mb-8 flex items-start justify-between gap-6">
              <div>
                <h1 className="mb-2 text-4xl font-black">Pedidos</h1>
                <p className="text-slate-300">
                  Creacion, seguimiento y trazabilidad de ordenes comerciales.
                </p>
              </div>

              {canOpenShipments && (
                <Link
                  to="/shipments"
                  className="rounded-xl bg-white/10 px-5 py-3 font-bold text-white transition hover:bg-white/20"
                >
                  Ver envios
                </Link>
              )}
            </div>

            {error && (
              <div className="mb-6 rounded-2xl border border-red-500/50 bg-red-950/50 p-5">
                <p className="font-semibold text-red-200">{error}</p>
              </div>
            )}

            <div className="mb-8 rounded-3xl border border-white/10 bg-slate-800/80 p-6">
              <h2 className="mb-2 text-2xl font-black">
                {editingOrderNumber ? "Actualizar pedido" : "Crear pedido"}
              </h2>
              <p className="mb-6 text-slate-400">
                Registra una orden, separa la comuna y elige productos disponibles desde inventario.
              </p>

              <OrderProductPicker
                error={inventoryError}
                loading={inventoryLoading}
                onQueryChange={setProductSearch}
                onSelectProduct={handleSelectProduct}
                query={productSearch}
                results={productResults}
                selectedProduct={selectedProduct}
              />

              <form onSubmit={handleCreateOrder} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <input
                  className="rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-400"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Nombre cliente"
                />

                <input
                  className="rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-400"
                  value={customerEmail}
                  onChange={(event) => setCustomerEmail(event.target.value)}
                  placeholder="Email cliente"
                />

                <input
                  className="rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-400"
                  value={shippingStreet}
                  onChange={(event) => setShippingStreet(event.target.value)}
                  placeholder="Direccion envio"
                />

                <input
                  className="rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-400"
                  value={shippingCommune}
                  onChange={(event) => setShippingCommune(event.target.value)}
                  placeholder="Comuna envio"
                />

                <select
                  aria-label="Region de envio"
                  className="rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-indigo-400"
                  value={shippingRegion}
                  onChange={(event) => setShippingRegion(event.target.value)}
                >
                  {CHILEAN_REGIONS.map((region) => <option key={region}>{region}</option>)}
                </select>

                <input
                  className="rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-400"
                  value={sku}
                  onChange={(event) => setSku(event.target.value)}
                  placeholder="SKU seleccionado"
                />

                <input
                  className="rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-400"
                  min="1"
                  type="number"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  placeholder="Cantidad"
                />

                <input
                  readOnly
                  title="Precio definido por inventario y validado por el backend"
                  className="cursor-not-allowed rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 font-black text-emerald-200 outline-none"
                  min="0"
                  type="number"
                  value={unitPrice}
                  placeholder="Precio desde inventario"
                />

                <input
                  className="bg-slate-950/80 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-400 outline-none"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value)}
                  placeholder="Código descuento opcional"
                />

                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white shadow-lg transition hover:bg-indigo-500"
                >
                  {editingOrderNumber ? "Actualizar pedido" : "Crear pedido"}
                </button>

                {editingOrderNumber && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-xl bg-white/10 px-6 py-3 font-bold text-white transition hover:bg-white/20"
                  >
                    Cancelar edicion
                  </button>
                )}
              </form>
            </div>

            {loading && (
              <div className="rounded-2xl border border-white/10 bg-slate-800/80 p-5">
                <p className="animate-pulse text-slate-300">Cargando pedidos...</p>
              </div>
            )}

            {!loading && (
              <div className="rounded-3xl border border-white/10 bg-slate-800/80 p-6">
                <h2 className="mb-6 text-2xl font-black">Listado de pedidos</h2>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1320px] border-collapse">
                    <thead>
                      <tr className="bg-slate-900/80 text-sm uppercase text-slate-300">
                        <th className="rounded-l-xl p-4 text-left">Numero</th>
                        <th className="p-4 text-left">Cliente</th>
                        <th className="p-4 text-left">Comuna</th>
                        <th className="p-4 text-left">Direccion</th>
                        <th className="p-4 text-left">Estado</th>
                        <th className="p-4 text-left">Pago</th>
                        <th className="p-4 text-left">Subtotal</th>
                        <th className="p-4 text-left">Descuento</th>
                        <th className="p-4 text-left">Código</th>
                        <th className="p-4 text-left">Total</th>
                        <th className="p-4 text-left">Envio</th>
                        <th className="p-4 text-left">Fecha</th>
                        <th className="rounded-r-xl p-4 text-left">Acciones</th>
                      </tr>
                    </thead>

                    <tbody>
                      {orders.length === 0 && (
                        <tr>
                          <td colSpan="13" className="p-8 text-center font-bold text-slate-400">
                            No hay pedidos registrados todavia.
                          </td>
                        </tr>
                      )}

                      {orders.map((order) => {
                        const statusMeta = getOrderStatusMeta(order.status);
                        const paymentMeta = getPaymentStatusMeta(order.paymentStatus);
                        const parsedAddress = splitShippingAddress(order.shippingAddress);

                        return (
                          <tr key={order.orderNumber} className="border-b border-white/10 transition hover:bg-white/5">
                            <td className="p-4 font-bold">{order.orderNumber}</td>

                            <td className="p-4">
                              <p className="font-bold text-white">{order.customerName || "Cliente"}</p>
                              <p className="text-xs font-semibold text-slate-400">{order.customerEmail || "-"}</p>
                            </td>

                            <td className="p-4">
                              <span className="rounded-full bg-sky-500/20 px-3 py-1 font-bold text-sky-200">
                                {order.shippingCommune || parsedAddress.commune || "Sin comuna"}
                              </span>
                            </td>

                            <td className="p-4 text-slate-300">{parsedAddress.street || "-"}</td>

                            <td className="p-4">
                              <span className={`rounded-full px-3 py-1 font-bold ${statusMeta.classes}`}>
                                {statusMeta.label}
                              </span>
                            </td>

                            <td className="p-4">
                              <span className={`rounded-full px-3 py-1 font-bold ${paymentMeta.classes}`}>
                                {paymentMeta.label}
                              </span>
                              {order.transactionReference && <p className="mt-2 max-w-[150px] break-all text-xs font-semibold text-slate-500">{order.transactionReference}</p>}
                            </td>

                            <td className="p-4">
                              ${order.subtotalAmount}
                            </td>

                            <td className="p-4 font-bold text-emerald-300">
                              -${order.discountAmount}
                            </td>

                            <td className="p-4">
                              {order.discountCode || "-"}
                            </td>

                            <td className="p-4 font-black">
                              ${order.totalAmount}
                            </td>

                            <td className="p-4">
                              {order.trackingCode ? (
                                <div className="flex flex-col gap-2">
                                  <span className="rounded-full bg-emerald-500/20 px-3 py-1 font-bold text-emerald-300">
                                    {order.trackingCode}
                                  </span>
                                  {canOpenShipments && (
                                    <Link
                                      to="/shipments"
                                      className="text-sm font-black text-sky-300 hover:text-sky-200"
                                    >
                                      Ver en envios
                                    </Link>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400">Sin tracking</span>
                              )}

                              {order.rejectionReason && (
                                <p className="mt-2 max-w-[220px] text-xs font-semibold text-amber-200">
                                  {order.rejectionReason}
                                </p>
                              )}
                            </td>

                            <td className="p-4 text-slate-300">{formatOrderDate(order.createdAt)}</td>

                            <td className="p-4">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => handleEdit(order)}
                                  className="rounded-xl bg-amber-500 px-4 py-2 font-bold text-white transition hover:bg-amber-400"
                                >
                                  Editar
                                </button>

                                <button
                                  onClick={() => handleDelete(order.orderNumber)}
                                  className="rounded-xl bg-red-500 px-4 py-2 font-bold text-white transition hover:bg-red-400"
                                >
                                  Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </div>
      </PageContainer>
    </div>
  );
}

function OrderProductPicker({
  error,
  loading,
  onQueryChange,
  onSelectProduct,
  query,
  results,
  selectedProduct,
}) {
  const selectedLocation = selectedProduct
    ? getProductStorageLocation(selectedProduct)
    : null;

  return (
    <section className="mb-6 rounded-2xl border border-sky-300/15 bg-slate-950/35 p-4">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase text-sky-300">
              Catalogo de inventario
            </span>
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Buscar producto por nombre, SKU, categoria o bodega..."
              className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 font-bold text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-sky-400"
            />
          </label>

          {loading && (
            <p className="mt-3 text-sm font-semibold text-slate-400">
              Cargando productos disponibles...
            </p>
          )}

          {error && (
            <p className="mt-3 text-sm font-semibold text-amber-200">{error}</p>
          )}
        </div>

        <div className="rounded-2xl bg-white/5 p-4">
          <p className="text-xs font-black uppercase text-slate-500">
            Producto seleccionado
          </p>
          {selectedProduct ? (
            <div className="mt-3 flex items-center gap-4">
              <OrderProductThumbnail
                imageUrl={selectedProduct.imageUrl}
                productName={selectedProduct.productName}
              />
              <div className="min-w-0">
                <p className="truncate font-black text-white">
                  {selectedProduct.productName}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-400">
                  {selectedProduct.sku} | {selectedProduct.category || "General"}
                </p>
                <p className="mt-2 text-xs font-black uppercase text-sky-200">
                  {selectedLocation.label}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm font-bold text-slate-400">
              Puedes escribir SKU manual o elegir un producto del catalogo.
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        {!loading && results.length === 0 && (
          <div className="rounded-xl border border-dashed border-white/15 bg-slate-900/60 p-4 text-center text-sm font-bold text-slate-400 xl:col-span-2">
            No hay productos disponibles para esa busqueda.
          </div>
        )}

        {results.map((item) => (
          <OrderProductCard
            key={`order-product-${item.sku}`}
            item={item}
            isSelected={selectedProduct?.sku === item.sku}
            onSelectProduct={onSelectProduct}
          />
        ))}
      </div>
    </section>
  );
}

function OrderProductCard({ isSelected, item, onSelectProduct }) {
  const available = getAvailableUnits(item);
  const location = getProductStorageLocation(item);

  return (
    <article className={`rounded-2xl border p-4 transition ${
      isSelected
        ? "border-sky-300/60 bg-sky-500/10"
        : "border-white/10 bg-slate-900/70 hover:bg-slate-900"
    }`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <OrderProductThumbnail imageUrl={item.imageUrl} productName={item.productName} />
          <div className="min-w-0">
            <p className="truncate font-black text-white">{item.productName}</p>
            <p className="mt-1 text-xs font-bold text-slate-400">
              {item.sku} | {item.category || "General"}
            </p>
            <p className="mt-2 text-xs font-black uppercase text-sky-200">
              {location.warehouse.name} | {location.shortLabel}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onSelectProduct(item)}
          className={`rounded-xl px-4 py-2 text-sm font-black text-white transition ${
            isSelected ? "bg-emerald-500 hover:bg-emerald-400" : "bg-sky-500 hover:bg-sky-400"
          }`}
        >
          {isSelected ? "Seleccionado" : "Elegir"}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-xl bg-white/5 p-2">
          <p className="text-[10px] font-black uppercase text-slate-500">Disponible</p>
          <p className="mt-1 text-sm font-black text-emerald-300">{available}</p>
        </div>
        <div className="rounded-xl bg-white/5 p-2">
          <p className="text-[10px] font-black uppercase text-slate-500">Reservado</p>
          <p className="mt-1 text-sm font-black text-amber-200">{item.reservedQuantity}</p>
        </div>
        <div className="rounded-xl bg-white/5 p-2">
          <p className="text-[10px] font-black uppercase text-slate-500">Ubicacion</p>
          <p className="mt-1 text-sm font-black text-sky-200">{location.shortLabel}</p>
        </div>
      </div>
    </article>
  );
}

function OrderProductThumbnail({ imageUrl, productName }) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={productName}
        className="h-14 w-14 shrink-0 rounded-xl border border-white/10 object-cover"
      />
    );
  }

  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-slate-800 text-lg font-black text-slate-300">
      {String(productName || "P").charAt(0).toUpperCase()}
    </div>
  );
}

export default OrdersPage;
