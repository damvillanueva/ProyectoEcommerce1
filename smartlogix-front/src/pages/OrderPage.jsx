import { useEffect, useState } from "react";
import { loadOrderService, saveOrder, editOrder, removeOrder } from "../services/orderService";
import Navbar from "../components/Navbar";
import PageContainer from "../layout/PageContainer";

function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [customerName, setCustomerName] = useState("Cliente Demo");
  const [customerEmail, setCustomerEmail] = useState("cliente@smartlogix.com");
  const [shippingAddress, setShippingAddress] = useState("Av. Principal 123");
  const [sku, setSku] = useState("SKU-1001");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(19990);
  const [editingOrderNumber, setEditingOrderNumber] = useState(null);

  async function loadOrders() {
    try {
      setLoading(true);
      const data = await loadOrderService();
      setOrders(data);
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

  async function handleCreateOrder(event) {
    event.preventDefault();

    const orderData = {
      customerName,
      customerEmail,
      shippingAddress,
      lines: [
        {
          sku,
          quantity: Number(quantity),
          unitPrice: Number(unitPrice),
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
      setError("No se pudo crear el pedido. Revisa stock, JWT o servicios activos.");
    }
  }

  function handleEdit(order) {
    const firstLine = order.lines?.[0];

    setEditingOrderNumber(order.orderNumber);

    setCustomerName("Cliente Demo");
    setCustomerEmail("cliente@smartlogix.com");
    setShippingAddress("Av. Principal 123");

    if (firstLine) {
      setSku(firstLine.sku);
      setQuantity(firstLine.quantity);
      setUnitPrice(firstLine.unitPrice);
    }
  }

  const handleDelete = async (orderNumber) => {
    if (!window.confirm(`¿Eliminar pedido ${orderNumber}?`)) return;

    try {
      await removeOrder(orderNumber);
      await loadOrders();
    } catch (error) {
      console.error(error);
      setError("No se pudo eliminar el pedido.");
    }
  };

    return (
      <div className="min-h-screen bg-slate-950 p-6 text-white">
          <PageContainer>
            <div className="rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
              <Navbar />

              <section className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-8">

            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-4xl font-black mb-2">Pedidos</h1>
                <p className="text-slate-300">Creación, seguimiento y trazabilidad de órdenes comerciales.</p>
              </div>
            </div>

            {error && (
              <div className="bg-red-950/50 border border-red-500/50 rounded-2xl p-5 mb-6">
                <p className="text-red-200 font-semibold">{error}</p>
              </div>
            )}

            <div className="bg-slate-800/80 border border-white/10 rounded-3xl p-6 mb-8">
              <h2 className="text-2xl font-black mb-2">
                {editingOrderNumber ? "Actualizar pedido" : "Crear pedido"}
              </h2>
              <p className="text-slate-400 mb-6">
                Registra una orden y genera automáticamente la solicitud de despacho.
              </p>

              <form onSubmit={handleCreateOrder} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <input
                  className="bg-slate-950/80 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-400 outline-none"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nombre cliente"
                />

                <input
                  className="bg-slate-950/80 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-400 outline-none"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="Email cliente"
                />

                <input
                  className="bg-slate-950/80 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-400 outline-none"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Dirección envío"
                />

                <input
                  className="bg-slate-950/80 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-400 outline-none"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="SKU"
                />

                <input
                  className="bg-slate-950/80 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-400 outline-none"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Cantidad"
                />

                <input
                  className="bg-slate-950/80 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-400 outline-none"
                  type="number"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  placeholder="Precio unitario"
                />

                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-6 py-3 text-white font-bold shadow-lg hover:bg-indigo-500 transition"
                >
                  {editingOrderNumber ? "Actualizar pedido" : "Crear pedido"}
                </button>
              </form>
            </div>

            {loading && (
              <div className="bg-slate-800/80 border border-white/10 rounded-2xl p-5">
                <p className="text-slate-300 animate-pulse">Cargando pedidos...</p>
              </div>
            )}

            {!loading && (
              <div className="bg-slate-800/80 border border-white/10 rounded-3xl p-6">
                <h2 className="text-2xl font-black mb-6">Listado de pedidos</h2>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-900/80 text-slate-300 uppercase text-sm">
                        <th className="p-4 text-left rounded-l-xl">Número</th>
                        <th className="p-4 text-left">Estado</th>
                        <th className="p-4 text-left">Total</th>
                        <th className="p-4 text-left">Tracking</th>
                        <th className="p-4 text-left">Fecha</th>
                        <th className="p-4 text-left rounded-r-xl">Acciones</th>
                      </tr>
                    </thead>

                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.orderNumber} className="border-b border-white/10 hover:bg-white/5 transition">
                          <td className="p-4 font-bold">{order.orderNumber}</td>

                          <td className="p-4">
                            <span className="rounded-full bg-blue-500/20 text-blue-300 px-3 py-1 font-bold">
                              {order.status}
                            </span>
                          </td>

                          <td className="p-4">${order.totalAmount}</td>

                          <td className="p-4">
                            {order.trackingCode ? (
                              <span className="rounded-full bg-emerald-500/20 text-emerald-300 px-3 py-1 font-bold">
                                {order.trackingCode}
                              </span>
                            ) : (
                              <span className="text-slate-400">Sin tracking</span>
                            )}
                          </td>

                          <td className="p-4 text-slate-300">{order.createdAt}</td>

                          <td className="p-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEdit(order)}
                                className="rounded-xl bg-amber-500 px-4 py-2 text-white font-bold hover:bg-amber-400 transition"
                              >
                                Editar
                              </button>

                              <button
                                onClick={() => handleDelete(order.orderNumber)}
                                className="rounded-xl bg-red-500 px-4 py-2 text-white font-bold hover:bg-red-400 transition"
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
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