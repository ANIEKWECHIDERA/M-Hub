import type { Metadata } from "next";

import { ContactForm } from "@/components/shared/contact-form";
import { PageShell } from "@/components/shared/page-shell";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact the Crevo team.",
};

export default function ContactPage() {
  return (
    <PageShell>
      <section className="section-shell">
        <div className="container-shell grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div className="space-y-4">
            <span className="label-pill">Contact</span>
            <h1 className="section-title">
              Tell us what your agency is juggling.
            </h1>
            <p className="section-copy max-w-xl">
              If you&apos;re exploring Crevo, partnerships, or early-access
              questions, send a note. We&apos;d love to hear from you.
            </p>
          </div>
          <ContactForm />
        </div>
      </section>
    </PageShell>
  );
}
