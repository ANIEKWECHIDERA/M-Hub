import { Bell, Shield, User, type LucideIcon } from "lucide-react";

export type SettingsSection = "profile" | "notifications" | "security";

export type SettingsSectionItem = {
  id: SettingsSection;
  label: string;
  description: string;
  icon: LucideIcon;
  teamMemberHidden?: boolean;
};

export const settingsSections: SettingsSectionItem[] = [
  {
    id: "profile",
    label: "Profile",
    description: "Personal details and photo",
    icon: User,
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Alerts and preferences",
    icon: Bell,
  },
  {
    id: "security",
    label: "Security",
    description: "Password and account protection",
    icon: Shield,
  },
];

export function getAllowedSettingsSections(isTeamMember: boolean) {
  return settingsSections.filter(
    (section) => !isTeamMember || !section.teamMemberHidden,
  );
}
