import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabaseClient";

export type WaitlistLead = {
  id: string;
  email: string;
  name: string | null;
  agency: string | null;
  created_at: string;
  referral_code: string;
  referred_by: string | null;
};

export type WaitlistSnapshot = {
  leads: WaitlistLead[];
  total: number;
  joinedToday: number;
  joinedThisWeek: number;
  referredCount: number;
  directCount: number;
  topReferrers: Array<{ referralCode: string; count: number }>;
  usesAnonKey: boolean;
};

export async function getWaitlistSnapshot(options?: {
  query?: string;
  segment?: "all" | "referred" | "direct";
}) {
  const supabase = getSupabaseAdminClient();
  const result = await supabase
    .from("waitlist")
    .select("*")
    .order("created_at", { ascending: false });

  if (result.error) {
    throw new Error(result.error.message);
  }

  const allLeads = (result.data ?? []) as WaitlistLead[];
  const query = options?.query?.trim().toLowerCase() ?? "";
  const segment = options?.segment ?? "all";

  const filtered = allLeads.filter((lead) => {
    const matchesSegment =
      segment === "all" ||
      (segment === "referred" ? Boolean(lead.referred_by) : !lead.referred_by);

    if (!matchesSegment) return false;
    if (!query) return true;

    return [lead.email, lead.name, lead.agency, lead.referral_code, lead.referred_by]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - 6);

  const topReferrerMap = new Map<string, number>();

  for (const lead of allLeads) {
    if (lead.referred_by) {
      topReferrerMap.set(lead.referred_by, (topReferrerMap.get(lead.referred_by) ?? 0) + 1);
    }
  }

  return {
    leads: filtered,
    total: allLeads.length,
    joinedToday: allLeads.filter((lead) => new Date(lead.created_at) >= startOfToday).length,
    joinedThisWeek: allLeads.filter((lead) => new Date(lead.created_at) >= startOfWeek).length,
    referredCount: allLeads.filter((lead) => Boolean(lead.referred_by)).length,
    directCount: allLeads.filter((lead) => !lead.referred_by).length,
    topReferrers: [...topReferrerMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([referralCode, count]) => ({ referralCode, count })),
    usesAnonKey: false,
  } satisfies WaitlistSnapshot;
}

export function toWaitlistCsv(leads: WaitlistLead[]) {
  const headers = [
    "Email",
    "Name",
    "Agency",
    "Joined At",
    "Referral Code",
    "Referred By",
  ];

  const rows = leads.map((lead) => [
    lead.email,
    lead.name ?? "",
    lead.agency ?? "",
    lead.created_at,
    lead.referral_code,
    lead.referred_by ?? "",
  ]);

  return [headers, ...rows]
    .map((row) =>
      row
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\n");
}
