import posthog from "posthog-js";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY?.trim();
const POSTHOG_PROXY_PATH = "/api/events";
const configuredPostHogHost = import.meta.env.VITE_POSTHOG_HOST?.trim();
const POSTHOG_HOST =
  configuredPostHogHost &&
  !configuredPostHogHost.includes("posthog.com") &&
  configuredPostHogHost !== "/ingest"
    ? configuredPostHogHost
    : POSTHOG_PROXY_PATH;

let initialized = false;

export const isPostHogEnabled = () => Boolean(POSTHOG_KEY);

export function initPostHog() {
  if (!POSTHOG_KEY || initialized || typeof window === "undefined") {
    return;
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false,
    capture_pageleave: false,
    autocapture: false,
    advanced_disable_flags: true,
    capture_performance: false,
    capture_heatmaps: false,
    capture_dead_clicks: false,
    disable_external_dependency_loading: true,
    disable_persistence: true,
    disable_scroll_properties: true,
    disable_session_recording: true,
    disable_surveys: true,
    disable_surveys_automatic_display: true,
    disable_product_tours: true,
    disable_conversations: true,
    persistence: "memory",
    person_profiles: "identified_only",
    request_queue_config: {
      flush_interval_ms: 5000,
    },
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
