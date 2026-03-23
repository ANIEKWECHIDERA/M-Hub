import { useEffect, useState } from "react";
import { useAuthContext } from "@/context/AuthContext";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import type { DashboardRetentionSnapshot } from "@/Types/types";

export function useRetentionSnapshot(options?: { enabled?: boolean }) {
  const { authStatus } = useAuthContext();
  const {
    getRetentionSnapshot,
    peekRetentionSnapshot,
  } = useWorkspaceContext();
  const enabled = options?.enabled ?? true;
  const companyId = authStatus?.companyId ?? null;
  const initialSnapshot = peekRetentionSnapshot(companyId);
  const [snapshot, setSnapshot] = useState<DashboardRetentionSnapshot | null>(
    initialSnapshot,
  );
  const [loading, setLoading] = useState(enabled && !initialSnapshot);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setSnapshot(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const cached = peekRetentionSnapshot(companyId);
    setSnapshot(cached);
    setLoading(!cached);
    setError(null);

    void getRetentionSnapshot()
      .then((nextSnapshot) => {
        if (!cancelled) {
          setSnapshot(nextSnapshot);
        }
      })
      .catch((nextError: any) => {
        if (!cancelled) {
          setError(nextError.message || "Failed to load dashboard snapshot");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [companyId, enabled, getRetentionSnapshot, peekRetentionSnapshot]);

  return {
    snapshot,
    loading,
    error,
  };
}
