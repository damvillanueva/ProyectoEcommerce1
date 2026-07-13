import axios from "axios";
import { getAuthHeaders } from "../middleware/authHeaders";

const API_URL = "http://localhost:8080";

export async function getUsers() {
  const response = await axios.get(`${API_URL}/api/auth/users`, {
    headers: getAuthHeaders(),
  });

  return response.data;
}

export async function createUser(userData) {
  const response = await axios.post(`${API_URL}/api/auth/users`, userData, {
    headers: getAuthHeaders(),
  });

  return response.data;
}

export async function updateUser(id, userData) {
  const response = await axios.put(`${API_URL}/api/auth/users/${id}`, userData, {
    headers: getAuthHeaders(),
  });

  return response.data;
}