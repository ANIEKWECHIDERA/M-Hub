import type { Metadata } from "next";

import { PageShell } from "@/components/shared/page-shell";

export const metadata: Metadata = {
  title: "Terms",
};

export default function TermsPage() {
  return (
    <PageShell>
      <section className="section-shell">
        <div className="container-shell max-w-4xl space-y-6">
          <h1 className="section-title">Terms</h1>
          <p className="section-copy">
            By joining the Crevo waitlist or using this website, you agree to use it lawfully and
            not misuse the service, the content, or the forms we provide.
          </p>
          <p className="section-copy">
            Product details, pricing, timelines, and feature availability may change as Crevo
            evolves. Joining the waitlist does not guarantee immediate access.
          </p>
          <p className="section-copy">
            We may update these terms as the product develops. Continued use of the site means you
            accept the updated terms.
          </p>
        </div>
      </section>
    </PageShell>
  );
}
