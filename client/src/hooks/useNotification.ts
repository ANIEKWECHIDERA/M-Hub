import { useState } from "react";

interface Notification {
  id: number;
  title: string;
  message: string;
  time: string;
  unread: boolean;
}

const mockNotifications: Notification[] = [
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

export function useNotifications() {
  const [notifications, setNotifications] =
    useState<Notification[]>(mockNotifications);

  const markAsRead = (id: number) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, unread: false })));
  };

  const unreadCount = notifications.filter((n) => n.unread).length;

  return { notifications, markAsRead, markAllAsRead, unreadCount };
}
