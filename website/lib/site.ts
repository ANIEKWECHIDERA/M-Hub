export const siteConfig = {
  name: "Crevo",
  domain: "trycrevo.com",
  description:
    "The project hub your agency actually deserves. Manage clients, projects, budgets, approvals, and deliverables in one place.",
  tagline: "Built for agencies. Not adapted for them.",
  secondaryTagline: "Where agency work actually lives.",
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:5173/login",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
};

export const navItems = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "For Agencies", href: "/for-agencies" },
];
