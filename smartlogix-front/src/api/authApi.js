import axios, { API_URL } from "./apiConfig";
import { getAuthHeaders } from "../middleware/authHeaders";

export async function loginRequest(data) {
  const response = await axios.post(`${API_URL}/api/auth/login`, data);
  return response.data;
}

export async function registerRequest(data) {
  const response = await axios.post(`${API_URL}/api/auth/register`, data);
  return response.data;
}

export async function logoutRequest() {
  const response = await axios.post(`${API_URL}/api/auth/logout`);
  return response.data;
}

export async function requestPasswordResetRequest(email) {
  const response = await axios.post(`${API_URL}/api/auth/password/forgot`, { email });
  return response.data;
}

export async function resetPasswordRequest(token, password) {
  const response = await axios.post(`${API_URL}/api/auth/password/reset`, { token, password });
  return response.data;
}

export async function verifyEmailRequest(token) {
  const response = await axios.post(`${API_URL}/api/auth/email/verify`, { token });
  return response.data;
}

export async function resendVerificationRequest(email) {
  const response = await axios.post(`${API_URL}/api/auth/email/resend`, { email });
  return response.data;
}

export async function getCustomerProfileRequest() {
  const response = await axios.get(`${API_URL}/api/auth/me`, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function updateCustomerProfileRequest(data) {
  const response = await axios.put(`${API_URL}/api/auth/me`, data, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function createCustomerAddressRequest(data) {
  const response = await axios.post(`${API_URL}/api/auth/me/addresses`, data, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function updateCustomerAddressRequest(addressId, data) {
  const response = await axios.put(`${API_URL}/api/auth/me/addresses/${addressId}`, data, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function deleteCustomerAddressRequest(addressId) {
  await axios.delete(`${API_URL}/api/auth/me/addresses/${addressId}`, {
    headers: getAuthHeaders(),
  });
}

export async function getCustomerFavoritesRequest() {
  const response = await axios.get(`${API_URL}/api/auth/me/favorites`, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function addCustomerFavoriteRequest(sku) {
  const response = await axios.post(
    `${API_URL}/api/auth/me/favorites/${encodeURIComponent(sku)}`,
    null,
    { headers: getAuthHeaders() }
  );
  return response.data;
}

export async function removeCustomerFavoriteRequest(sku) {
  await axios.delete(`${API_URL}/api/auth/me/favorites/${encodeURIComponent(sku)}`, {
    headers: getAuthHeaders(),
  });
}
