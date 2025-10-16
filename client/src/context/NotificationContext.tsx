import { createContext, useContext, useMemo, useState } from "react";

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  time: string; // human friendly or ISO string
  unread: boolean;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  addNotification: (n: Omit<NotificationItem, "id" | "unread">) => void;
  markAsRead: (id: number) => void;
  markAllAsRead: () => void;
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotificationContext = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx)
    throw new Error(
      "useNotificationContext must be used within NotificationProvider"
    );
  return ctx;
};

const initialMock: NotificationItem[] = [
  {
    id: 1,
    title: "Task assigned to you",
    message: "Logo Design task has been assigned to you",
    time: "5 minutes ago",
    unread: true,
  },
  {
    id: 2,
    title: "Project updated",
    message: "TechCorp project deadline has been extended",
    time: "1 hour ago",
    unread: true,
  },
  {
    id: 3,
    title: "New comment",
    message: "Sarah commented on Brand Guidelines task",
    time: "2 hours ago",
    unread: false,
  },
];

export const NotificationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [notifications, setNotifications] =
    useState<NotificationItem[]>(initialMock);

  const markAsRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const addNotification = (n: Omit<NotificationItem, "id" | "unread">) => {
    setNotifications((prev) => [
      { id: Date.now(), unread: true, ...n },
      ...prev,
    ]);
  };

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.unread).length,
    [notifications]
  );

  const value: NotificationContextType = {
    notifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    unreadCount,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
