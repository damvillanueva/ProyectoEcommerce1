import {
  getManagedNotifications,
  getMyNotifications,
  markAllMyNotificationsRead,
  markMyNotificationRead,
  retryManagedNotification,
} from "../api/notificationApi";

export const loadMyNotifications = () => getMyNotifications();
export const readMyNotification = (notificationId) => markMyNotificationRead(notificationId);
export const readAllMyNotifications = () => markAllMyNotificationsRead();
export const loadManagedNotifications = () => getManagedNotifications();
export const retryNotification = (notificationId) => retryManagedNotification(notificationId);
