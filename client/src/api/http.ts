import { API_CONFIG } from "@/lib/api";

export async function apiFetch<T>(
  url: string,
  options: RequestInit = {},
  idToken: string
): Promise<T> {
  const isFormData = options.body instanceof FormData;

  const res = await fetch(`${API_CONFIG.backend}${url}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      Authorization: `Bearer ${idToken}`,
      ...options.headers,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}
