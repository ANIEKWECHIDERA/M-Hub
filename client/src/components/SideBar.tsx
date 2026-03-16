import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
  Menu,
  ChevronLeft,
  ChevronRight,
  Target,
  Building2,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/context/AuthContext";
import { workspaceAPI, type Workspace } from "@/api/workspace.api";
import { toast } from "sonner";

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

interface SidebarProps {
  onCollapseChange?: (collapsed: boolean) => void;
}

interface SidebarContentProps {
  mobile?: boolean;
  collapsed: boolean;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  loadingWorkspaces: boolean;
  onSwitchWorkspace: (companyId: string) => Promise<void>;
  onToggleCollapse: () => void;
  pathname: string;
  onNavClick: () => void;
}

function SidebarContent({
  mobile = false,
  collapsed,
  workspaces,
  currentWorkspace,
  loadingWorkspaces,
  onSwitchWorkspace,
  onToggleCollapse,
  pathname,
  onNavClick,
}: SidebarContentProps) {
  const isExpanded = mobile || !collapsed;

  return (
    <div
      className={cn(
        "flex h-full flex-col transition-all duration-300",
        mobile ? "w-full" : isExpanded ? "w-72" : "w-20",
      )}
    >
      <div className="border-b p-4">
        <div className="flex items-center justify-between gap-2">
          <div
            className={cn(
              "flex items-center gap-3",
              !isExpanded && !mobile && "justify-center",
            )}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
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

          {!mobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="shrink-0"
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        <div
          className={cn(
            "mt-4 rounded-2xl border bg-muted/30 p-3",
            !isExpanded && !mobile && "p-2",
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
                  <div className="h-10 animate-pulse rounded-md bg-muted" />
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
      </div>

      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {navigation.map((item) => {
            const isActive =
              pathname === item.to ||
              (item.to !== "/dashboard" && pathname.startsWith(item.to + "/"));

            return (
              <Link key={item.name} to={item.to} onClick={onNavClick}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  title={!isExpanded ? item.name : undefined}
                  aria-label={item.name}
                  className={cn(
                    "w-full rounded-xl transition-all duration-200",
                    isExpanded
                      ? "justify-start gap-3 px-3 py-6"
                      : "mx-auto h-12 w-12 justify-center px-0",
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {isExpanded && <span>{item.name}</span>}
                </Button>
              </Link>
            );
          })}
        </div>
      </nav>

      {!isExpanded && !mobile && (
        <div className="p-4">
          <Button
            variant="outline"
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl"
            onClick={onToggleCollapse}
          >
            <ChevronsUpDown className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function Sidebar({ onCollapseChange }: SidebarProps) {
  const pathname = useLocation().pathname;
  const navigate = useNavigate();
  const { idToken, refreshStatus, authStatus } = useAuthContext();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);

  const currentWorkspace = useMemo(
    () =>
      workspaces.find((workspace) => workspace.isActive) ??
      workspaces.find((workspace) => workspace.companyId === authStatus?.companyId) ??
      workspaces[0] ??
      null,
    [workspaces, authStatus?.companyId],
  );

  const toggleCollapse = () => {
    const nextState = !collapsed;
    setCollapsed(nextState);
    onCollapseChange?.(nextState);
  };

  const handleNavClick = () => {
    if (mobileOpen) {
      setMobileOpen(false);
    }
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
    <>
      <div
        className={cn(
          "fixed inset-y-0 z-50 hidden border-r bg-background lg:flex",
          collapsed ? "lg:w-20" : "lg:w-72",
        )}
      >
        <SidebarContent
          collapsed={collapsed}
          workspaces={workspaces}
          currentWorkspace={currentWorkspace}
          loadingWorkspaces={loadingWorkspaces}
          onSwitchWorkspace={handleSwitchWorkspace}
          onToggleCollapse={toggleCollapse}
          pathname={pathname}
          onNavClick={handleNavClick}
        />
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="fixed left-4 top-4 z-50 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 p-0">
          <SidebarContent
            mobile
            collapsed={false}
            workspaces={workspaces}
            currentWorkspace={currentWorkspace}
            loadingWorkspaces={loadingWorkspaces}
            onSwitchWorkspace={handleSwitchWorkspace}
            onToggleCollapse={() => undefined}
            pathname={pathname}
            onNavClick={handleNavClick}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
