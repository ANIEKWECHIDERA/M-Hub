import { useState } from "react";
import { Sidebar } from "./components/SideBar";
import { Header } from "./components/Header";
import { Outlet } from "react-router-dom";

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);

  const sidebarWidth = collapsed ? 64 : 256; // Tailwind: 16 or 64

  return (
    <>
      <style>
        {`
          @media (min-width: 1024px) {
            .content-margin {
              margin-left: ${sidebarWidth}px;
            }
          }
        `}
      </style>

      <div className="h-screen flex">
        <Sidebar onCollapseChange={setCollapsed} />

        <div className="flex flex-col flex-1 transition-all duration-300 content-margin">
          <Header />
          <main className="flex-1 overflow-y-auto p-4">
            <Outlet />
          </main>
        </div>
      </div>
    </>
  );
}
