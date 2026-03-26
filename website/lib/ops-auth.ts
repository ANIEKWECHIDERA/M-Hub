import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerEnv } from "@/lib/server-env";

const OPS_SESSION_COOKIE = "crevo_ops_session";
const OPS_SESSION_TTL_SECONDS = 60 * 60 * 12;

type SessionPayload = {
  email: string;
  expiresAt: number;
};

function getRequiredOpsEnv() {
  const {
    waitlistAdminEmail: email,
    waitlistAdminPassword: password,
    waitlistAdminSessionSecret: secret,
  } = getServerEnv();

  if (!email || !password || !secret) {
    throw new Error(
      "Missing WAITLIST_ADMIN_EMAIL, WAITLIST_ADMIN_PASSWORD, or WAITLIST_ADMIN_SESSION_SECRET.",
    );
  }

  return {
    email: email.trim().toLowerCase(),
    password,
    secret,
  };
}

function signValue(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function createSessionToken(payload: SessionPayload, secret: string) {
  const serialized = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signValue(serialized, secret);
  return `${serialized}.${signature}`;
}

function parseSessionToken(token: string, secret: string): SessionPayload | null {
  const [serialized, signature] = token.split(".");
  if (!serialized || !signature) return null;

  const expected = signValue(serialized, secret);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(serialized, "base64url").toString("utf8"),
    ) as SessionPayload;

    if (!payload.email || !payload.expiresAt || payload.expiresAt < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function createOpsSession(email: string) {
  const { secret } = getRequiredOpsEnv();
  const jar = await cookies();
  const token = createSessionToken(
    {
      email,
      expiresAt: Date.now() + OPS_SESSION_TTL_SECONDS * 1000,
    },
    secret,
  );

  jar.set(OPS_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: OPS_SESSION_TTL_SECONDS,
    path: "/",
  });
}

export async function clearOpsSession() {
  const jar = await cookies();
  jar.delete(OPS_SESSION_COOKIE);
}

export async function getOpsSession() {
  const { secret } = getRequiredOpsEnv();
  const jar = await cookies();
  const token = jar.get(OPS_SESSION_COOKIE)?.value;
  if (!token) return null;
  return parseSessionToken(token, secret);
}

export async function requireOpsSession() {
  const session = await getOpsSession();
  if (!session) {
    redirect("/ops/login");
  }

  return session;
}

export function validateOpsCredentials(email: string, password: string) {
  const env = getRequiredOpsEnv();
  return email.trim().toLowerCase() === env.email && password === env.password;
}
