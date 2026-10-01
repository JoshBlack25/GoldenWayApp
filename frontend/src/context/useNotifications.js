import { useContext } from "react";
import { NotificationContext } from "./notificationContext";

/**
 * Hook for reading the live notification bell state from
 * NotificationProvider: { unread, notifications, refresh, markAllRead, markRead }.
 * Split out of NotificationProvider.jsx so that file only exports a
 * component (react fast-refresh requirement).
 */
export function useNotifications() {
  return useContext(NotificationContext);
}
