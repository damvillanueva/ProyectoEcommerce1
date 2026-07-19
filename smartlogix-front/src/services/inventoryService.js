import {
  getInventoryItems,
  getCatalogProducts,
  getCatalogProduct,
  getProductReviews,
  saveProductReviewRequest,
  deleteProductReviewRequest,
  getProductQuestions,
  createProductQuestionRequest,
  deleteProductQuestionRequest,
  answerProductQuestionRequest,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  upsertInventoryStock,
  deleteInventoryStock,
  transferInventoryStock,
  getWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
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
    available: item.availableQuantity,
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

export async function saveInventoryStock(sku, warehouseCode, stockData) {
  return await upsertInventoryStock(sku, warehouseCode, stockData);
}

export async function removeInventoryStock(sku, warehouseCode) {
  return await deleteInventoryStock(sku, warehouseCode);
}

export async function moveInventoryStock(sku, transferData) {
  return await transferInventoryStock(sku, transferData);
}

export async function fetchWarehouses() {
  return await getWarehouses();
}

export async function saveWarehouse(warehouseData) {
  return await createWarehouse(warehouseData);
}

export async function editWarehouse(code, warehouseData) {
  return await updateWarehouse(code, warehouseData);
}

export async function removeWarehouse(code) {
  return await deleteWarehouse(code);
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

export async function getPublicCatalogProduct(sku) {
  return await getCatalogProduct(sku);
}

export async function loadProductReviews(sku) {
  return await getProductReviews(sku);
}

export async function saveProductReview(sku, review) {
  return await saveProductReviewRequest(sku, review);
}

export async function deleteProductReview(sku, reviewId) {
  return await deleteProductReviewRequest(sku, reviewId);
}

export async function loadProductQuestions(sku) {
  return await getProductQuestions(sku);
}

export async function createProductQuestion(sku, question) {
  return await createProductQuestionRequest(sku, question);
}

export async function deleteProductQuestion(sku, questionId) {
  return await deleteProductQuestionRequest(sku, questionId);
}

export async function answerProductQuestion(sku, questionId, answer) {
  return await answerProductQuestionRequest(sku, questionId, answer);
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
