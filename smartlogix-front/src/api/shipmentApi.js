import axios from "axios";
import { getAuthHeaders } from "../middleware/authHeaders";
import { API_URL } from "./apiConfig";

export async function getShipments() {
  const response = await axios.get(`${API_URL}/api/shipments`, {
    headers: getAuthHeaders(),
  });

  return response.data;
}

export async function createShipment(shipmentData) {
  const response = await axios.post(`${API_URL}/api/shipments`, shipmentData, {
    headers: getAuthHeaders(),
  });

  return response.data;
}

export async function updateShipment(trackingCode, shipmentData) {
  const response = await axios.put(
    `${API_URL}/api/shipments/${trackingCode}`,
    shipmentData,
    {
      headers: getAuthHeaders(),
    }
  );

  return response.data;
}

export async function deleteShipment(trackingCode) {
  await axios.delete(`${API_URL}/api/shipments/${trackingCode}`, {
    headers: getAuthHeaders(),
  });
}
