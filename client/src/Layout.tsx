import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { Outlet } from "react-router-dom";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useAuthContext } from "@/context/AuthContext";
import { useProjectContext } from "@/context/ProjectContext";
import { useClientContext } from "@/context/ClientContext";
import { useNotificationContext } from "@/context/NotificationContext";
import { useTeamContext } from "@/context/TeamMemberContext";
import { useMyTasksContext } from "@/context/MyTaskContext";
import { useUser } from "@/context/UserContext";

function WorkspaceSwitchOverlay() {
  const {
    authStatus,
    isWorkspaceSwitching,
    workspaceSwitchCompanyId,
    finishWorkspaceSwitch,
  } = useAuthContext();
  const { loading: projectLoading } = useProjectContext();
  const { loading: clientLoading } = useClientContext();
  const { loading: notificationLoading } = useNotificationContext();
  const { loading: teamLoading } = useTeamContext();
  const { loading: myTasksLoading } = useMyTasksContext();
  const { loading: userLoading } = useUser();

  const waitingForData =
    projectLoading ||
    clientLoading ||
    notificationLoading ||
    teamLoading ||
    myTasksLoading ||
    userLoading;

  useEffect(() => {
    if (
      isWorkspaceSwitching &&
      authStatus?.companyId === workspaceSwitchCompanyId &&
      !waitingForData
    ) {
      const frame = window.requestAnimationFrame(() => {
        finishWorkspaceSwitch();
      });

      return () => window.cancelAnimationFrame(frame);
    }
  }, [
    authStatus?.companyId,
    finishWorkspaceSwitch,
    isWorkspaceSwitching,
    waitingForData,
    workspaceSwitchCompanyId,
  ]);

  if (!isWorkspaceSwitching) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-[70] flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="rounded-xl border bg-card px-6 py-5 text-center shadow-sm">
        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
        <p className="mt-3 text-sm font-medium">Switching workspace...</p>
        <p className="mt-1 text-xs text-muted-foreground">
          We&apos;re loading the latest workspace data for you.
        </p>
      </div>
    </div>
  );
}

export default function Layout() {
  return (
    <SidebarProvider defaultOpen>
      <motion.div
        layout
        className="app-shell relative flex h-screen overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.28, ease: [0, 0, 0.2, 1] }}
      >
        <WorkspaceSwitchOverlay />
        <Sidebar />
        <SidebarInset className="h-screen overflow-hidden">
          <Header />
          <motion.main
            layout
            className="relative flex-1 overflow-hidden"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: [0, 0, 0.2, 1], delay: 0.04 }}
          >
            <div className="h-full overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
              <Outlet />
            </div>
          </motion.main>
        </SidebarInset>
      </motion.div>
    </SidebarProvider>
  );
}
