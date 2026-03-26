import type { Metadata } from "next";

import { logoutFromOps } from "@/actions/ops-auth";
import { WaitlistOpsActions } from "@/components/shared/waitlist-ops-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireOpsSession } from "@/lib/ops-auth";
import { getWaitlistSnapshot } from "@/lib/waitlist-admin";

export const metadata: Metadata = {
  title: "Waitlist Ops",
  description: "Private waitlist operations dashboard for Crevo.",
  robots: {
    index: false,
    follow: false,
  },
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function OpsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; segment?: "all" | "referred" | "direct" }>;
}) {
  await requireOpsSession();

  const params = await searchParams;
  const snapshot = await getWaitlistSnapshot({
    query: params.q,
    segment: params.segment,
  });

  const exportQuery = new URLSearchParams();
  if (params.q) exportQuery.set("q", params.q);
  if (params.segment) exportQuery.set("segment", params.segment);

  return (
    <main className="min-h-screen bg-background">
      <div className="container-shell space-y-6 py-8 sm:space-y-8">
        <div className="flex flex-col gap-4 rounded-[24px] border border-border/70 bg-card/82 p-5 shadow-[0_18px_48px_rgba(0,0,0,0.18)] sm:flex-row sm:items-end sm:justify-between sm:p-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="label-pill">Waitlist ops</span>
              {snapshot.usesAnonKey ? (
                <Badge variant="warning">Server key is still anon</Badge>
              ) : (
                <Badge>Server-only key active</Badge>
              )}
            </div>
            <div>
              <h1 className="section-title text-2xl sm:text-3xl">Captured leads, ready to use.</h1>
              <p className="section-copy max-w-3xl">
                See who joined, where referrals are compounding, and export clean lists for
                launch updates or segmented outreach.
              </p>
            </div>
          </div>
          <form action={logoutFromOps}>
            <Button type="submit" variant="outline">
              Sign out
            </Button>
          </form>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total signups", value: snapshot.total },
            { label: "Joined today", value: snapshot.joinedToday },
            { label: "Joined this week", value: snapshot.joinedThisWeek },
            { label: "Referral signups", value: snapshot.referredCount },
          ].map((item) => (
            <Card key={item.label} className="surface-outline">
              <CardHeader className="pb-2">
                <CardDescription>{item.label}</CardDescription>
                <CardTitle className="text-3xl">{item.value}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="surface-outline">
            <CardHeader className="space-y-4">
              <div>
                <CardTitle>Lead finder</CardTitle>
                <CardDescription>
                  Search by email, name, agency, referral code, or referrer.
                </CardDescription>
              </div>
              <form className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
                <Input
                  name="q"
                  defaultValue={params.q ?? ""}
                  placeholder="Search leads"
                />
                <Button
                  type="submit"
                  name="segment"
                  value="all"
                  variant={
                    params.segment === "referred" || params.segment === "direct"
                      ? "outline"
                      : "default"
                  }
                >
                  All
                </Button>
                <Button
                  type="submit"
                  name="segment"
                  value="referred"
                  variant={params.segment === "referred" ? "default" : "outline"}
                >
                  Referred
                </Button>
                <Button
                  type="submit"
                  name="segment"
                  value="direct"
                  variant={params.segment === "direct" ? "default" : "outline"}
                >
                  Direct
                </Button>
              </form>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Showing {snapshot.leads.length} of {snapshot.total} captured leads.
                </p>
                <div className="flex flex-wrap gap-3">
                  <WaitlistOpsActions emails={snapshot.leads.map((lead) => lead.email)} />
                  <Button asChild type="button" variant="outline" size="sm">
                    <a href={`/ops/export${exportQuery.size ? `?${exportQuery.toString()}` : ""}`}>
                      Export CSV
                    </a>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-[20px] border border-border/70">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border/70 text-left text-sm">
                    <thead className="bg-background/72 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Lead</th>
                        <th className="px-4 py-3">Agency</th>
                        <th className="px-4 py-3">Joined</th>
                        <th className="px-4 py-3">Referral</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {snapshot.leads.map((lead) => (
                        <tr key={lead.id} className="bg-card/40">
                          <td className="px-4 py-4">
                            <div className="space-y-1">
                              <div className="truncate font-medium text-foreground">{lead.email}</div>
                              <div className="truncate text-xs text-muted-foreground">
                                {lead.name || "No name saved"}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-muted-foreground">
                            <span
                              title={lead.agency ?? undefined}
                              className="block max-w-[12rem] truncate"
                            >
                              {lead.agency || "-"}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-muted-foreground">
                            {formatDate(lead.created_at)}
                          </td>
                          <td className="px-4 py-4">
                            <div className="space-y-1">
                              <div className="font-mono text-xs uppercase tracking-[0.18em] text-foreground">
                                {lead.referral_code}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {lead.referred_by ? `via ${lead.referred_by}` : "Direct signup"}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="surface-outline">
              <CardHeader>
                <CardTitle>Referral momentum</CardTitle>
                <CardDescription>
                  The people already doing your launch marketing for you.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {snapshot.topReferrers.length ? (
                  snapshot.topReferrers.map((referrer) => (
                    <div
                      key={referrer.referralCode}
                      className="flex items-center justify-between rounded-[16px] border border-border/70 bg-background/45 px-4 py-3"
                    >
                      <div>
                        <p className="font-mono text-xs uppercase tracking-[0.18em] text-foreground">
                          {referrer.referralCode}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Shared {referrer.count} signup{referrer.count > 1 ? "s" : ""}
                        </p>
                      </div>
                      <Badge>{referrer.count}</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No referral chain yet. The first one usually starts once you send your first batch.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="surface-outline">
              <CardHeader>
                <CardTitle>Email marketing prep</CardTitle>
                <CardDescription>
                  Easy next steps when you are ready to warm up the list.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Use the Copy emails action to drop the current segment into your ESP or a BCC draft.</p>
                <p>Filter to Direct for cold launch messaging, or Referred for ambassador-style follow-up.</p>
                <p>
                  Once Supabase is switched to a real service-role key, keep this page private
                  and your list off the public API.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}
