import { API_CONFIG } from "@/lib/api";
import { auth } from "@/firebase/firebase";
import { toast } from "sonner";

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let lastMembershipToastAt = 0;

function parseResponseBody(raw: string) {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return {
      message: raw,
      parseError: true,
    };
  }
}

function notifyMembershipChange(message: string) {
  const now = Date.now();
  if (now - lastMembershipToastAt < 5000) {
    return;
  }

  lastMembershipToastAt = now;
  toast.error(message, {
    id: "workspace-membership-changed",
    duration: 5000,
  });
}

export async function apiFetch<T>(
  url: string,
  options: RequestInit = {},
  idToken?: string | null,
): Promise<T> {
  const isFormData = options.body instanceof FormData;
  const buildHeaders = (token?: string | null) => ({
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  });

  const requestInit = {
    ...options,
    cache: "no-store" as RequestCache,
  };

  let res = await fetch(`${API_CONFIG.backend}${url}`, {
    ...requestInit,
    headers: buildHeaders(idToken),
  });

  if (res.status === 401) {
    const refreshedToken = auth.currentUser
      ? await auth.currentUser.getIdToken(true)
      : null;

    if (refreshedToken && refreshedToken !== idToken) {
      res = await fetch(`${API_CONFIG.backend}${url}`, {
        ...requestInit,
        headers: buildHeaders(refreshedToken),
      });
    }
  }

  const raw = await res.text();
  const data = parseResponseBody(raw);

  if (!res.ok) {
    const fallbackMessage =
      res.status === 401
        ? "Your session or workspace membership may have changed. Refresh the app and sign in again."
        : res.status === 403
          ? "Your workspace access may have changed. Refresh the app to load your latest permissions."
          : data?.error ||
            data?.message ||
            `Request failed (${res.status})`;

    if (res.status === 401 || res.status === 403) {
      notifyMembershipChange(fallbackMessage);
    }
    throw new ApiError(
      fallbackMessage,
      res.status,
      data?.code,
      data?.details,
    );
  }

  return data;
}
