import axios from "axios";
import { getAuthHeaders } from "../middleware/authHeaders";

const API_URL = "http://localhost:8080";
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
