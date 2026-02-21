export async function safeFetch<T>(
  request: () => Promise<Response>,
  isAppReady: boolean,
): Promise<T | null> {
  if (!isAppReady) {
    console.warn("App not ready. Request blocked.");
    return null;
  }

  try {
    const res = await request();

    if (!res.ok) {
      let message = "Request failed";
      try {
        const data = await res.json();
        message = data.error || message;
      } catch {}

      throw new Error(message);
    }

    return await res.json();
  } catch (err) {
    console.error("safeFetch error:", err);
    return null;
  }
}
