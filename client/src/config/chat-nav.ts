import { Hash, Users, type LucideIcon } from "lucide-react";

export type ChatSection = "projects" | "direct";

export type ChatSectionItem = {
  id: ChatSection;
  label: string;
  icon: LucideIcon;
};

export const chatSections: ChatSectionItem[] = [
  { id: "projects", label: "Projects", icon: Users },
  { id: "direct", label: "Direct", icon: Hash },
];
