import { useMemo, useState } from "react";
import {
  FiArchive,
  FiCheck,
  FiEdit2,
  FiMapPin,
  FiPlus,
  FiTrash2,
  FiX,
} from "react-icons/fi";

const DEFAULT_ZONE_CODES = ["A", "C", "G", "M", "N", "O", "P", "R"];
const AVAILABLE_ZONE_CODES = Array.from({ length: 26 }, (_, index) =>
  String.fromCharCode(65 + index)
);

const EMPTY_FORM = {
  code: "",
  name: "",
  city: "",
  region: "",
  address: "",
  active: true,
  dispatchPriority: "100",
  aisleCount: "6",
  rackCount: "8",
  levelCount: "4",
  positionsPerLevel: "12",
  zoneCodes: DEFAULT_ZONE_CODES,
};

const NUMBER_FIELDS = [
  "dispatchPriority",
  "aisleCount",
  "rackCount",
  "levelCount",
  "positionsPerLevel",
];

function toForm(warehouse) {
  return NUMBER_FIELDS.reduce(
    (form, field) => ({ ...form, [field]: String(warehouse[field]) }),
    {
      code: warehouse.code,
      name: warehouse.name,
      city: warehouse.city,
      region: warehouse.region,
      address: warehouse.address,
      active: warehouse.active,
      zoneCodes: warehouse.zoneCodes?.length ? warehouse.zoneCodes : DEFAULT_ZONE_CODES,
    }
  );
}

function toPayload(form, includeCode) {
  const payload = {
    name: form.name.trim(),
    city: form.city.trim(),
    region: form.region.trim(),
    address: form.address.trim(),
    active: form.active,
    dispatchPriority: Number(form.dispatchPriority),
    aisleCount: Number(form.aisleCount),
    rackCount: Number(form.rackCount),
    levelCount: Number(form.levelCount),
    positionsPerLevel: Number(form.positionsPerLevel),
    zoneCodes: form.zoneCodes,
  };

  return includeCode ? { code: form.code.trim().toUpperCase(), ...payload } : payload;
}

function WarehouseManagementPanel({
  canDelete,
  onCreate,
  onDelete,
  onUpdate,
  warehouses,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingCode, setEditingCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const activeCount = useMemo(
    () => warehouses.filter((warehouse) => warehouse.active).length,
    [warehouses]
  );

  function handleChange(event) {
    const { checked, name, type, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function resetForm() {
    setForm({ ...EMPTY_FORM, zoneCodes: [...DEFAULT_ZONE_CODES] });
    setEditingCode("");
  }

  function handleZoneChange(event) {
    const { checked, value } = event.target;
    setForm((current) => ({
      ...current,
      zoneCodes: checked
        ? [...current.zoneCodes, value].sort()
        : current.zoneCodes.filter((zone) => zone !== value),
    }));
  }

  function startEdit(warehouse) {
    setForm(toForm(warehouse));
    setEditingCode(warehouse.code);
    setExpanded(true);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);

    try {
      let succeeded;
      if (editingCode) {
        succeeded = await onUpdate(editingCode, toPayload(form, false));
      } else {
        succeeded = await onCreate(toPayload(form, true));
      }
      if (succeeded !== false) resetForm();
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      const succeeded = await onDelete(deleteTarget.code);
      if (succeeded !== false) {
        setDeleteTarget(null);
        if (editingCode === deleteTarget.code) resetForm();
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="mb-8 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80">
      <div className="flex flex-col gap-4 border-b border-white/10 p-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <span className="rounded-lg bg-sky-500/15 p-3 text-sky-300">
            <FiArchive aria-hidden="true" size={22} />
          </span>
          <div>
            <p className="text-xs font-black uppercase text-sky-300">Configuracion operativa</p>
            <h2 className="mt-1 text-2xl font-black">Administracion de bodegas</h2>
            <p className="mt-1 text-sm font-semibold text-slate-400">
              {warehouses.length} registradas, {activeCount} activas
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-500 px-4 py-3 text-sm font-black text-white transition hover:bg-sky-400"
        >
          {expanded ? <FiX aria-hidden="true" /> : <FiPlus aria-hidden="true" />}
          {expanded ? "Cerrar formulario" : "Nueva bodega"}
        </button>
      </div>

      {expanded && (
        <form onSubmit={handleSubmit} className="border-b border-white/10 bg-slate-950/35 p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black">
                {editingCode ? `Editar ${editingCode}` : "Registrar bodega"}
              </h3>
              <p className="mt-1 text-sm font-semibold text-slate-400">
                El plano define los limites validos para ubicar productos.
              </p>
            </div>
            {editingCode && (
              <button
                type="button"
                onClick={resetForm}
                title="Cancelar edicion"
                className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                <FiX aria-hidden="true" size={20} />
                <span className="sr-only">Cancelar edicion</span>
              </button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <WarehouseField
              label="Codigo"
              name="code"
              value={form.code}
              onChange={handleChange}
              disabled={Boolean(editingCode)}
              placeholder="WH-TEM-05"
              pattern="[A-Za-z0-9][A-Za-z0-9-]{2,39}"
            />
            <WarehouseField label="Nombre" name="name" value={form.name} onChange={handleChange} placeholder="Bodega Temuco" />
            <WarehouseField label="Ciudad" name="city" value={form.city} onChange={handleChange} placeholder="Temuco" />
            <WarehouseField label="Region" name="region" value={form.region} onChange={handleChange} placeholder="La Araucania" />
            <div className="md:col-span-2 xl:col-span-3">
              <WarehouseField label="Direccion" name="address" value={form.address} onChange={handleChange} placeholder="Av. Industrial 123" />
            </div>
            <WarehouseField label="Prioridad despacho" name="dispatchPriority" value={form.dispatchPriority} onChange={handleChange} type="number" min="1" max="999" />
            <WarehouseField label="Pasillos" name="aisleCount" value={form.aisleCount} onChange={handleChange} type="number" min="1" max="12" />
            <WarehouseField label="Racks por pasillo" name="rackCount" value={form.rackCount} onChange={handleChange} type="number" min="1" max="20" />
            <WarehouseField label="Niveles por rack" name="levelCount" value={form.levelCount} onChange={handleChange} type="number" min="1" max="8" />
            <WarehouseField label="Posiciones por nivel" name="positionsPerLevel" value={form.positionsPerLevel} onChange={handleChange} type="number" min="1" max="30" />
          </div>

          <fieldset className="mt-5 rounded-lg border border-white/10 bg-slate-950/45 p-4">
            <legend className="flex items-center gap-2 px-2 text-xs font-black uppercase text-slate-300">
              <FiMapPin aria-hidden="true" />
              Zonas habilitadas
            </legend>
            <div className="mt-2 grid grid-cols-7 gap-2 sm:grid-cols-[repeat(13,minmax(0,1fr))]">
              {AVAILABLE_ZONE_CODES.map((zone) => (
                <label
                  key={zone}
                  className={`flex cursor-pointer items-center justify-center rounded-lg border px-2 py-2 text-xs font-black transition ${
                    form.zoneCodes.includes(zone)
                      ? "border-sky-300/60 bg-sky-500/20 text-sky-100"
                      : "border-white/10 bg-slate-900 text-slate-500 hover:text-slate-200"
                  }`}
                  title={`Zona ${zone}`}
                >
                  <input
                    type="checkbox"
                    value={zone}
                    checked={form.zoneCodes.includes(zone)}
                    onChange={handleZoneChange}
                    className="sr-only"
                  />
                  {zone}
                </label>
              ))}
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-500">
              Cada zona comparte los limites de pasillos, racks, niveles y posiciones del plano.
            </p>
          </fieldset>

          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="inline-flex cursor-pointer items-center gap-3 text-sm font-black text-slate-200">
              <input
                type="checkbox"
                name="active"
                checked={form.active}
                onChange={handleChange}
                className="h-5 w-5 accent-sky-500"
              />
              Disponible para recibir inventario
            </label>
            <button
              type="submit"
              disabled={saving || form.zoneCodes.length === 0}
              className="inline-flex min-w-44 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiCheck aria-hidden="true" />
              {saving ? "Guardando..." : editingCode ? "Guardar cambios" : "Crear bodega"}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-[980px] w-full text-left text-sm">
          <thead className="bg-slate-950/55 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-5 py-4">Bodega</th>
              <th className="px-5 py-4">Estado</th>
              <th className="px-5 py-4">Inventario</th>
              <th className="px-5 py-4">Plano</th>
              <th className="px-5 py-4">Ocupacion</th>
              <th className="px-5 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {warehouses.map((warehouse) => {
              const occupancy = warehouse.locationCapacity > 0
                ? Math.round((warehouse.occupiedLocations / warehouse.locationCapacity) * 100)
                : 0;

              return (
                <tr key={warehouse.code} className="transition hover:bg-white/[0.03]">
                  <td className="px-5 py-4">
                    <p className="font-black text-white">{warehouse.name}</p>
                    <p className="mt-1 font-semibold text-slate-400">
                      {warehouse.code} | {warehouse.city}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Prioridad {warehouse.dispatchPriority}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${warehouse.active ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-700 text-slate-300"}`}>
                      {warehouse.active ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-black text-white">{warehouse.productCount} productos</p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      {warehouse.availableQuantity} disponibles | {warehouse.reservedQuantity} reservados
                    </p>
                  </td>
                  <td className="px-5 py-4 font-semibold text-slate-300">
                    {(warehouse.zoneCodes || []).length}Z | {warehouse.aisleCount}P | {warehouse.rackCount}R | {warehouse.levelCount}N | {warehouse.positionsPerLevel}U
                    <p className="mt-1 text-xs text-slate-500">
                      {(warehouse.zoneCodes || []).join(", ") || "Sin zonas"}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="h-2 w-36 overflow-hidden rounded-full bg-slate-950">
                      <div className="h-full bg-sky-400" style={{ width: `${Math.min(occupancy, 100)}%` }} />
                    </div>
                    <p className="mt-2 text-xs font-semibold text-slate-400">{occupancy}% | {warehouse.occupiedLocations}/{warehouse.locationCapacity}</p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(warehouse)}
                        title={`Editar ${warehouse.name}`}
                        className="rounded-lg bg-white/10 p-2.5 text-sky-200 transition hover:bg-sky-500/20 hover:text-white"
                      >
                        <FiEdit2 aria-hidden="true" />
                        <span className="sr-only">Editar {warehouse.name}</span>
                      </button>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(warehouse)}
                          title={`Eliminar ${warehouse.name}`}
                          className="rounded-lg bg-white/10 p-2.5 text-red-300 transition hover:bg-red-500/20 hover:text-white"
                        >
                          <FiTrash2 aria-hidden="true" />
                          <span className="sr-only">Eliminar {warehouse.name}</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
          <section role="dialog" aria-modal="true" aria-labelledby="delete-warehouse-title" className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <h3 id="delete-warehouse-title" className="text-xl font-black">Eliminar bodega</h3>
            <p className="mt-3 text-sm font-semibold text-slate-300">
              Se eliminara {deleteTarget.name}. La API rechazara la operacion si aun tiene productos asignados.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleting} className="rounded-lg bg-white/10 px-4 py-2.5 text-sm font-black text-white transition hover:bg-white/15">
                Cancelar
              </button>
              <button type="button" onClick={confirmDelete} disabled={deleting} className="rounded-lg bg-red-500 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-400 disabled:opacity-60">
                {deleting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

function WarehouseField({ disabled = false, label, name, onChange, ...inputProps }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase text-slate-400">{label}</span>
      <input
        name={name}
        onChange={onChange}
        disabled={disabled}
        required
        className="w-full rounded-lg border border-white/10 bg-slate-950/80 px-4 py-3 text-sm font-bold text-white outline-none transition focus:ring-2 focus:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
        {...inputProps}
      />
    </label>
  );
}

export default WarehouseManagementPanel;
