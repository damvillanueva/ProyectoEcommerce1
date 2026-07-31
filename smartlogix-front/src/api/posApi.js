import axios, { API_URL } from "./apiConfig";
import { getAuthHeaders } from "../middleware/authHeaders";

export async function getCurrentCashRegister() {
  const response = await axios.get(`${API_URL}/api/pos/sessions/current`, {
    headers: getAuthHeaders(),
  });
  return response.data || null;
}

export async function getCashRegisterHistory() {
  const response = await axios.get(`${API_URL}/api/pos/sessions/history`, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function openCashRegister(data) {
  const response = await axios.post(`${API_URL}/api/pos/sessions/open`, data, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function closeCashRegister(sessionNumber, data) {
  const response = await axios.post(
    `${API_URL}/api/pos/sessions/${encodeURIComponent(sessionNumber)}/close`,
    data,
    { headers: getAuthHeaders() },
  );
  return response.data;
}

export async function getPosSales(sessionNumber) {
  const response = await axios.get(
    `${API_URL}/api/pos/sessions/${encodeURIComponent(sessionNumber)}/sales`,
    { headers: getAuthHeaders() },
  );
  return response.data;
}

export async function createPosSale(data) {
  const response = await axios.post(`${API_URL}/api/pos/sales`, data, {
    headers: getAuthHeaders(),
  });
  return response.data;
}
