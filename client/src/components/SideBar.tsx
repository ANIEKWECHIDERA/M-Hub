import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
  ChevronsUpDown,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/context/AuthContext";
import { workspaceAPI, type Workspace } from "@/api/workspace.api";
import { toast } from "sonner";
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

interface NavItem {
  name: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navigation: NavItem[] = [
  { name: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { name: "Projects", to: "/projects", icon: FolderOpen },
  { name: "My Tasks", to: "/mytasks", icon: Target },
  { name: "Chat", to: "/chat", icon: MessageSquare },
  { name: "Notepad", to: "/notepad", icon: FileText },
  { name: "Settings", to: "/settings", icon: Settings },
];

interface SidebarPanelProps {
  collapsed: boolean;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  loadingWorkspaces: boolean;
  onSwitchWorkspace: (companyId: string) => Promise<void>;
  onToggleCollapse: () => void;
  pathname: string;
}

function SidebarPanel({
  collapsed,
  workspaces,
  currentWorkspace,
  loadingWorkspaces,
  onSwitchWorkspace,
  onToggleCollapse,
  pathname,
}: SidebarPanelProps) {
  const isExpanded = !collapsed;
  const { isMobile, setOpenMobile } = useSidebar();

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <>
      <SidebarHeader className={cn("space-y-3", !isExpanded && "px-2")}>
        <div className="flex items-center justify-between gap-2">
          <div
            className={cn(
              "flex items-center gap-3",
              !isExpanded && "justify-center",
            )}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sidebar-border bg-sidebar-primary text-sidebar-primary-foreground">
              <span className="text-lg font-bold">M</span>
            </div>
            {isExpanded && (
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  M-Hub
                </p>
                <p className="text-base font-semibold">Workspace Hub</p>
              </div>
            )}
          </div>

          {/* {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="shrink-0 rounded-lg"
            >
              <ChevronsUpDown className="h-4 w-4" />
            </Button>
          )} */}
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

      <SidebarBody className={cn(!isExpanded && "px-2")}>
        <SidebarGroup>
          {isExpanded && <SidebarGroupLabel>Navigation</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const isActive =
                  pathname === item.to ||
                  (item.to !== "/dashboard" &&
                    pathname.startsWith(item.to + "/"));

                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={!isExpanded ? item.name : undefined}
                      aria-label={item.name}
                      className={cn(
                        !isExpanded && "mx-auto h-10 w-10 justify-center px-0",
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarBody>

      <SidebarFooter className={cn("space-y-2", !isExpanded && "px-2")}>
        {isExpanded ? (
          <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/30 p-3">
            <p className="text-sm font-medium">Workspace controls</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Switch teams, manage members, and keep your workspaces separate.
            </p>
          </div>
        ) : (
          <Button
            variant="outline"
            size="icon"
            className="mx-auto rounded-lg"
            title="Expand sidebar"
            onClick={onToggleCollapse}
          >
            <ChevronsUpDown className="h-4 w-4" />
          </Button>
        )}
      </SidebarFooter>
    </>
  );
}

export function Sidebar() {
  const pathname = useLocation().pathname;
  const navigate = useNavigate();
  const { idToken, refreshStatus, authStatus } = useAuthContext();
  const { open, setOpen } = useSidebar();
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

  const toggleCollapse = () => {
    setOpen((value) => !value);
  };

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
      await workspaceAPI.switch(companyId, idToken);
      await refreshStatus();
      await loadWorkspaces();
      navigate("/dashboard");
      toast.success("Workspace switched");
    } catch (error: any) {
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
        onToggleCollapse={toggleCollapse}
        pathname={pathname}
      />
    </AppSidebar>
  );
}
