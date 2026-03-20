import { API_CONFIG } from "@/lib/api";
import { auth } from "@/firebase/firebase";

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
  const data = raw ? JSON.parse(raw) : null;

  if (!res.ok) {
    throw new Error(
      data?.error || data?.message || `Request failed (${res.status})`,
    );
  }

  return data;
}
