import * as React from "react";
import { PanelLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type SidebarContextValue = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openMobile: boolean;
  setOpenMobile: React.Dispatch<React.SetStateAction<boolean>>;
  isMobile: boolean;
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsMobile(mediaQuery.matches);

    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return isMobile;
}

export function SidebarProvider({
  defaultOpen = true,
  children,
}: {
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const [openMobile, setOpenMobile] = React.useState(false);
  const isMobile = useIsMobile();

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) {
      setOpenMobile((value) => !value);
      return;
    }

    setOpen((value) => !value);
  }, [isMobile]);

  const value = React.useMemo(
    () => ({
      open,
      setOpen,
      openMobile,
      setOpenMobile,
      isMobile,
      toggleSidebar,
    }),
    [isMobile, open, openMobile, toggleSidebar],
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = React.useContext(SidebarContext);

  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }

  return context;
}

export function SidebarTrigger({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("h-9 w-9 rounded-lg", className)}
      onClick={toggleSidebar}
      {...props}
    >
      <PanelLeft className="h-4 w-4" />
      <span className="sr-only">Toggle sidebar</span>
    </Button>
  );
}

export function SidebarInset({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col overflow-hidden bg-background",
        className,
      )}
      {...props}
    />
  );
}

export function Sidebar({
  className,
  children,
}: React.ComponentProps<"aside">) {
  const { open, openMobile, setOpenMobile } = useSidebar();

  return (
    <>
      <aside
        className={cn(
          "hidden h-screen shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex lg:flex-col",
          open ? "lg:w-72" : "lg:w-20",
          className,
        )}
      >
        {children}
      </aside>

      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent
          side="left"
          className="w-[22rem] border-r border-sidebar-border bg-sidebar p-0 text-sidebar-foreground sm:max-w-none"
        >
          <aside className="flex h-full flex-col">{children}</aside>
        </SheetContent>
      </Sheet>
    </>
  );
}

export function SidebarHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("border-b border-sidebar-border p-3", className)}
      {...props}
    />
  );
}

export function SidebarContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-1 flex-col gap-4 overflow-y-auto p-3", className)}
      {...props}
    />
  );
}

export function SidebarFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("border-t border-sidebar-border p-3", className)}
      {...props}
    />
  );
}

export function SidebarGroup({
  className,
  ...props
}: React.ComponentProps<"section">) {
  return <section className={cn("space-y-2", className)} {...props} />;
}

export function SidebarGroupLabel({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function SidebarGroupContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("space-y-1", className)} {...props} />;
}

export function SidebarMenu({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("space-y-1", className)} {...props} />;
}

export function SidebarMenuItem({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn(className)} {...props} />;
}

export function SidebarMenuButton({
  className,
  isActive,
  tooltip,
  ...props
}: React.ComponentProps<typeof Button> & {
  isActive?: boolean;
  tooltip?: string;
}) {
  return (
    <Button
      variant={isActive ? "secondary" : "ghost"}
      title={tooltip}
      className={cn(
        "h-10 w-full justify-start gap-3 rounded-lg border border-transparent px-3 text-sm font-medium shadow-none",
        isActive &&
          "border-border bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/90",
        className,
      )}
      {...props}
    />
  );
}
