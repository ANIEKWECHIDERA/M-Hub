import type { Request } from "express";
import * as Sentry from "@sentry/node";

const firstNonEmpty = (...values: Array<string | undefined>) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
};

const OBSERVABILITY_PROVIDER = (
  process.env.OBSERVABILITY_PROVIDER ??
  (process.env.SENTRY_DSN ? "sentry" : "disabled")
).toLowerCase();
const OBSERVABILITY_DSN = firstNonEmpty(
  process.env.OBSERVABILITY_DSN,
  process.env.SENTRY_DSN,
);
const SENTRY_ENVIRONMENT =
  process.env.SENTRY_ENVIRONMENT ??
  process.env.OBSERVABILITY_ENVIRONMENT ??
  process.env.NODE_ENV ??
  "development";
const SENTRY_RELEASE =
  process.env.SENTRY_RELEASE ??
  process.env.OBSERVABILITY_RELEASE ??
  process.env.npm_package_version ??
  "local";
const SENTRY_TRACES_SAMPLE_RATE = Number.parseFloat(
  process.env.SENTRY_TRACES_SAMPLE_RATE ??
    process.env.OBSERVABILITY_TRACES_SAMPLE_RATE ??
    ((process.env.NODE_ENV ?? "development") === "production" ? "0.15" : "1"),
);
const SENTRY_PROFILES_SAMPLE_RATE = Number.parseFloat(
  process.env.SENTRY_PROFILES_SAMPLE_RATE ??
    process.env.OBSERVABILITY_PROFILES_SAMPLE_RATE ??
    ((process.env.NODE_ENV ?? "development") === "production" ? "0" : "0"),
);

const isFiniteRate = (value: number) => Number.isFinite(value) && value >= 0 && value <= 1;
const tracesSampleRate = isFiniteRate(SENTRY_TRACES_SAMPLE_RATE)
  ? SENTRY_TRACES_SAMPLE_RATE
  : (process.env.NODE_ENV ?? "development") === "production"
    ? 0.15
    : 1;
const profilesSampleRate = isFiniteRate(SENTRY_PROFILES_SAMPLE_RATE)
  ? SENTRY_PROFILES_SAMPLE_RATE
  : 0;

const isNoisyAuthError = (message: string) =>
  message.includes("auth/id-token-expired") ||
  message.includes("Invalid or expired token") ||
  message.includes("verifyFirebaseToken: Unauthorized");

const shouldDropTransaction = (transactionName: string | undefined) => {
  if (!transactionName) {
    return false;
  }

  return (
    transactionName.includes("/api/health") ||
    transactionName.includes("/api/frontend-logs") ||
    transactionName.includes("/api/cache-metrics")
  );
};

if (OBSERVABILITY_DSN && OBSERVABILITY_PROVIDER !== "disabled") {
  Sentry.init({
    dsn: OBSERVABILITY_DSN,
    environment: SENTRY_ENVIRONMENT,
    release: SENTRY_RELEASE,
    enabled: true,
    attachStacktrace: true,
    sendDefaultPii: false,
    tracesSampleRate,
    profilesSampleRate,
    integrations: [Sentry.requestDataIntegration(), Sentry.expressIntegration()],
    ignoreErrors: [
      "Invalid or expired token",
      "verifyFirebaseToken: Unauthorized",
      "Firebase ID token has expired",
    ],
    beforeSend(event, hint) {
      const originalError = hint.originalException;
      const message =
        originalError instanceof Error
          ? originalError.message
          : typeof originalError === "string"
            ? originalError
            : event.message ?? "";

      if (isNoisyAuthError(message)) {
        return null;
      }

      return event;
    },
    beforeSendTransaction(event) {
      event.tags = {
        ...event.tags,
        observability_provider: OBSERVABILITY_PROVIDER,
      };

      if (shouldDropTransaction(event.transaction)) {
        return null;
      }

      return event;
    },
  });
}

export const sentry = Sentry;

export const isSentryEnabled = () =>
  Boolean(OBSERVABILITY_DSN) &&
  OBSERVABILITY_PROVIDER !== "disabled" &&
  Sentry.isEnabled();

export const captureRequestException = (error: unknown, req: Request) => {
  if (!isSentryEnabled()) {
    return null;
  }

  return Sentry.withScope((scope) => {
    scope.setTag("observability_provider", OBSERVABILITY_PROVIDER);
    scope.setTag("request_id", req.requestId ?? "unknown");
    scope.setTag("http.method", req.method);
    scope.setTag("http.path", req.originalUrl || req.path);

    if (req.user?.company_id) {
      scope.setTag("company_id", req.user.company_id);
    }

    if (req.user?.role) {
      scope.setTag("user_role", req.user.role);
    }

    const sentryUserId = req.user?.id ?? req.user?.uid ?? null;
    if (sentryUserId || req.user?.email) {
      scope.setUser({
        id: sentryUserId ?? undefined,
        email: req.user?.email ?? undefined,
      });
    }

    scope.setContext("request", {
      requestId: req.requestId ?? null,
      path: req.originalUrl || req.path,
      method: req.method,
      companyId: req.user?.company_id ?? null,
      userId: req.user?.id ?? req.user?.uid ?? null,
      userAgent: req.get("user-agent") ?? null,
    });

    return Sentry.captureException(error);
  });
};
