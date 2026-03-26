import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNotificationContext } from "@/context/NotificationContext";
import { useAuthContext } from "@/context/AuthContext";
import { useUser } from "@/context/UserContext";
import { useSettingsContext } from "@/context/SettingsContext";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import { useChatContext } from "@/context/ChatContext";
import {
  Bell,
  Trash2,
  Moon,
  RefreshCw,
  Settings,
  Sun,
  LogOut,
} from "lucide-react";
import {
  formatNotificationTime,
  getNotificationIcon,
  getNotificationRoute,
} from "@/lib/notifications";
import { Link, useNavigate } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useMemo, useState } from "react";
import { useSidebar } from "@/components/ui/sidebar";
import { motion } from "framer-motion";

export function Header() {
  const { toggleTheme, preferences } = useSettingsContext();
  const { currentWorkspace } = useWorkspaceContext();
  const { totalUnreadCount } = useChatContext();
  const { open, openMobile, isMobile } = useSidebar();
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
    unreadCount,
    loading: notificationsLoading,
    error: notificationsError,
    refreshNotifications,
  } = useNotificationContext();
  const { logout, authStatus } = useAuthContext();
  const { profile, loading: userLoading } = useUser();
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const isTeamMember =
    authStatus?.access === "team_member" || authStatus?.access === "member";
  const activeWorkspaceName = useMemo(
    () => currentWorkspace?.name || "Workspace",
    [currentWorkspace?.name],
  );
  const showSidebarUnreadDot =
    totalUnreadCount > 0 &&
    ((isMobile && !openMobile) || (!isMobile && !open));

  // const [searchQuery, setSearchQuery] = useState("");

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };
  // console.log("Header profile:", profile);

  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    profile?.displayName ||
    "User";
  const email = profile?.email || "user@example.com";
  const photoURL = profile?.photoURL;

  const initials = (() => {
    if (!profile) return "User";

    const { first_name, last_name, displayName } = profile;

    const initials =
      [first_name, last_name]
        .filter(Boolean)
        .map((x) => x![0].toUpperCase())
        .join("") ||
      displayName
        ?.split(" ")
        .filter(Boolean)
        .map((p) => p[0].toUpperCase())
        .join("");

    return initials || "User";
  })();

  // console.log("Header computed values:", {
  //   displayName,
  //   email,
  //   photoURL,
  //   initials,
  // });

  if (userLoading) {
    return (
      <motion.header
        layout
        className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/78 backdrop-blur-xl supports-[backdrop-filter]:bg-background/66"
      >
        <div className="flex h-12 items-center justify-between gap-2 px-4 sm:h-14 sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="relative">
              <SidebarTrigger className="lg:flex" />
              {showSidebarUnreadDot && (
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-background" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground sm:text-base">
                {activeWorkspaceName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="h-9 w-9 animate-pulse rounded-md bg-muted" />
            <div className="h-9 w-9 animate-pulse rounded-md bg-muted" />
            <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
          </div>
        </div>
      </motion.header>
    );
  }

  return (
    <motion.header
      layout
      className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/78 backdrop-blur-xl supports-[backdrop-filter]:bg-background/66"
    >
      <div className="flex h-12 items-center justify-between gap-2 px-4 sm:h-14 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="relative">
            <SidebarTrigger className="lg:flex" />
            {showSidebarUnreadDot && (
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-background" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground sm:text-base">
              {activeWorkspaceName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          <Popover
            open={notificationsOpen}
            onOpenChange={(open) => {
              setNotificationsOpen(open);
              if (open) {
                refreshNotifications({ silent: true });
              }
            }}
          >
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="relative"
                disabled={!preferences.notifications}
                aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 rounded-xl border border-border/35 bg-popover p-0 shadow-[var(--shadow-card)]" align="end">
              <div className="space-y-4">
                <div className="border-b border-border/35 px-4 pb-3 pt-4">
                  <h4 className="text-sm font-semibold tracking-tight" data-display-font="true">Notifications</h4>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 rounded-md border border-border/25 px-2 text-[11px]"
                      onClick={() => refreshNotifications()}
                      aria-label="Refresh notifications"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 rounded-md border border-border/25 px-2.5 text-[11px]"
                      onClick={markAllAsRead}
                      disabled={unreadCount === 0}
                    >
                      Mark all read
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 rounded-md border border-border/25 px-2.5 text-[11px]"
                      onClick={clearAllNotifications}
                      disabled={notifications.length === 0}
                    >
                      Clear all
                    </Button>
                  </div>
                </div>
                <div className="max-h-80 space-y-2 overflow-y-auto px-4 pb-4">
                  {!preferences.notifications ? (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">
                        Notifications are turned off
                      </p>
                      <p className="mt-1">
                        Re-enable them in Settings to resume in-app alerts.
                      </p>
                    </div>
                  ) : notificationsLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <div
                          key={index}
                          className="rounded-lg border p-3 animate-pulse"
                        >
                          <div className="h-4 w-2/3 rounded bg-muted" />
                          <div className="mt-2 h-3 w-full rounded bg-muted" />
                          <div className="mt-2 h-3 w-1/3 rounded bg-muted" />
                        </div>
                      ))}
                    </div>
                  ) : notificationsError ? (
                    <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">
                        Couldn&apos;t load notifications
                      </p>
                      <p className="mt-1">{notificationsError}</p>
                    </div>
                  ) : notifications.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No notifications
                    </p>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`cursor-pointer rounded-lg border p-3 transition-colors hover:bg-muted/50 ${
                          !notification.read ? "bg-muted/30" : ""
                        }`}
                        onClick={async () => {
                          await markAsRead(notification.id);
                          setNotificationsOpen(false);
                          navigate(getNotificationRoute(notification));
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="mt-0.5 rounded-md border bg-background p-2">
                            {(() => {
                              const Icon = getNotificationIcon(
                                notification.type,
                              );
                              return (
                                <Icon className="h-4 w-4 text-muted-foreground" />
                              );
                            })()}
                          </div>
                          <div className="space-y-1 flex-1 min-w-0">
                            <p className="text-sm font-medium">
                              {notification.title}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatNotificationTime(notification.created_at)}
                            </p>
                          </div>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-primary rounded-full mt-1" />
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            onClick={(event) => {
                              event.stopPropagation();
                              void clearNotification(notification.id);
                            }}
                            aria-label="Clear notification"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={photoURL || undefined} alt={displayName} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {displayName}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Link to="/settings?section=profile">
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>{isTeamMember ? "Profile" : "Settings"}</span>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-600 focus:text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.header>
  );
}
