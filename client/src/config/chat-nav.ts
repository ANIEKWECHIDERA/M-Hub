import { Hash, MessageSquare, Users, type LucideIcon } from "lucide-react";

export type ChatSection = "all" | "projects" | "direct";

export type ChatSectionItem = {
  id: ChatSection;
  label: string;
  icon: LucideIcon;
  unreadCount?: number;
};

export const chatSections: ChatSectionItem[] = [
  { id: "all", label: "All", icon: MessageSquare, unreadCount: 4 },
  { id: "projects", label: "Projects", icon: Users, unreadCount: 1 },
  { id: "direct", label: "Direct", icon: Hash, unreadCount: 3 },
];
