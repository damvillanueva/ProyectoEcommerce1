import axios from "axios";
import { getAuthHeaders } from "../middleware/authHeaders";
import { API_URL } from "./apiConfig";
function compactParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== "" && value !== null && value !== undefined
    )
  );
}


export async function getInventoryItems() {
  const response = await axios.get(`${API_URL}/api/inventory/items`, {
    headers: getAuthHeaders(),
  });

  return response.data;
}

export async function createInventoryItem(itemData) {
  const response = await axios.post(
    `${API_URL}/api/inventory/items`,
    itemData,
    {
      headers: getAuthHeaders(),
    }
  );

  return response.data;
}

export async function deleteInventoryItem(sku) {
  await axios.delete(`${API_URL}/api/inventory/items/${sku}`, {
    headers: getAuthHeaders(),
  });
}

export async function updateInventoryItem(sku, itemData) {
  const response = await axios.put(
    `${API_URL}/api/inventory/items/${sku}`,
    itemData,
    {
      headers: getAuthHeaders(),
    }
  );

  return response.data;
}
export async function getInventoryMovements(params = {}) {
  const response = await axios.get(`${API_URL}/api/inventory/movements`, {
    headers: getAuthHeaders(),
    params: compactParams(params),
  });

  return response.data;
}

export async function createInventoryMovement(movementData) {
  const response = await axios.post(
    `${API_URL}/api/inventory/movements/manual`,
    movementData,
    {
      headers: getAuthHeaders(),
    }
  );

  return response.data;
}

export async function exportInventoryMovements(params = {}) {
  const response = await axios.get(`${API_URL}/api/inventory/movements/export`, {
    headers: getAuthHeaders(),
    params: compactParams(params),
    responseType: "blob",
  });

  return response.data;
}

export async function getCatalogProducts() {
  const response = await axios.get(`${API_URL}/api/catalog/products`);
  return response.data;
}

export async function getCatalogProduct(sku) {
  const response = await axios.get(`${API_URL}/api/catalog/products/${encodeURIComponent(sku)}`);
  return response.data;
}

export async function getProductReviews(sku) {
  const response = await axios.get(
    `${API_URL}/api/catalog/products/${encodeURIComponent(sku)}/reviews`
  );
  return response.data;
}

export async function saveProductReviewRequest(sku, review) {
  const response = await axios.post(
    `${API_URL}/api/catalog/products/${encodeURIComponent(sku)}/reviews`,
    review,
    { headers: getAuthHeaders() }
  );
  return response.data;
}

export async function deleteProductReviewRequest(sku, reviewId) {
  await axios.delete(
    `${API_URL}/api/catalog/products/${encodeURIComponent(sku)}/reviews/${reviewId}`,
    { headers: getAuthHeaders() }
  );
}

export async function getProductQuestions(sku) {
  const response = await axios.get(
    `${API_URL}/api/catalog/products/${encodeURIComponent(sku)}/questions`
  );
  return response.data;
}

export async function createProductQuestionRequest(sku, question) {
  const response = await axios.post(
    `${API_URL}/api/catalog/products/${encodeURIComponent(sku)}/questions`,
    question,
    { headers: getAuthHeaders() }
  );
  return response.data;
}

export async function deleteProductQuestionRequest(sku, questionId) {
  await axios.delete(
    `${API_URL}/api/catalog/products/${encodeURIComponent(sku)}/questions/${questionId}`,
    { headers: getAuthHeaders() }
  );
}

export async function answerProductQuestionRequest(sku, questionId, answer) {
  const response = await axios.put(
    `${API_URL}/api/catalog/products/${encodeURIComponent(sku)}/questions/${questionId}/answer`,
    answer,
    { headers: getAuthHeaders() }
  );
  return response.data;
}

export async function saveInventoryHistoryReport(reportData = {}) {
  const response = await axios.post(
    `${API_URL}/api/inventory/movements/reports`,
    compactParams(reportData),
    {
      headers: getAuthHeaders(),
    }
  );

  return response.data;
}

export async function getLatestInventoryHistoryReport() {
  const response = await axios.get(`${API_URL}/api/inventory/movements/reports/latest`, {
    headers: getAuthHeaders(),
  });

  return response.data;
}

export async function getInventoryAuditLogs(params = {}) {
  const response = await axios.get(`${API_URL}/api/inventory/audit`, {
    headers: getAuthHeaders(),
    params: compactParams(params),
  });

  return response.data;
}
