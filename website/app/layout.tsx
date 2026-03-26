import type { Metadata } from "next";

import { Toaster } from "@/components/ui/sonner";
import { siteConfig } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  title: {
    default: "Crevo | Built for agencies. Not adapted for them.",
    template: "%s | Crevo",
  },
  description:
    "Crevo is the project hub your agency actually deserves. Manage clients, projects, budgets, approvals, and deliverables in one place.",
  openGraph: {
    title: "Crevo | Built for agencies. Not adapted for them.",
    description:
      "The project hub your agency actually deserves. Join the Crevo waitlist.",
    url: siteConfig.siteUrl,
    siteName: "Crevo",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Crevo | Built for agencies. Not adapted for them.",
    description:
      "The project hub your agency actually deserves. Join the Crevo waitlist.",
  },
  alternates: {
    canonical: siteConfig.siteUrl,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full scroll-smooth antialiased">
      <body className="min-h-full bg-background text-foreground">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
