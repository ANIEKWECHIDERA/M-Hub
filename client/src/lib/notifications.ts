import {
  Bell,
  Briefcase,
  MessageSquare,
  type LucideIcon,
  Paperclip,
  UserPlus,
} from "lucide-react";
import type { NotificationRecord } from "@/api/notifications.api";
import { formatRelativeTimestamp } from "@/lib/datetime";

export function getNotificationBaseType(type: string) {
  return type.split(":")[0] ?? type;
}

export function getNotificationRoute(notification: NotificationRecord) {
  const parts = notification.type.split(":");
  const baseType = getNotificationBaseType(notification.type);

  switch (baseType) {
    case "task_assigned":
    case "task_status":
    case "task_due":
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
    case "task_due":
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
  return formatRelativeTimestamp(timestamp);
}

export function sortNotifications(
  notifications: NotificationRecord[],
): NotificationRecord[] {
  return [...notifications].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}
