export function SocialProofBar() {
  return (
    <section className="border-y border-border/70 bg-card/72">
      <div className="container-shell flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Trusted by agencies across Lagos · London · New York · Amsterdam
        </p>
        <div className="flex items-center gap-3 overflow-hidden">
          {["Mono", "Salt", "Bloom", "Kova", "Nord"].map((name) => (
            <div
              key={name}
              className="flex h-10 min-w-24 items-center justify-center rounded-full border border-border/70 px-4 text-xs uppercase tracking-[0.16em] text-muted-foreground"
            >
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
