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
import { fetchInventoryMovements, getInventoryItemsWithAvailable } from "../services/inventoryService";
import { loadOrderService } from "../services/orderService";
import { loadShipmentService } from "../services/shipmentService";
import { loadUsersService } from "../services/userService";
import { generateSmartRecommendations } from "../advisor/smartAdvisor";
import { getRoleFromToken } from "../utils/authTokenUtils";

function DashboardPage() {
  const role = getRoleFromToken();

  const [inventory, setInventory] = useState([]);
  const [movements, setMovements] = useState([]);
  const [orders, setOrders] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");

  async function loadDashboard() {
    try {
      const inventoryData =
        role !== "ROLE_USER" ? await getInventoryItemsWithAvailable() : [];

      const movementData =
        role !== "ROLE_USER"
          ? await fetchInventoryMovements({ page: 0, size: 200, sort: "createdAt,desc" })
          : { content: [] };

      const orderData =
        role !== "ROLE_WAREHOUSE_MANAGER" ? await loadOrderService() : [];

      const shipmentData =
        role !== "ROLE_USER" ? await loadShipmentService() : [];

      const userData =
        role === "ROLE_ADMIN" ? await loadUsersService() : [];

      setInventory(inventoryData);
      setMovements(Array.isArray(movementData.content) ? movementData.content : movementData);
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

  const criticalItems = inventory.filter((item) => {
    const available =
      Number(item.availableQuantity || 0) - Number(item.reservedQuantity || 0);
    return available <= Number(item.reorderLevel || 0);
  });

  const todayKey = new Date().toISOString().slice(0, 10);
  const movementsToday = movements.filter((movement) =>
    String(movement.createdAt || "").startsWith(todayKey)
  ).length;

  const warehouseSummary = Object.values(
    inventory.reduce((summary, item) => {
      const warehouse = item.warehouseCode || "Sin bodega";
      const available =
        Number(item.availableQuantity || 0) - Number(item.reservedQuantity || 0);

      if (!summary[warehouse]) {
        summary[warehouse] = {
          code: warehouse,
          products: 0,
          stock: 0,
          available: 0,
          critical: 0,
        };
      }

      summary[warehouse].products += 1;
      summary[warehouse].stock += Number(item.availableQuantity || 0);
      summary[warehouse].available += available;
      if (available <= Number(item.reorderLevel || 0)) summary[warehouse].critical += 1;

      return summary;
    }, {})
  ).sort((left, right) => right.available - left.available);

  const topMovementProducts = Object.values(
    movements.reduce((summary, movement) => {
      const sku = movement.sku || "SIN-SKU";

      if (!summary[sku]) {
        summary[sku] = {
          sku,
          productName: movement.productName || "Producto",
          count: 0,
          units: 0,
        };
      }

      summary[sku].count += 1;
      summary[sku].units += Number(movement.quantity || 0);
      return summary;
    }, {})
  )
    .sort((left, right) => right.count - left.count)
    .slice(0, 5);

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

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6 mb-6">
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

            {role !== "ROLE_USER" && (
              <DashboardMetric
                icon={<FaBoxes />}
                label="Productos criticos"
                value={criticalItems.length}
                hint="Bajo nivel de reposicion"
                to="/inventory"
              />
            )}

            {role !== "ROLE_USER" && (
              <DashboardMetric
                icon={<FaClipboardList />}
                label="Movimientos hoy"
                value={movementsToday}
                hint="Entradas, salidas y ajustes"
                to="/inventory/movements"
              />
            )}

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

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
            <Panel title="Stock por bodega">
              {warehouseSummary.length ? (
                <div className="space-y-3">
                  {warehouseSummary.map((warehouse) => (
                    <div
                      key={warehouse.code}
                      className="rounded-2xl border border-white/10 bg-slate-950/35 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <strong className="text-white">{warehouse.code}</strong>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            warehouse.critical
                              ? "bg-amber-500/20 text-amber-200"
                              : "bg-emerald-500/20 text-emerald-300"
                          }`}
                        >
                          {warehouse.critical ? `${warehouse.critical} criticos` : "OK"}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                        <MiniMetric label="Productos" value={warehouse.products} />
                        <MiniMetric label="Disponible" value={warehouse.available} />
                        <MiniMetric label="Stock" value={warehouse.stock} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400">No hay bodegas con inventario.</p>
              )}
            </Panel>

            <Panel title="Productos criticos">
              {criticalItems.length ? (
                <div className="space-y-3">
                  {criticalItems.slice(0, 6).map((item) => {
                    const available =
                      Number(item.availableQuantity || 0) - Number(item.reservedQuantity || 0);

                    return (
                      <Link
                        key={item.sku}
                        to="/inventory"
                        className="block rounded-2xl border border-amber-300/20 bg-amber-500/10 p-4 transition hover:bg-amber-500/15"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <strong>{item.productName}</strong>
                          <span className="text-sm font-black text-amber-200">{available}</span>
                        </div>
                        <p className="mt-1 text-xs font-semibold text-slate-400">
                          {item.sku} | Minimo: {item.reorderLevel} | {item.warehouseCode}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="text-slate-400">No hay productos bajo reposicion.</p>
              )}
            </Panel>

            <Panel title="Top productos con movimiento">
              {topMovementProducts.length ? (
                <div className="space-y-3">
                  {topMovementProducts.map((item) => (
                    <Link
                      key={item.sku}
                      to={`/inventory/movements?product=${encodeURIComponent(item.sku)}`}
                      className="block rounded-2xl border border-white/10 bg-slate-950/35 p-4 transition hover:bg-white/10"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <strong>{item.productName}</strong>
                        <span className="rounded-full bg-sky-500/20 px-3 py-1 text-xs font-black text-sky-200">
                          {item.count} mov.
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-slate-400">
                        {item.sku} | {item.units} unidades movidas
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400">No hay movimientos recientes.</p>
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

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-[11px] font-black uppercase text-slate-500">{label}</p>
      <strong className="mt-1 block text-lg font-black text-white">{value}</strong>
    </div>
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
