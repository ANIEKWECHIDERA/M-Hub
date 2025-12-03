import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

export function Breadcrumb({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return <nav aria-label="breadcrumb" className={cn("w-full", className)} {...props} />;
}

export function BreadcrumbList({ className, ...props }: React.HTMLAttributes<ol>) {
  return <ol className={cn("flex items-center text-sm text-muted-foreground", className)} {...props} />;
}

export function BreadcrumbItem({ className, ...props }: React.LiHTMLAttributes<HTMLLIElement>) {
  return <li className={cn("inline-flex items-center", className)} {...props} />;
}

export function BreadcrumbLink({ className, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a className={cn("hover:text-foreground transition-colors", className)} {...props} />;
}

export function BreadcrumbPage({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("text-foreground font-medium", className)} {...props} />;
}

export function BreadcrumbSeparator({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span role="presentation" aria-hidden className={cn("mx-2 inline-flex items-center", className)} {...props}>
      <ChevronRight className="h-4 w-4" />
    </span>
  );
}
