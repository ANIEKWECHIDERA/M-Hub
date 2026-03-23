import { useEffect, useState } from "react";
import { useAuthContext } from "@/context/AuthContext";
import { useWorkspaceContext } from "@/context/WorkspaceContext";
import type { DashboardRetentionSnapshot } from "@/Types/types";

export function useRetentionSnapshot() {
  const { authStatus } = useAuthContext();
  const {
    getRetentionSnapshot,
    peekRetentionSnapshot,
  } = useWorkspaceContext();
  const companyId = authStatus?.companyId ?? null;
  const initialSnapshot = peekRetentionSnapshot(companyId);
  const [snapshot, setSnapshot] = useState<DashboardRetentionSnapshot | null>(
    initialSnapshot,
  );
  const [loading, setLoading] = useState(!initialSnapshot);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, [companyId, getRetentionSnapshot, peekRetentionSnapshot]);

  return {
    snapshot,
    loading,
    error,
  };
}
