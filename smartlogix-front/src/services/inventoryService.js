import {
  getInventoryItems,
  getCatalogProducts,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getInventoryMovements,
  createInventoryMovement,
  exportInventoryMovements,
  saveInventoryHistoryReport,
  getLatestInventoryHistoryReport,
  getInventoryAuditLogs,
} from "../api/inventoryApi";


export async function getInventoryItemsWithAvailable() {
  const items = await getInventoryItems();

  return items.map((item) => ({
    ...item,
    available: item.availableQuantity - item.reservedQuantity,
  }));
}

export async function saveInventoryItem(itemData) {
  return await createInventoryItem(itemData);
}

export async function editInventoryItem(sku, itemData) {
  return await updateInventoryItem(sku, itemData);
}

export async function removeInventoryItem(sku) {
  return await deleteInventoryItem(sku);
}

export async function fetchInventoryMovements(params) {
  return await getInventoryMovements(params);
}

export async function registerManualInventoryMovement(movementData) {
  return await createInventoryMovement(movementData);
}

export async function exportInventoryMovementsCsv(params) {
  return await exportInventoryMovements(params);
}

export async function getPublicCatalogProducts() {
  return await getCatalogProducts();
}

export async function saveInventoryHistory(params) {
  return await saveInventoryHistoryReport(params);
}

export async function fetchLatestInventoryHistory() {
  return await getLatestInventoryHistoryReport();
}

export async function fetchInventoryAuditLogs(params) {
  return await getInventoryAuditLogs(params);
}
