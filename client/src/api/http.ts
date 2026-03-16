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

  let res = await fetch(`${API_CONFIG.backend}${url}`, {
    ...options,
    headers: buildHeaders(idToken),
  });

  if (res.status === 401) {
    const refreshedToken = auth.currentUser
      ? await auth.currentUser.getIdToken(true)
      : null;

    if (refreshedToken && refreshedToken !== idToken) {
      res = await fetch(`${API_CONFIG.backend}${url}`, {
        ...options,
        headers: buildHeaders(refreshedToken),
      });
    }
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}
