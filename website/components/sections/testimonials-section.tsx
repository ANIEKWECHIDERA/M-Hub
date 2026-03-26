import { Reveal } from "@/components/shared/reveal";
import { Card, CardContent } from "@/components/ui/card";

const testimonials = [
  {
    quote:
      "We were running 14 clients across a spreadsheet, Asana, and a prayer. Crevo replaced all three. Our Monday morning stand-up went from 45 minutes to 10.",
    name: "Zara O.",
    role: "Studio Director, Bloom Creative",
  },
  {
    quote:
      "The client portal alone is worth it. Clients stopped emailing us for updates the week we launched it. That's hours back every single week.",
    name: "Marcus T.",
    role: "Founder, The Salt Agency",
    featured: true,
  },
  {
    quote:
      "I've tried everything. Crevo is the first tool that actually understands that agencies aren't just teams — we're managing relationships.",
    name: "Priya N.",
    role: "Operations Lead, Kova Studio",
  },
];

export function TestimonialsSection() {
  return (
    <section className="section-shell">
      <div className="container-shell space-y-10">
        <Reveal className="space-y-4">
          <h2 className="section-title max-w-3xl">
            Agencies that switched to Crevo don&apos;t go back.
          </h2>
          <p className="section-copy max-w-2xl">
            Built for modern teams who care about delivery, client confidence, and
            getting context out of everybody&apos;s heads.
          </p>
        </Reveal>

        <div className="grid gap-4 lg:grid-cols-3 lg:gap-5">
          {testimonials.map((testimonial, index) => (
            <Reveal key={testimonial.name} delay={index * 0.06}>
              <Card className={testimonial.featured ? "border-primary/30 bg-background/90 lg:-translate-y-2" : ""}>
                <CardContent className="p-6">
                  <p className="text-5xl leading-none text-primary">“</p>
                  <p className="mt-3 text-sm leading-7 text-foreground">{testimonial.quote}</p>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/12" />
                    <div>
                      <p className="text-sm font-semibold">{testimonial.name}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
