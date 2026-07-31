import axios, { API_URL } from "./apiConfig";
import { getAuthHeaders } from "../middleware/authHeaders";

const config = () => ({ headers: getAuthHeaders() });

export async function getMyPostSales() {
  const response = await axios.get(`${API_URL}/api/returns/mine`, config());
  return response.data;
}

export async function createMyPostSale(orderNumber, data) {
  const response = await axios.post(
    `${API_URL}/api/returns/mine/orders/${encodeURIComponent(orderNumber)}`,
    data,
    config()
  );
  return response.data;
}

export async function cancelMyPostSale(requestNumber) {
  const response = await axios.post(
    `${API_URL}/api/returns/mine/${encodeURIComponent(requestNumber)}/cancel`,
    {},
    config()
  );
  return response.data;
}

export async function getPostSales() {
  const response = await axios.get(`${API_URL}/api/returns`, config());
  return response.data;
}

export async function reviewPostSale(requestNumber, data) {
  const response = await axios.post(
    `${API_URL}/api/returns/${encodeURIComponent(requestNumber)}/review`,
    data,
    config()
  );
  return response.data;
}

export async function receivePostSale(requestNumber, data) {
  const response = await axios.post(
    `${API_URL}/api/returns/${encodeURIComponent(requestNumber)}/receive`,
    data,
    config()
  );
  return response.data;
}

export async function resolvePostSale(requestNumber, data) {
  const response = await axios.post(
    `${API_URL}/api/returns/${encodeURIComponent(requestNumber)}/resolve`,
    data,
    config()
  );
  return response.data;
}
