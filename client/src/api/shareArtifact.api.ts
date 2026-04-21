import { apiFetch } from "./http";
import type {
  DecisionTimelineArtifact,
  WorkspaceSnapshotArtifact,
} from "@/Types/types";

type ShareArtifactQuery = {
  from?: string;
  to?: string;
  conversationId?: string;
  limit?: number;
};

function buildQuery(params: ShareArtifactQuery = {}) {
  const searchParams = new URLSearchParams();

  if (params.from) {
    searchParams.set("from", params.from);
  }
  if (params.to) {
    searchParams.set("to", params.to);
  }
  if (params.conversationId) {
    searchParams.set("conversationId", params.conversationId);
  }
  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export const shareArtifactAPI = {
  decisionTimeline(idToken: string, params?: ShareArtifactQuery) {
    return apiFetch<DecisionTimelineArtifact>(
      `/api/share/decision-timeline${buildQuery(params)}`,
      undefined,
      idToken,
    );
  },

  workspaceSnapshot(idToken: string, params?: ShareArtifactQuery) {
    return apiFetch<WorkspaceSnapshotArtifact>(
      `/api/share/workspace-snapshot${buildQuery(params)}`,
      undefined,
      idToken,
    );
  },
};
