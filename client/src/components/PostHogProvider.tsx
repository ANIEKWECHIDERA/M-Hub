import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuthContext } from "@/context/AuthContext";
import { initPostHog, isPostHogEnabled, posthog } from "@/lib/posthog";

export function PostHogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const location = useLocation();
  const { currentUser, authStatus } = useAuthContext();
  const hasIdentifiedRef = useRef(false);

  useEffect(() => {
    initPostHog();
  }, []);

  useEffect(() => {
    if (!isPostHogEnabled() || typeof window === "undefined") {
      return;
    }

    posthog.capture("$pageview", {
      $current_url: window.location.href,
      pathname: location.pathname,
      search: location.search,
      title: document.title,
    });
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!isPostHogEnabled()) {
      return;
    }

    if (!currentUser) {
      if (hasIdentifiedRef.current) {
        posthog.reset();
        hasIdentifiedRef.current = false;
      }
      return;
    }

    posthog.identify(
      currentUser.uid,
      {
        email: currentUser.email ?? undefined,
        display_name: currentUser.displayName ?? undefined,
        company_id: authStatus?.companyId ?? undefined,
        access: authStatus?.access ?? undefined,
        onboarding_state: authStatus?.onboardingState ?? undefined,
      },
      {
        first_seen_in_crevo:
          currentUser.metadata.creationTime ?? new Date().toISOString(),
      },
    );

    if (authStatus?.companyId) {
      posthog.group("company", authStatus.companyId, {
        access: authStatus.access,
      });
    }

    hasIdentifiedRef.current = true;
  }, [authStatus, currentUser]);

  return <>{children}</>;
}
