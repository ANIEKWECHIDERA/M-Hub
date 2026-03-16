import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { Outlet } from "react-router-dom";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

export default function Layout() {
  return (
    <SidebarProvider defaultOpen>
      <div className="app-shell flex min-h-screen">
        <Sidebar />
        <SidebarInset>
          <Header />
          <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-6 pt-4 lg:px-6">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
