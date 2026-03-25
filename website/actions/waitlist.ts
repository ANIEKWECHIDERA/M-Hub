"use server";

import { revalidatePath } from "next/cache";

import { getSupabaseAdminClient } from "@/lib/supabaseClient";
import { siteConfig } from "@/lib/site";

export type WaitlistActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  referralCode?: string;
  referralLink?: string;
  positionEstimate?: string;
};

type ExistingWaitlistRow = {
  referral_code: string;
} | null;

type WaitlistInsertPayload = {
  email: string;
  name: string | null;
  referral_code: string;
  referred_by: string | null;
};

type SupabaseMaybeSingleResult<T> = Promise<{
  data: T;
  error: { message: string; code?: string } | null;
}>;

type SupabaseInsertResult = Promise<{
  error: { message: string; code?: string } | null;
}>;

type WaitlistTableApi = {
  select: (columns: string) => {
    eq: (column: string, value: string) => {
      maybeSingle: () => SupabaseMaybeSingleResult<ExistingWaitlistRow>;
    };
  };
  insert: (values: WaitlistInsertPayload) => SupabaseInsertResult;
};

type WaitlistSupabaseClient = {
  from: (table: "waitlist") => WaitlistTableApi;
};

function normaliseEmail(rawEmail: FormDataEntryValue | null) {
  return String(rawEmail || "")
    .trim()
    .toLowerCase();
}

function normaliseText(rawValue: FormDataEntryValue | null) {
  const value = String(rawValue || "").trim();
  return value.length ? value : null;
}

async function generateReferralCode() {
  const supabase = getSupabaseAdminClient() as unknown as WaitlistSupabaseClient;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const referralCode = Math.random().toString(36).slice(2, 10).toUpperCase();
    const { data, error } = await supabase
      .from("waitlist")
      .select("id")
      .eq("referral_code", referralCode)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return referralCode;
  }

  return crypto.randomUUID().slice(0, 8).toUpperCase();
}

export async function joinWaitlist(
  _prevState: WaitlistActionState,
  formData: FormData,
): Promise<WaitlistActionState> {
  const email = normaliseEmail(formData.get("email"));
  const name = normaliseText(formData.get("name"));
  const referredBy = normaliseText(formData.get("referredBy"));

  if (!email || !email.includes("@")) {
    return {
      status: "error",
      message: "Add a valid email so we can save your place.",
    };
  }

  try {
    const supabase = getSupabaseAdminClient() as unknown as WaitlistSupabaseClient;

    const existingResult = await supabase
      .from("waitlist")
      .select("referral_code")
      .eq("email", email)
      .maybeSingle();

    if (existingResult.error) throw new Error(existingResult.error.message);

    const existing = existingResult.data as ExistingWaitlistRow;

    const referralCode = existing?.referral_code ?? (await generateReferralCode());

    if (!existing) {
      const { error } = await supabase.from("waitlist").insert({
        email,
        name,
        referral_code: referralCode,
        referred_by: referredBy,
      });

      if (error) {
        if (error.code === "23505") {
          return {
            status: "success",
            message: "You're already on the waitlist. Here is your link again.",
            referralCode,
            referralLink: `${siteConfig.siteUrl}/?ref=${referralCode}`,
            positionEstimate: "Already locked in",
          };
        }

        throw new Error(error.message);
      }
    }

    revalidatePath("/waitlist");

    return {
      status: "success",
      message: "You're on the waitlist.",
      referralCode,
      referralLink: `${siteConfig.siteUrl}/?ref=${referralCode}`,
      positionEstimate: "Founding access unlocked",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
    };
  }
}
