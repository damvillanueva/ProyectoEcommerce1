import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
getInventoryItemsWithAvailable,
saveInventoryItem,
editInventoryItem,
removeInventoryItem,
fetchInventoryMovements,
fetchInventoryAuditLogs,
} from "../services/inventoryService";
import Navbar from "../components/Navbar";
import PageContainer from "../layout/PageContainer";
import ToastStack from "../components/ToastStack";
import { useToasts } from "../hooks/useToasts";

function getRoleFromToken() {
const token = localStorage.getItem("token");

if (!token) return null;

try {
const payloadBase64 = token.split(".")[1];
const payloadJson = atob(payloadBase64);
const decoded = JSON.parse(payloadJson);

return (
decoded.role ||
decoded.authority ||
decoded.roles?.[0] ||
decoded.authorities?.[0] ||
null
);
} catch (error) {
console.error("Token inválido:", error);
return null;
}
}

function InventoryPage() {
const [items, setItems] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");
const [saving, setSaving] = useState(false);
const [editingSku, setEditingSku] = useState(null);
const [detailItem, setDetailItem] = useState(null);
const [detailMovements, setDetailMovements] = useState([]);
const [detailLoading, setDetailLoading] = useState(false);
const [detailError, setDetailError] = useState("");
const [auditLogs, setAuditLogs] = useState([]);
const [auditLoading, setAuditLoading] = useState(false);
const [auditError, setAuditError] = useState("");
const [deleteTarget, setDeleteTarget] = useState(null);
const [deleting, setDeleting] = useState(false);
const { dismissToast, showToast, toasts } = useToasts();

const role = getRoleFromToken();

const canManageInventory =
role === "ROLE_ADMIN" || role === "ROLE_WAREHOUSE_MANAGER";

const canDeleteInventory = role === "ROLE_ADMIN";
const canViewAudit = role === "ROLE_ADMIN";
const canViewMovements = role === "ROLE_ADMIN" || role === "ROLE_WAREHOUSE_MANAGER";

const criticalItems = useMemo(
() =>
items.filter(
(item) => item.availableQuantity - item.reservedQuantity <= item.reorderLevel
),
[items]
);

function showPageError(message) {
setError(message);
showToast(message, "error");
}

function showPageSuccess(message) {
setError("");
showToast(message, "success");
}

const [formData, setFormData] = useState({
sku: `SKU-${Math.floor(Math.random() * 9000) + 1000}`,
productName: "Auriculares Hyperx",
imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=240&q=80",
warehouseCode: "BOD-001",
initialQuantity: "25",
reorderLevel: "5",
});

useEffect(() => {
async function loadInventory() {
try {
const data = await getInventoryItemsWithAvailable();
setItems(data);
} catch (err) {
console.error(err);
showPageError("No se pudo cargar el inventario.");
} finally {
setLoading(false);
}
}

loadInventory();

if (canViewAudit) {
loadAuditLogs();
}
}, [canViewAudit]);

async function loadAuditLogs() {
try {
setAuditLoading(true);
setAuditError("");
const data = await fetchInventoryAuditLogs({ limit: 10 });
setAuditLogs(Array.isArray(data) ? data : []);
} catch (err) {
console.error(err);
setAuditError("No se pudo cargar la auditoria de inventario.");
showToast("No se pudo cargar la auditoria de inventario.", "error");
} finally {
setAuditLoading(false);
}
}

function handleChange(event) {
const { name, value } = event.target;

setFormData((prevData) => ({
...prevData,
[name]: value,
}));
}

async function handleCreateInventory(event) {
event.preventDefault();

if (!canManageInventory) {
showPageError("No tienes permisos para crear o modificar inventario.");
return;
}

const cleanSku = formData.sku.trim();
const cleanProductName = formData.productName.trim();
const cleanImageUrl = formData.imageUrl.trim();
const cleanWarehouseCode = formData.warehouseCode.trim();
const parsedQuantity = Number(formData.initialQuantity);
const parsedReorderLevel = Number(formData.reorderLevel);

if (!cleanSku) {
showPageError("Ingresa un SKU válido.");
return;
}

if (!cleanProductName) {
showPageError("Ingresa el nombre del producto.");
return;
}

if (!cleanWarehouseCode) {
showPageError("Ingresa el código de bodega.");
return;
}

if (!Number.isFinite(parsedQuantity) || parsedQuantity < 0) {
showPageError("La cantidad no puede ser negativa.");
return;
}

if (!Number.isInteger(parsedQuantity)) {
showPageError("La cantidad debe ser un número entero.");
return;
}

if (!Number.isFinite(parsedReorderLevel) || parsedReorderLevel < 0) {
showPageError("El nivel de reposición no puede ser negativo.");
return;
}

if (!Number.isInteger(parsedReorderLevel)) {
showPageError("El nivel de reposición debe ser un número entero.");
return;
}

try {
setSaving(true);
setError("");

if (editingSku) {
const currentItem = items.find((item) => item.sku === editingSku);
const reservedQuantity = Number(currentItem?.reservedQuantity || 0);

if (parsedQuantity < reservedQuantity) {
showPageError(
`No puedes dejar el stock en ${parsedQuantity}, porque ya existen ${reservedQuantity} unidades reservadas.`
);
return;
}

await editInventoryItem(editingSku, {
productName: cleanProductName,
imageUrl: cleanImageUrl,
warehouseCode: cleanWarehouseCode,
availableQuantity: parsedQuantity,
reservedQuantity,
reorderLevel: parsedReorderLevel,
});
} else {
await saveInventoryItem({
sku: cleanSku,
productName: cleanProductName,
imageUrl: cleanImageUrl,
warehouseCode: cleanWarehouseCode,
initialQuantity: parsedQuantity,
reorderLevel: parsedReorderLevel,
});
}

const data = await getInventoryItemsWithAvailable();
setItems(data);
if (canViewAudit) {
await loadAuditLogs();
}
showPageSuccess(editingSku ? "Producto actualizado correctamente." : "Producto agregado correctamente.");

setEditingSku(null);

setFormData({
sku: `SKU-${Math.floor(Math.random() * 9000) + 1000}`,
productName: "Auriculares Hyperx",
imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=240&q=80",
warehouseCode: "BOD-001",
initialQuantity: "25",
reorderLevel: "5",
});
} catch (err) {
console.error(err);
showPageError(
editingSku
? "No se pudo actualizar el producto."
: "No se pudo agregar el producto al inventario."
);
} finally {
setSaving(false);
}
}

function handleEdit(item) {
if (!canManageInventory) {
showPageError("No tienes permisos para editar inventario.");
return;
}

setEditingSku(item.sku);

setFormData({
sku: item.sku,
productName: item.productName,
imageUrl: item.imageUrl || "",
warehouseCode: item.warehouseCode,
initialQuantity: String(item.availableQuantity),
reorderLevel: String(item.reorderLevel),
});
}

function handleDeleteRequest(item) {
if (!canDeleteInventory) {
showPageError("Solo un administrador puede eliminar inventario.");
return;
}

setDeleteTarget(item);
}

async function handleConfirmDelete() {
if (!deleteTarget) return;

const sku = deleteTarget.sku;

try {
setDeleting(true);
await removeInventoryItem(sku);

const data = await getInventoryItemsWithAvailable();
setItems(data);
if (canViewAudit) {
await loadAuditLogs();
}
showPageSuccess(`Producto ${sku} eliminado correctamente.`);
setDeleteTarget(null);
} catch (err) {
console.error(err);
showPageError("No se pudo eliminar el producto.");
} finally {
setDeleting(false);
}
}

async function handleOpenDetail(item) {
setDetailItem(item);
setDetailMovements([]);
setDetailError("");

if (!canViewMovements) {
setDetailLoading(false);
return;
}

setDetailLoading(true);

try {
const data = await fetchInventoryMovements({
product: item.sku,
page: 0,
size: 5,
sort: "createdAt,desc",
});
const content = Array.isArray(data.content) ? data.content : data;
setDetailMovements(content || []);
} catch (err) {
console.error(err);
setDetailError("No se pudo cargar el historial asociado.");
showToast("No se pudo cargar el historial asociado.", "error");
} finally {
setDetailLoading(false);
}
}

function handleCloseDetail() {
setDetailItem(null);
setDetailMovements([]);
setDetailError("");
}

return (
<div className="min-h-screen bg-slate-950 p-6 text-white">
<ToastStack onDismiss={dismissToast} toasts={toasts} />
<PageContainer>
<div className="rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
<Navbar />

<section className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-8">
<div className="flex justify-between items-start mb-8">
<div>
<h1 className="text-4xl font-black mb-2">Inventario</h1>
<p className="text-slate-300">
Gestión de productos, stock disponible y reposición.
</p>
</div>
{canViewMovements && (
<Link
to="/inventory/movements"
className="rounded-xl bg-white/10 px-5 py-3 font-bold text-white transition hover:bg-white/20"
>
Ver historial
</Link>
)}
</div>

{loading && (
<div className="bg-slate-800/80 border border-white/10 rounded-2xl p-5 mb-6">
<p className="text-slate-300 animate-pulse">
Cargando inventario...
</p>
</div>
)}

{!loading && criticalItems.length > 0 && (
<div className="bg-amber-500/10 border border-amber-300/30 rounded-2xl p-5 mb-6">
<p className="text-amber-100 font-bold">
Alerta de stock bajo: {criticalItems.length} producto(s) alcanzaron o quedaron bajo su nivel de reposiciÃ³n.
</p>
</div>
)}

{!loading && (
<>
{canManageInventory && (
<div className="bg-slate-800/80 border border-white/10 rounded-3xl p-6 mb-8">
<h2 className="text-2xl font-black mb-2">
{editingSku ? "Actualizar inventario" : "Agregar inventario"}
</h2>

<p className="text-slate-400 mb-6">
Registra nuevos productos o actualiza existencias.
</p>

<form
onSubmit={handleCreateInventory}
className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
>
<input
type="text"
name="sku"
value={formData.sku}
onChange={handleChange}
placeholder="SKU"
required
disabled={Boolean(editingSku)}
className="bg-slate-950/80 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-400 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
/>

<input
type="text"
name="productName"
value={formData.productName}
onChange={handleChange}
placeholder="Nombre del producto"
required
className="bg-slate-950/80 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-400 outline-none"
/>

<input
type="url"
name="imageUrl"
value={formData.imageUrl}
onChange={handleChange}
placeholder="URL de imagen del producto"
className="bg-slate-950/80 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-400 outline-none"
/>

<input
type="text"
name="warehouseCode"
value={formData.warehouseCode}
onChange={handleChange}
placeholder="Código de bodega"
required
className="bg-slate-950/80 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-400 outline-none"
/>

<input
type="number"
name="initialQuantity"
value={formData.initialQuantity}
onChange={handleChange}
placeholder="Cantidad inicial"
min="0"
required
className="bg-slate-950/80 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-400 outline-none"
/>

<input
type="number"
name="reorderLevel"
value={formData.reorderLevel}
onChange={handleChange}
placeholder="Nivel de reposición"
min="0"
required
className="bg-slate-950/80 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-400 outline-none"
/>

<button
type="submit"
disabled={saving}
className="rounded-xl bg-indigo-600 px-6 py-3 text-white font-bold shadow-lg hover:bg-indigo-500 transition disabled:opacity-60"
>
{saving
? editingSku
? "Actualizando..."
: "Agregando..."
: editingSku
? "Actualizar inventario"
: "Agregar inventario"}
</button>
</form>
</div>
)}

{!canManageInventory && (
<div className="bg-slate-800/80 border border-white/10 rounded-2xl p-5 mb-6">
<p className="text-slate-300">
Tienes acceso de lectura al inventario. La creación,
edición y eliminación está reservada para administradores
o bodegueros.
</p>
</div>
)}

<div className="bg-slate-800/80 border border-white/10 rounded-3xl p-6">
<h2 className="text-2xl font-black mb-6">
Listado de inventario
</h2>

<div className="overflow-x-auto">
<table className="w-full border-collapse">
<thead>
<tr className="bg-slate-900/80 text-slate-300 uppercase text-sm">
<th className="p-4 text-left rounded-l-xl">SKU</th>
<th className="p-4 text-left">Imagen</th>
<th className="p-4 text-left">Nombre</th>
<th className="p-4 text-left">Stock</th>
<th className="p-4 text-left">Reservado</th>
<th className="p-4 text-left">Disponible</th>
<th className="p-4 text-left">Estado</th>
<th className="p-4 text-left rounded-r-xl">
Acciones
</th>
</tr>
</thead>

<tbody>
{items.map((item) => (
<tr
key={item.sku}
className="border-b border-white/10 hover:bg-white/5 transition"
>
<td className="p-4 font-bold">{item.sku}</td>
<td className="p-4">
<ProductThumbnail imageUrl={item.imageUrl} productName={item.productName} />
</td>
<td className="p-4">{item.productName}</td>
<td className="p-4">{item.availableQuantity}</td>
<td className="p-4">{item.reservedQuantity}</td>
<td className="p-4">
<span className="rounded-full bg-emerald-500/20 text-emerald-300 px-3 py-1 font-bold">
{item.availableQuantity - item.reservedQuantity}
</span>
</td>
<td className="p-4">
<StockBadge item={item} />
</td>

<td className="p-4">
<div className="flex flex-wrap gap-2">
<button
onClick={() => handleOpenDetail(item)}
className="rounded-xl bg-white/10 px-4 py-2 text-white font-bold hover:bg-white/20 transition"
>
Detalle
</button>

{canManageInventory && (
<>
<button
onClick={() => handleEdit(item)}
className="rounded-xl bg-amber-500 px-4 py-2 text-white font-bold hover:bg-amber-400 transition"
>
Editar
</button>

{canDeleteInventory && (
<button
onClick={() => handleDeleteRequest(item)}
className="rounded-xl bg-red-500 px-4 py-2 text-white font-bold hover:bg-red-400 transition"
>
Eliminar
</button>
)}
</>
)}
{canViewMovements && (
<Link
to={`/inventory/movements?product=${encodeURIComponent(item.sku)}`}
className="rounded-xl bg-sky-500 px-4 py-2 text-white font-bold hover:bg-sky-400 transition"
>
Movimientos
</Link>
)}
</div>
</td>
</tr>
))}
</tbody>
</table>
</div>
</div>

{canViewAudit && (
<InventoryAuditPanel
logs={auditLogs}
loading={auditLoading}
error={auditError}
onRefresh={loadAuditLogs}
/>
)}
</>
)}
</section>
</div>
</PageContainer>

{detailItem && (
<ProductDetailModal
item={detailItem}
movements={detailMovements}
loading={detailLoading}
error={detailError}
canViewMovements={canViewMovements}
onClose={handleCloseDetail}
/>
)}

{deleteTarget && (
<DeleteProductModal
deleting={deleting}
item={deleteTarget}
onCancel={() => setDeleteTarget(null)}
onConfirm={handleConfirmDelete}
/>
)}
</div>
);
}

function InventoryAuditPanel({ error, loading, logs, onRefresh }) {
return (
<section className="mt-8 rounded-3xl border border-white/10 bg-slate-800/80 p-6">
<div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
<div>
<h2 className="text-2xl font-black">Auditoria de inventario</h2>
<p className="mt-1 text-sm font-semibold text-slate-400">
Ultimas acciones registradas sobre productos.
</p>
</div>
<button
type="button"
onClick={onRefresh}
className="rounded-xl bg-white/10 px-4 py-2 text-sm font-black text-white transition hover:bg-white/20"
>
Actualizar
</button>
</div>

{loading && (
<div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 text-sm font-bold text-slate-300">
Cargando auditoria...
</div>
)}

{error && (
<div className="rounded-2xl border border-red-400/40 bg-red-950/40 p-4 text-sm font-bold text-red-200">
{error}
</div>
)}

{!loading && !error && logs.length === 0 && (
<div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 text-sm font-bold text-slate-400">
Todavia no hay eventos de auditoria.
</div>
)}

{!loading && !error && logs.length > 0 && (
<div className="overflow-x-auto">
<table className="w-full min-w-[980px] border-collapse text-sm">
<thead>
<tr className="bg-slate-900/80 text-left text-xs uppercase text-slate-300">
<th className="rounded-l-xl p-4">Fecha</th>
<th className="p-4">Accion</th>
<th className="p-4">SKU</th>
<th className="p-4">Producto</th>
<th className="p-4">Usuario</th>
<th className="p-4">Rol</th>
<th className="p-4">IP</th>
<th className="rounded-r-xl p-4">Detalle</th>
</tr>
</thead>
<tbody>
{logs.map((log) => (
<tr key={log.id} className="border-b border-white/10 transition hover:bg-white/5">
<td className="whitespace-nowrap p-4 font-bold text-slate-300">{formatAuditDate(log.createdAt)}</td>
<td className="p-4">
<span className={`rounded-full px-3 py-1 text-xs font-black ${getAuditActionClass(log.action)}`}>
{formatAuditAction(log.action)}
</span>
</td>
<td className="p-4 font-black text-white">{log.sku || "-"}</td>
<td className="p-4 font-semibold text-slate-200">{log.productName || "-"}</td>
<td className="p-4 font-bold text-slate-200">{log.username || "system"}</td>
<td className="p-4 font-bold text-slate-300">{formatRole(log.role)}</td>
<td className="p-4 font-mono text-xs text-slate-300">{log.ipAddress || "unknown"}</td>
<td className="p-4 font-semibold text-slate-300">{log.detail || "-"}</td>
</tr>
))}
</tbody>
</table>
</div>
)}
</section>
);
}

function DeleteProductModal({ deleting, item, onCancel, onConfirm }) {
const available = item.availableQuantity - item.reservedQuantity;

return (
<div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
<section className="w-full max-w-lg rounded-3xl border border-red-300/20 bg-slate-900 p-6 text-white shadow-2xl">
<div className="mb-5 flex items-start gap-4">
<div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-red-500/15 text-2xl font-black text-red-200">
!
</div>
<div>
<p className="text-sm font-black uppercase text-red-300">Confirmar eliminacion</p>
<h2 className="mt-1 text-2xl font-black">Eliminar producto</h2>
<p className="mt-2 text-sm font-semibold leading-6 text-slate-300">
Esta accion eliminara el producto del inventario y quedara registrada en auditoria.
</p>
</div>
</div>

<div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
<div className="flex items-center gap-4">
<ProductThumbnail imageUrl={item.imageUrl} productName={item.productName} />
<div>
<p className="text-lg font-black">{item.productName}</p>
<p className="text-sm font-bold text-slate-400">{item.sku}</p>
</div>
</div>

<div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
<div className="rounded-xl bg-white/5 p-3">
<p className="text-xs font-black uppercase text-slate-500">Stock</p>
<p className="mt-1 text-xl font-black">{item.availableQuantity}</p>
</div>
<div className="rounded-xl bg-white/5 p-3">
<p className="text-xs font-black uppercase text-slate-500">Reservado</p>
<p className="mt-1 text-xl font-black">{item.reservedQuantity}</p>
</div>
<div className="rounded-xl bg-white/5 p-3">
<p className="text-xs font-black uppercase text-slate-500">Disponible</p>
<p className="mt-1 text-xl font-black">{available}</p>
</div>
</div>
</div>

<div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
<button
type="button"
onClick={onCancel}
disabled={deleting}
className="rounded-xl bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
>
Cancelar
</button>
<button
type="button"
onClick={onConfirm}
disabled={deleting}
className="rounded-xl bg-red-500 px-5 py-3 text-sm font-black text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
>
{deleting ? "Eliminando..." : "Eliminar producto"}
</button>
</div>
</section>
</div>
);
}

function formatAuditDate(value) {
if (!value) return "-";

return new Intl.DateTimeFormat("es-CL", {
dateStyle: "short",
timeStyle: "medium",
hour12: false,
}).format(new Date(value));
}

function formatAuditAction(action) {
const labels = {
CREATE_PRODUCT: "Creacion",
UPDATE_PRODUCT: "Edicion",
DELETE_PRODUCT: "Eliminacion",
};

return labels[action] || action || "Accion";
}

function getAuditActionClass(action) {
if (action === "CREATE_PRODUCT") return "bg-emerald-500/20 text-emerald-300";
if (action === "DELETE_PRODUCT") return "bg-red-500/20 text-red-200";
return "bg-amber-500/20 text-amber-200";
}

function formatRole(role) {
const labels = {
ROLE_ADMIN: "Admin",
ROLE_WAREHOUSE_MANAGER: "Bodeguero",
ROLE_USER: "Usuario",
};

return labels[role] || role || "-";
}

function ProductDetailModal({ canViewMovements, item, movements, loading, error, onClose }) {
const available = item.availableQuantity - item.reservedQuantity;
const isLowStock = available <= item.reorderLevel;

return (
<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
<section className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-white/10 bg-slate-900 text-white shadow-2xl">
<div className="flex items-start justify-between gap-4 border-b border-white/10 p-6">
<div>
<p className="text-sm font-black uppercase text-sky-300">Detalle de producto</p>
<h2 className="mt-1 text-3xl font-black">{item.productName}</h2>
<p className="mt-2 text-sm font-semibold text-slate-400">{item.sku}</p>
</div>
<button
type="button"
onClick={onClose}
className="rounded-xl bg-white/10 px-4 py-2 text-sm font-black text-white transition hover:bg-white/20"
>
Cerrar
</button>
</div>

<div className="grid gap-6 p-6 lg:grid-cols-[320px_minmax(0,1fr)]">
<div>
{item.imageUrl ? (
<img
src={item.imageUrl}
alt={item.productName}
className="h-72 w-full rounded-2xl border border-white/10 object-cover shadow-xl"
loading="lazy"
/>
) : (
<div className="flex h-72 w-full items-center justify-center rounded-2xl border border-dashed border-white/20 bg-slate-950/60 text-lg font-black text-slate-500">
Sin imagen
</div>
)}

<div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/45 p-4">
<p className="mb-2 text-sm font-black text-slate-300">Estado actual</p>
<StockBadge item={item} />
<p className="mt-3 text-sm font-semibold text-slate-400">
{isLowStock
? "El producto necesita reposicion o revision de stock."
: "El producto se mantiene sobre el nivel de reposicion."}
</p>
</div>
</div>

<div className="space-y-6">
<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
<DetailMetric label="SKU" value={item.sku} />
<DetailMetric label="Bodega" value={item.warehouseCode} />
<DetailMetric label="Stock total" value={item.availableQuantity} />
<DetailMetric label="Reservado" value={item.reservedQuantity} />
<DetailMetric label="Disponible" value={available} tone={isLowStock ? "warning" : "success"} />
<DetailMetric label="Nivel reposicion" value={item.reorderLevel} />
</div>

{canViewMovements && (
<div className="rounded-2xl border border-white/10 bg-slate-950/45 p-5">
<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
<div>
<h3 className="text-xl font-black">Historial asociado</h3>
<p className="text-sm font-semibold text-slate-400">
Ultimos movimientos registrados para este SKU.
</p>
</div>
{canViewMovements && (
<Link
to={`/inventory/movements?product=${encodeURIComponent(item.sku)}`}
className="rounded-xl bg-sky-500 px-4 py-2 text-center text-sm font-black text-white transition hover:bg-sky-400"
>
Ver historial completo
</Link>
)}
</div>

{loading && (
<p className="rounded-xl border border-white/10 bg-slate-900/80 p-4 text-sm font-bold text-slate-300">
Cargando movimientos...
</p>
)}

{error && (
<p className="rounded-xl border border-red-400/40 bg-red-950/40 p-4 text-sm font-bold text-red-200">
{error}
</p>
)}

{!loading && !error && movements.length === 0 && (
<p className="rounded-xl border border-white/10 bg-slate-900/80 p-4 text-sm font-bold text-slate-400">
No hay movimientos registrados para este producto.
</p>
)}

{!loading && !error && movements.length > 0 && (
<div className="space-y-3">
{movements.map((movement) => (
<div
key={movement.id}
className="grid gap-3 rounded-2xl border border-white/10 bg-slate-900/80 p-4 sm:grid-cols-[140px_minmax(0,1fr)_90px]"
>
<div>
<p className={`text-sm font-black ${getMovementTone(movement.movementType)}`}>
{formatMovementType(movement.movementType)}
</p>
<p className="mt-1 text-xs font-semibold text-slate-500">
#{movement.id}
</p>
</div>
<div>
<p className="font-bold text-white">{movement.reason || "Movimiento de inventario"}</p>
<p className="mt-1 text-sm font-semibold text-slate-400">
{formatMovementDate(movement.createdAt)} · {movement.username || "system"}
</p>
</div>
<div className="text-left sm:text-right">
<p className={`text-lg font-black ${getMovementTone(movement.movementType)}`}>
{getMovementQuantityLabel(movement)}
</p>
<p className="text-xs font-semibold text-slate-500">
{movement.previousStock} a {movement.newStock}
</p>
</div>
</div>
))}
</div>
)}
</div>
)}
</div>
</div>
</section>
</div>
);
}

function DetailMetric({ label, value, tone = "default" }) {
const toneClass =
tone === "success"
? "text-emerald-300"
: tone === "warning"
? "text-amber-200"
: "text-white";

return (
<div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
<p className="text-xs font-black uppercase text-slate-500">{label}</p>
<p className={`mt-2 text-2xl font-black ${toneClass}`}>{value ?? "-"}</p>
</div>
);
}

function formatMovementDate(value) {
if (!value) return "-";

return new Intl.DateTimeFormat("es-CL", {
dateStyle: "short",
timeStyle: "short",
hour12: false,
}).format(new Date(value));
}

function formatMovementType(type) {
const labels = {
ENTRY: "Entrada",
EXIT: "Salida",
ADJUSTMENT: "Ajuste",
};

return labels[type] || "Movimiento";
}

function getMovementQuantityLabel(movement) {
const quantity = Number(movement.quantity || 0);

if (movement.movementType === "ENTRY") return `+${quantity}`;
if (movement.movementType === "EXIT") return `-${quantity}`;

const delta = Number(movement.newStock || 0) - Number(movement.previousStock || 0);
return `${delta >= 0 ? "+" : ""}${delta}`;
}

function getMovementTone(type) {
if (type === "ENTRY") return "text-emerald-300";
if (type === "EXIT") return "text-red-300";
return "text-amber-200";
}

function ProductThumbnail({ imageUrl, productName }) {
if (!imageUrl) {
return (
<div className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 bg-slate-950/70 text-xs font-black text-slate-400">
IMG
</div>
);
}

return (
<img
src={imageUrl}
alt={productName}
className="h-14 w-14 rounded-xl border border-white/10 object-cover shadow-lg"
loading="lazy"
/>
);
}

function StockBadge({ item }) {
const available = item.availableQuantity - item.reservedQuantity;
const isLowStock = available <= item.reorderLevel;

if (isLowStock) {
return (
<span className="rounded-full bg-amber-500/20 px-3 py-1 text-sm font-bold text-amber-200">
Stock bajo
</span>
);
}

return (
<span className="rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-bold text-emerald-300">
OK
</span>
);
}

export default InventoryPage;
