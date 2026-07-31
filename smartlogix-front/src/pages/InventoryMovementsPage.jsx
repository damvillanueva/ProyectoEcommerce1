import { useEffect, useMemo, useState } from "react";
import {
  FiArchive,
  FiArrowDown,
  FiArrowUp,
  FiBox,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiClipboard,
  FiDownload,
  FiFileText,
  FiHash,
  FiList,
  FiPackage,
  FiPlus,
  FiRefreshCw,
  FiRepeat,
  FiSave,
  FiSearch,
  FiTrendingDown,
  FiTrendingUp,
  FiUser,
  FiX,
} from "react-icons/fi";
import Navbar from "../components/Navbar";
import PageContainer from "../layout/PageContainer";
import ToastStack from "../components/ToastStack";
import {
  exportInventoryMovementsCsv,
  fetchLatestInventoryHistory,
  fetchInventoryMovements,
  getInventoryItemsWithAvailable,
  registerManualInventoryMovement,
  saveInventoryHistory,
} from "../services/inventoryService";
import { useToasts } from "../hooks/useToasts";
import { useSearchParams } from "react-router-dom";

const PAGE_SIZE = 7;
const EXPORT_PAGE_SIZE = 200;
const SAVED_AT_KEY = "smartlogix.inventoryHistorySavedAt";

const SORT_OPTIONS = [
  { value: "createdAt,desc", label: "Fecha mas reciente" },
  { value: "createdAt,asc", label: "Fecha mas antigua" },
  { value: "quantity,desc", label: "Cantidad mayor" },
  { value: "quantity,asc", label: "Cantidad menor" },
  { value: "username,asc", label: "Usuario A-Z" },
  { value: "movementType,asc", label: "Tipo A-Z" },
];

const DEFAULT_SORT_BY_FIELD = {
  createdAt: "desc",
  quantity: "desc",
  previousStock: "desc",
  newStock: "desc",
  productName: "asc",
  sku: "asc",
  movementType: "asc",
  username: "asc",
};

const MANUAL_REASON_OPTIONS = {
  ENTRY: ["Compra proveedor", "Carga inicial", "Devolucion cliente"],
  EXIT: ["Orden de venta", "Dano/perdida", "Traslado de bodega"],
  ADJUSTMENT: ["Correccion inventario", "Conteo fisico", "Ajuste por diferencia"],
};

const EMPTY_FILTERS = {
  product: "",
  type: "",
  user: "",
  startDate: "",
  endDate: "",
  minQuantity: "",
  maxQuantity: "",
};

const EMPTY_MANUAL_FORM = {
  sku: "",
  warehouseCode: "",
  movementType: "ENTRY",
  quantity: "1",
  reason: "",
};

function getFiltersFromSearch(searchParams) {
  return {
    ...EMPTY_FILTERS,
    product: searchParams.get("product") || "",
  };
}

const MOVEMENT_META = {
  ENTRY: {
    label: "ENTRADA",
    shortLabel: "Entrada",
    icon: FiArrowUp,
    badge: "border-emerald-300/40 bg-emerald-400/15 text-emerald-200",
    text: "text-emerald-300",
    chart: "#65e572",
  },
  EXIT: {
    label: "SALIDA",
    shortLabel: "Salida",
    icon: FiArrowDown,
    badge: "border-rose-300/40 bg-rose-400/15 text-rose-200",
    text: "text-rose-300",
    chart: "#ff7b7b",
  },
  ADJUSTMENT: {
    label: "AJUSTE",
    shortLabel: "Ajuste",
    icon: FiRepeat,
    badge: "border-amber-300/40 bg-amber-400/15 text-amber-100",
    text: "text-amber-200",
    chart: "#ffd447",
  },
};

const ACTION_LABELS = {
  CREATE_PRODUCT: "Producto creado",
  UPDATE_STOCK: "Stock actualizado",
  ORDER_CREATED: "Reserva por pedido",
  ORDER_CANCELLED: "Reserva liberada",
  DELETE_PRODUCT: "Producto eliminado",
  MANUAL_ENTRY: "Entrada manual",
  MANUAL_EXIT: "Salida manual",
  MANUAL_ADJUSTMENT: "Ajuste manual",
  TRANSFER_OUT: "Traslado de salida",
  TRANSFER_IN: "Traslado de entrada",
};

function getMovementMeta(type) {
  return MOVEMENT_META[type] || MOVEMENT_META.ADJUSTMENT;
}

function getActionLabel(action) {
  return ACTION_LABELS[action] || action || "Movimiento";
}

function getSortParts(sortOption) {
  const [field = "createdAt", direction = "desc"] = String(sortOption || "").split(",");
  return { field, direction };
}

function getNextSortOption(sortOption, field) {
  const current = getSortParts(sortOption);
  if (current.field === field) {
    return `${field},${current.direction === "asc" ? "desc" : "asc"}`;
  }

  return `${field},${DEFAULT_SORT_BY_FIELD[field] || "asc"}`;
}

function getSortLabel(sortOption) {
  return SORT_OPTIONS.find((option) => option.value === sortOption)?.label || sortOption;
}

function getApiFilters(filters) {
  return filters;
}

function getTodayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeFilePart(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getFilterFileSuffix(filters) {
  const parts = [];

  if (filters.product) parts.push(`producto-${normalizeFilePart(filters.product)}`);
  if (filters.type) parts.push(`tipo-${normalizeFilePart(filters.type)}`);
  if (filters.user) parts.push(`usuario-${normalizeFilePart(filters.user)}`);
  if (filters.startDate) parts.push(`desde-${filters.startDate}`);
  if (filters.endDate) parts.push(`hasta-${filters.endDate}`);
  if (filters.minQuantity) parts.push(`min-${filters.minQuantity}`);
  if (filters.maxQuantity) parts.push(`max-${filters.maxQuantity}`);

  return parts.length > 0 ? `-${parts.join("-")}` : "";
}

function buildExportFilename(filters, extension) {
  return `historial-inventario-${getTodayStamp()}${getFilterFileSuffix(filters)}.${extension}`;
}

function getFilterSummary(filters) {
  const summary = [];

  if (filters.product) summary.push(`Producto/SKU: ${filters.product}`);
  if (filters.type) summary.push(`Tipo: ${getMovementMeta(filters.type).shortLabel}`);
  if (filters.user) summary.push(`Usuario: ${filters.user}`);
  if (filters.startDate) summary.push(`Desde: ${filters.startDate}`);
  if (filters.endDate) summary.push(`Hasta: ${filters.endDate}`);
  if (filters.minQuantity) summary.push(`Cantidad minima: ${filters.minQuantity}`);
  if (filters.maxQuantity) summary.push(`Cantidad maxima: ${filters.maxQuantity}`);

  return summary.length > 0 ? summary.join(" | ") : "Sin filtros aplicados";
}

function formatDate(value) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "medium",
    hour12: false,
  }).format(new Date(value));
}

function formatSavedDate(value) {
  if (!value) return "--";
  return formatDate(value);
}

function getQuantityDelta(movement) {
  if (!movement) return 0;

  if (movement.movementType === "ENTRY") return Number(movement.quantity || 0);
  if (movement.movementType === "EXIT") return -Number(movement.quantity || 0);

  return Number(movement.newStock || 0) - Number(movement.previousStock || 0);
}

function getQuantityLabel(movement) {
  const delta = getQuantityDelta(movement);
  if (delta > 0) return `+${delta}`;
  return `${delta}`;
}

function getInitialSavedAt() {
  try {
    return localStorage.getItem(SAVED_AT_KEY) || "";
  } catch {
    return "";
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function excelCell(value) {
  return `<td>${escapeHtml(value)}</td>`;
}

function buildExcelHtml(exportMovements, filters) {
  const rows = exportMovements
    .map((movement) => {
      const meta = getMovementMeta(movement.movementType);

      return `<tr>
        ${excelCell(formatDate(movement.createdAt))}
        ${excelCell(movement.productName || "Producto")}
        ${excelCell(movement.sku || "-")}
        ${excelCell(movement.warehouseCode || "-")}
        ${excelCell(movement.transferReference || "-")}
        ${excelCell(meta.shortLabel)}
        ${excelCell(getActionLabel(movement.actionType))}
        ${excelCell(getQuantityLabel(movement))}
        ${excelCell(movement.previousStock ?? "-")}
        ${excelCell(movement.newStock ?? "-")}
        ${excelCell(movement.username || "system")}
        ${excelCell(movement.reason || getActionLabel(movement.actionType))}
      </tr>`;
    })
    .join("");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; }
      th { background: #1f2937; color: #ffffff; font-weight: 700; }
      th, td { border: 1px solid #cbd5e1; padding: 8px; }
      .title { font-size: 18px; font-weight: 700; margin-bottom: 8px; }
      .meta { color: #475569; margin-bottom: 14px; }
    </style>
  </head>
  <body>
    <div class="title">Historial de movimientos de inventario</div>
    <div class="meta">Generado: ${escapeHtml(formatDate(new Date().toISOString()))}</div>
    <div class="meta">Filtros: ${escapeHtml(getFilterSummary(filters))}</div>
    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Producto</th>
          <th>SKU</th>
          <th>Bodega</th>
          <th>Referencia</th>
          <th>Tipo</th>
          <th>Accion</th>
          <th>Cantidad</th>
          <th>Stock anterior</th>
          <th>Stock nuevo</th>
          <th>Usuario</th>
          <th>Motivo</th>
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="12">No hay movimientos para exportar.</td></tr>`}
      </tbody>
    </table>
  </body>
</html>`;
}

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function InventoryMovementsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchFilterKey = searchParams.toString();
  const [filters, setFilters] = useState(() => getFiltersFromSearch(searchParams));
  const [movements, setMovements] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [pagination, setPagination] = useState({
    page: 0,
    totalPages: 0,
    totalElements: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingHistory, setSavingHistory] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [, setError] = useState("");
  const [selectedMovement, setSelectedMovement] = useState(null);
  const [manualForm, setManualForm] = useState(EMPTY_MANUAL_FORM);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(getInitialSavedAt);
  const [lastSavedReport, setLastSavedReport] = useState(null);
  const [sortOption, setSortOption] = useState("createdAt,desc");
  const [viewMode, setViewMode] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
      ? "timeline"
      : "table"
  );
  const { dismissToast, showToast, toasts } = useToasts();

  const stats = useMemo(() => {
    return movements.reduce(
      (summary, movement) => {
        const delta = getQuantityDelta(movement);
        const amount = Math.abs(delta);

        if (movement.movementType === "ENTRY") {
          summary.entries += 1;
          summary.entryUnits += amount;
        } else if (movement.movementType === "EXIT") {
          summary.exits += 1;
          summary.exitUnits += amount;
        } else {
          summary.adjustments += 1;
          summary.adjustmentUnits += delta;
        }

        summary.visible += 1;
        return summary;
      },
      {
        entries: 0,
        exits: 0,
        adjustments: 0,
        entryUnits: 0,
        exitUnits: 0,
        adjustmentUnits: 0,
        visible: 0,
      }
    );
  }, [movements]);

  const userOptions = useMemo(() => {
    const uniqueUsers = new Set(["admin", "bodega", "system"]);
    movements.forEach((movement) => {
      if (movement.username) uniqueUsers.add(movement.username);
    });
    return Array.from(uniqueUsers);
  }, [movements]);

  const productImageBySku = useMemo(() => {
    return inventoryItems.reduce((images, item) => {
      images[item.sku] = item.imageUrl || "";
      return images;
    }, {});
  }, [inventoryItems]);

  const pageButtons = useMemo(() => {
    if (pagination.totalPages <= 1) return [];

    const pages = new Set([0, pagination.totalPages - 1, pagination.page]);
    if (pagination.page > 0) pages.add(pagination.page - 1);
    if (pagination.page + 1 < pagination.totalPages) pages.add(pagination.page + 1);

    return Array.from(pages).sort((left, right) => left - right);
  }, [pagination.page, pagination.totalPages]);

  const chartStyle = useMemo(() => {
    const total = stats.entries + stats.exits + stats.adjustments;
    if (total === 0) {
      return {
        background: "conic-gradient(#475569 0deg 360deg)",
      };
    }

    const entryEnd = (stats.entries / total) * 360;
    const exitEnd = entryEnd + (stats.exits / total) * 360;

    return {
      background: `conic-gradient(${MOVEMENT_META.ENTRY.chart} 0deg ${entryEnd}deg, ${MOVEMENT_META.EXIT.chart} ${entryEnd}deg ${exitEnd}deg, ${MOVEMENT_META.ADJUSTMENT.chart} ${exitEnd}deg 360deg)`,
    };
  }, [stats.adjustments, stats.entries, stats.exits]);

  const movementRangeStart =
    pagination.totalElements === 0 ? 0 : pagination.page * PAGE_SIZE + 1;
  const movementRangeEnd = Math.min(
    pagination.page * PAGE_SIZE + movements.length,
    pagination.totalElements
  );

  const manualQuantityLabel =
    manualForm.movementType === "ADJUSTMENT" ? "Stock final" : "Cantidad";

  useEffect(() => {
    loadInventoryItems();
    loadLatestHistoryReport();
  }, []);

  useEffect(() => {
    const urlFilters = getFiltersFromSearch(searchParams);
    setFilters(urlFilters);
    loadMovements(0, urlFilters, sortOption);
  }, [searchFilterKey]);

  useEffect(() => {
    if (movements.length === 0) {
      setSelectedMovement(null);
      return;
    }

    const selectedStillVisible = movements.some(
      (movement) => movement.id === selectedMovement?.id
    );

    if (!selectedStillVisible) {
      setSelectedMovement(movements[0]);
    }
  }, [movements, selectedMovement]);

  async function loadInventoryItems() {
    try {
      const data = await getInventoryItemsWithAvailable();
      setInventoryItems(data);
      setManualForm((previousForm) => ({
        ...previousForm,
        sku: previousForm.sku || data[0]?.sku || "",
        warehouseCode:
          previousForm.warehouseCode
          || data[0]?.stocks?.[0]?.warehouseCode
          || data[0]?.warehouseCode
          || "",
      }));
    } catch (loadError) {
      console.error(loadError);
      setError("No se pudo cargar el inventario para registrar movimientos.");
      showToast("No se pudo cargar el inventario para registrar movimientos.", "error");
    }
  }

  async function loadMovements(page = pagination.page, activeFilters = filters, activeSort = sortOption) {
    try {
      setLoading(true);
      const data = await fetchInventoryMovements({
        ...getApiFilters(activeFilters),
        page,
        size: PAGE_SIZE,
        sort: activeSort,
      });

      const content = Array.isArray(data.content) ? data.content : data;
      setMovements(content);
      setPagination({
        page: typeof data.number === "number" ? data.number : page,
        totalPages: data.totalPages || 0,
        totalElements: data.totalElements || content.length,
      });
      setError("");
    } catch (loadError) {
      console.error(loadError);
      setError("No se pudo cargar el historial de movimientos.");
      showToast("No se pudo cargar el historial de movimientos.", "error");
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(event) {
    const { name, value } = event.target;
    setFilters((previousFilters) => ({
      ...previousFilters,
      [name]: value,
    }));
  }

  function handleManualChange(event) {
    const { name, value } = event.target;
    setManualForm((previousForm) => {
      if (name === "sku") {
        const product = inventoryItems.find((item) => item.sku === value);
        return {
          ...previousForm,
          sku: value,
          warehouseCode: product?.stocks?.[0]?.warehouseCode || product?.warehouseCode || "",
        };
      }

      return { ...previousForm, [name]: value };
    });
  }

  async function handleFilterSubmit(event) {
    event.preventDefault();
    await loadMovements(0, filters, sortOption);
  }

  async function handleClearFilters() {
    setSearchParams({});
    setFilters(EMPTY_FILTERS);
    await loadMovements(0, EMPTY_FILTERS, sortOption);
  }

  async function handleSortChange(event) {
    const nextSort = event.target.value;
    setSortOption(nextSort);
    await loadMovements(0, filters, nextSort);
  }

  async function handleSortColumn(field) {
    const nextSort = getNextSortOption(sortOption, field);
    setSortOption(nextSort);
    await loadMovements(0, filters, nextSort);
  }

  async function loadLatestHistoryReport() {
    try {
      const report = await fetchLatestInventoryHistory();
      if (report?.createdAt) {
        setLastSavedReport(report);
        setLastSavedAt(report.createdAt);
      }
    } catch (loadError) {
      console.error(loadError);
    }
  }

  async function handleManualSubmit(event) {
    event.preventDefault();

    const parsedQuantity = Number(manualForm.quantity);

    if (!manualForm.sku) {
      setError("Selecciona un SKU para registrar el movimiento.");
      showToast("Selecciona un SKU para registrar el movimiento.", "error");
      return;
    }

    if (!manualForm.warehouseCode) {
      setError("Selecciona una bodega para registrar el movimiento.");
      showToast("Selecciona una bodega para registrar el movimiento.", "error");
      return;
    }

    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 0) {
      setError("Ingresa una cantidad valida.");
      showToast("Ingresa una cantidad valida.", "error");
      return;
    }

    if (manualForm.movementType !== "ADJUSTMENT" && parsedQuantity <= 0) {
      setError("La cantidad debe ser mayor a 0.");
      showToast("La cantidad debe ser mayor a 0.", "error");
      return;
    }

    try {
      setSaving(true);
      setError("");
      await registerManualInventoryMovement({
        sku: manualForm.sku,
        warehouseCode: manualForm.warehouseCode,
        movementType: manualForm.movementType,
        quantity: parsedQuantity,
        reason: manualForm.reason.trim() || "Movimiento manual",
      });

      setManualForm((previousForm) => ({
        ...EMPTY_MANUAL_FORM,
        sku: previousForm.sku,
        warehouseCode: previousForm.warehouseCode,
      }));
      setIsRegisterOpen(false);
      showToast("Movimiento registrado correctamente.", "success");
      await loadInventoryItems();
      await loadMovements(0, filters, sortOption);
    } catch (saveError) {
      console.error(saveError);
      setError("No se pudo registrar el movimiento manual.");
      showToast("No se pudo registrar el movimiento manual.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleExport() {
    try {
      setExporting(true);
      setError("");
      const blob = await exportInventoryMovementsCsv(getApiFilters(filters));
      downloadBlob(blob, buildExportFilename(filters, "csv"));
      showToast("CSV exportado con los filtros aplicados.", "success");
    } catch (exportError) {
      console.error(exportError);
      setError("No se pudo exportar el historial.");
      showToast("No se pudo exportar el historial.", "error");
    } finally {
      setExporting(false);
    }
  }

  async function fetchAllMovementsForExport(activeFilters = filters, activeSort = sortOption) {
    const firstPage = await fetchInventoryMovements({
      ...getApiFilters(activeFilters),
      page: 0,
      size: EXPORT_PAGE_SIZE,
      sort: activeSort,
    });
    const firstContent = Array.isArray(firstPage.content) ? firstPage.content : firstPage;
    const totalPages = firstPage.totalPages || 1;

    if (totalPages <= 1) {
      return firstContent;
    }

    const remainingContent = [];

    for (let page = 1; page < totalPages; page += 1) {
      const data = await fetchInventoryMovements({
        ...getApiFilters(activeFilters),
        page,
        size: EXPORT_PAGE_SIZE,
        sort: activeSort,
      });
      const content = Array.isArray(data.content) ? data.content : data;
      remainingContent.push(...content);
    }

    return [...firstContent, ...remainingContent];
  }

  async function handleExportExcel() {
    try {
      setExportingExcel(true);
      setError("");
      const exportMovements = await fetchAllMovementsForExport(filters, sortOption);
      const excelHtml = buildExcelHtml(exportMovements, filters);
      const blob = new Blob(["\ufeff", excelHtml], {
        type: "application/vnd.ms-excel;charset=utf-8",
      });
      downloadBlob(blob, buildExportFilename(filters, "xls"));
      showToast(`Excel exportado con ${exportMovements.length} movimientos.`, "success");
    } catch (exportError) {
      console.error(exportError);
      setError("No se pudo exportar el historial a Excel.");
      showToast("No se pudo exportar el historial a Excel.", "error");
    } finally {
      setExportingExcel(false);
    }
  }

  async function handleSaveHistory() {
    try {
      setSavingHistory(true);
      setError("");
      const report = await saveInventoryHistory(getApiFilters(filters));
      const savedAt = report.createdAt || new Date().toISOString();

      setLastSavedReport(report);
      setLastSavedAt(savedAt);

      try {
        localStorage.setItem(SAVED_AT_KEY, savedAt);
      } catch (saveError) {
        console.error(saveError);
      }

      showToast(`Historial guardado en backend: ${report.totalMovements} movimientos en el reporte #${report.id}.`, "success");
    } catch (saveError) {
      console.error(saveError);
      setError("No se pudo guardar el historial en backend.");
      showToast("No se pudo guardar el historial en backend.", "error");
    } finally {
      setSavingHistory(false);
    }
  }

  async function goToPage(page) {
    if (page < 0 || (pagination.totalPages > 0 && page >= pagination.totalPages)) return;
    await loadMovements(page, filters, sortOption);
  }

  return (
    <div className="min-h-screen bg-[#0b1220] p-4 text-white sm:p-6">
      <ToastStack onDismiss={dismissToast} toasts={toasts} />
      <PageContainer>
        <div className="overflow-hidden rounded-lg border border-white/10 bg-[#111a2b] shadow-2xl">
          <Navbar />

          <main className="space-y-4 bg-[#111a2b] p-4 sm:p-6">
            <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-3xl font-black tracking-normal text-white">
                  Historial de movimientos
                </h1>
                <p className="mt-1 max-w-2xl text-sm font-medium text-slate-300">
                  Consulta y gestiona todos los movimientos de inventario registrados en el sistema.
                </p>
              </div>

              <div className="grid w-full gap-3 sm:flex sm:w-auto sm:flex-wrap">
                <ActionButton onClick={handleExport} disabled={exporting} icon={FiDownload}>
                  {exporting ? "Exportando" : "Exportar CSV"}
                </ActionButton>
                <ActionButton
                  onClick={handleExportExcel}
                  disabled={exportingExcel}
                  icon={FiFileText}
                >
                  {exportingExcel ? "Exportando" : "Exportar Excel"}
                </ActionButton>
                <ActionButton onClick={handleSaveHistory} disabled={savingHistory} icon={FiSave}>
                  {savingHistory ? "Guardando" : "Guardar historial"}
                </ActionButton>
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(true)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-400 sm:w-auto"
                >
                  <FiPlus />
                  Registrar movimiento
                </button>
              </div>
            </section>

            <FilterPanel
              filters={filters}
              sortOption={sortOption}
              userOptions={userOptions}
              viewMode={viewMode}
              onChange={handleFilterChange}
              onSortChange={handleSortChange}
              onSubmit={handleFilterSubmit}
              onClear={handleClearFilters}
              onRefresh={() => loadMovements(pagination.page, filters, sortOption)}
              onViewModeChange={setViewMode}
            />

            <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
              {viewMode === "timeline" ? (
                <MovementsTimeline
                  loading={loading}
                  movements={movements}
                  pagination={pagination}
                  pageButtons={pageButtons}
                  rangeStart={movementRangeStart}
                  rangeEnd={movementRangeEnd}
                  selectedMovement={selectedMovement}
                  sortOption={sortOption}
                  productImageBySku={productImageBySku}
                  onSelect={setSelectedMovement}
                  onPageChange={goToPage}
                />
              ) : (
                <MovementsTable
                  loading={loading}
                  movements={movements}
                  pagination={pagination}
                  pageButtons={pageButtons}
                  rangeStart={movementRangeStart}
                  rangeEnd={movementRangeEnd}
                  selectedMovement={selectedMovement}
                  sortOption={sortOption}
                  productImageBySku={productImageBySku}
                  onSelect={setSelectedMovement}
                  onPageChange={goToPage}
                  onSort={handleSortColumn}
                />
              )}

              <MovementDetailPanel
                movement={selectedMovement}
                imageUrl={productImageBySku[selectedMovement?.sku]}
              />
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.4fr_0.7fr_0.9fr]">
              <PeriodSummary stats={stats} />
              <MovementChart stats={stats} chartStyle={chartStyle} />
              <InfoPanel
                lastSavedAt={lastSavedAt}
                lastSavedReport={lastSavedReport}
                totalElements={pagination.totalElements}
              />
            </section>
          </main>
        </div>
      </PageContainer>

      {isRegisterOpen && (
        <RegisterMovementModal
          inventoryItems={inventoryItems}
          manualForm={manualForm}
          manualQuantityLabel={manualQuantityLabel}
          saving={saving}
          onChange={handleManualChange}
          onReasonSelect={(reason) =>
            setManualForm((previousForm) => ({
              ...previousForm,
              reason,
            }))
          }
          onSubmit={handleManualSubmit}
          onClose={() => setIsRegisterOpen(false)}
        />
      )}
    </div>
  );
}

function ActionButton({ children, disabled = false, icon: Icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-white/10 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
    >
      <Icon />
      {children}
    </button>
  );
}

function FilterPanel({
  filters,
  sortOption,
  userOptions,
  viewMode,
  onChange,
  onClear,
  onRefresh,
  onSortChange,
  onSubmit,
  onViewModeChange,
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.07] p-4 shadow-xl shadow-slate-950/20">
      <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <FilterField label="Buscar producto" className="xl:col-span-1">
          <div className="relative">
            <input
              type="text"
              name="product"
              value={filters.product}
              onChange={onChange}
              placeholder="Buscar por nombre o SKU..."
              className="field-control pr-11"
            />
            <FiSearch className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
          </div>
        </FilterField>

        <FilterField label="Tipo de movimiento">
          <select name="type" value={filters.type} onChange={onChange} className="field-control">
            <option value="">Todos</option>
            <option value="ENTRY">Entrada</option>
            <option value="EXIT">Salida</option>
            <option value="ADJUSTMENT">Ajuste</option>
          </select>
        </FilterField>

        <FilterField label="Fecha desde">
          <div className="relative">
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={onChange}
              className="field-control pr-11"
            />
            <FiCalendar className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
          </div>
        </FilterField>

        <FilterField label="Fecha hasta">
          <div className="relative">
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={onChange}
              className="field-control pr-11"
            />
            <FiCalendar className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
          </div>
        </FilterField>

        <FilterField label="Usuario">
          <select name="user" value={filters.user} onChange={onChange} className="field-control">
            <option value="">Todos</option>
            {userOptions.map((user) => (
              <option key={user} value={user}>
                {user}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Ordenar por">
          <select value={sortOption} onChange={onSortChange} className="field-control">
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Cantidad minima">
          <input
            type="number"
            min="0"
            name="minQuantity"
            value={filters.minQuantity}
            onChange={onChange}
            placeholder="Ej: 1"
            className="field-control"
          />
        </FilterField>

        <FilterField label="Cantidad maxima">
          <input
            type="number"
            min="0"
            name="maxQuantity"
            value={filters.maxQuantity}
            onChange={onChange}
            placeholder="Ej: 100"
            className="field-control"
          />
        </FilterField>

        <div className="flex items-end">
          <div className="grid w-full grid-cols-2 overflow-hidden rounded-md border border-white/10 bg-slate-950/45 p-1">
            <button
              type="button"
              onClick={() => onViewModeChange("table")}
              className={`inline-flex min-h-10 items-center justify-center gap-2 rounded px-3 text-xs font-black transition ${
                viewMode === "table"
                  ? "bg-sky-400 text-slate-950"
                  : "text-slate-200 hover:bg-white/10"
              }`}
            >
              <FiList />
              Tabla
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("timeline")}
              className={`inline-flex min-h-10 items-center justify-center gap-2 rounded px-3 text-xs font-black transition ${
                viewMode === "timeline"
                  ? "bg-sky-400 text-slate-950"
                  : "text-slate-200 hover:bg-white/10"
              }`}
            >
              <FiRepeat />
              Timeline
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:flex sm:items-end md:col-span-2 xl:col-span-3 xl:justify-end">
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-white/10 px-4 text-sm font-black text-white transition hover:bg-white/15 sm:w-auto"
          >
            <FiRefreshCw />
            Actualizar
          </button>
          <button
            type="submit"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-blue-500 px-8 text-sm font-black text-white transition hover:bg-blue-400 sm:w-auto"
          >
            <FiSearch />
            Buscar
          </button>
          <button
            type="button"
            onClick={onClear}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-slate-950/55 px-8 text-sm font-black text-white transition hover:bg-slate-900 sm:w-auto"
          >
            <FiRefreshCw />
            Limpiar
          </button>
        </div>
      </form>
    </section>
  );
}

function FilterField({ children, label, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-xs font-black text-slate-200">{label}</span>
      {children}
    </label>
  );
}

function MovementsTable({
  loading,
  movements,
  pagination,
  pageButtons,
  rangeStart,
  rangeEnd,
  selectedMovement,
  sortOption,
  productImageBySku,
  onSelect,
  onPageChange,
  onSort,
}) {
  const currentSort = getSortParts(sortOption);

  return (
    <section className="min-w-0 rounded-lg border border-white/10 bg-white/[0.07] p-4 shadow-xl shadow-slate-950/20">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1060px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs font-black uppercase text-slate-300">
              <SortableHeader currentSort={currentSort} field="createdAt" label="Fecha y hora" onSort={onSort} />
              <SortableHeader currentSort={currentSort} field="productName" label="Producto" onSort={onSort} />
              <SortableHeader currentSort={currentSort} field="sku" label="SKU" onSort={onSort} />
              <SortableHeader currentSort={currentSort} field="movementType" label="Tipo" onSort={onSort} />
              <SortableHeader currentSort={currentSort} field="quantity" label="Cantidad" onSort={onSort} />
              <SortableHeader currentSort={currentSort} field="previousStock" label="Stock anterior" onSort={onSort} />
              <SortableHeader currentSort={currentSort} field="newStock" label="Stock nuevo" onSort={onSort} />
              <SortableHeader currentSort={currentSort} field="username" label="Usuario" onSort={onSort} />
              <th className="px-3 py-3">Motivo</th>
              <th className="px-3 py-3 text-right"> </th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td colSpan="10" className="px-3 py-8 text-center font-bold text-slate-300">
                  Cargando movimientos...
                </td>
              </tr>
            )}

            {!loading && movements.length === 0 && (
              <tr>
                <td colSpan="10" className="px-3 py-8 text-center font-bold text-slate-400">
                  No hay movimientos registrados.
                </td>
              </tr>
            )}

            {!loading &&
              movements.map((movement) => (
                <MovementRow
                  key={movement.id}
                  movement={movement}
                  imageUrl={productImageBySku[movement.sku]}
                  selected={selectedMovement?.id === movement.id}
                  onSelect={() => onSelect(movement)}
                />
              ))}
          </tbody>
        </table>
      </div>

      <MovementPagination
        pageButtons={pageButtons}
        pagination={pagination}
        rangeEnd={rangeEnd}
        rangeStart={rangeStart}
        onPageChange={onPageChange}
      />
    </section>
  );
}

function SortableHeader({ currentSort, field, label, onSort }) {
  const active = currentSort.field === field;
  const Icon = currentSort.direction === "asc" ? FiArrowUp : FiArrowDown;

  return (
    <th className="px-3 py-3">
      <button
        type="button"
        onClick={() => onSort(field)}
        className={`inline-flex min-h-10 items-center gap-1 rounded px-2 py-1 text-left transition hover:bg-white/10 ${
          active ? "text-sky-200" : ""
        }`}
      >
        {label}
        {active && <Icon className="text-[13px]" />}
      </button>
    </th>
  );
}

function MovementPagination({ pageButtons, pagination, rangeEnd, rangeStart, onPageChange }) {
  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4 lg:flex-row lg:items-center lg:justify-between">
      <span className="text-sm font-bold text-slate-300">
        Mostrando {rangeStart} a {rangeEnd} de {pagination.totalElements} movimientos
      </span>

      <div className="flex flex-wrap items-center gap-2">
        <PageButton disabled={pagination.page <= 0} onClick={() => onPageChange(pagination.page - 1)}>
          <FiChevronLeft />
          Anterior
        </PageButton>

        {pageButtons.map((page, index) => {
          const previousPage = pageButtons[index - 1];
          const showGap = index > 0 && page - previousPage > 1;

          return (
            <span key={page} className="flex items-center gap-2">
              {showGap && <span className="text-slate-400">...</span>}
              <button
                type="button"
                onClick={() => onPageChange(page)}
                className={`h-10 min-w-10 rounded-md border px-3 text-sm font-black transition ${
                  page === pagination.page
                    ? "border-sky-300 bg-sky-400 text-slate-950"
                    : "border-white/10 bg-slate-950/55 text-white hover:bg-white/10"
                }`}
              >
                {page + 1}
              </button>
            </span>
          );
        })}

        <PageButton
          disabled={pagination.totalPages === 0 || pagination.page >= pagination.totalPages - 1}
          onClick={() => onPageChange(pagination.page + 1)}
        >
          Siguiente
          <FiChevronRight />
        </PageButton>
      </div>
    </div>
  );
}

function MovementsTimeline({
  loading,
  movements,
  pagination,
  pageButtons,
  rangeStart,
  rangeEnd,
  selectedMovement,
  sortOption,
  productImageBySku,
  onSelect,
  onPageChange,
}) {
  return (
    <section className="min-w-0 rounded-lg border border-white/10 bg-white/[0.07] p-4 shadow-xl shadow-slate-950/20">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-white">Timeline de movimientos</h2>
          <p className="text-sm font-semibold text-slate-400">
            Vista cronologica segun el orden seleccionado: {getSortLabel(sortOption)}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {loading && (
          <div className="rounded-md border border-dashed border-white/15 bg-slate-950/35 p-6 text-center text-sm font-bold text-slate-400">
            Cargando movimientos...
          </div>
        )}

        {!loading && movements.length === 0 && (
          <div className="rounded-md border border-dashed border-white/15 bg-slate-950/35 p-6 text-center text-sm font-bold text-slate-400">
            No hay movimientos registrados.
          </div>
        )}

        {!loading &&
          movements.map((movement) => (
            <TimelineItem
              key={movement.id}
              imageUrl={productImageBySku[movement.sku]}
              movement={movement}
              selected={selectedMovement?.id === movement.id}
              onSelect={() => onSelect(movement)}
            />
          ))}
      </div>

      <MovementPagination
        pageButtons={pageButtons}
        pagination={pagination}
        rangeEnd={rangeEnd}
        rangeStart={rangeStart}
        onPageChange={onPageChange}
      />
    </section>
  );
}

function TimelineItem({ imageUrl, movement, selected, onSelect }) {
  const meta = getMovementMeta(movement.movementType);
  const Icon = meta.icon;
  const quantityClass = getQuantityDelta(movement) < 0 ? "text-rose-300" : meta.text;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`grid w-full grid-cols-[auto_1fr] gap-4 rounded-lg border p-4 text-left transition hover:bg-white/10 ${
        selected
          ? "border-sky-300/40 bg-sky-400/10"
          : "border-white/10 bg-slate-950/30"
      }`}
    >
      <div className="flex flex-col items-center">
        <span className={`flex h-11 w-11 items-center justify-center rounded-full border ${meta.badge}`}>
          <Icon />
        </span>
        <span className="mt-2 h-full w-px bg-white/10" />
      </div>

      <div className="min-w-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-white/10 bg-slate-950/60 text-sky-200">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={movement.productName || "Producto"}
                  className="h-full w-full rounded-md object-cover"
                  loading="lazy"
                />
              ) : (
                <FiPackage />
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate text-base font-black text-white">
                {movement.productName || "Producto"}
              </p>
              <p className="text-xs font-black uppercase text-slate-400">
                {movement.sku || "-"} | {formatDate(movement.createdAt)}
              </p>
            </div>
          </div>

          <span className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-black ${meta.badge}`}>
            {meta.label}
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <TimelineMetric label="Cantidad" value={getQuantityLabel(movement)} valueClass={quantityClass} />
          <TimelineMetric label="Stock anterior" value={movement.previousStock ?? "-"} />
          <TimelineMetric label="Stock nuevo" value={movement.newStock ?? "-"} />
          <TimelineMetric label="Usuario" value={movement.username || "system"} />
        </div>

        <p className="mt-3 line-clamp-2 text-sm font-bold text-slate-300">
          {movement.reason || getActionLabel(movement.actionType)}
        </p>
        {movement.transferReference && (
          <p className="mt-2 text-xs font-black text-sky-300">
            Referencia {movement.transferReference}
          </p>
        )}
      </div>
    </button>
  );
}

function TimelineMetric({ label, value, valueClass = "text-white" }) {
  return (
    <div className="rounded-md border border-white/10 bg-slate-950/35 p-3">
      <p className="text-[11px] font-black uppercase text-slate-500">{label}</p>
      <p className={`mt-1 text-sm font-black ${valueClass}`}>{value}</p>
    </div>
  );
}

function MovementRow({ imageUrl, movement, selected, onSelect }) {
  const meta = getMovementMeta(movement.movementType);
  const Icon = meta.icon;
  const quantityLabel = getQuantityLabel(movement);
  const quantityClass = getQuantityDelta(movement) < 0 ? "text-rose-300" : meta.text;

  return (
    <tr
      onClick={onSelect}
      className={`cursor-pointer border-b border-white/10 transition hover:bg-white/10 ${
        selected ? "bg-sky-400/10 outline outline-1 outline-sky-300/30" : ""
      }`}
    >
      <td className="whitespace-nowrap px-3 py-3 font-bold text-slate-200">
        {formatDate(movement.createdAt)}
      </td>
      <td className="px-3 py-3">
        <div className="flex min-w-[210px] items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/10 bg-slate-950/60 text-sky-200">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={movement.productName || "Producto"}
                className="h-full w-full rounded-md object-cover"
                loading="lazy"
              />
            ) : (
              <FiPackage />
            )}
          </span>
          <span className="font-black text-white">{movement.productName || "Producto"}</span>
        </div>
      </td>
      <td className="whitespace-nowrap px-3 py-3 font-black text-slate-200">
        {movement.sku || "-"}
      </td>
      <td className="px-3 py-3">
        <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-black ${meta.badge}`}>
          <Icon />
          {meta.label}
        </span>
      </td>
      <td className={`whitespace-nowrap px-3 py-3 text-base font-black ${quantityClass}`}>
        {quantityLabel}
      </td>
      <td className="whitespace-nowrap px-3 py-3 font-bold text-slate-200">
        {movement.previousStock ?? "-"}
      </td>
      <td className="whitespace-nowrap px-3 py-3 font-bold text-slate-200">
        {movement.newStock ?? "-"}
      </td>
      <td className="whitespace-nowrap px-3 py-3 font-black text-slate-200">
        {movement.username || "system"}
      </td>
      <td className="max-w-[190px] px-3 py-3 font-bold text-slate-300">
        <p className="truncate">{movement.reason || getActionLabel(movement.actionType)}</p>
        {movement.transferReference && (
          <p className="mt-1 truncate text-xs font-black text-sky-300">
            {movement.transferReference}
          </p>
        )}
      </td>
      <td className="px-3 py-3 text-right text-slate-300">
        <FiChevronRight className="ml-auto" />
      </td>
    </tr>
  );
}

function PageButton({ children, disabled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-white/10 bg-slate-950/55 px-3 text-sm font-black text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
    >
      {children}
    </button>
  );
}

function MovementDetailPanel({ imageUrl, movement }) {
  if (!movement) {
    return (
      <aside className="rounded-lg border border-white/10 bg-white/[0.07] p-4 shadow-xl shadow-slate-950/20">
        <h2 className="mb-4 text-lg font-black text-white">Detalle del movimiento</h2>
        <div className="rounded-md border border-dashed border-white/15 bg-slate-950/35 p-6 text-center text-sm font-bold text-slate-400">
          Selecciona una fila para ver el detalle.
        </div>
      </aside>
    );
  }

  const meta = getMovementMeta(movement.movementType);
  const Icon = meta.icon;
  const quantityClass = getQuantityDelta(movement) < 0 ? "text-rose-300" : meta.text;

  return (
    <aside className="rounded-lg border border-white/10 bg-white/[0.07] p-4 shadow-xl shadow-slate-950/20">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-lg font-black text-white">Detalle del movimiento</h2>
        <span className="text-xs font-black text-slate-300">ID: #{movement.id}</span>
      </div>

      <span className={`mb-5 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-black ${meta.badge}`}>
        <Icon />
        {meta.label}
      </span>

      {imageUrl && (
        <img
          src={imageUrl}
          alt={movement.productName || "Producto"}
          className="mb-5 h-36 w-full rounded-lg border border-white/10 object-cover"
          loading="lazy"
        />
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-5 text-sm">
        <DetailItem icon={FiBox} label="Producto" value={movement.productName || "Producto"} />
        <DetailItem icon={FiUser} label="Usuario" value={movement.username || "system"} />
        <DetailItem icon={FiHash} label="SKU" value={movement.sku || "-"} />
        <DetailItem icon={FiArchive} label="Bodega" value={movement.warehouseCode || "-"} />
        {movement.transferReference && (
          <DetailItem icon={FiHash} label="Referencia traslado" value={movement.transferReference} valueClass="text-sky-300" />
        )}
        <DetailItem icon={FiCalendar} label="Fecha y hora" value={formatDate(movement.createdAt)} />
        <DetailItem label="Tipo de movimiento" value={meta.shortLabel} valueClass={meta.text} />
        <DetailItem label="Motivo" value={movement.reason || getActionLabel(movement.actionType)} />
        <DetailItem label="Cantidad" value={`${getQuantityLabel(movement)} unidades`} valueClass={quantityClass} />
        <DetailItem label="Motivo funcional" value={getActionLabel(movement.actionType)} />
        <DetailItem label="Stock anterior" value={movement.previousStock ?? "-"} />
        <DetailItem label="Stock nuevo" value={movement.newStock ?? "-"} />
      </div>

      <button
        type="button"
        className="mt-6 w-full rounded-md bg-slate-950/55 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-900"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        Cerrar
      </button>
    </aside>
  );
}

function DetailItem({ icon: Icon, label, value, valueClass = "text-white" }) {
  return (
    <div>
      <p className="mb-1 flex items-center gap-1 text-xs font-black text-slate-400">
        {Icon && <Icon />}
        {label}
      </p>
      <p className={`font-black ${valueClass}`}>{value ?? "-"}</p>
    </div>
  );
}

function PeriodSummary({ stats }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.07] p-4 shadow-xl shadow-slate-950/20">
      <h2 className="mb-4 text-lg font-black text-white">Resumen del periodo filtrado</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryMetric
          icon={FiTrendingUp}
          label="Entradas"
          value={stats.entries}
          caption={`+${stats.entryUnits} unidades`}
          tone="entry"
        />
        <SummaryMetric
          icon={FiTrendingDown}
          label="Salidas"
          value={stats.exits}
          caption={`-${stats.exitUnits} unidades`}
          tone="exit"
        />
        <SummaryMetric
          icon={FiRepeat}
          label="Ajustes"
          value={stats.adjustments}
          caption={`${stats.adjustmentUnits >= 0 ? "+" : ""}${stats.adjustmentUnits} unidades`}
          tone="adjustment"
        />
        <SummaryMetric
          icon={FiClipboard}
          label="Total movimientos"
          value={stats.visible}
          caption="acciones visibles"
          tone="total"
        />
      </div>
    </section>
  );
}

function SummaryMetric({ caption, icon: Icon, label, tone, value }) {
  const tones = {
    entry: "border-emerald-300/30 text-emerald-200",
    exit: "border-rose-300/30 text-rose-200",
    adjustment: "border-amber-300/30 text-amber-100",
    total: "border-sky-300/30 text-sky-100",
  };

  return (
    <div className={`rounded-lg border bg-slate-950/30 p-4 text-center ${tones[tone]}`}>
      <Icon className="mx-auto mb-2 text-2xl" />
      <p className="text-xs font-black text-slate-300">{label}</p>
      <strong className="block text-3xl font-black text-white">{value}</strong>
      <span className="text-xs font-black">{caption}</span>
    </div>
  );
}

function MovementChart({ stats, chartStyle }) {
  const total = stats.entries + stats.exits + stats.adjustments;

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.07] p-4 shadow-xl shadow-slate-950/20">
      <h2 className="mb-4 text-lg font-black text-white">Movimientos por tipo</h2>
      <div className="flex items-center gap-5">
        <div className="relative h-32 w-32 shrink-0 rounded-full" style={chartStyle}>
          <div className="absolute inset-7 rounded-full bg-[#111a2b]" />
        </div>
        <div className="space-y-2 text-sm font-bold text-slate-200">
          <ChartLegend color="bg-emerald-300" label="Entradas" value={stats.entries} total={total} />
          <ChartLegend color="bg-rose-300" label="Salidas" value={stats.exits} total={total} />
          <ChartLegend color="bg-amber-300" label="Ajustes" value={stats.adjustments} total={total} />
        </div>
      </div>
    </section>
  );
}

function ChartLegend({ color, label, total, value }) {
  const percentage = total === 0 ? 0 : Math.round((value / total) * 100);

  return (
    <div className="flex items-center gap-2">
      <span className={`h-3 w-3 rounded-full ${color}`} />
      <span>
        {label}: {value} ({percentage}%)
      </span>
    </div>
  );
}

function InfoPanel({ lastSavedAt, lastSavedReport, totalElements }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.07] p-4 shadow-xl shadow-slate-950/20">
      <div className="mb-4 flex items-center gap-2 text-white">
        <FiArchive />
        <h2 className="text-lg font-black">Informacion</h2>
      </div>
      <p className="text-sm font-semibold leading-6 text-slate-300">
        Guarda o exporta el historial actual con los filtros aplicados.
      </p>
      <div className="mt-8 space-y-2 text-sm font-black text-slate-200">
        <p>Total consultado: {totalElements}</p>
        <p>
          Ultimo guardado: <span className="text-emerald-300">{formatSavedDate(lastSavedAt)}</span>
        </p>
        {lastSavedReport && (
          <>
            <p>Reporte guardado: #{lastSavedReport.id}</p>
            <p>Usuario: {lastSavedReport.username || "system"}</p>
            <p>Movimientos guardados: {lastSavedReport.totalMovements}</p>
          </>
        )}
      </div>
    </section>
  );
}

function RegisterMovementModal({
  inventoryItems,
  manualForm,
  manualQuantityLabel,
  saving,
  onChange,
  onClose,
  onReasonSelect,
  onSubmit,
}) {
  const reasonOptions = MANUAL_REASON_OPTIONS[manualForm.movementType] || [];
  const selectedItem = inventoryItems.find((item) => item.sku === manualForm.sku);
  const selectedStocks = selectedItem?.stocks?.length
    ? selectedItem.stocks
    : selectedItem
      ? [selectedItem]
      : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-xl rounded-lg border border-white/10 bg-[#111a2b] p-5 text-white shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-sky-300">Nuevo registro</p>
            <h2 className="text-2xl font-black">Registrar movimiento</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-md bg-white/10 p-3 text-white transition hover:bg-white/15"
          >
            <FiX />
          </button>
        </div>

        <div className="grid gap-4">
          <FilterField label="Producto">
            <select name="sku" value={manualForm.sku} onChange={onChange} className="field-control">
              <option value="">Seleccionar producto</option>
              {inventoryItems.map((item) => (
                <option key={item.sku} value={item.sku}>
                  {item.sku} - {item.productName}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Bodega y ubicacion">
            <select
              name="warehouseCode"
              value={manualForm.warehouseCode}
              onChange={onChange}
              className="field-control"
            >
              <option value="">Seleccionar bodega</option>
              {selectedStocks.map((stock) => (
                <option key={stock.warehouseCode} value={stock.warehouseCode}>
                  {stock.warehouseCode} - Disponible {stock.availableQuantity} - {stock.locationAisle}-{stock.locationRack}-{stock.locationLevel}-{stock.locationPosition}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Tipo de movimiento">
            <select
              name="movementType"
              value={manualForm.movementType}
              onChange={onChange}
              className="field-control"
            >
              <option value="ENTRY">Entrada</option>
              <option value="EXIT">Salida</option>
              <option value="ADJUSTMENT">Ajuste</option>
            </select>
          </FilterField>

          <FilterField label={manualQuantityLabel}>
            <input
              type="number"
              min="0"
              name="quantity"
              value={manualForm.quantity}
              onChange={onChange}
              placeholder={manualQuantityLabel}
              className="field-control"
            />
          </FilterField>

          <FilterField label="Motivo rapido">
            <div className="flex flex-wrap gap-2">
              {reasonOptions.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => onReasonSelect(reason)}
                  className={`rounded-md border px-3 py-2 text-xs font-black transition ${
                    manualForm.reason === reason
                      ? "border-sky-300 bg-sky-400 text-slate-950"
                      : "border-white/10 bg-white/10 text-slate-100 hover:bg-white/15"
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
          </FilterField>

          <FilterField label="Motivo detallado">
            <textarea
              name="reason"
              value={manualForm.reason}
              onChange={onChange}
              placeholder="Escribe un motivo o usa una opcion rapida"
              rows="3"
              className="field-control resize-none"
            />
          </FilterField>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || inventoryItems.length === 0}
            className="inline-flex items-center gap-2 rounded-md bg-blue-500 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FiPlus />
            {saving ? "Guardando" : "Guardar movimiento"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default InventoryMovementsPage;
