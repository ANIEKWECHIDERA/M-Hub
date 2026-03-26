import * as React from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
    <SidebarContext.Provider value={value}>
      <TooltipProvider delayDuration={400}>{children}</TooltipProvider>
    </SidebarContext.Provider>
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
  const { toggleSidebar, open } = useSidebar();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        "h-10 w-10 rounded-md border border-border/35 bg-card/65 shadow-sm sm:h-9 sm:w-9",
        className,
      )}
      onClick={toggleSidebar}
      {...props}
    >
      {open ? (
        <PanelLeftClose className="h-4 w-4" />
      ) : (
        <PanelLeftOpen className="h-4 w-4" />
      )}
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
          "hidden h-screen shrink-0 border-r border-sidebar-border/45 bg-sidebar/95 text-sidebar-foreground backdrop-blur-xl lg:flex lg:flex-col",
          open ? "lg:w-72" : "lg:w-20",
          className,
        )}
      >
        {children}
      </aside>

      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent
          side="left"
          className="w-[20rem] border-r border-sidebar-border/45 bg-sidebar/95 p-0 text-sidebar-foreground backdrop-blur-xl sm:w-[22rem] sm:max-w-none"
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
      className={cn("border-b border-sidebar-border/45 p-2 sm:p-3", className)}
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
      className={cn(
        "flex flex-1 flex-col gap-3 overflow-y-auto p-2.5 sm:gap-4 sm:p-3",
        className,
      )}
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
      className={cn("border-t border-sidebar-border/45 p-2 sm:p-3", className)}
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
  const button = (
    <Button
      variant={isActive ? "secondary" : "ghost"}
      className={cn(
        "relative h-10 w-full justify-start gap-3 rounded-md border border-sidebar-border/30 px-2.5 text-sm font-medium shadow-none sm:px-3",
        isActive &&
          "border-sidebar-border/30 bg-primary/[0.06] text-foreground shadow-sm after:absolute after:left-0 after:top-[7px] after:h-[26px] after:w-[2px] after:bg-primary",
        !isActive &&
          "text-muted-foreground hover:border-primary/10 hover:bg-primary/[0.035] hover:text-foreground",
        className,
      )}
      {...props}
    />
  );

  if (!tooltip) {
    return button;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right">{tooltip}</TooltipContent>
    </Tooltip>
  );
}
