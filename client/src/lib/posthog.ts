import posthog from "posthog-js";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY?.trim();
const POSTHOG_HOST =
  import.meta.env.VITE_POSTHOG_HOST?.trim() || "https://us.i.posthog.com";

let initialized = false;

export const isPostHogEnabled = () => Boolean(POSTHOG_KEY);

export function initPostHog() {
  if (!POSTHOG_KEY || initialized || typeof window === "undefined") {
    return;
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false,
    autocapture: true,
    persistence: "localStorage+cookie",
    person_profiles: "identified_only",
    loaded(instance) {
      instance.register({
        app_name: "crevo",
        app_type: "product",
        app_environment: import.meta.env.DEV ? "development" : "production",
      });
    },
  });

  initialized = true;
}

export { posthog };
