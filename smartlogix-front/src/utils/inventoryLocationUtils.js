export const WAREHOUSE_LOCATION_OPTIONS = [
  { code: "WH-SCL-01", name: "Bodega Santiago", city: "Santiago" },
  { code: "WH-VAP-02", name: "Bodega Valparaiso", city: "Valparaiso" },
  { code: "WH-CON-03", name: "Bodega Concepcion", city: "Concepcion" },
  { code: "WH-ANT-04", name: "Bodega Antofagasta", city: "Antofagasta" },
];

const CATEGORY_ZONE = {
  Accesorios: "A",
  Componentes: "C",
  Monitores: "M",
  Notebooks: "N",
  Perifericos: "P",
  Otros: "G",
};

function hashText(value) {
  const text = String(value || "SKU").toUpperCase();
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function getAvailableUnits(item) {
  return Number(item?.availableQuantity || 0) - Number(item?.reservedQuantity || 0);
}

export function getWarehouseMeta(code) {
  return (
    WAREHOUSE_LOCATION_OPTIONS.find((warehouse) => warehouse.code === code) || {
      code,
      name: code || "Bodega sin codigo",
      city: "Sin ciudad",
    }
  );
}

export function getProductStorageLocation(item) {
  const sku = item?.sku || "SKU";
  const category = item?.category || "General";
  const warehouseCode = item?.warehouseCode || "WH-SIN-00";
  const hash = hashText(`${warehouseCode}-${sku}-${category}`);
  const aisleLetter =
    item?.locationAisle || String.fromCharCode(65 + (hash % 5));
  const rack = Number(item?.locationRack) || (Math.floor(hash / 5) % 8) + 1;
  const level = Number(item?.locationLevel) || (Math.floor(hash / 41) % 4) + 1;
  const position =
    Number(item?.locationPosition) || (Math.floor(hash / 163) % 12) + 1;
  const zone = item?.locationZone || CATEGORY_ZONE[category] || "G";
  const warehouse = getWarehouseMeta(warehouseCode);

  return {
    aisle: aisleLetter,
    code: `${warehouseCode}-${zone}${aisleLetter}-R${rack}-N${level}-P${position}`,
    label: `Zona ${zone} / Pasillo ${aisleLetter} / Rack ${rack} / Nivel ${level}`,
    level,
    position,
    rack,
    shortLabel: `${aisleLetter}-${rack}-${level}-${position}`,
    slotLabel: `Posicion ${position}`,
    warehouse,
    zone,
  };
}

export function productMatchesSearch(item, query) {
  const cleanQuery = String(query || "").trim().toLowerCase();

  if (!cleanQuery) return true;

  const location = getProductStorageLocation(item);
  const searchable = [
    item?.sku,
    item?.productName,
    item?.category,
    item?.warehouseCode,
    location.code,
    location.label,
    location.warehouse.name,
    location.warehouse.city,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchable.includes(cleanQuery);
}
