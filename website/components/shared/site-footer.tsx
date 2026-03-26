import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness, MessageCircle } from "lucide-react";

import { Logo } from "@/components/shared/logo";

const footerGroups = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "Pricing", href: "/pricing" },
      { label: "Waitlist", href: "/waitlist" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "For Agencies", href: "/for-agencies" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 bg-background/92">
      <div className="container-shell section-shell pb-8 pt-12">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)]">
          <div className="space-y-4">
            <Logo />
            <p className="max-w-md text-sm leading-6 text-muted-foreground">
              Built for agencies that want one clear home for clients, projects,
              approvals, and the work between them.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {footerGroups.map((group) => (
              <div key={group.title} className="space-y-3">
                <p className="text-sm font-semibold text-foreground">{group.title}</p>
                <ul className="space-y-2">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-primary"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-border/70 pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Crevo · trycrevo.com</p>
          <p className="text-center">Made for agencies, by people who get it.</p>
          <div className="flex items-center gap-3">
            <a href="#" aria-label="Twitter" className="transition-colors hover:text-primary">
              <ArrowUpRight className="h-4 w-4" />
            </a>
            <a href="#" aria-label="LinkedIn" className="transition-colors hover:text-primary">
              <BriefcaseBusiness className="h-4 w-4" />
            </a>
            <a href="#" aria-label="Instagram" className="transition-colors hover:text-primary">
              <MessageCircle className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
