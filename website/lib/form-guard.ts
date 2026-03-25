import { headers } from "next/headers";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS_PER_WINDOW = 5;
const MIN_FILL_TIME_MS = 2500;

type AttemptState = {
  count: number;
  firstSeenAt: number;
};

const attemptsByFingerprint = new Map<string, AttemptState>();

function trimExpiredEntries(now: number) {
  for (const [key, state] of attemptsByFingerprint.entries()) {
    if (now - state.firstSeenAt > WINDOW_MS) {
      attemptsByFingerprint.delete(key);
    }
  }
}

async function getRequestFingerprint() {
  const requestHeaders = await headers();
  const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = requestHeaders.get("x-real-ip")?.trim();
  const userAgent = requestHeaders.get("user-agent")?.trim();

  return [forwardedFor || realIp || "unknown-ip", userAgent || "unknown-agent"].join("|");
}

export async function guardPublicForm(params: {
  formName: "waitlist" | "contact";
  formData: FormData;
  email?: string;
}) {
  const honeypot = String(params.formData.get("companyWebsite") || "").trim();
  if (honeypot) {
    throw new Error("Spam detected. Submission blocked.");
  }

  const startedAtRaw = String(params.formData.get("startedAt") || "").trim();
  const startedAt = Number(startedAtRaw);

  if (!startedAt || Number.isNaN(startedAt) || Date.now() - startedAt < MIN_FILL_TIME_MS) {
    throw new Error("Please take a moment to complete the form before submitting.");
  }

  const now = Date.now();
  trimExpiredEntries(now);

  const requestFingerprint = await getRequestFingerprint();
  const fingerprint = [
    params.formName,
    requestFingerprint,
    params.email?.toLowerCase() || "no-email",
  ].join("|");

  const state = attemptsByFingerprint.get(fingerprint);

  if (state && now - state.firstSeenAt <= WINDOW_MS && state.count >= MAX_ATTEMPTS_PER_WINDOW) {
    throw new Error("Too many attempts. Please wait a few minutes and try again.");
  }

  if (!state || now - state.firstSeenAt > WINDOW_MS) {
    attemptsByFingerprint.set(fingerprint, {
      count: 1,
      firstSeenAt: now,
    });
    return;
  }

  state.count += 1;
}
