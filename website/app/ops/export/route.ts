import { NextResponse } from "next/server";

import { requireOpsSession } from "@/lib/ops-auth";
import { getWaitlistSnapshot, toWaitlistCsv } from "@/lib/waitlist-admin";

export async function GET(request: Request) {
  await requireOpsSession();

  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? "";
  const segmentParam = url.searchParams.get("segment");
  const segment =
    segmentParam === "referred" || segmentParam === "direct" ? segmentParam : "all";

  const snapshot = await getWaitlistSnapshot({ query, segment });
  const csv = toWaitlistCsv(snapshot.leads);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="crevo-waitlist.csv"',
      "Cache-Control": "no-store",
    },
  });
}
