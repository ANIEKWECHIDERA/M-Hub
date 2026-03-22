import { auth } from "@/firebase/firebase";
import { API_CONFIG } from "@/lib/api";

type FrontendLogLevel = "error" | "warn" | "info";
type FrontendLogType =
  | "runtime_error"
  | "unhandled_rejection"
  | "console_error"
  | "manual";

type FrontendLogPayload = {
  level: FrontendLogLevel;
  type: FrontendLogType;
  message: string;
  stack?: string | null;
  component?: string | null;
  path?: string | null;
  href?: string | null;
  userAgent?: string | null;
  meta?: Record<string, unknown>;
};

const RECENT_LOG_WINDOW_MS = 5000;
const MAX_MESSAGE_LENGTH = 4000;
const recentLogs = new Map<string, number>();
let installed = false;
const FRONTEND_LOGGING_ENABLED =
  import.meta.env.DEV ||
  import.meta.env.VITE_ENABLE_FRONTEND_LOGGING === "true";

const trimText = (value: string | null | undefined, maxLength: number) =>
  value ? value.slice(0, maxLength) : null;

const buildSignature = (payload: FrontendLogPayload) =>
  [
    payload.level,
    payload.type,
    payload.message,
    payload.path ?? "",
    payload.stack ?? "",
  ].join("|");

const shouldSkipLog = (payload: FrontendLogPayload) => {
  const signature = buildSignature(payload);
  const now = Date.now();

  for (const [key, timestamp] of recentLogs.entries()) {
    if (now - timestamp > RECENT_LOG_WINDOW_MS) {
      recentLogs.delete(key);
    }
  }

  const lastSeen = recentLogs.get(signature);
  if (lastSeen && now - lastSeen < RECENT_LOG_WINDOW_MS) {
    return true;
  }

  recentLogs.set(signature, now);
  return false;
};

const postFrontendLog = async (payload: FrontendLogPayload) => {
  if (!FRONTEND_LOGGING_ENABLED) {
    return;
  }

  if (shouldSkipLog(payload)) {
    return;
  }

  try {
    const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;

    await fetch(`${API_CONFIG.backend}/api/frontend-logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Frontend logging must never break the app.
  }
};

export const reportFrontendLog = (payload: FrontendLogPayload) => {
  void postFrontendLog({
    ...payload,
    message: trimText(payload.message, MAX_MESSAGE_LENGTH) ?? "Unknown frontend error",
    stack: trimText(payload.stack, 12000),
    path: trimText(payload.path ?? window.location.pathname, 500),
    href: trimText(payload.href ?? window.location.href, 2000),
    userAgent: trimText(payload.userAgent ?? navigator.userAgent, 1000),
    component: trimText(payload.component, 200),
    meta: payload.meta ?? {},
  });
};

export const installFrontendLogging = () => {
  if (installed || typeof window === "undefined" || !FRONTEND_LOGGING_ENABLED) {
    return;
  }

  installed = true;

  window.addEventListener("error", (event) => {
    reportFrontendLog({
      level: "error",
      type: "runtime_error",
      message: event.message || "Unhandled runtime error",
      stack: event.error?.stack ?? null,
      meta: {
        source: event.filename ?? null,
        line: event.lineno ?? null,
        column: event.colno ?? null,
      },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason =
      typeof event.reason === "string"
        ? event.reason
        : event.reason instanceof Error
          ? event.reason.message
          : "Unhandled promise rejection";

    reportFrontendLog({
      level: "error",
      type: "unhandled_rejection",
      message: reason,
      stack: event.reason instanceof Error ? event.reason.stack : null,
      meta: {
        reasonType:
          event.reason && typeof event.reason === "object"
            ? event.reason.constructor?.name ?? "object"
            : typeof event.reason,
      },
    });
  });

  const originalConsoleError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    originalConsoleError(...args);

    const [firstArg] = args;
    const message =
      typeof firstArg === "string"
        ? firstArg
        : firstArg instanceof Error
          ? firstArg.message
          : "Console error";

    const stack = firstArg instanceof Error ? firstArg.stack : null;

    reportFrontendLog({
      level: "error",
      type: "console_error",
      message,
      stack,
      meta: {
        args: args.map((arg) =>
          typeof arg === "string"
            ? trimText(arg, 1000)
            : arg instanceof Error
              ? {
                  name: arg.name,
                  message: trimText(arg.message, 1000),
                  stack: trimText(arg.stack, 2000),
                }
              : String(arg),
        ),
      },
    });
  };
};
