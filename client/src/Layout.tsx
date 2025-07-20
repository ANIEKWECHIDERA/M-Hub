import { Sidebar } from "./components/SideBar";
import { Header } from "./components/Header";
import { Outlet } from "react-router-dom";
import { useState } from "react";

export default function Layout() {
  // Optional: sidebar state if needed
  const [collapsed, setCollapsed] = useState(false);
  const sidebarWidth = collapsed ? 64 : 256; // 16px or 64px (in Tailwind px)

  return (
    <div className="h-screen flex bg-muted">
      {/* Sidebar (already fixed in Sidebar component) */}
      <Sidebar />

      {/* Right section shifted to the right based on sidebar width */}
      <div
        className="flex flex-col flex-1"
        style={{ marginLeft: `calc(${sidebarWidth}px)` }}
      >
        <Header />
        <main className="flex-1 overflow-y-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
