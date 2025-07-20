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

interface NavItem {
  name: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SidebarContentProps {
  mobile?: boolean;
}

const navigation: NavItem[] = [
  { name: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { name: "Projects", to: "/projects", icon: FolderOpen },
  { name: "Chat", to: "/chat", icon: MessageSquare },
  { name: "Notepad", to: "/notepad", icon: FileText },
  { name: "Tools", to: "/tools", icon: Calculator },
  { name: "Settings", to: "/settings", icon: Settings },
];

interface SidebarProps {
  onCollapseChange?: (collapsed: boolean) => void;
}

export function Sidebar({ onCollapseChange }: SidebarProps) {
  const pathname = useLocation().pathname;
  const [collapsed, setCollapsed] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isExpanded = !collapsed || hovered;

  const toggleCollapse = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    onCollapseChange?.(newState);
  };

  const handleNavClick = () => {
    // Expand permanently when clicking a nav item
    if (collapsed) {
      setCollapsed(false);
      onCollapseChange?.(false);
    }
    if (mobileOpen) {
      setMobileOpen(false);
    }
  };

  const SidebarContent = ({ mobile = false }: SidebarContentProps) => (
    <div
      className={cn(
        "flex flex-col h-full transition-all duration-300",
        mobile ? "w-full" : isExpanded ? "w-64" : "w-16"
      )}
    >
      <div className="flex items-center justify-between p-4 border-b">
        <div
          className={cn(
            "flex items-center gap-2",
            isExpanded ? "justify-start" : "justify-center"
          )}
        >
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">M</span>
          </div>
          {(isExpanded || mobile) && (
            <span className="font-bold text-xl">M-Hub</span>
          )}
        </div>
        {!mobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCollapse}
            className="p-1"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4 hidden" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      <nav className="flex-1 p-4">
        {navigation.map((item) => {
          const isActive =
            pathname === item.to ||
            (item.to !== "/dashboard" && pathname.startsWith(item.to + "/"));

          return (
            <Link key={item.name} to={item.to} onClick={handleNavClick}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full flex items-center transition-all duration-200",
                  isExpanded
                    ? "justify-start gap-3 h-10 py-2 mb-3"
                    : "justify-center w-10 h-10 mb-3"
                )}
              >
                <item.icon className="h-5 w-5" />
                {(isExpanded || mobile) && <span>{item.name}</span>}
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
          "fixed inset-y-0 z-50 bg-background border-r hidden lg:flex flex-col transition-all duration-300",
          isExpanded ? "lg:w-64" : "lg:w-16"
        )}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
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
