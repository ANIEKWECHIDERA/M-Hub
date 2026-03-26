import type { Metadata } from "next";

import { PageShell } from "@/components/shared/page-shell";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPolicyPage() {
  return (
    <PageShell>
      <section className="section-shell">
        <div className="container-shell max-w-4xl space-y-6">
          <h1 className="section-title">Privacy Policy</h1>
          <p className="section-copy">
            We collect the information you submit to join the waitlist, contact us, or use our
            website. That usually includes your name, email, and any message you choose to send.
          </p>
          <p className="section-copy">
            We use that information to manage the waitlist, respond to inquiries, improve Crevo,
            and send product updates you explicitly asked for.
          </p>
          <p className="section-copy">
            We do not sell your personal data. If you want your data updated or removed, contact us
            and we&apos;ll handle it.
          </p>
        </div>
      </section>
    </PageShell>
  );
}
