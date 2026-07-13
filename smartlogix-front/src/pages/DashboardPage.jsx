import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaBoxes,
  FaClipboardList,
  FaTruck,
  FaUsersCog,
} from "react-icons/fa";

import PageContainer from "../layout/PageContainer";
import Navbar from "../components/Navbar";
import { getInventoryItemsWithAvailable } from "../services/inventoryService";
import { loadOrderService } from "../services/orderService";
import { loadShipmentService } from "../services/shipmentService";
import { loadUsersService } from "../services/userService";
import { generateSmartRecommendations } from "../advisor/smartAdvisor";

function DashboardPage() {
  const role = localStorage.getItem("role");

  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");

  async function loadDashboard() {
    try {
      const inventoryData =
        role !== "ROLE_USER" ? await getInventoryItemsWithAvailable() : [];

      const orderData =
        role !== "ROLE_WAREHOUSE_MANAGER" ? await loadOrderService() : [];

      const shipmentData =
        role !== "ROLE_USER" ? await loadShipmentService() : [];

      const userData =
        role === "ROLE_ADMIN" ? await loadUsersService() : [];

      setInventory(inventoryData);
      setOrders(orderData);
      setShipments(shipmentData);
      setUsers(userData);
      setError("");
    } catch (err) {
      console.error(err);
      setError("No se pudieron cargar todos los datos del dashboard.");
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const pendingOrders = orders.filter(
    (order) =>
      order.status === "PENDING" ||
      order.status === "FAILED" ||
      order.status === "REJECTED"
  ).length;

  const totalAvailableUnits = inventory.reduce(
    (total, item) => total + Number(item.availableQuantity || 0),
    0
  );

  const inTransitShipments = shipments.filter(
    (shipment) => shipment.status === "IN_TRANSIT"
  ).length;

  const activeUsers = users.filter((user) => user.enabled).length;

  const recommendations = generateSmartRecommendations({
    inventory,
    orders,
    shipments,
  });

  const inventoryTop = [...inventory]
    .sort((a, b) => b.availableQuantity - a.availableQuantity)
    .slice(0, 5);

  const maxStock = Math.max(
    ...inventoryTop.map((item) => item.availableQuantity),
    1
  );

  const orderStatusCount = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white">
      <PageContainer>
        <div className="rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
          <Navbar />

          <section className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-8">
          <div className="flex justify-between items-start gap-6 mb-8">
            <div>
              <h1 className="text-4xl font-black">Resumen ejecutivo</h1>
              <p className="text-slate-400 mt-2">
                Panorama general de la operación logística.
              </p>
            </div>

            <button
              onClick={loadDashboard}
              className="rounded-2xl bg-white/10 px-5 py-3 font-bold text-white hover:bg-white/20 transition"
            >
              Actualizar datos
            </button>
          </div>

          {error && (
            <div className="mb-6 rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-red-200 font-semibold">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
            <DashboardMetric
              icon={<FaClipboardList />}
              label="Pedidos pendientes"
              value={pendingOrders}
              hint="Órdenes que requieren revisión"
              to="/orders"
            />

            <DashboardMetric
              icon={<FaBoxes />}
              label="Unidades disponibles"
              value={totalAvailableUnits}
              hint="Stock total disponible"
              to="/inventory"
            />

            <DashboardMetric
              icon={<FaTruck />}
              label="Envíos en tránsito"
              value={inTransitShipments}
              hint="Despachos actualmente activos"
              to="/shipments"
            />

            {role === "ROLE_ADMIN" && (
              <DashboardMetric
                icon={<FaUsersCog />}
                label="Usuarios activos"
                value={activeUsers}
                hint="Cuentas habilitadas"
                to="/users"
              />
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
            <Panel title="Pedidos por estado">
              {Object.keys(orderStatusCount).length ? (
                <div className="space-y-4">
                  {Object.entries(orderStatusCount).map(([status, count]) => (
                    <div key={status} className="flex justify-between border-b border-white/10 pb-3">
                      <span className="text-slate-300">{status}</span>
                      <strong>{count}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400">No hay pedidos registrados.</p>
              )}
            </Panel>

            <Panel title="Niveles de inventario Top 5">
              {inventoryTop.length ? (
                <div className="space-y-4">
                  {inventoryTop.map((item) => (
                    <div key={item.sku}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{item.productName}</span>
                        <span>{item.availableQuantity}</span>
                      </div>
                      <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-indigo-500"
                          style={{
                            width: `${(item.availableQuantity / maxStock) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400">No hay inventario disponible.</p>
              )}
            </Panel>
          </div>

          <Panel title="SmartLogix Advisor">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recommendations.map((recommendation, index) => (
                <article
                  key={index}
                  className={`rounded-2xl p-5 border ${
                    recommendation.priority === "Alta"
                      ? "bg-red-500/10 border-red-400/30"
                      : recommendation.priority === "Media"
                      ? "bg-amber-500/10 border-amber-400/30"
                      : "bg-emerald-500/10 border-emerald-400/30"
                  }`}
                >
                  <p className="text-sm font-bold text-slate-300">
                    {recommendation.priority} · {recommendation.type}
                  </p>
                  <h3 className="text-lg font-black mt-2">
                    {recommendation.title}
                  </h3>
                  <p className="text-slate-300 mt-1">
                    {recommendation.message}
                  </p>
                  <p className="text-slate-400 text-sm mt-3">
                    {recommendation.action}
                  </p>
                </article>
              ))}
            </div>
          </Panel>
        </section>
        </div>
      </PageContainer>
    </div>
  );
}

function DashboardMetric({ icon, label, value, hint, to }) {
  return (
    <Link
      to={to}
      className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-xl hover:bg-white/15 transition"
    >
      <div className="text-3xl text-indigo-300 mb-4">{icon}</div>
      <p className="text-slate-300 font-semibold">{label}</p>
      <strong className="block text-4xl font-black mt-2">{value}</strong>
      <span className="block text-slate-400 text-sm mt-3">{hint}</span>
    </Link>
  );
}

function Panel({ title, children }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-xl">
      <h2 className="text-2xl font-black mb-5">{title}</h2>
      {children}
    </section>
  );
}

export default DashboardPage;