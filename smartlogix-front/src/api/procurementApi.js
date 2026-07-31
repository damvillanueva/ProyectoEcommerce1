import axios, { API_URL } from "./apiConfig";
import { getAuthHeaders } from "../middleware/authHeaders";

const config = () => ({ headers: getAuthHeaders() });

export async function getSuppliersRequest() {
  const response = await axios.get(`${API_URL}/api/inventory/suppliers`, config());
  return response.data;
}

export async function createSupplierRequest(payload) {
  const response = await axios.post(`${API_URL}/api/inventory/suppliers`, payload, config());
  return response.data;
}

export async function updateSupplierRequest(id, payload) {
  const response = await axios.put(`${API_URL}/api/inventory/suppliers/${id}`, payload, config());
  return response.data;
}

export async function deactivateSupplierRequest(id) {
  const response = await axios.delete(`${API_URL}/api/inventory/suppliers/${id}`, config());
  return response.data;
}

export async function saveSupplierProductRequest(supplierId, payload) {
  const response = await axios.post(
    `${API_URL}/api/inventory/suppliers/${supplierId}/products`,
    payload,
    config(),
  );
  return response.data;
}

export async function removeSupplierProductRequest(supplierId, sku) {
  const response = await axios.delete(
    `${API_URL}/api/inventory/suppliers/${supplierId}/products/${encodeURIComponent(sku)}`,
    config(),
  );
  return response.data;
}

export async function getPurchaseOrdersRequest() {
  const response = await axios.get(`${API_URL}/api/inventory/purchase-orders`, config());
  return response.data;
}

export async function createPurchaseOrderRequest(payload) {
  const response = await axios.post(
    `${API_URL}/api/inventory/purchase-orders`,
    payload,
    config(),
  );
  return response.data;
}

export async function approvePurchaseOrderRequest(id) {
  const response = await axios.post(
    `${API_URL}/api/inventory/purchase-orders/${id}/approve`,
    {},
    config(),
  );
  return response.data;
}

export async function receivePurchaseOrderRequest(id, payload) {
  const response = await axios.post(
    `${API_URL}/api/inventory/purchase-orders/${id}/receive`,
    payload,
    config(),
  );
  return response.data;
}

export async function cancelPurchaseOrderRequest(id) {
  const response = await axios.post(
    `${API_URL}/api/inventory/purchase-orders/${id}/cancel`,
    {},
    config(),
  );
  return response.data;
}

export async function getReplenishmentProposalsRequest() {
  const response = await axios.get(
    `${API_URL}/api/inventory/replenishment/proposals`,
    config(),
  );
  return response.data;
}
