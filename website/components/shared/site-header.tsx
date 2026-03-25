"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import { navItems, siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 transition-all duration-200",
          isScrolled && "backdrop-blur-xl",
        )}
        style={{
          background: isScrolled ? "var(--header-background)" : "transparent",
          borderBottom: isScrolled
            ? "1px solid var(--border)"
            : "1px solid transparent",
        }}
      >
        <div className="container-shell py-3">
          <div className="flex items-center justify-between gap-4">
            <Logo />

            <nav className="hidden items-center gap-3 lg:flex">
              {navItems.map((item) => (
                <motion.div
                  key={item.href}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative"
                >
                  <Link
                    href={item.href}
                    className={cn(
                      "relative z-10 flex h-10 items-center rounded-full px-4 text-sm transition-colors",
                      pathname === item.href
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-primary",
                    )}
                  >
                    {pathname === item.href ? (
                      <motion.span
                        layoutId="site-header-active"
                        className="absolute inset-0 -z-10 rounded-full border border-primary/18 bg-primary/10 shadow-[0_0_0_1px_rgba(200,241,53,0.08)]"
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 30,
                        }}
                      />
                    ) : null}
                    {item.label}
                  </Link>
                </motion.div>
              ))}
            </nav>

            <div className="hidden items-center gap-2 lg:flex">
              <Button asChild variant="ghost" size="sm">
                <a href={siteConfig.appUrl}>Log in</a>
              </Button>
              <Button asChild size="sm">
                <Link href="/waitlist">Join waitlist</Link>
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setIsOpen((current) => !current)}
              aria-label={isOpen ? "Close menu" : "Open menu"}
            >
              {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      {isOpen ? (
        <div className="fixed inset-0 z-40 bg-background/96 backdrop-blur-2xl lg:hidden">
          <div className="container-shell flex min-h-screen flex-col justify-between py-8">
            <div className="space-y-8 pt-16">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "block rounded-2xl px-4 py-3 text-3xl font-semibold tracking-tight transition-colors",
                    pathname === item.href
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:text-primary",
                  )}
                  data-display-font="true"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="space-y-3">
              <Button asChild variant="outline" className="w-full">
                <a href={siteConfig.appUrl}>Log in</a>
              </Button>
              <Button asChild className="w-full">
                <Link href="/waitlist" onClick={() => setIsOpen(false)}>
                  Join waitlist
                </Link>
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
