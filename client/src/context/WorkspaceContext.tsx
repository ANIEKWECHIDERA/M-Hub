import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { workspaceAPI, type Workspace } from "@/api/workspace.api";
import type {
  Company,
  DashboardRetentionSnapshot,
  WorkspaceManagerSnapshot,
} from "@/Types/types";
import { dashboardAPI } from "@/api/dashboard.api";
import { useAuthContext } from "@/context/AuthContext";

type WorkspaceContextValue = {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  loadingWorkspaces: boolean;
  refreshWorkspaces: (options?: { force?: boolean }) => Promise<Workspace[]>;
  getManagerSnapshot: (
    options?: { force?: boolean; companyId?: string | null },
  ) => Promise<WorkspaceManagerSnapshot | null>;
  peekManagerSnapshot: (
    companyId?: string | null,
  ) => WorkspaceManagerSnapshot | null;
  invalidateManagerSnapshot: (companyId?: string | null) => void;
  getRetentionSnapshot: (
    options?: { force?: boolean; companyId?: string | null },
  ) => Promise<DashboardRetentionSnapshot | null>;
  peekRetentionSnapshot: (
    companyId?: string | null,
  ) => DashboardRetentionSnapshot | null;
  invalidateRetentionSnapshot: (companyId?: string | null) => void;
  applyWorkspaceUpdate: (company: Company) => void;
  clearWorkspaceState: () => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspaceContext() {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error("useWorkspaceContext must be used within WorkspaceProvider");
  }

  return context;
}

export function WorkspaceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { idToken, authStatus } = useAuthContext();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);
  const listPromiseRef = useRef<Promise<Workspace[]> | null>(null);
  const managerCacheRef = useRef<Map<string, WorkspaceManagerSnapshot>>(
    new Map(),
  );
  const managerPromiseRef = useRef<
    Map<string, Promise<WorkspaceManagerSnapshot | null>>
  >(new Map());
  const retentionCacheRef = useRef<Map<string, DashboardRetentionSnapshot>>(
    new Map(),
  );
  const retentionPromiseRef = useRef<
    Map<string, Promise<DashboardRetentionSnapshot | null>>
  >(new Map());

  const clearWorkspaceState = useCallback(() => {
    setWorkspaces([]);
    setLoadingWorkspaces(false);
    listPromiseRef.current = null;
    managerCacheRef.current.clear();
    managerPromiseRef.current.clear();
    retentionCacheRef.current.clear();
    retentionPromiseRef.current.clear();
  }, []);

  const refreshWorkspaces = useCallback(
    async (options?: { force?: boolean }) => {
      const force = options?.force ?? false;

      if (!idToken || authStatus?.onboardingState !== "ACTIVE") {
        clearWorkspaceState();
        return [];
      }

      if (!force && workspaces.length > 0) {
        return workspaces;
      }

      if (!force && listPromiseRef.current) {
        return listPromiseRef.current;
      }

      setLoadingWorkspaces(true);

      const request = workspaceAPI
        .list(idToken)
        .then((response) => {
          setWorkspaces(response.workspaces);
          return response.workspaces;
        })
        .finally(() => {
          setLoadingWorkspaces(false);
          listPromiseRef.current = null;
        });

      listPromiseRef.current = request;
      return request;
    },
    [
      authStatus?.onboardingState,
      clearWorkspaceState,
      idToken,
      workspaces,
    ],
  );

  const invalidateManagerSnapshot = useCallback((companyId?: string | null) => {
    if (!companyId) {
      managerCacheRef.current.clear();
      managerPromiseRef.current.clear();
      return;
    }

    managerCacheRef.current.delete(companyId);
    managerPromiseRef.current.delete(companyId);
  }, []);

  const invalidateRetentionSnapshot = useCallback((companyId?: string | null) => {
    if (!companyId) {
      retentionCacheRef.current.clear();
      retentionPromiseRef.current.clear();
      return;
    }

    retentionCacheRef.current.delete(companyId);
    retentionPromiseRef.current.delete(companyId);
  }, []);

  const getManagerSnapshot = useCallback(
    async (options?: { force?: boolean; companyId?: string | null }) => {
      const companyId = options?.companyId ?? authStatus?.companyId ?? null;
      const force = options?.force ?? false;

      if (!idToken || !companyId || authStatus?.onboardingState !== "ACTIVE") {
        return null;
      }

      if (!force && managerCacheRef.current.has(companyId)) {
        return managerCacheRef.current.get(companyId) ?? null;
      }

      const pending = managerPromiseRef.current.get(companyId);
      if (!force && pending) {
        return pending;
      }

      const request = workspaceAPI
        .manager(idToken)
        .then((snapshot) => {
          managerCacheRef.current.set(companyId, snapshot);
          return snapshot;
        })
        .finally(() => {
          managerPromiseRef.current.delete(companyId);
        });

      managerPromiseRef.current.set(companyId, request);
      return request;
    },
    [authStatus?.companyId, authStatus?.onboardingState, idToken],
  );

  const peekManagerSnapshot = useCallback(
    (companyId?: string | null) => {
      const resolvedCompanyId = companyId ?? authStatus?.companyId ?? null;
      if (!resolvedCompanyId) {
        return null;
      }

      return managerCacheRef.current.get(resolvedCompanyId) ?? null;
    },
    [authStatus?.companyId],
  );

  const getRetentionSnapshot = useCallback(
    async (options?: { force?: boolean; companyId?: string | null }) => {
      const companyId = options?.companyId ?? authStatus?.companyId ?? null;
      const force = options?.force ?? false;

      if (!idToken || !companyId || authStatus?.onboardingState !== "ACTIVE") {
        return null;
      }

      if (!force && retentionCacheRef.current.has(companyId)) {
        return retentionCacheRef.current.get(companyId) ?? null;
      }

      const pending = retentionPromiseRef.current.get(companyId);
      if (!force && pending) {
        return pending;
      }

      const request = dashboardAPI
        .retention(idToken)
        .then((snapshot) => {
          retentionCacheRef.current.set(companyId, snapshot);
          return snapshot;
        })
        .finally(() => {
          retentionPromiseRef.current.delete(companyId);
        });

      retentionPromiseRef.current.set(companyId, request);
      return request;
    },
    [authStatus?.companyId, authStatus?.onboardingState, idToken],
  );

  const peekRetentionSnapshot = useCallback(
    (companyId?: string | null) => {
      const resolvedCompanyId = companyId ?? authStatus?.companyId ?? null;
      if (!resolvedCompanyId) {
        return null;
      }

      return retentionCacheRef.current.get(resolvedCompanyId) ?? null;
    },
    [authStatus?.companyId],
  );

  const applyWorkspaceUpdate = useCallback((company: Company) => {
    const logoUrl = company.logoUrl ?? null;

    setWorkspaces((current) =>
      current.map((workspace) =>
        workspace.companyId === company.id
          ? {
              ...workspace,
              name: company.name,
              logoUrl,
            }
          : workspace,
      ),
    );

    const cachedSnapshot = managerCacheRef.current.get(company.id);
    if (cachedSnapshot) {
      managerCacheRef.current.set(company.id, {
        ...cachedSnapshot,
        workspace: {
          ...cachedSnapshot.workspace,
          name: company.name,
          description:
            company.description ?? cachedSnapshot.workspace.description ?? null,
          logoUrl,
        },
      });
    }

    const retentionSnapshot = retentionCacheRef.current.get(company.id);
    if (retentionSnapshot?.workspaceHealth) {
      retentionCacheRef.current.set(company.id, {
        ...retentionSnapshot,
      });
    }
  }, []);

  useEffect(() => {
    if (!idToken || authStatus?.onboardingState !== "ACTIVE") {
      clearWorkspaceState();
      return;
    }

    void refreshWorkspaces();
  }, [
    authStatus?.companyId,
    authStatus?.onboardingState,
    clearWorkspaceState,
    idToken,
    refreshWorkspaces,
  ]);

  const currentWorkspace = useMemo(
    () =>
      workspaces.find((workspace) => workspace.isActive) ??
      workspaces.find(
        (workspace) => workspace.companyId === authStatus?.companyId,
      ) ??
      workspaces[0] ??
      null,
    [authStatus?.companyId, workspaces],
  );

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      workspaces,
      currentWorkspace,
      loadingWorkspaces,
      refreshWorkspaces,
      getManagerSnapshot,
      peekManagerSnapshot,
      invalidateManagerSnapshot,
      getRetentionSnapshot,
      peekRetentionSnapshot,
      invalidateRetentionSnapshot,
      applyWorkspaceUpdate,
      clearWorkspaceState,
    }),
    [
      applyWorkspaceUpdate,
      clearWorkspaceState,
      currentWorkspace,
      getManagerSnapshot,
      peekManagerSnapshot,
      invalidateManagerSnapshot,
      getRetentionSnapshot,
      peekRetentionSnapshot,
      invalidateRetentionSnapshot,
      loadingWorkspaces,
      refreshWorkspaces,
      workspaces,
    ],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}
