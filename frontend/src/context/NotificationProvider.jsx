import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "./auth";
import { supabase } from "../lib/supabaseClient";
import { fetchNotifications, fetchUnreadCount, markNotificationsRead } from "../api/operations";
import { NotificationContext } from "./notificationContext";
/**
 * NotificationProvider (D3, Q7) — live bell over the notifications table.
 * Counts + list load on sign-in; a Postgres realtime subscription (0007
 * enables realtime on notifications) refreshes on INSERT for this user.
 * Exposes { unread, notifications, refresh, markAllRead, markRead } via
 * the useNotifications hook (./useNotifications).
 */

export default function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [userId, setUserId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // The context user shape differs (commuter has id; staff doesn't), so
  // resolve the auth UUID straight from the session.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
  }, [user]);

  const refresh = useCallback(async () => {
    try {
      const [list, count] = await Promise.all([fetchNotifications(), fetchUnreadCount()]);
      setNotifications(list);
      setUnread(count);
    } catch {
      // notifications are additive — never block the app
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setUnread(0);
      setLoaded(false);
      return;
    }
    refresh();

    // Realtime: any new row for this user bumps the bell. The 0007
    // migration enables realtime publication on public.notifications;
    // if the project hasn't been added to the publication, this channel
    // simply stays quiet (refresh() on focus still picks changes up).
    const channel = supabase
      .channel("notifications-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, userId, refresh]);

  const markAllRead = useCallback(async () => {
    await markNotificationsRead(null);
    setUnread(0);
    setNotifications((list) => list.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
  }, []);

  const markRead = useCallback(async (ids) => {
    const count = await markNotificationsRead(ids);
    setUnread((u) => Math.max(0, u - (count ?? 0)));
    setNotifications((list) =>
      list.map((n) => (ids.includes(n.id) ? { ...n, readAt: n.readAt || new Date().toISOString() } : n)),
    );
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ unread, notifications, loaded, refresh, markAllRead, markRead }),
    [unread, notifications, loaded, refresh, markAllRead, markRead],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
