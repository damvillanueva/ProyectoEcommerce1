import { Suspense, lazy, useEffect, useMemo, useState } from "react";
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
import {
getAvailableUnits,
getProductStorageLocation,
productMatchesSearch,
WAREHOUSE_LOCATION_OPTIONS,
} from "../utils/inventoryLocationUtils";

const CATEGORY_OPTIONS = [
"Accesorios",
"Componentes",
"Monitores",
"Notebooks",
"Perifericos",
"Otros",
];

const WAREHOUSE_OPTIONS = WAREHOUSE_LOCATION_OPTIONS;
const Warehouse3DExplorer = lazy(() => import("../components/Warehouse3DExplorer"));

const MAX_IMAGE_UPLOAD_BYTES = 900 * 1024;
const SKU_CODE_GRID_SIZE = 11;

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

function isFinderPatternCell(row, column, startRow, startColumn) {
const localRow = row - startRow;
const localColumn = column - startColumn;

if (localRow < 0 || localRow > 2 || localColumn < 0 || localColumn > 2) {
return null;
}

return (
localRow === 0 ||
localRow === 2 ||
localColumn === 0 ||
localColumn === 2 ||
(localRow === 1 && localColumn === 1)
);
}

function getSkuCodeCells(sku) {
const normalizedSku = String(sku || "SKU").toUpperCase();
let hash = 2166136261;

for (let index = 0; index < normalizedSku.length; index += 1) {
hash ^= normalizedSku.charCodeAt(index);
hash = Math.imul(hash, 16777619);
}

return Array.from({ length: SKU_CODE_GRID_SIZE * SKU_CODE_GRID_SIZE }, (_, index) => {
const row = Math.floor(index / SKU_CODE_GRID_SIZE);
const column = index % SKU_CODE_GRID_SIZE;
const finder =
isFinderPatternCell(row, column, 0, 0) ??
isFinderPatternCell(row, column, 0, SKU_CODE_GRID_SIZE - 3) ??
isFinderPatternCell(row, column, SKU_CODE_GRID_SIZE - 3, 0);

if (finder !== null) return finder;

hash = Math.imul(hash ^ (row * 31 + column * 17 + index), 1103515245) + 12345;
return (hash >>> 0) % 4 !== 0;
});
}

function InventoryPage() {
const [items, setItems] = useState([]);
const [loading, setLoading] = useState(true);
const [, setError] = useState("");
const [saving, setSaving] = useState(false);
const [editingSku, setEditingSku] = useState(null);
const [detailItem, setDetailItem] = useState(null);
const [detailMovements, setDetailMovements] = useState([]);
const [detailLoading, setDetailLoading] = useState(false);
const [detailError, setDetailError] = useState("");
const [transferringSku, setTransferringSku] = useState("");
const [auditLogs, setAuditLogs] = useState([]);
const [auditLoading, setAuditLoading] = useState(false);
const [auditError, setAuditError] = useState("");
const [deleteTarget, setDeleteTarget] = useState(null);
const [deleting, setDeleting] = useState(false);
const [categoryFilter, setCategoryFilter] = useState("");
const [warehouseFilter, setWarehouseFilter] = useState("");
const [warehouseSearch, setWarehouseSearch] = useState("");
const [focusedWarehouseSku, setFocusedWarehouseSku] = useState("");
const [labelItem, setLabelItem] = useState(null);
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

const categoryOptions = useMemo(() => {
const categories = new Set(CATEGORY_OPTIONS);
items.forEach((item) => {
if (item.category) categories.add(item.category);
});
return Array.from(categories).sort((left, right) => left.localeCompare(right));
}, [items]);

const warehouseOptions = useMemo(() => {
const warehouses = new Map(WAREHOUSE_OPTIONS.map((warehouse) => [warehouse.code, warehouse]));
items.forEach((item) => {
if (item.warehouseCode && !warehouses.has(item.warehouseCode)) {
warehouses.set(item.warehouseCode, {
code: item.warehouseCode,
name: item.warehouseCode,
city: "Sin ciudad",
});
}
});
return Array.from(warehouses.values()).sort((left, right) => left.code.localeCompare(right.code));
}, [items]);

const warehouseSummary = useMemo(() => {
return warehouseOptions.map((warehouse) => {
const warehouseItems = items.filter((item) => item.warehouseCode === warehouse.code);
const categoryCounts = Array.from(
warehouseItems.reduce((categories, item) => {
const category = item.category || "General";
categories.set(category, (categories.get(category) || 0) + 1);
return categories;
}, new Map())
).map(([name, count]) => ({ name, count }));
const totals = warehouseItems.reduce(
(summary, item) => {
const available = item.availableQuantity - item.reservedQuantity;
summary.stock += item.availableQuantity;
summary.reserved += item.reservedQuantity;
summary.available += available;
if (available <= item.reorderLevel) summary.critical += 1;
return summary;
},
{ stock: 0, reserved: 0, available: 0, critical: 0 }
);

return {
...warehouse,
...totals,
items: warehouseItems.length,
categories: categoryCounts,
products: [...warehouseItems]
.map((item) => ({
...item,
availableVisual: item.availableQuantity - item.reservedQuantity,
isCriticalVisual: item.availableQuantity - item.reservedQuantity <= item.reorderLevel,
}))
.sort((left, right) => {
if (left.isCriticalVisual !== right.isCriticalVisual) {
return left.isCriticalVisual ? -1 : 1;
}

return left.productName.localeCompare(right.productName);
}),
};
});
}, [items, warehouseOptions]);

const filteredItems = useMemo(() => {
return items.filter((item) => {
const matchesCategory = !categoryFilter || (item.category || "General") === categoryFilter;
const matchesWarehouse = !warehouseFilter || item.warehouseCode === warehouseFilter;
return matchesCategory && matchesWarehouse;
});
}, [categoryFilter, items, warehouseFilter]);

const locationSearchResults = useMemo(() => {
const cleanSearch = warehouseSearch.trim();

if (!cleanSearch) return [];

return items
.filter((item) => productMatchesSearch(item, cleanSearch))
.map((item) => ({
...item,
availableVisual: getAvailableUnits(item),
storageLocation: getProductStorageLocation(item),
}))
.sort((left, right) => {
const leftAvailable = getAvailableUnits(left);
const rightAvailable = getAvailableUnits(right);

if (leftAvailable !== rightAvailable) return rightAvailable - leftAvailable;

return left.productName.localeCompare(right.productName);
})
.slice(0, 8);
}, [items, warehouseSearch]);

function showPageError(message) {
setError(message);
showToast(message, "error");
}

function showPageSuccess(message) {
setError("");
showToast(message, "success");
}

function handleWarehouseSearchChange(value) {
setWarehouseSearch(value);
setFocusedWarehouseSku("");
}

function handleLocateProduct(item) {
const location = getProductStorageLocation(item);

setWarehouseFilter(item.warehouseCode || "");
setFocusedWarehouseSku(item.sku);
showPageSuccess(`${item.productName} ubicado en ${location.label}.`);
}

const [formData, setFormData] = useState({
sku: `SKU-${Math.floor(Math.random() * 9000) + 1000}`,
productName: "Auriculares Hyperx",
imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=240&q=80",
category: "Accesorios",
salePrice: "29990",
warehouseCode: "WH-SCL-01",
locationZone: "A",
locationAisle: "A",
locationRack: "1",
locationLevel: "1",
locationPosition: "1",
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

function handleImageUpload(event) {
const file = event.target.files?.[0];

if (!file) return;

if (!file.type.startsWith("image/")) {
showPageError("Selecciona un archivo de imagen valido.");
event.target.value = "";
return;
}

if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
showPageError("La imagen debe pesar menos de 900 KB para guardarla en la demo.");
event.target.value = "";
return;
}

const reader = new FileReader();
reader.onload = () => {
setFormData((prevData) => ({
...prevData,
imageUrl: String(reader.result || ""),
}));
showPageSuccess("Imagen cargada en el formulario.");
event.target.value = "";
};
reader.onerror = () => {
showPageError("No se pudo leer la imagen seleccionada.");
event.target.value = "";
};
reader.readAsDataURL(file);
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
const cleanCategory = formData.category.trim();
const parsedSalePrice = Number(formData.salePrice);
const cleanWarehouseCode = formData.warehouseCode.trim();
const cleanLocationZone = formData.locationZone.trim();
const cleanLocationAisle = formData.locationAisle.trim();
const parsedLocationRack = Number(formData.locationRack);
const parsedLocationLevel = Number(formData.locationLevel);
const parsedLocationPosition = Number(formData.locationPosition);
const parsedQuantity = Number(formData.initialQuantity);
const parsedReorderLevel = Number(formData.reorderLevel);

if (!Number.isFinite(parsedSalePrice) || parsedSalePrice <= 0) {
showPageError("Ingresa un precio de venta mayor a 0.");
return;
}

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

if (
!Number.isInteger(parsedLocationRack) ||
parsedLocationRack <= 0 ||
!Number.isInteger(parsedLocationLevel) ||
parsedLocationLevel <= 0 ||
!Number.isInteger(parsedLocationPosition) ||
parsedLocationPosition <= 0
) {
showPageError("Rack, nivel y posicion deben ser numeros enteros mayores a 0.");
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
category: cleanCategory,
salePrice: parsedSalePrice,
warehouseCode: cleanWarehouseCode,
locationZone: cleanLocationZone,
locationAisle: cleanLocationAisle,
locationRack: parsedLocationRack,
locationLevel: parsedLocationLevel,
locationPosition: parsedLocationPosition,
availableQuantity: parsedQuantity,
reservedQuantity,
reorderLevel: parsedReorderLevel,
});
} else {
await saveInventoryItem({
sku: cleanSku,
productName: cleanProductName,
imageUrl: cleanImageUrl,
category: cleanCategory,
salePrice: parsedSalePrice,
warehouseCode: cleanWarehouseCode,
locationZone: cleanLocationZone,
locationAisle: cleanLocationAisle,
locationRack: parsedLocationRack,
locationLevel: parsedLocationLevel,
locationPosition: parsedLocationPosition,
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
category: "Accesorios",
salePrice: "29990",
warehouseCode: "WH-SCL-01",
locationZone: "A",
locationAisle: "A",
locationRack: "1",
locationLevel: "1",
locationPosition: "1",
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
const location = getProductStorageLocation(item);

setFormData({
sku: item.sku,
productName: item.productName,
imageUrl: item.imageUrl || "",
category: item.category || "General",
salePrice: String(item.salePrice || ""),
warehouseCode: item.warehouseCode,
locationZone: item.locationZone || location.zone,
locationAisle: item.locationAisle || location.aisle,
locationRack: String(item.locationRack || location.rack),
locationLevel: String(item.locationLevel || location.level),
locationPosition: String(item.locationPosition || location.position),
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

async function handleTransferProduct(item, transferData) {
if (!canManageInventory) {
showPageError("No tienes permisos para trasladar inventario.");
return;
}

const destinationWarehouse = transferData.warehouseCode.trim();
const destinationZone = transferData.locationZone.trim();
const destinationAisle = transferData.locationAisle.trim();
const destinationRack = Number(transferData.locationRack);
const destinationLevel = Number(transferData.locationLevel);
const destinationPosition = Number(transferData.locationPosition);

if (!destinationWarehouse) {
showPageError("Selecciona una bodega destino.");
return;
}

if (!destinationZone || !destinationAisle) {
showPageError("Ingresa zona y pasillo de destino.");
return;
}

if (
!Number.isInteger(destinationRack) ||
destinationRack <= 0 ||
!Number.isInteger(destinationLevel) ||
destinationLevel <= 0 ||
!Number.isInteger(destinationPosition) ||
destinationPosition <= 0
) {
showPageError("Rack, nivel y posicion deben ser numeros enteros mayores a 0.");
return;
}

try {
setTransferringSku(item.sku);
await editInventoryItem(item.sku, {
productName: item.productName,
imageUrl: item.imageUrl || "",
category: item.category || "General",
salePrice: item.salePrice,
warehouseCode: destinationWarehouse,
locationZone: destinationZone.toUpperCase(),
locationAisle: destinationAisle.toUpperCase(),
locationRack: destinationRack,
locationLevel: destinationLevel,
locationPosition: destinationPosition,
availableQuantity: item.availableQuantity,
reservedQuantity: item.reservedQuantity,
reorderLevel: item.reorderLevel,
});

const data = await getInventoryItemsWithAvailable();
setItems(data);
const updatedItem = data.find((candidate) => candidate.sku === item.sku);
if (updatedItem) {
setDetailItem(updatedItem);
setWarehouseFilter(destinationWarehouse);
setFocusedWarehouseSku(updatedItem.sku);
}
if (canViewAudit) {
await loadAuditLogs();
}
showPageSuccess(`${item.productName} trasladado a ${destinationWarehouse}.`);
} catch (err) {
console.error(err);
showPageError("No se pudo trasladar el producto.");
} finally {
setTransferringSku("");
}
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
Alerta de stock bajo: {criticalItems.length} producto(s) alcanzaron o quedaron bajo su nivel de reposicion.
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

<label className="cursor-pointer rounded-xl border border-dashed border-sky-300/40 bg-sky-500/10 px-4 py-3 text-sm font-black text-sky-100 transition hover:bg-sky-500/15">
<span className="block">
{formData.imageUrl ? "Cambiar imagen desde archivo" : "Subir imagen desde archivo"}
</span>
<span className="mt-1 block text-xs font-semibold text-sky-200/80">
JPG, PNG o WebP hasta 900 KB
</span>
<input
type="file"
accept="image/png,image/jpeg,image/webp"
onChange={handleImageUpload}
className="hidden"
/>
</label>

<select
name="category"
value={formData.category}
onChange={handleChange}
className="bg-slate-950/80 border border-white/10 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-400 outline-none"
>
{categoryOptions.map((category) => (
<option key={category} value={category}>
{category}
</option>
))}
</select>

<input
type="number"
name="salePrice"
value={formData.salePrice}
onChange={handleChange}
placeholder="Precio de venta"
min="1"
step="1"
required
className="bg-slate-950/80 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-400 outline-none"
/>

<select
name="warehouseCode"
value={formData.warehouseCode}
onChange={handleChange}
required
className="bg-slate-950/80 border border-white/10 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-400 outline-none"
>
{warehouseOptions.map((warehouse) => (
<option key={warehouse.code} value={warehouse.code}>
{warehouse.code} - {warehouse.name}
</option>
))}
</select>

<input
type="text"
name="locationZone"
value={formData.locationZone}
onChange={handleChange}
placeholder="Zona"
className="bg-slate-950/80 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-400 outline-none"
/>

<input
type="text"
name="locationAisle"
value={formData.locationAisle}
onChange={handleChange}
placeholder="Pasillo"
className="bg-slate-950/80 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-400 outline-none"
/>

<input
type="number"
name="locationRack"
value={formData.locationRack}
onChange={handleChange}
placeholder="Rack"
min="1"
required
className="bg-slate-950/80 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-400 outline-none"
/>

<input
type="number"
name="locationLevel"
value={formData.locationLevel}
onChange={handleChange}
placeholder="Nivel"
min="1"
required
className="bg-slate-950/80 border border-white/10 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-400 outline-none"
/>

<input
type="number"
name="locationPosition"
value={formData.locationPosition}
onChange={handleChange}
placeholder="Posicion"
min="1"
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

<WarehouseSummaryPanel
selectedWarehouse={warehouseFilter}
summary={warehouseSummary}
onSelectWarehouse={setWarehouseFilter}
/>

<Suspense
fallback={
<section className="mb-8 rounded-2xl border border-white/10 bg-slate-900/80 p-6 text-white">
<p className="text-sm font-black uppercase text-sky-300">Vista 3D de Bodega</p>
<p className="mt-2 text-lg font-black">Cargando mapa 3D...</p>
<div className="mt-5 h-[360px] rounded-2xl bg-slate-950/80" />
</section>
}
>
<Warehouse3DExplorer
items={items}
onOpenDetail={handleOpenDetail}
onSelectWarehouse={setWarehouseFilter}
selectedWarehouse={warehouseFilter}
warehouseOptions={warehouseOptions}
/>
</Suspense>

<WarehouseOperationsBoard
focusedSku={focusedWarehouseSku}
locationResults={locationSearchResults}
locationSearch={warehouseSearch}
onLocationSearchChange={handleWarehouseSearchChange}
onLocateProduct={handleLocateProduct}
selectedWarehouse={warehouseFilter}
warehouses={warehouseSummary}
onOpenDetail={handleOpenDetail}
onOpenLabel={setLabelItem}
onSelectWarehouse={setWarehouseFilter}
/>

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
<div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
<div>
<h2 className="text-2xl font-black">
Listado de inventario
</h2>
<p className="mt-1 text-sm font-semibold text-slate-400">
Mostrando {filteredItems.length} de {items.length} productos.
</p>
</div>
<div className="grid w-full gap-3 md:w-[620px] md:grid-cols-2">
<label>
<span className="mb-2 block text-xs font-black uppercase text-slate-400">Categoria</span>
<select
value={categoryFilter}
onChange={(event) => setCategoryFilter(event.target.value)}
className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 font-bold text-white outline-none focus:ring-2 focus:ring-indigo-400"
>
<option value="">Todas</option>
{categoryOptions.map((category) => (
<option key={category} value={category}>
{category}
</option>
))}
</select>
</label>
<label>
<span className="mb-2 block text-xs font-black uppercase text-slate-400">Bodega</span>
<select
value={warehouseFilter}
onChange={(event) => setWarehouseFilter(event.target.value)}
className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 font-bold text-white outline-none focus:ring-2 focus:ring-indigo-400"
>
<option value="">Todas</option>
{warehouseOptions.map((warehouse) => (
<option key={warehouse.code} value={warehouse.code}>
{warehouse.code} - {warehouse.city}
</option>
))}
</select>
</label>
</div>
</div>

<div className="overflow-x-auto">
<table className="w-full border-collapse">
<thead>
<tr className="bg-slate-900/80 text-slate-300 uppercase text-sm">
<th className="p-4 text-left rounded-l-xl">SKU</th>
<th className="p-4 text-left">Codigo</th>
<th className="p-4 text-left">Imagen</th>
<th className="p-4 text-left">Nombre</th>
<th className="p-4 text-left">Categoria</th>
<th className="p-4 text-left">Precio</th>
<th className="p-4 text-left">Bodega</th>
<th className="p-4 text-left">Ubicacion</th>
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
{filteredItems.length === 0 && (
<tr>
<td colSpan="13" className="p-8 text-center font-bold text-slate-400">
No hay productos para la categoria seleccionada.
</td>
</tr>
)}

{filteredItems.map((item) => {
const location = getProductStorageLocation(item);

return (
<tr
key={item.sku}
className="border-b border-white/10 hover:bg-white/5 transition"
>
<td className="p-4 font-bold">{item.sku}</td>
<td className="p-4">
<SkuQrCode sku={item.sku} compact />
</td>
<td className="p-4">
<ProductThumbnail imageUrl={item.imageUrl} productName={item.productName} />
</td>
<td className="p-4">{item.productName}</td>
<td className="p-4">
<span className="rounded-full bg-sky-500/15 px-3 py-1 text-sm font-bold text-sky-200">
{item.category || "General"}
</span>
</td>
<td className="p-4 font-black text-emerald-300">
{new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(item.salePrice || 0)}
</td>
<td className="p-4">
<span className="rounded-full bg-indigo-500/15 px-3 py-1 text-sm font-bold text-indigo-200">
{item.warehouseCode}
</span>
</td>
<td className="p-4">
<div className="flex flex-col gap-1">
<span className="rounded-full bg-sky-500/15 px-3 py-1 text-sm font-bold text-sky-200">
{location.shortLabel}
</span>
<span className="text-xs font-semibold text-slate-400">{location.label}</span>
</div>
</td>
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

<button
type="button"
onClick={() => setLabelItem(item)}
className="rounded-xl bg-indigo-500 px-4 py-2 text-white font-bold hover:bg-indigo-400 transition"
>
Etiqueta
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
);
})}
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
canManageInventory={canManageInventory}
canViewMovements={canViewMovements}
onTransfer={handleTransferProduct}
transferring={transferringSku === detailItem.sku}
warehouseOptions={warehouseOptions}
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

{labelItem && (
<SkuLabelModal
item={labelItem}
onClose={() => setLabelItem(null)}
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

function WarehouseSummaryPanel({ onSelectWarehouse, selectedWarehouse, summary }) {
return (
<section className="mb-8 rounded-3xl border border-white/10 bg-slate-800/80 p-6">
<div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
<div>
<h2 className="text-2xl font-black">Stock por bodega</h2>
<p className="mt-1 text-sm font-semibold text-slate-400">
Visualiza productos, stock y alertas separados por ubicacion.
</p>
</div>
{selectedWarehouse && (
<button
type="button"
onClick={() => onSelectWarehouse("")}
className="rounded-xl bg-white/10 px-4 py-2 text-sm font-black text-white transition hover:bg-white/20"
>
Ver todas
</button>
)}
</div>

<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
{summary.map((warehouse) => {
const isSelected = selectedWarehouse === warehouse.code;
const hasCritical = warehouse.critical > 0;

return (
<button
key={warehouse.code}
type="button"
onClick={() => onSelectWarehouse(isSelected ? "" : warehouse.code)}
className={`rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 hover:bg-white/10 ${
isSelected
? "border-sky-300 bg-sky-500/15 shadow-lg shadow-sky-950/20"
: "border-white/10 bg-slate-950/35"
}`}
>
<div className="mb-4 flex items-start justify-between gap-3">
<div>
<p className="text-xs font-black uppercase text-slate-500">{warehouse.code}</p>
<h3 className="mt-1 text-lg font-black text-white">{warehouse.name}</h3>
<p className="text-sm font-semibold text-slate-400">{warehouse.city}</p>
</div>
<span className={`rounded-full px-3 py-1 text-xs font-black ${
hasCritical ? "bg-amber-500/20 text-amber-200" : "bg-emerald-500/20 text-emerald-300"
}`}>
{hasCritical ? `${warehouse.critical} criticos` : "OK"}
</span>
</div>

<div className="grid grid-cols-2 gap-3">
<WarehouseMetric label="Productos" value={warehouse.items} />
<WarehouseMetric label="Disponible" value={warehouse.available} tone="success" />
<WarehouseMetric label="Reservado" value={warehouse.reserved} tone="warning" />
<WarehouseMetric label="Stock total" value={warehouse.stock} />
</div>
</button>
);
})}
</div>
</section>
);
}

function WarehouseMetric({ label, tone = "default", value }) {
const toneClass =
tone === "success"
? "text-emerald-300"
: tone === "warning"
? "text-amber-200"
: "text-white";

return (
<div className="rounded-xl bg-white/5 p-3">
<p className="text-xs font-black uppercase text-slate-500">{label}</p>
<p className={`mt-1 text-2xl font-black ${toneClass}`}>{value}</p>
</div>
);
}

function WarehouseOperationsBoard({
focusedSku,
locationResults,
locationSearch,
onLocationSearchChange,
onLocateProduct,
onOpenDetail,
onOpenLabel,
onSelectWarehouse,
selectedWarehouse,
warehouses,
}) {
const cleanLocationSearch = locationSearch.trim();
const visibleWarehouses = selectedWarehouse
? warehouses.filter((warehouse) => warehouse.code === selectedWarehouse)
: cleanLocationSearch
? warehouses.filter((warehouse) =>
warehouse.products.some((item) => productMatchesSearch(item, cleanLocationSearch))
)
: warehouses;
const maxAvailable = Math.max(...warehouses.map((warehouse) => warehouse.available), 1);
const activeWarehouses = warehouses.filter((warehouse) => warehouse.items > 0).length;
const totalCritical = warehouses.reduce((total, warehouse) => total + warehouse.critical, 0);

return (
<section className="mb-8 rounded-3xl border border-white/10 bg-slate-800/80 p-6">
<div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
<div>
<p className="text-sm font-black uppercase text-sky-300">Bodegas multiples visuales</p>
<h2 className="mt-1 text-2xl font-black">Mapa visual de bodegas</h2>
<p className="mt-1 max-w-3xl text-sm font-semibold text-slate-400">
Cada bodega muestra sus productos asignados, disponibilidad, reservas, categorias y alertas de reposicion.
</p>
</div>
<div className="grid gap-3 sm:grid-cols-3">
<WarehouseBoardMetric label="Bodegas activas" value={activeWarehouses} />
<WarehouseBoardMetric label="Productos criticos" value={totalCritical} tone={totalCritical ? "warning" : "success"} />
<WarehouseBoardMetric label="Vista actual" value={selectedWarehouse || "Todas"} />
</div>
</div>

<div className="mb-5 rounded-2xl border border-sky-300/15 bg-slate-950/40 p-4">
<div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
<label className="block flex-1">
<span className="mb-2 block text-xs font-black uppercase text-sky-300">
Localizador de producto
</span>
<input
value={locationSearch}
onChange={(event) => onLocationSearchChange(event.target.value)}
placeholder="Buscar por nombre, SKU, bodega o ubicacion..."
className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 font-bold text-white outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-sky-400"
/>
</label>
<div className="grid grid-cols-2 gap-2 text-center sm:min-w-[260px]">
<div className="rounded-xl bg-white/5 p-3">
<p className="text-[10px] font-black uppercase text-slate-500">Coincidencias</p>
<p className="mt-1 text-xl font-black text-white">
{cleanLocationSearch ? locationResults.length : "-"}
</p>
</div>
<div className="rounded-xl bg-white/5 p-3">
<p className="text-[10px] font-black uppercase text-slate-500">Bodega foco</p>
<p className="mt-1 text-sm font-black text-emerald-300">
{selectedWarehouse || "Todas"}
</p>
</div>
</div>
</div>

{cleanLocationSearch && (
<div className="mt-4">
{locationResults.length === 0 ? (
<div className="rounded-xl border border-dashed border-white/15 bg-slate-900/60 p-4 text-center text-sm font-bold text-slate-400">
No se encontraron productos con ese nombre, SKU o ubicacion.
</div>
) : (
<div className="grid gap-3 xl:grid-cols-2">
{locationResults.map((item) => (
<LocationResultCard
key={`location-${item.sku}`}
item={item}
isFocused={focusedSku === item.sku}
onLocateProduct={onLocateProduct}
/>
))}
</div>
)}
</div>
)}
</div>

<div className="grid gap-4 xl:grid-cols-2">
{visibleWarehouses.map((warehouse) => (
<WarehouseLane
focusedSku={focusedSku}
key={warehouse.code}
locationSearch={cleanLocationSearch}
maxAvailable={maxAvailable}
onOpenDetail={onOpenDetail}
onOpenLabel={onOpenLabel}
onSelectWarehouse={onSelectWarehouse}
selectedWarehouse={selectedWarehouse}
warehouse={warehouse}
/>
))}
</div>
</section>
);
}

function LocationResultCard({ isFocused, item, onLocateProduct }) {
const location = getProductStorageLocation(item);
const available = getAvailableUnits(item);

return (
<article className={`rounded-2xl border p-4 transition ${
isFocused
? "border-sky-300/60 bg-sky-500/10 shadow-lg shadow-sky-950/30"
: "border-white/10 bg-slate-900/70 hover:bg-slate-900"
}`}>
<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
<div className="flex min-w-0 items-center gap-4">
<ProductThumbnail imageUrl={item.imageUrl} productName={item.productName} />
<div className="min-w-0">
<p className="truncate font-black text-white">{item.productName}</p>
<p className="mt-1 text-xs font-bold text-slate-400">
{item.sku} | {item.category || "General"}
</p>
<p className="mt-2 text-xs font-black uppercase text-sky-200">
{location.warehouse.name}
</p>
</div>
</div>

<button
type="button"
onClick={() => onLocateProduct(item)}
className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-black text-white transition hover:bg-sky-400"
>
Ubicar
</button>
</div>

<div className="mt-4 grid gap-3 md:grid-cols-[1.3fr_0.7fr]">
<div className="rounded-xl bg-white/5 p-3">
<p className="text-[10px] font-black uppercase text-slate-500">Ubicacion exacta</p>
<p className="mt-1 text-sm font-black text-white">{location.label}</p>
<p className="mt-1 text-xs font-bold text-slate-400">
{location.slotLabel} | Codigo {location.code}
</p>
</div>
<div className="rounded-xl bg-white/5 p-3 text-center">
<p className="text-[10px] font-black uppercase text-slate-500">Disponible</p>
<p className={`mt-1 text-xl font-black ${available > 0 ? "text-emerald-300" : "text-amber-200"}`}>
{available}
</p>
</div>
</div>
</article>
);
}

function WarehouseBoardMetric({ label, tone = "default", value }) {
const toneClass =
tone === "success"
? "text-emerald-300"
: tone === "warning"
? "text-amber-200"
: "text-white";

return (
<div className="min-w-[150px] rounded-2xl border border-white/10 bg-slate-950/45 p-4">
<p className="text-xs font-black uppercase text-slate-500">{label}</p>
<p className={`mt-1 text-xl font-black ${toneClass}`}>{value}</p>
</div>
);
}

function WarehouseLane({
focusedSku,
locationSearch,
maxAvailable,
onOpenDetail,
onOpenLabel,
onSelectWarehouse,
selectedWarehouse,
warehouse,
}) {
const hasCritical = warehouse.critical > 0;
const fillPercent = Math.min(100, Math.round((warehouse.available / maxAvailable) * 100));
const visibleProducts = locationSearch
? warehouse.products.filter((item) => productMatchesSearch(item, locationSearch))
: warehouse.products;

return (
<article className="rounded-2xl border border-white/10 bg-slate-950/35 p-5">
<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
<div>
<div className="flex flex-wrap items-center gap-2">
<span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-black text-indigo-200">
{warehouse.code}
</span>
<span className={`rounded-full px-3 py-1 text-xs font-black ${
hasCritical ? "bg-amber-500/20 text-amber-200" : "bg-emerald-500/20 text-emerald-300"
}`}>
{hasCritical ? `${warehouse.critical} criticos` : "Sin alertas"}
</span>
</div>
<h3 className="mt-3 text-xl font-black text-white">{warehouse.name}</h3>
<p className="text-sm font-semibold text-slate-400">{warehouse.city}</p>
</div>

<button
type="button"
onClick={() => onSelectWarehouse(selectedWarehouse === warehouse.code ? "" : warehouse.code)}
className="rounded-xl bg-white/10 px-4 py-2 text-sm font-black text-white transition hover:bg-white/20"
>
{selectedWarehouse === warehouse.code ? "Ver todas" : "Filtrar bodega"}
</button>
</div>

<div className="mt-5 grid gap-3 sm:grid-cols-4">
<WarehouseMetric label="Productos" value={warehouse.items} />
<WarehouseMetric label="Disponible" value={warehouse.available} tone="success" />
<WarehouseMetric label="Reservado" value={warehouse.reserved} tone="warning" />
<WarehouseMetric label="Stock total" value={warehouse.stock} />
</div>

<div className="mt-5">
<div className="mb-2 flex items-center justify-between text-xs font-black uppercase text-slate-500">
<span>Capacidad visual por stock disponible</span>
<span>{warehouse.available} unidades</span>
</div>
<div className="h-3 overflow-hidden rounded-full bg-slate-900">
<div
className={`h-full rounded-full ${hasCritical ? "bg-amber-300" : "bg-emerald-300"}`}
style={{ width: `${fillPercent}%` }}
/>
</div>
</div>

<div className="mt-5 flex flex-wrap gap-2">
{warehouse.categories.length > 0 ? (
warehouse.categories.map((category) => (
<span
key={`${warehouse.code}-${category.name}`}
className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-slate-300"
>
{category.name}: {category.count}
</span>
))
) : (
<span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-slate-500">
Sin categorias
</span>
)}
</div>

<div className="mt-5 space-y-3">
{visibleProducts.length === 0 && (
<div className="rounded-2xl border border-dashed border-white/15 bg-slate-900/50 p-5 text-center text-sm font-bold text-slate-400">
{locationSearch ? "Sin coincidencias en esta bodega." : "Sin productos asignados a esta bodega."}
</div>
)}

{visibleProducts.slice(0, 6).map((item) => (
<WarehouseProductRow
isFocused={focusedSku === item.sku}
key={`${warehouse.code}-${item.sku}`}
item={item}
onOpenDetail={onOpenDetail}
onOpenLabel={onOpenLabel}
/>
))}

{visibleProducts.length > 6 && (
<button
type="button"
onClick={() => onSelectWarehouse(warehouse.code)}
className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-slate-200 transition hover:bg-white/10"
>
Ver {visibleProducts.length - 6} producto(s) mas en esta bodega
</button>
)}
</div>
</article>
);
}

function WarehouseProductRow({ isFocused, item, onOpenDetail, onOpenLabel }) {
const location = getProductStorageLocation(item);

return (
<div className={`rounded-2xl border p-4 ${
isFocused
? "border-sky-300/70 bg-sky-500/10 shadow-lg shadow-sky-950/30"
:
item.isCriticalVisual
? "border-amber-300/25 bg-amber-500/10"
: "border-white/10 bg-slate-900/70"
}`}>
<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
<div className="flex min-w-0 items-center gap-4">
<ProductThumbnail imageUrl={item.imageUrl} productName={item.productName} />
<div className="min-w-0">
<p className="truncate font-black text-white">{item.productName}</p>
<p className="mt-1 text-xs font-bold text-slate-400">
{item.sku} | {item.category || "General"}
</p>
<p className="mt-2 text-xs font-black uppercase text-sky-200">
{location.label}
</p>
</div>
</div>

<div className="grid grid-cols-4 gap-2 text-center text-xs lg:min-w-[340px]">
<WarehouseMiniStock label="Stock" value={item.availableQuantity} />
<WarehouseMiniStock label="Reservado" value={item.reservedQuantity} tone="warning" />
<WarehouseMiniStock label="Disponible" value={item.availableVisual} tone={item.isCriticalVisual ? "warning" : "success"} />
<WarehouseMiniStock label="Slot" value={location.shortLabel} tone="success" />
</div>
</div>

<div className="mt-3 flex flex-wrap items-center justify-between gap-3">
<div className="flex flex-wrap items-center gap-2">
<StockBadge item={item} />
<span className="rounded-full bg-sky-500/15 px-3 py-1 text-xs font-black text-sky-200">
{location.slotLabel}
</span>
</div>
<div className="flex flex-wrap gap-2">
<button
type="button"
onClick={() => onOpenDetail(item)}
className="rounded-xl bg-white/10 px-3 py-2 text-xs font-black text-white transition hover:bg-white/20"
>
Detalle
</button>
<button
type="button"
onClick={() => onOpenLabel(item)}
className="rounded-xl bg-indigo-500 px-3 py-2 text-xs font-black text-white transition hover:bg-indigo-400"
>
QR
</button>
</div>
</div>
</div>
);
}

function WarehouseMiniStock({ label, tone = "default", value }) {
const toneClass =
tone === "success"
? "text-emerald-300"
: tone === "warning"
? "text-amber-200"
: "text-white";

return (
<div className="rounded-xl bg-white/5 p-2">
<p className="text-[10px] font-black uppercase text-slate-500">{label}</p>
<p className={`mt-1 text-sm font-black ${toneClass}`}>{value}</p>
</div>
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

function SkuVisualCode({ compact = false, sku }) {
const cells = useMemo(() => getSkuCodeCells(sku), [sku]);
const sizeClass = compact ? "h-14 w-14" : "h-44 w-44";

return (
<div
className={`${sizeClass} grid rounded-xl border border-white/10 bg-white p-1 shadow-lg`}
style={{
gridTemplateColumns: `repeat(${SKU_CODE_GRID_SIZE}, minmax(0, 1fr))`,
gridTemplateRows: `repeat(${SKU_CODE_GRID_SIZE}, minmax(0, 1fr))`,
}}
title={`Codigo visual SKU ${sku}`}
>
{cells.map((active, index) => (
<span
key={`${sku}-${index}`}
className={active ? "rounded-[2px] bg-slate-950" : "rounded-[2px] bg-white"}
/>
))}
</div>
);
}

function SkuQrCode({ compact = false, sku }) {
const [qrDataUrl, setQrDataUrl] = useState("");
const [failed, setFailed] = useState(false);
const sizeClass = compact ? "h-14 w-14" : "h-44 w-44";

useEffect(() => {
let active = true;
setQrDataUrl("");
setFailed(false);

import("qrcode")
.then((module) =>
module.default.toDataURL(String(sku || "SKU"), {
errorCorrectionLevel: "M",
margin: compact ? 1 : 2,
width: compact ? 88 : 260,
})
)
.then((dataUrl) => {
if (active) setQrDataUrl(dataUrl);
})
.catch((error) => {
console.error("No se pudo generar el QR:", error);
if (active) setFailed(true);
});

return () => {
active = false;
};
}, [compact, sku]);

if (failed) {
return <SkuVisualCode compact={compact} sku={sku} />;
}

if (!qrDataUrl) {
return (
<div className={`${sizeClass} flex items-center justify-center rounded-xl border border-white/10 bg-white text-xs font-black text-slate-500 shadow-lg`}>
QR
</div>
);
}

return (
<img
src={qrDataUrl}
alt={`QR SKU ${sku}`}
className={`${sizeClass} rounded-xl border border-white/10 bg-white p-1 shadow-lg`}
loading="lazy"
/>
);
}

function SkuLabelModal({ item, onClose }) {
const available = item.availableQuantity - item.reservedQuantity;
const location = getProductStorageLocation(item);

return (
<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
<section className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 text-white shadow-2xl">
<div className="mb-5 flex items-start justify-between gap-4">
<div>
<p className="text-sm font-black uppercase text-sky-300">Etiqueta de producto</p>
<h2 className="mt-1 text-2xl font-black">{item.productName}</h2>
<p className="mt-1 text-sm font-semibold text-slate-400">{item.sku}</p>
</div>
<button
type="button"
onClick={onClose}
className="rounded-xl bg-white/10 px-4 py-2 text-sm font-black text-white transition hover:bg-white/20"
>
Cerrar
</button>
</div>

<div className="flex flex-col items-center rounded-2xl border border-white/10 bg-white p-5 text-slate-950">
<SkuQrCode sku={item.sku} />
<p className="mt-4 text-center text-2xl font-black">{item.sku}</p>
<p className="mt-1 text-center text-sm font-bold text-slate-600">{item.productName}</p>
</div>

<div className="mt-5 grid grid-cols-2 gap-3 text-sm">
<DetailMetric label="Bodega" value={item.warehouseCode} />
<DetailMetric label="Ubicacion" value={location.shortLabel} />
<DetailMetric label="Categoria" value={item.category || "General"} />
<DetailMetric label="Precio venta" value={new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(item.salePrice || 0)} />
<DetailMetric label="Disponible" value={available} tone={available <= item.reorderLevel ? "warning" : "success"} />
<DetailMetric label="Reposicion" value={item.reorderLevel} />
</div>

<button
type="button"
onClick={() => window.print()}
className="mt-5 w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white transition hover:bg-indigo-500"
>
Imprimir etiqueta
</button>
</section>
</div>
);
}

function ProductDetailModal({
canManageInventory,
canViewMovements,
item,
movements,
loading,
error,
onClose,
onTransfer,
transferring,
warehouseOptions,
}) {
const available = item.availableQuantity - item.reservedQuantity;
const isLowStock = available <= item.reorderLevel;
const location = getProductStorageLocation(item);

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

<div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/45 p-4">
<p className="mb-3 text-sm font-black text-slate-300">Etiqueta SKU</p>
<div className="flex flex-col items-center rounded-2xl bg-white p-4 text-slate-950">
<SkuQrCode sku={item.sku} />
<p className="mt-3 text-lg font-black">{item.sku}</p>
</div>
</div>
</div>

<div className="space-y-6">
<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
<DetailMetric label="SKU" value={item.sku} />
<DetailMetric label="Categoria" value={item.category || "General"} />
<DetailMetric label="Bodega" value={item.warehouseCode} />
<DetailMetric label="Ubicacion" value={location.shortLabel} />
<DetailMetric label="Detalle ubicacion" value={location.label} />
<DetailMetric label="Stock total" value={item.availableQuantity} />
<DetailMetric label="Precio venta" value={new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(item.salePrice || 0)} />
<DetailMetric label="Reservado" value={item.reservedQuantity} />
<DetailMetric label="Disponible" value={available} tone={isLowStock ? "warning" : "success"} />
<DetailMetric label="Nivel reposicion" value={item.reorderLevel} />
</div>

{canManageInventory && (
<TransferProductPanel
item={item}
location={location}
onTransfer={onTransfer}
transferring={transferring}
warehouseOptions={warehouseOptions}
/>
)}

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

function TransferProductPanel({ item, location, onTransfer, transferring, warehouseOptions }) {
const defaultWarehouseCode = warehouseOptions[0]?.code || "";
const [transferData, setTransferData] = useState(() => ({
warehouseCode: item.warehouseCode || warehouseOptions[0]?.code || "",
locationZone: item.locationZone || location.zone,
locationAisle: item.locationAisle || location.aisle,
locationRack: String(item.locationRack || location.rack),
locationLevel: String(item.locationLevel || location.level),
locationPosition: String(item.locationPosition || location.position),
}));

useEffect(() => {
setTransferData({
warehouseCode: item.warehouseCode || warehouseOptions[0]?.code || "",
locationZone: item.locationZone || location.zone,
locationAisle: item.locationAisle || location.aisle,
locationRack: String(item.locationRack || location.rack),
locationLevel: String(item.locationLevel || location.level),
locationPosition: String(item.locationPosition || location.position),
});
}, [
defaultWarehouseCode,
item.locationAisle,
item.locationLevel,
item.locationPosition,
item.locationRack,
item.locationZone,
item.sku,
item.warehouseCode,
location.aisle,
location.level,
location.position,
location.rack,
location.zone,
]);

function handleChange(event) {
const { name, value } = event.target;
setTransferData((current) => ({
...current,
[name]: value,
}));
}

function handleSubmit(event) {
event.preventDefault();
onTransfer(item, transferData);
}

const selectedWarehouse = warehouseOptions.find(
(warehouse) => warehouse.code === transferData.warehouseCode
);

return (
<form
onSubmit={handleSubmit}
className="rounded-2xl border border-sky-300/20 bg-sky-500/10 p-5"
>
<div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
<div>
<h3 className="text-xl font-black">Traslado entre bodegas</h3>
<p className="mt-1 text-sm font-semibold text-slate-400">
Actualiza la bodega y posicion fisica sin modificar stock ni reservas.
</p>
</div>
<span className="rounded-full bg-slate-950/70 px-3 py-1 text-xs font-black text-sky-200">
{selectedWarehouse?.city || "Destino"}
</span>
</div>

<div className="grid gap-3 md:grid-cols-3">
<select
name="warehouseCode"
value={transferData.warehouseCode}
onChange={handleChange}
className="rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm font-black text-white outline-none focus:ring-2 focus:ring-sky-400 md:col-span-3"
>
{warehouseOptions.map((warehouse) => (
<option key={warehouse.code} value={warehouse.code}>
{warehouse.code} - {warehouse.name}
</option>
))}
</select>

<TransferInput label="Zona" name="locationZone" value={transferData.locationZone} onChange={handleChange} />
<TransferInput label="Pasillo" name="locationAisle" value={transferData.locationAisle} onChange={handleChange} />
<TransferInput label="Rack" name="locationRack" value={transferData.locationRack} onChange={handleChange} type="number" />
<TransferInput label="Nivel" name="locationLevel" value={transferData.locationLevel} onChange={handleChange} type="number" />
<TransferInput label="Posicion" name="locationPosition" value={transferData.locationPosition} onChange={handleChange} type="number" />

<button
type="submit"
disabled={transferring}
className="rounded-xl bg-sky-500 px-4 py-3 text-sm font-black text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
>
{transferring ? "Trasladando..." : "Trasladar producto"}
</button>
</div>
</form>
);
}

function TransferInput({ label, name, onChange, type = "text", value }) {
return (
<label className="block">
<span className="mb-1 block text-xs font-black uppercase text-slate-500">{label}</span>
<input
type={type}
name={name}
value={value}
onChange={onChange}
min={type === "number" ? "1" : undefined}
className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm font-black text-white outline-none focus:ring-2 focus:ring-sky-400"
/>
</label>
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
