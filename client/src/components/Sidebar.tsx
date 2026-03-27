import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  FolderOpen,
  MessageSquare,
  FileText,
  Settings,
  Target,
  Sparkles,
  ListTodo,
  Building2,
  Loader2,
  ChevronDown,
  Trash2,
  BriefcaseBusiness,
  Users,
  HeartPulse,
  MoreHorizontal,
  CheckCircle2,
  AlertTriangle,
  CircleDot,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/context/AuthContext";
import { useChatContext } from "@/context/ChatContext";
import { workspaceAPI, type Workspace } from "@/api/workspace.api";
import { CrevoMark } from "@/components/CrevoMark";
import { toast } from "sonner";
import { chatSections, type ChatSection } from "@/config/chat-nav";
import {
  getAllowedSettingsSections,
  type SettingsSection,
} from "@/config/settings-nav";
import {
  Sidebar as AppSidebar,
  SidebarContent as SidebarBody,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { useRetentionSnapshot } from "@/hooks/useRetentionSnapshot";
import { useSettingsContext } from "@/context/SettingsContext";
import { useMyTasksContext } from "@/context/MyTaskContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItem {
  name: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
}

const submenuMotionProps = {
  initial: { height: 0, opacity: 0, marginTop: 0 },
  animate: { height: "auto", opacity: 1, marginTop: 4 },
  exit: { height: 0, opacity: 0, marginTop: 0 },
  transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] as const },
};

function SidebarSubmenu({
  open,
  children,
  panelRef,
}: {
  open: boolean;
  children: React.ReactNode;
  panelRef?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          ref={panelRef}
          {...submenuMotionProps}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

const baseNavigation: NavItem[] = [
  { name: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { name: "Projects", to: "/projects", icon: FolderOpen },
  { name: "Chat", to: "/chat", icon: MessageSquare },
  { name: "Notes", to: "/notepad", icon: FileText },
];

const focusSections = [
  {
    id: "tasks",
    label: "My Tasks",
    icon: ListTodo,
  },
  {
    id: "daily-focus",
    label: "Daily Focus",
    icon: Sparkles,
  },
] as const;

const chatSectionsById = new Map(chatSections.map((section) => [section.id, section] as const));
const focusSectionsById = new Map(
  focusSections.map((section) => [section.id, section] as const),
);

function getWorkspaceHealthMeta(
  status?: "Healthy" | "At Risk" | "Critical" | null,
) {
  switch (status) {
    case "Healthy":
      return {
        icon: CheckCircle2,
        badgeClass: "border-emerald-200 bg-emerald-100 text-emerald-800",
      };
    case "At Risk":
      return {
        icon: AlertTriangle,
        badgeClass: "border-amber-200 bg-amber-100 text-amber-800",
      };
    case "Critical":
      return {
        icon: CircleDot,
        badgeClass: "border-rose-200 bg-rose-100 text-rose-800",
      };
    default:
      return {
        icon: HeartPulse,
        badgeClass: "border-slate-200 bg-slate-100 text-slate-700",
      };
  }
}

const workspaceManagerSections: Array<{
  id: "details" | "workload" | "team" | "invites" | "delete";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  superAdminOnly?: boolean;
}> = [
  {
    id: "details",
    label: "Workspace Details",
    icon: BriefcaseBusiness,
  },
  {
    id: "workload",
    label: "Team Workload",
    icon: Users,
  },
  {
    id: "team",
    label: "Team",
    icon: Users,
  },
  {
    id: "invites",
    label: "Invites",
    icon: BriefcaseBusiness,
  },
  {
    id: "delete",
    label: "Delete Workspace",
    icon: Trash2,
    superAdminOnly: true,
  },
] as const;

const workspaceManagerSectionsById = new Map(
  workspaceManagerSections.map((section) => [section.id, section] as const),
);

interface SidebarPanelProps {
  collapsed: boolean;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  loadingWorkspaces: boolean;
  onSwitchWorkspace: (companyId: string) => Promise<void>;
  pathname: string;
  search: string;
}

function SidebarPanel({
  collapsed,
  workspaces,
  currentWorkspace,
  loadingWorkspaces,
  onSwitchWorkspace,
  pathname,
  search,
}: SidebarPanelProps) {
  const isExpanded = !collapsed;
  const { isMobile, setOpenMobile, setOpen } = useSidebar();
  const { authStatus } = useAuthContext();
  const { preferences, setPreferences } = useSettingsContext();
  const isTeamMember =
    authStatus?.access === "team_member" || authStatus?.access === "member";
  const canSeeWorkspaceHealth =
    authStatus?.access === "admin" || authStatus?.access === "superAdmin";
  const { totalUnreadCount, unreadBySection, refreshWorkspaceMembers } =
    useChatContext();
  const { refetch: refetchMyTasks } = useMyTasksContext();
  const { snapshot: retentionSnapshot, loading: retentionLoading } =
    useRetentionSnapshot({
      enabled: canSeeWorkspaceHealth && preferences.workspaceHealth,
    });
  const navigation = useMemo(
    () =>
      isTeamMember
        ? baseNavigation.filter((item) => item.to !== "/dashboard")
        : baseNavigation,
    [isTeamMember],
  );
  const activeChatSection = useMemo(() => {
    const params = new URLSearchParams(search);
    const section = params.get("section") as ChatSection | null;

    return (section ? chatSectionsById.get(section)?.id : null) ?? "projects";
  }, [search]);
  const activeFocusSection = useMemo(() => {
    const params = new URLSearchParams(search);
    const section = params.get("section") as
      | (typeof focusSections)[number]["id"]
      | null;
    return (section ? focusSectionsById.get(section)?.id : null) ?? "tasks";
  }, [search]);
  const totalChatUnread = useMemo(() => totalUnreadCount, [totalUnreadCount]);
  const settingsSections = getAllowedSettingsSections(isTeamMember);
  const settingsSectionsById = useMemo(
    () => new Map(settingsSections.map((section) => [section.id, section] as const)),
    [settingsSections],
  );
  const activeSettingsSection = useMemo(() => {
    const params = new URLSearchParams(search);
    const section = params.get("section") as SettingsSection | null;

    return (
      (section ? settingsSectionsById.get(section)?.id : null) ??
      settingsSections[0]?.id ??
      "profile"
    );
  }, [search, settingsSections, settingsSectionsById]);
  const chatOpenByDefault = pathname === "/chat";
  const focusOpenByDefault = pathname === "/mytasks";
  const settingsOpenByDefault = pathname === "/settings";
  const workspaceManagerOpenByDefault = pathname === "/workspace-manager";
  const [chatOpen, setChatOpen] = useState(chatOpenByDefault);
  const [focusOpen, setFocusOpen] = useState(focusOpenByDefault);
  const [settingsOpen, setSettingsOpen] = useState(settingsOpenByDefault);
  const [workspaceManagerOpen, setWorkspaceManagerOpen] = useState(
    workspaceManagerOpenByDefault,
  );
  const focusPanelRef = useRef<HTMLDivElement | null>(null);
  const chatPanelRef = useRef<HTMLDivElement | null>(null);
  const settingsPanelRef = useRef<HTMLDivElement | null>(null);
  const workspaceManagerPanelRef = useRef<HTMLDivElement | null>(null);
  const activeWorkspaceSection = useMemo(() => {
    const params = new URLSearchParams(search);
    const section = params.get("section") as
      | (typeof workspaceManagerSections)[number]["id"]
      | null;
    return (section ? workspaceManagerSectionsById.get(section)?.id : null) ?? "details";
  }, [search]);
  const workspaceHealth = retentionSnapshot?.workspaceHealth ?? null;
  const workspaceHealthMeta = getWorkspaceHealthMeta(workspaceHealth?.status);
  const WorkspaceHealthIcon = workspaceHealthMeta.icon;

  useEffect(() => {
    if (pathname === "/chat") {
      setChatOpen(true);
    }

    if (pathname === "/settings") {
      setSettingsOpen(true);
    }

    if (pathname === "/mytasks") {
      setFocusOpen(true);
    }

    if (pathname === "/workspace-manager") {
      setWorkspaceManagerOpen(true);
    }
  }, [pathname]);

  const scrollPanelIntoView = (
    panelRef: React.RefObject<HTMLDivElement | null>,
  ) => {
    window.requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    });
  };

  const toggleSubmenu = (
    setExpanded: React.Dispatch<React.SetStateAction<boolean>>,
    panelRef: React.RefObject<HTMLDivElement | null>,
    options?: { prefetch?: () => void },
  ) => {
    setExpanded((value) => {
      const next = !value;

      if (next) {
        options?.prefetch?.();
        scrollPanelIntoView(panelRef);
      }

      return next;
    });
  };

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleParentSubmenuClick = (
    setExpanded: React.Dispatch<React.SetStateAction<boolean>>,
    panelRef: React.RefObject<HTMLDivElement | null>,
    options?: { prefetch?: () => void },
  ) => {
    if (!isExpanded) {
      setOpen(true);
      setExpanded(true);
      options?.prefetch?.();
      window.setTimeout(() => scrollPanelIntoView(panelRef), 140);
      return;
    }

    toggleSubmenu(setExpanded, panelRef, options);
  };

  return (
    <>
      <SidebarHeader className={cn("space-y-3", !isExpanded && "px-2")}>
        <div
          className={cn(
            "flex items-center justify-start gap-3",
            !isExpanded && "justify-center",
          )}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-sidebar-border bg-sidebar-primary text-sidebar-primary-foreground">
            <CrevoMark className="h-6 w-6 text-sidebar-primary-foreground" />
          </div>
          {isExpanded && (
            <div className="flex items-center">
              <p className="text-2xl font-semibold tracking-tight">Crevo</p>
            </div>
          )}
        </div>

        <div
          className={cn(
            "rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-3",
            !isExpanded && "p-2",
          )}
        >
          {isExpanded ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={currentWorkspace?.logoUrl || undefined} />
                  <AvatarFallback>
                    {currentWorkspace?.name?.[0]?.toUpperCase() ?? "W"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {currentWorkspace?.name ?? "Workspace"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {currentWorkspace?.access ?? "team_member"}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Switch Workspace
                </p>
                {loadingWorkspaces ? (
                  <div className="flex h-10 items-center gap-2 rounded-lg border border-dashed border-sidebar-border bg-sidebar px-3 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading workspaces...
                  </div>
                ) : (
                  <Select
                    value={currentWorkspace?.companyId}
                    onValueChange={(value) => onSwitchWorkspace(value)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Choose workspace" />
                    </SelectTrigger>
                    <SelectContent>
                      {workspaces.map((workspace) => (
                        <SelectItem
                          key={workspace.companyId}
                          value={workspace.companyId}
                        >
                          {workspace.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <Avatar className="h-10 w-10">
                <AvatarImage src={currentWorkspace?.logoUrl || undefined} />
                <AvatarFallback>
                  <Building2 className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarBody className={cn(!isExpanded && "items-center px-2")}>
        <SidebarGroup>
          {isExpanded && <SidebarGroupLabel>Navigation</SidebarGroupLabel>}
          <SidebarGroupContent className={cn(!isExpanded && "w-full")}>
            <SidebarMenu
              className={cn(!isExpanded && "flex flex-col items-center")}
            >
              {navigation
                .filter((item) => item.to === "/dashboard" || item.to === "/projects")
                .map((item) => {
                const isActive =
                  pathname === item.to ||
                  (item.to !== "/dashboard" &&
                    pathname.startsWith(item.to + "/"));

                if (item.to === "/chat") {
                  return (
                    <SidebarMenuItem key={item.name}>
                      <div className={cn("relative", !isExpanded && "w-10")}>
                        <SidebarMenuButton
                          isActive={isActive}
                          tooltip={!isExpanded ? item.name : undefined}
                          aria-label={item.name}
                          className={cn(
                            !isExpanded &&
                              "mx-auto h-10 w-10 items-center justify-center px-0 text-center [&>svg]:mx-0",
                            isExpanded && chatOpen && "pr-10",
                          )}
                          onClick={() =>
                            handleParentSubmenuClick(setChatOpen, chatPanelRef, {
                              prefetch: () => {
                                void refreshWorkspaceMembers();
                              },
                            })
                          }
                        >
                          <item.icon className="h-5 w-5" />
                          {isExpanded && <span>{item.name}</span>}
                          {isExpanded && totalChatUnread > 0 && (
                            <Badge
                              variant="destructive"
                              className="ml-auto mr-8 rounded-full px-2 py-0 text-[11px]"
                            >
                              {totalChatUnread}
                            </Badge>
                          )}
                          {!isExpanded && totalChatUnread > 0 && (
                            <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-sidebar" />
                          )}
                        </SidebarMenuButton>

                        {isExpanded && (
                          <button
                            type="button"
                            aria-label={
                              chatOpen
                                ? "Collapse chat menu"
                                : "Expand chat menu"
                            }
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              toggleSubmenu(setChatOpen, chatPanelRef, {
                                prefetch: () => {
                                  void refreshWorkspaceMembers();
                                },
                              });
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
                          >
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 transition-transform",
                                chatOpen && "rotate-180",
                              )}
                            />
                          </button>
                        )}
                      </div>

                      {isExpanded && chatOpen && (
                        <div className="ml-6 mt-1 space-y-1 border-l border-sidebar-border pl-3">
                          {chatSections.map((section) => {
                            const Icon = section.icon;
                            const isSectionActive =
                              pathname === "/chat" &&
                              activeChatSection === section.id;

                            return (
                              <Link
                                key={section.id}
                                to={`/chat?section=${section.id}`}
                                onClick={handleNavClick}
                                className={cn(
                                  "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors",
                                  isSectionActive
                                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                    : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground",
                                )}
                              >
                                <Icon className="h-4 w-4" />
                                <span>{section.label}</span>
                                {(unreadBySection[section.id] ?? 0) > 0 && (
                                  <Badge
                                    variant="destructive"
                                    className="ml-auto rounded-full px-2 py-0 text-[11px]"
                                  >
                                    {unreadBySection[section.id]}
                                  </Badge>
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </SidebarMenuItem>
                  );
                }

                if (item.to === "/dashboard") {
                  return (
                    <SidebarMenuItem key={item.name}>
                      <div className={cn("relative", !isExpanded && "w-10")}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={!isExpanded ? item.name : undefined}
                          aria-label={item.name}
                          className={cn(
                            !isExpanded &&
                              "mx-auto h-10 w-10 items-center justify-center px-0 text-center [&>svg]:mx-0",
                          )}
                        >
                          <Link to={item.to} onClick={handleNavClick}>
                            <item.icon className="h-5 w-5" />
                            {isExpanded && <span>{item.name}</span>}
                          </Link>
                        </SidebarMenuButton>
                      </div>
                    </SidebarMenuItem>
                  );
                }

                if (item.to === "/projects") {
                  return (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={!isExpanded ? item.name : undefined}
                        aria-label={item.name}
                        className={cn(
                          !isExpanded &&
                            "mx-auto h-10 w-10 items-center justify-center px-0 text-center [&>svg]:mx-0",
                        )}
                      >
                        <Link to={item.to} onClick={handleNavClick}>
                          <item.icon className="h-5 w-5" />
                          {isExpanded && <span>{item.name}</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={!isExpanded ? item.name : undefined}
                      aria-label={item.name}
                      className={cn(
                        !isExpanded &&
                          "mx-auto h-10 w-10 items-center justify-center px-0 text-center [&>svg]:mx-0",
                      )}
                    >
                      <Link to={item.to} onClick={handleNavClick}>
                        <item.icon className="h-5 w-5" />
                        {isExpanded && <span>{item.name}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
                })}

              <SidebarMenuItem>
                <div className={cn("relative", !isExpanded && "w-10")}>
                  <SidebarMenuButton
                    isActive={pathname === "/mytasks"}
                    tooltip={!isExpanded ? "Focus" : undefined}
                    aria-label="Focus"
                    className={cn(
                      !isExpanded &&
                        "mx-auto h-10 w-10 items-center justify-center px-0 text-center [&>svg]:mx-0",
                      isExpanded && focusOpen && "pr-10",
                    )}
                    onClick={() =>
                      handleParentSubmenuClick(setFocusOpen, focusPanelRef, {
                        prefetch: () => {
                          void refetchMyTasks();
                        },
                      })
                    }
                  >
                    <Target className="h-5 w-5" />
                    {isExpanded && <span>Focus</span>}
                  </SidebarMenuButton>

                  {isExpanded && (
                    <button
                      type="button"
                      aria-label={
                        focusOpen ? "Collapse focus menu" : "Expand focus menu"
                      }
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        toggleSubmenu(setFocusOpen, focusPanelRef, {
                          prefetch: () => {
                            void refetchMyTasks();
                          },
                        });
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
                    >
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform",
                          focusOpen && "rotate-180",
                        )}
                      />
                    </button>
                  )}
                </div>

                <SidebarSubmenu open={isExpanded && focusOpen} panelRef={focusPanelRef}>
                  <div className="ml-6 space-y-1 border-l border-sidebar-border pl-3">
                    {focusSections.map((section) => {
                      const Icon = section.icon;
                      const isSectionActive =
                        pathname === "/mytasks" &&
                        activeFocusSection === section.id;

                      return (
                        <Link
                          key={section.id}
                          to={`/mytasks?section=${section.id}`}
                          onClick={handleNavClick}
                          className={cn(
                            "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors",
                            isSectionActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground"
                              : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground",
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{section.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </SidebarSubmenu>
              </SidebarMenuItem>

              {navigation
                .filter((item) => item.to === "/chat" || item.to === "/notepad")
                .map((item) => {
                  const isActive =
                    pathname === item.to ||
                    (item.to !== "/dashboard" &&
                      pathname.startsWith(item.to + "/"));

                  if (item.to === "/chat") {
                    return (
                      <SidebarMenuItem key={item.name}>
                        <div className={cn("relative", !isExpanded && "w-10")}>
                          <SidebarMenuButton
                            isActive={isActive}
                            tooltip={!isExpanded ? item.name : undefined}
                            aria-label={item.name}
                            className={cn(
                              !isExpanded &&
                                "mx-auto h-10 w-10 items-center justify-center px-0 text-center [&>svg]:mx-0",
                              isExpanded && chatOpen && "pr-10",
                            )}
                            onClick={() =>
                              handleParentSubmenuClick(
                                setChatOpen,
                                chatPanelRef,
                                {
                                  prefetch: () => {
                                    void refreshWorkspaceMembers();
                                  },
                                },
                              )
                            }
                          >
                            <item.icon className="h-5 w-5" />
                            {isExpanded && <span>{item.name}</span>}
                            {isExpanded && totalChatUnread > 0 && (
                              <Badge
                                variant="destructive"
                                className="ml-auto mr-8 rounded-full px-2 py-0 text-[11px]"
                              >
                                {totalChatUnread}
                              </Badge>
                            )}
                            {!isExpanded && totalChatUnread > 0 && (
                              <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-sidebar" />
                            )}
                          </SidebarMenuButton>

                          {isExpanded && (
                            <button
                              type="button"
                              aria-label={
                                chatOpen
                                  ? "Collapse chat menu"
                                  : "Expand chat menu"
                              }
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                toggleSubmenu(setChatOpen, chatPanelRef, {
                                  prefetch: () => {
                                    void refreshWorkspaceMembers();
                                  },
                                });
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
                            >
                              <ChevronDown
                                className={cn(
                                  "h-4 w-4 transition-transform",
                                  chatOpen && "rotate-180",
                                )}
                              />
                            </button>
                          )}
                        </div>

                        <SidebarSubmenu open={isExpanded && chatOpen} panelRef={chatPanelRef}>
                          <div className="ml-6 space-y-1 border-l border-sidebar-border pl-3">
                            {chatSections.map((section) => {
                              const Icon = section.icon;
                              const isSectionActive =
                                pathname === "/chat" &&
                                activeChatSection === section.id;

                              return (
                                <Link
                                  key={section.id}
                                  to={`/chat?section=${section.id}`}
                                  onClick={handleNavClick}
                                  className={cn(
                                    "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors",
                                    isSectionActive
                                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                      : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground",
                                  )}
                                >
                                  <Icon className="h-4 w-4" />
                                  <span>{section.label}</span>
                                  {(unreadBySection[section.id] ?? 0) > 0 && (
                                    <Badge
                                      variant="destructive"
                                      className="ml-auto rounded-full px-2 py-0 text-[11px]"
                                    >
                                      {unreadBySection[section.id]}
                                    </Badge>
                                  )}
                                </Link>
                              );
                            })}
                          </div>
                        </SidebarSubmenu>
                      </SidebarMenuItem>
                    );
                  }

                  return (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={!isExpanded ? item.name : undefined}
                        aria-label={item.name}
                        className={cn(
                          !isExpanded &&
                            "mx-auto h-10 w-10 items-center justify-center px-0 text-center [&>svg]:mx-0",
                        )}
                      >
                        <Link to={item.to} onClick={handleNavClick}>
                          <item.icon className="h-5 w-5" />
                          {isExpanded && <span>{item.name}</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}

              {!isTeamMember && (
                <SidebarMenuItem>
                  <div className={cn("relative", !isExpanded && "w-10")}>
                    <SidebarMenuButton
                      isActive={pathname === "/workspace-manager"}
                      tooltip={!isExpanded ? "Workspace Manager" : undefined}
                      aria-label="Workspace Manager"
                      className={cn(
                        !isExpanded &&
                          "mx-auto h-10 w-10 items-center justify-center px-0 text-center [&>svg]:mx-0",
                        isExpanded && workspaceManagerOpen && "pr-10",
                      )}
                      onClick={() => {
                        handleParentSubmenuClick(
                          setWorkspaceManagerOpen,
                          workspaceManagerPanelRef,
                        );
                      }}
                    >
                      <Building2 className="h-5 w-5" />
                      {isExpanded && <span>Workspace Manager</span>}
                    </SidebarMenuButton>

                    {isExpanded && (
                      <button
                        type="button"
                        aria-label={
                          workspaceManagerOpen
                            ? "Collapse workspace manager menu"
                            : "Expand workspace manager menu"
                        }
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          toggleSubmenu(
                            setWorkspaceManagerOpen,
                            workspaceManagerPanelRef,
                          );
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
                      >
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform",
                            workspaceManagerOpen && "rotate-180",
                          )}
                        />
                      </button>
                    )}
                  </div>

                  <SidebarSubmenu
                    open={isExpanded && workspaceManagerOpen}
                    panelRef={workspaceManagerPanelRef}
                  >
                    <div className="ml-6 space-y-1 border-l border-sidebar-border pl-3">
                      {workspaceManagerSections
                        .filter(
                          (section) =>
                            !section.superAdminOnly ||
                            authStatus?.access === "superAdmin",
                        )
                        .map((section) => {
                          const Icon = section.icon;
                          const isSectionActive =
                            pathname === "/workspace-manager" &&
                            activeWorkspaceSection === section.id;

                          return (
                            <Link
                              key={section.id}
                              to={`/workspace-manager?section=${section.id}`}
                              onClick={handleNavClick}
                              className={cn(
                                "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors",
                                isSectionActive
                                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                  : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground",
                                section.id === "delete" &&
                                  "text-red-600 hover:text-red-700",
                              )}
                            >
                              <Icon className="h-4 w-4" />
                              <span>{section.label}</span>
                            </Link>
                          );
                        })}
                    </div>
                  </SidebarSubmenu>
                </SidebarMenuItem>
              )}

              {[{ name: "Settings", to: "/settings", icon: Settings }].map(
                (item) => {
                  const isSettingsRoute = pathname === item.to;
                  const isActive = isSettingsRoute;
                  return (
                    <SidebarMenuItem key={item.name}>
                      <div className={cn("relative", !isExpanded && "w-10")}>
                        <SidebarMenuButton
                          isActive={isActive}
                          tooltip={!isExpanded ? item.name : undefined}
                          aria-label={item.name}
                          className={cn(
                            !isExpanded &&
                              "mx-auto h-10 w-10 items-center justify-center px-0 text-center [&>svg]:mx-0",
                            isExpanded && settingsOpen && "pr-10",
                          )}
                          onClick={() =>
                            handleParentSubmenuClick(
                              setSettingsOpen,
                              settingsPanelRef,
                            )
                          }
                        >
                          <item.icon className="h-5 w-5" />
                          {isExpanded && <span>{item.name}</span>}
                        </SidebarMenuButton>

                        {isExpanded && (
                          <button
                            type="button"
                            aria-label={
                              settingsOpen
                                ? "Collapse settings menu"
                                : "Expand settings menu"
                            }
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              toggleSubmenu(
                                setSettingsOpen,
                                settingsPanelRef,
                              );
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
                          >
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 transition-transform",
                                settingsOpen && "rotate-180",
                              )}
                            />
                          </button>
                        )}
                      </div>

                      <SidebarSubmenu open={isExpanded && settingsOpen} panelRef={settingsPanelRef}>
                        <div className="ml-6 space-y-1 border-l border-sidebar-border pl-3">
                          {settingsSections.map((section) => {
                            const Icon = section.icon;
                            const isSectionActive =
                              isSettingsRoute &&
                              activeSettingsSection === section.id;

                            return (
                              <Link
                                key={section.id}
                                to={`/settings?section=${section.id}`}
                                onClick={handleNavClick}
                                className={cn(
                                  "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors",
                                  isSectionActive
                                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                    : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground",
                                )}
                              >
                                <Icon className="h-4 w-4" />
                                <span>{section.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </SidebarSubmenu>
                    </SidebarMenuItem>
                  );
                },
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarBody>

      <SidebarFooter className={cn("space-y-2", !isExpanded && "px-2")}>
        {isExpanded ? (
          canSeeWorkspaceHealth && preferences.workspaceHealth ? (
            <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/30 p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium">Workspace Health</p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <HelpCircle className="h-3.5 w-3.5" />
                          <span className="sr-only">
                            What workspace health means
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[220px] text-left leading-relaxed">
                        Healthy: 75+. At Risk: 45-74. Critical: below 45. The
                        score reflects overdue work, blockers, overloaded
                        teammates, and completion pace.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    A compact pulse check on delivery pressure.
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">
                        See more workspace health options
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link
                        to="/workspace-manager?section=workload"
                        onClick={handleNavClick}
                      >
                        Open team workload
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/projects" onClick={handleNavClick}>
                        Review workspace projects
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="mt-2.5 flex items-center justify-between gap-3 rounded-lg border border-sidebar-border/70 bg-sidebar/60 px-2.5 py-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar/90">
                    <WorkspaceHealthIcon className="h-8 w-8 text-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-base font-semibold leading-none">
                        {retentionLoading
                          ? "..."
                          : (workspaceHealth?.score ?? "--")}
                      </p>
                      {!retentionLoading && workspaceHealth?.status ? (
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-full px-2 py-0 text-[10px] font-medium",
                            workspaceHealthMeta.badgeClass,
                          )}
                        >
                          {workspaceHealth.status}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {retentionLoading
                        ? "Checking activity..."
                        : "Weighted score out of 100"}
                    </p>
                  </div>
                </div>
              </div>
              {workspaceHealth?.summary && (
                <p className="mt-2 line-clamp-2 text-[11px] text-muted-foreground">
                  {workspaceHealth.summary}
                </p>
              )}
            </div>
          ) : canSeeWorkspaceHealth ? (
            <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/30 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Workspace Health</p>
                  <p className="text-xs text-muted-foreground">
                    Keep the sidebar quieter until you want the delivery pulse
                    card back.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setPreferences((prev) => ({
                      ...prev,
                      workspaceHealth: true,
                    }))
                  }
                  className="shrink-0 rounded-md border border-sidebar-border bg-sidebar px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-sidebar-accent"
                >
                  Turn on
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/30 p-3">
              <p className="text-sm font-medium">Workspace controls</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Switch teams and keep each workspace isolated.
              </p>
            </div>
          )
        ) : (
          <div className="flex justify-center">
            <div className="relative rounded-lg border border-sidebar-border bg-sidebar-accent/50 p-2">
              {canSeeWorkspaceHealth && preferences.workspaceHealth ? (
                <HeartPulse className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Building2 className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        )}
      </SidebarFooter>
    </>
  );
}

export function Sidebar() {
  const location = useLocation();
  const pathname = location.pathname;
  const navigate = useNavigate();
  const {
    idToken,
    refreshStatus,
    authStatus,
    startWorkspaceSwitch,
    finishWorkspaceSwitch,
  } = useAuthContext();
  const { open } = useSidebar();
  const { workspaces, currentWorkspace, loadingWorkspaces, refreshWorkspaces } =
    useWorkspaceContext();

  const handleSwitchWorkspace = async (companyId: string) => {
    if (!idToken || companyId === authStatus?.companyId) {
      return;
    }

    try {
      startWorkspaceSwitch(companyId);
      await workspaceAPI.switch(companyId, idToken);
      await refreshStatus();
      await refreshWorkspaces({ force: true });
      navigate(
        authStatus?.access === "team_member" || authStatus?.access === "member"
          ? "/mytasks"
          : "/dashboard",
      );
      toast.success("Workspace switched");
    } catch (error: any) {
      finishWorkspaceSwitch();
      toast.error(error.message || "Failed to switch workspace");
    }
  };

  return (
    <AppSidebar>
      <SidebarPanel
        collapsed={!open}
        workspaces={workspaces}
        currentWorkspace={currentWorkspace}
        loadingWorkspaces={loadingWorkspaces}
        onSwitchWorkspace={handleSwitchWorkspace}
        pathname={pathname}
        search={location.search}
      />
    </AppSidebar>
  );
}
