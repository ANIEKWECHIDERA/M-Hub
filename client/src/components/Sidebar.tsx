import { useEffect, useMemo, useState } from "react";
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
  Building2,
  Loader2,
  ChevronDown,
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

interface NavItem {
  name: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
}

const baseNavigation: NavItem[] = [
  { name: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { name: "Projects", to: "/projects", icon: FolderOpen },
  { name: "My Tasks", to: "/mytasks", icon: Target },
  { name: "Chat", to: "/chat", icon: MessageSquare },
  { name: "Notes", to: "/notepad", icon: FileText },
];

const adminNavigation: NavItem[] = [
  { name: "Settings", to: "/settings", icon: Settings },
];

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
  const { isMobile, setOpenMobile } = useSidebar();
  const { authStatus } = useAuthContext();
  const isTeamMember =
    authStatus?.access === "team_member" || authStatus?.access === "member";
  const { totalUnreadCount, unreadBySection } = useChatContext();
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

    return chatSections.find((item) => item.id === section)?.id ?? "projects";
  }, [search]);
  const totalChatUnread = useMemo(() => totalUnreadCount, [totalUnreadCount]);
  const settingsSections = getAllowedSettingsSections(isTeamMember);
  const activeSettingsSection = useMemo(() => {
    const params = new URLSearchParams(search);
    const section = params.get("section") as SettingsSection | null;

    return (
      settingsSections.find((item) => item.id === section)?.id ??
      settingsSections[0]?.id ??
      "profile"
    );
  }, [search, settingsSections]);
  const chatOpenByDefault = pathname === "/chat";
  const settingsOpenByDefault = pathname === "/settings";
  const [chatOpen, setChatOpen] = useState(chatOpenByDefault);
  const [settingsOpen, setSettingsOpen] = useState(settingsOpenByDefault);

  useEffect(() => {
    if (pathname === "/chat") {
      setChatOpen(true);
    }

    if (pathname === "/settings") {
      setSettingsOpen(true);
    }
  }, [pathname]);

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
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
              {navigation.map((item) => {
                const isActive =
                  pathname === item.to ||
                  (item.to !== "/dashboard" &&
                    pathname.startsWith(item.to + "/"));

                if (item.to === "/chat") {
                  const chatLink = `/chat?section=${activeChatSection}`;

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
                            isExpanded && chatOpen && "pr-10",
                          )}
                        >
                          <Link
                            to={chatLink}
                            onClick={() => {
                              if (isExpanded) {
                                setChatOpen(true);
                              }
                              handleNavClick();
                            }}
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
                          </Link>
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
                              setChatOpen((value) => !value);
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

              {adminNavigation.map((item) => {
                const isSettingsRoute = pathname === item.to;
                const isActive = isSettingsRoute;
                const settingsLink = `/settings?section=${activeSettingsSection}`;

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
                          isExpanded && settingsOpen && "pr-10",
                        )}
                      >
                        <Link
                          to={settingsLink}
                          onClick={() => {
                            if (isExpanded) {
                              setSettingsOpen(true);
                            }
                            handleNavClick();
                          }}
                        >
                          <item.icon className="h-5 w-5" />
                          {isExpanded && <span>{item.name}</span>}
                        </Link>
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
                            setSettingsOpen((value) => !value);
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

                    {isExpanded && settingsOpen && (
                      <div className="ml-6 mt-1 space-y-1 border-l border-sidebar-border pl-3">
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
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarBody>

      <SidebarFooter className={cn("space-y-2", !isExpanded && "px-2")}>
        {isExpanded ? (
          <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/30 p-3">
            <p className="text-sm font-medium">Workspace controls</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Switch teams and keep each company workspace isolated.
            </p>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/50 p-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
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
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);

  const currentWorkspace = useMemo(
    () =>
      workspaces.find((workspace) => workspace.isActive) ??
      workspaces.find(
        (workspace) => workspace.companyId === authStatus?.companyId,
      ) ??
      workspaces[0] ??
      null,
    [workspaces, authStatus?.companyId],
  );

  const loadWorkspaces = async () => {
    if (!idToken || authStatus?.onboardingState !== "ACTIVE") {
      return;
    }

    try {
      setLoadingWorkspaces(true);
      const response = await workspaceAPI.list(idToken);
      setWorkspaces(response.workspaces);
    } catch (error: any) {
      toast.error(error.message || "Failed to load workspaces");
    } finally {
      setLoadingWorkspaces(false);
    }
  };

  useEffect(() => {
    loadWorkspaces();
  }, [idToken, authStatus?.companyId, authStatus?.onboardingState]);

  const handleSwitchWorkspace = async (companyId: string) => {
    if (!idToken || companyId === authStatus?.companyId) {
      return;
    }

    try {
      startWorkspaceSwitch(companyId);
      await workspaceAPI.switch(companyId, idToken);
      await refreshStatus();
      await loadWorkspaces();
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
