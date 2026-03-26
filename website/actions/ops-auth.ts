"use server";

import { redirect } from "next/navigation";

import { clearOpsSession, createOpsSession, validateOpsCredentials } from "@/lib/ops-auth";

export type OpsLoginState = {
  status: "idle" | "error";
  message?: string;
};

export async function loginToOps(
  _prevState: OpsLoginState,
  formData: FormData,
): Promise<OpsLoginState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return {
      status: "error",
      message: "Add your email and password to continue.",
    };
  }

  if (!validateOpsCredentials(email, password)) {
    return {
      status: "error",
      message: "Those credentials do not match the waitlist operations account.",
    };
  }

  await createOpsSession(email.trim().toLowerCase());
  redirect("/ops");
}

export async function logoutFromOps() {
  await clearOpsSession();
  redirect("/ops/login");
}
