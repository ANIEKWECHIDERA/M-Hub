import {
  Bell,
  Briefcase,
  FolderOpen,
  MessageSquare,
  type LucideIcon,
  Paperclip,
  UserPlus,
} from "lucide-react";
import type { NotificationRecord } from "@/api/notifications.api";

export function getNotificationBaseType(type: string) {
  return type.split(":")[0] ?? type;
}

export function getNotificationRoute(notification: NotificationRecord) {
  const parts = notification.type.split(":");
  const baseType = getNotificationBaseType(notification.type);

  switch (baseType) {
    case "task_assigned":
    case "task_status":
      return "/mytasks";
    case "task_comment":
      return parts[2] ? `/projectdetails/${parts[2]}` : "/mytasks";
    case "project_comment":
      return parts[1] ? `/projectdetails/${parts[1]}` : "/projects";
    case "asset_uploaded":
      return parts[1] ? `/projectdetails/${parts[1]}` : "/projects";
    case "invite_accepted":
      return "/settings?section=team";
    default:
      return "/projects";
  }
}

export function getNotificationIcon(type: string): LucideIcon {
  switch (getNotificationBaseType(type)) {
    case "task_assigned":
    case "task_status":
      return Briefcase;
    case "task_comment":
    case "project_comment":
      return MessageSquare;
    case "asset_uploaded":
      return Paperclip;
    case "invite_accepted":
      return UserPlus;
    default:
      return Bell;
  }
}

export function formatNotificationTime(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  const formatter = new Intl.RelativeTimeFormat(undefined, {
    numeric: "auto",
  });

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 7) {
    return formatter.format(diffDays, "day");
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function sortNotifications(
  notifications: NotificationRecord[],
): NotificationRecord[] {
  return [...notifications].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}
