import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  FolderOpen,
  MessageSquare,
  FileText,
  Calculator,
  Settings,
  Menu,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Define the interface for navigation items
interface NavItem {
  name: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Define the interface for SidebarContent props
interface SidebarContentProps {
  mobile?: boolean;
}

// Define the navigation array with type annotation
const navigation: NavItem[] = [
  { name: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { name: "Projects", to: "/projects", icon: FolderOpen },
  { name: "Chat", to: "/chat", icon: MessageSquare },
  { name: "Notepad", to: "/notepad", icon: FileText },
  { name: "Tools", to: "/tools", icon: Calculator },
  { name: "Settings", to: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = useLocation().pathname;
  const [collapsed, setCollapsed] = useState(false);

  // Define SidebarContent with typed props
  const SidebarContent = ({ mobile = false }: SidebarContentProps) => (
    <div className={cn("flex flex-col h-full", mobile ? "w-full" : "w-64")}>
      <div className="flex items-center justify-between p-4 border-b">
        <div
          className={cn(
            "flex items-center gap-2",
            collapsed && !mobile && "justify-center"
          )}
        >
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">M</span>
          </div>
          {(!collapsed || mobile) && (
            <span className="font-bold text-xl">M-Hub</span>
          )}
        </div>
        {!mobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="p-1"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive =
            pathname === item.to ||
            (item.to !== "/dashboard" && pathname.startsWith(item.to + "/"));
          return (
            <Link key={item.name} to={item.to}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3",
                  collapsed && !mobile && "justify-center px-2"
                )}
              >
                <item.icon className="h-5 w-5" />
                {(!collapsed || mobile) && <span>{item.name}</span>}
              </Button>
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div
        className={cn(
          "hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:z-50 lg:bg-background lg:border-r transition-all duration-300",
          collapsed ? "lg:w-16" : "lg:w-64"
        )}
      >
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden fixed top-4 left-4 z-50"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <SidebarContent mobile />
        </SheetContent>
      </Sheet>
    </>
  );
}
