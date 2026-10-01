import { createContext } from "react";

/**
 * Context holding the live notification bell state
 * ({ unread, notifications, refresh, markAllRead, markRead }).
 * Kept in its own module so both the provider (component) and the
 * useNotifications hook can import it without cycles.
 */
export const NotificationContext = createContext(null);
