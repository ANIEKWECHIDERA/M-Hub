import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  notificationsAPI,
  type NotificationListResponse,
  type NotificationRecord,
} from "@/api/notifications.api";
import { useAuthContext } from "./AuthContext";
import { useSettingsContext } from "./SettingsContext";
import { API_CONFIG } from "@/lib/api";
import { sortNotifications } from "@/lib/notifications";

type NotificationStreamEvent =
  | {
      type: "notification.created";
      user_id: string;
      company_id: string;
      notification: NotificationRecord;
    }
  | {
      type: "notification.read";
      user_id: string;
      company_id: string;
      notificationId: string;
    }
  | {
      type: "notification.read_all";
      user_id: string;
      company_id: string;
    }
  | {
      type: "notification.deleted";
      user_id: string;
      company_id: string;
      notificationId: string;
    }
  | {
      type: "notification.cleared_all";
      user_id: string;
      company_id: string;
    };

interface NotificationContextType {
  notifications: NotificationRecord[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  refreshNotifications: (options?: { silent?: boolean }) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotificationContext must be used within NotificationProvider",
    );
  }

  return context;
};

function mergeNotificationLists(
  current: NotificationRecord[],
  incoming: NotificationRecord[],
) {
  const map = new Map<string, NotificationRecord>();

  [...current, ...incoming].forEach((notification) => {
    map.set(notification.id, notification);
  });

  return sortNotifications(Array.from(map.values()));
}

export const NotificationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { idToken, authStatus, currentUser } = useAuthContext();
  const { preferences } = useSettingsContext();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<EventSource | null>(null);
  const pollRef = useRef<number | null>(null);
  const refreshRef = useRef<Promise<void> | null>(null);
  const refreshScopeRef = useRef<string | null>(null);
  const idTokenRef = useRef<string | null>(idToken);
  const scopeKeyRef = useRef<string | null>(null);
  const notificationsById = useMemo(
    () =>
      new Map(
        notifications.map((notification) => [notification.id, notification] as const),
      ),
    [notifications],
  );
  const notificationsByIdRef = useRef(notificationsById);

  useEffect(() => {
    idTokenRef.current = idToken;
  }, [idToken]);

  useEffect(() => {
    notificationsByIdRef.current = notificationsById;
  }, [notificationsById]);

  const scopeKey =
    Boolean(idToken) &&
    Boolean(currentUser) &&
    authStatus?.onboardingState === "ACTIVE" &&
    Boolean(authStatus.companyId)
      ? `${currentUser?.uid}:${authStatus?.companyId}`
      : null;

  useEffect(() => {
    scopeKeyRef.current = scopeKey;
  }, [scopeKey]);

  const resetNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
    setError(null);
    setLoading(false);
  }, []);

  const applyListResponse = useCallback((response: NotificationListResponse) => {
    setNotifications(sortNotifications(response.notifications ?? []));
    setUnreadCount(response.unreadCount ?? 0);
    setError(null);
  }, []);

  const refreshNotifications = useCallback(
    async (options?: { silent?: boolean }) => {
      const activeToken = idTokenRef.current;

      if (!activeToken || !scopeKey || !preferences.notifications) {
        resetNotifications();
        return;
      }

      if (refreshRef.current && refreshScopeRef.current === scopeKey) {
        return refreshRef.current;
      }

      const silent = options?.silent ?? false;
      const requestScope = scopeKey;

      const request = (async () => {
        if (!silent) {
          setLoading(true);
        }

        try {
          const response = await notificationsAPI.list(activeToken);
          if (scopeKeyRef.current === requestScope) {
            applyListResponse(response);
          }
        } catch (refreshError: any) {
          if (scopeKeyRef.current === requestScope) {
            setError(refreshError.message || "Failed to load notifications");
          }
        } finally {
          if (!silent) {
            setLoading(false);
          }
        }
      })();

      refreshRef.current = request;
      refreshScopeRef.current = requestScope;

      try {
        await request;
      } finally {
        if (refreshRef.current === request) {
          refreshRef.current = null;
          refreshScopeRef.current = null;
        }
      }
    },
    [applyListResponse, preferences.notifications, resetNotifications, scopeKey],
  );

  const markAsRead = useCallback(
    async (id: string) => {
      if (!idToken) {
        return;
      }

      const previousNotifications = notifications;
      const previousUnreadCount = unreadCount;
      const target = notificationsById.get(id);

      if (!target || target.read) {
        return;
      }

      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === id ? { ...notification, read: true } : notification,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      try {
        const response = await notificationsAPI.markAsRead(id, idToken);
        setNotifications((prev) =>
          prev.map((notification) =>
            notification.id === id ? response.notification : notification,
          ),
        );
        setUnreadCount(response.unreadCount);
      } catch (markError: any) {
        setNotifications(previousNotifications);
        setUnreadCount(previousUnreadCount);
        setError(markError.message || "Failed to update notification");
      }
    },
    [idToken, notifications, notificationsById, unreadCount],
  );

  const markAllAsRead = useCallback(async () => {
    if (!idToken || unreadCount === 0) {
      return;
    }

    const previousNotifications = notifications;
    const previousUnreadCount = unreadCount;

    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, read: true })),
    );
    setUnreadCount(0);

    try {
      const response = await notificationsAPI.markAllAsRead(idToken);
      setUnreadCount(response.unreadCount);
    } catch (markAllError: any) {
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
      setError(markAllError.message || "Failed to update notifications");
    }
  }, [idToken, notifications, unreadCount]);

  const clearNotification = useCallback(
    async (id: string) => {
      if (!idToken) {
        return;
      }

      const previousNotifications = notifications;
      const previousUnreadCount = unreadCount;
      const target = notificationsById.get(id);

      if (!target) {
        return;
      }

      setNotifications((prev) =>
        prev.filter((notification) => notification.id !== id),
      );

      if (!target.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      try {
        const response = await notificationsAPI.clearOne(id, idToken);
        setUnreadCount(response.unreadCount);
      } catch (clearError: any) {
        setNotifications(previousNotifications);
        setUnreadCount(previousUnreadCount);
        setError(clearError.message || "Failed to clear notification");
      }
    },
    [idToken, notifications, notificationsById, unreadCount],
  );

  const clearAllNotifications = useCallback(async () => {
    if (!idToken || notifications.length === 0) {
      return;
    }

    const previousNotifications = notifications;
    const previousUnreadCount = unreadCount;

    setNotifications([]);
    setUnreadCount(0);

    try {
      const response = await notificationsAPI.clearAll(idToken);
      setUnreadCount(response.unreadCount);
    } catch (clearError: any) {
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
      setError(clearError.message || "Failed to clear notifications");
    }
  }, [idToken, notifications, unreadCount]);

  useEffect(() => {
    resetNotifications();
    refreshRef.current = null;
    refreshScopeRef.current = null;

    if (!scopeKey || !preferences.notifications) {
      return;
    }

    refreshNotifications();
  }, [preferences.notifications, scopeKey, refreshNotifications, resetNotifications]);

  useEffect(() => {
    if (!scopeKey || !idTokenRef.current || !preferences.notifications) {
      streamRef.current?.close();
      streamRef.current = null;

      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }

      return;
    }

    const stream = new EventSource(
      `${API_CONFIG.backend}/api/notifications/stream?token=${encodeURIComponent(
        idTokenRef.current,
      )}`,
    );

    const startFallbackPolling = () => {
      if (pollRef.current) {
        return;
      }

      pollRef.current = window.setInterval(() => {
        if (document.visibilityState === "visible") {
          refreshNotifications({ silent: true });
        }
      }, 60000);
    };

    const stopFallbackPolling = () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };

    const handleNotificationEvent = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as NotificationStreamEvent;

        if (payload.company_id !== authStatus?.companyId) {
          return;
        }

        if (payload.type === "notification.created") {
          setNotifications((prev) => {
            const exists = notificationsByIdRef.current.has(payload.notification.id);

            if (!exists && !payload.notification.read) {
              setUnreadCount((count) => count + 1);
            }

            return mergeNotificationLists(prev, [payload.notification]);
          });
          window.dispatchEvent(
            new CustomEvent("crevo:notification-created", {
              detail: payload.notification,
            }),
          );
          return;
        }

        if (payload.type === "notification.read") {
          setNotifications((prev) => {
            const target = notificationsByIdRef.current.get(payload.notificationId);

            if (target && !target.read) {
              setUnreadCount((count) => Math.max(0, count - 1));
            }

            return prev.map((notification) =>
              notification.id === payload.notificationId
                ? { ...notification, read: true }
                : notification,
            );
          });
          return;
        }

        if (payload.type === "notification.deleted") {
          setNotifications((prev) => {
            const target = notificationsByIdRef.current.get(payload.notificationId);

            if (target && !target.read) {
              setUnreadCount((count) => Math.max(0, count - 1));
            }

            return prev.filter(
              (notification) => notification.id !== payload.notificationId,
            );
          });
          return;
        }

        if (payload.type === "notification.cleared_all") {
          setNotifications([]);
          setUnreadCount(0);
          return;
        }

        setNotifications((prev) =>
          prev.map((notification) => ({ ...notification, read: true })),
        );
        setUnreadCount(0);
      } catch {
        // Ignore malformed stream events and let polling reconcile state.
      }
    };

    stream.addEventListener("notification", handleNotificationEvent);
    stream.onopen = () => {
      stopFallbackPolling();
    };
    stream.onerror = () => {
      // Let EventSource reconnect automatically and use light polling only as a
      // fallback while the stream is unhealthy.
      startFallbackPolling();
    };

    streamRef.current = stream;

    return () => {
      stream.removeEventListener("notification", handleNotificationEvent);
      stream.close();
      streamRef.current = null;
      stopFallbackPolling();
    };
  }, [
    authStatus?.companyId,
    preferences.notifications,
    refreshNotifications,
    scopeKey,
  ]);

  const value = useMemo<NotificationContextType>(
    () => ({
      notifications,
      unreadCount,
      loading,
      error,
      markAsRead,
      markAllAsRead,
      clearNotification,
      clearAllNotifications,
      refreshNotifications,
    }),
    [
      notifications,
      unreadCount,
      loading,
      error,
      markAsRead,
      markAllAsRead,
      clearNotification,
      clearAllNotifications,
      refreshNotifications,
    ],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
