import axios, { API_URL } from "./apiConfig";
import { getAuthHeaders } from "../middleware/authHeaders";

export async function getDiscounts() {
  const response = await axios.get(`${API_URL}/api/discounts`, {
    headers: getAuthHeaders(),
  });

  return response.data;
}

export async function createDiscount(discountData) {
  const response = await axios.post(`${API_URL}/api/discounts`, discountData, {
    headers: getAuthHeaders(),
  });

  return response.data;
}

export async function updateDiscount(id, discountData) {
  const response = await axios.put(`${API_URL}/api/discounts/${id}`, discountData, {
    headers: getAuthHeaders(),
  });

  return response.data;
}

export async function deleteDiscount(id) {
  await axios.delete(`${API_URL}/api/discounts/${id}`, {
    headers: getAuthHeaders(),
  });
}
