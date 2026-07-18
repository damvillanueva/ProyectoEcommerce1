import axios from "axios";
import { getAuthHeaders } from "../middleware/authHeaders";
import { API_URL } from "./apiConfig";

export async function loginRequest(data) {
    const response = await axios.post(`${API_URL}/api/auth/login`, data);
    return response.data;
}

export async function registerRequest(data) {
    const response = await axios.post(`${API_URL}/api/auth/register`, data);
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
