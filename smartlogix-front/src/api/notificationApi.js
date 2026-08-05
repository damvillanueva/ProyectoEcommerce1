import axios, { API_URL } from "./apiConfig";
import { getAuthHeaders } from "../middleware/authHeaders";

const config = () => ({ headers: getAuthHeaders() });

export async function getMyNotifications() {
  const response = await axios.get(`${API_URL}/api/notifications/mine`, config());
  return response.data;
}

export async function markMyNotificationRead(notificationId) {
  const response = await axios.patch(
    `${API_URL}/api/notifications/mine/${notificationId}/read`,
    null,
    config(),
  );
  return response.data;
}

export async function markAllMyNotificationsRead() {
  await axios.patch(`${API_URL}/api/notifications/mine/read-all`, null, config());
}

export async function getManagedNotifications() {
  const response = await axios.get(`${API_URL}/api/notifications`, config());
  return response.data;
}

export async function retryManagedNotification(notificationId) {
  const response = await axios.post(
    `${API_URL}/api/notifications/${notificationId}/retry`,
    null,
    config(),
  );
  return response.data;
}
