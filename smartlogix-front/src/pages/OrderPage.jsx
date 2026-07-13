import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { loadOrderService, saveOrder, editOrder, removeOrder } from "../services/orderService";
import Navbar from "../components/Navbar";
import PageContainer from "../layout/PageContainer";

const DEFAULT_CUSTOMER_NAME = "Cliente Demo";
const DEFAULT_CUSTOMER_EMAIL = "cliente@smartlogix.com";
const DEFAULT_SHIPPING_STREET = "Av. Principal 123";
const DEFAULT_SHIPPING_COMMUNE = "Puente Alto";
const DEFAULT_SKU = "SKU-1001";
const DEFAULT_QUANTITY = 1;
const DEFAULT_UNIT_PRICE = 19990;

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

function composeShippingAddress(street, commune) {
  const cleanStreet = (street || "").trim();
  const cleanCommune = (commune || "").trim();

  if (!cleanStreet) return cleanCommune;
  if (!cleanCommune) return cleanStreet;

  return `${cleanStreet}, ${cleanCommune}`;
}

function splitShippingAddress(address) {
  const cleanAddress = (address || "").trim();

  if (!cleanAddress) {
    return {
      street: DEFAULT_SHIPPING_STREET,
      commune: DEFAULT_SHIPPING_COMMUNE,
    };
  }

  const [street, ...rest] = cleanAddress.split(",");

  return {
    street: street?.trim() || DEFAULT_SHIPPING_STREET,
    commune: rest.join(",").trim() || "",
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

function formatOrderDate(value) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
    hour12: false,
  }).format(new Date(value));
}

function getRoleFromStorage() {
  return localStorage.getItem("role");
}

function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [customerName, setCustomerName] = useState(DEFAULT_CUSTOMER_NAME);
  const [customerEmail, setCustomerEmail] = useState(DEFAULT_CUSTOMER_EMAIL);
  const [shippingStreet, setShippingStreet] = useState(DEFAULT_SHIPPING_STREET);
  const [shippingCommune, setShippingCommune] = useState(DEFAULT_SHIPPING_COMMUNE);
  const [sku, setSku] = useState(DEFAULT_SKU);
  const [quantity, setQuantity] = useState(DEFAULT_QUANTITY);
  const [unitPrice, setUnitPrice] = useState(DEFAULT_UNIT_PRICE);
  const [editingOrderNumber, setEditingOrderNumber] = useState(null);

  const role = getRoleFromStorage();
  const canOpenShipments = role === "ROLE_ADMIN" || role === "ROLE_WAREHOUSE_MANAGER";

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

  function resetForm() {
    setEditingOrderNumber(null);
    setCustomerName(DEFAULT_CUSTOMER_NAME);
    setCustomerEmail(DEFAULT_CUSTOMER_EMAIL);
    setShippingStreet(DEFAULT_SHIPPING_STREET);
    setShippingCommune(DEFAULT_SHIPPING_COMMUNE);
    setSku(DEFAULT_SKU);
    setQuantity(DEFAULT_QUANTITY);
    setUnitPrice(DEFAULT_UNIT_PRICE);
  }

  async function handleCreateOrder(event) {
    event.preventDefault();

    const cleanCustomerName = customerName.trim();
    const cleanCustomerEmail = customerEmail.trim();
    const cleanStreet = shippingStreet.trim();
    const cleanCommune = shippingCommune.trim();
    const cleanSku = sku.trim();
    const parsedQuantity = Number(quantity);
    const parsedUnitPrice = Number(unitPrice);

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

    if (!cleanSku) {
      setError("Ingresa un SKU valido.");
      return;
    }

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setError("Ingresa una cantidad valida.");
      return;
    }

    if (!Number.isFinite(parsedUnitPrice) || parsedUnitPrice < 0) {
      setError("Ingresa un precio valido.");
      return;
    }

    const orderData = {
      customerName: cleanCustomerName,
      customerEmail: cleanCustomerEmail,
      shippingAddress: composeShippingAddress(cleanStreet, cleanCommune),
      lines: [
        {
          sku: cleanSku,
          quantity: parsedQuantity,
          unitPrice: parsedUnitPrice,
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
    setShippingCommune(parsedAddress.commune);

    if (firstLine) {
      setSku(firstLine.sku);
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
                Registra una orden, separa la comuna y genera automaticamente el despacho.
              </p>

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

                <input
                  className="rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-400"
                  value={sku}
                  onChange={(event) => setSku(event.target.value)}
                  placeholder="SKU"
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
                  className="rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-400"
                  min="0"
                  type="number"
                  value={unitPrice}
                  onChange={(event) => setUnitPrice(event.target.value)}
                  placeholder="Precio unitario"
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
                  <table className="w-full min-w-[1180px] border-collapse">
                    <thead>
                      <tr className="bg-slate-900/80 text-sm uppercase text-slate-300">
                        <th className="rounded-l-xl p-4 text-left">Numero</th>
                        <th className="p-4 text-left">Cliente</th>
                        <th className="p-4 text-left">Comuna</th>
                        <th className="p-4 text-left">Direccion</th>
                        <th className="p-4 text-left">Estado</th>
                        <th className="p-4 text-left">Total</th>
                        <th className="p-4 text-left">Envio</th>
                        <th className="p-4 text-left">Fecha</th>
                        <th className="rounded-r-xl p-4 text-left">Acciones</th>
                      </tr>
                    </thead>

                    <tbody>
                      {orders.length === 0 && (
                        <tr>
                          <td colSpan="9" className="p-8 text-center font-bold text-slate-400">
                            No hay pedidos registrados todavia.
                          </td>
                        </tr>
                      )}

                      {orders.map((order) => {
                        const statusMeta = getOrderStatusMeta(order.status);
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
                                {parsedAddress.commune || "Sin comuna"}
                              </span>
                            </td>

                            <td className="p-4 text-slate-300">{parsedAddress.street || "-"}</td>

                            <td className="p-4">
                              <span className={`rounded-full px-3 py-1 font-bold ${statusMeta.classes}`}>
                                {statusMeta.label}
                              </span>
                            </td>

                            <td className="p-4">${order.totalAmount}</td>

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

export default OrdersPage;
