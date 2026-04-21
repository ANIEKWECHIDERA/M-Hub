import { prisma } from "../lib/prisma";
import {
  buildWorkspaceHealthScore,
  type WorkspaceHealthScore,
} from "./retention.service";
import type { ChatMessageTag } from "../types/chat.types";

type ShareRange = {
  from: Date;
  to: Date;
  label: string;
};

type WorkspaceSummary = {
  id: string;
  name: string;
  logoUrl: string | null;
};

export type ShareArtifactAccess =
  | "admin"
  | "superAdmin"
  | "team_member"
  | "member"
  | null;

export type DecisionTimelineItem = {
  id: string;
  messageId: string;
  conversationId: string;
  conversationName: string;
  decisionText: string;
  primaryTag: ChatMessageTag;
  tags: ChatMessageTag[];
  contributor: {
    id: string | null;
    name: string;
    avatar: string | null;
  };
  createdAt: string;
  approvalState: null;
};

export type DecisionTimelineArtifact = {
  artifactType: "decision-timeline";
  workspace: WorkspaceSummary;
  range: {
    from: string;
    to: string;
    label: string;
  };
  summary: {
    decisions: number;
    actionItems: number;
    blockers: number;
    contributors: number;
  };
  items: DecisionTimelineItem[];
  generatedAt: string;
};

export type WorkspaceSnapshotArtifact = {
  artifactType: "workspace-snapshot";
  workspace: WorkspaceSummary;
  range: {
    from: string;
    to: string;
    label: string;
  };
  metrics: {
    completedTasks: number;
    overdueTasks: number;
    decisionsMade: number;
    blockersRaised: number;
    activeProjects: number;
    completionRate: number;
  };
  health: WorkspaceHealthScore;
  highlights: string[];
  generatedAt: string;
};

type DecisionTimelineParams = {
  companyId: string;
  userId: string;
  from?: unknown;
  to?: unknown;
  conversationId?: unknown;
  limit?: unknown;
};

type WorkspaceSnapshotParams = {
  companyId: string;
  from?: unknown;
  to?: unknown;
};

const IMPORTANT_TAGS: ChatMessageTag[] = [
  "decision",
  "action-item",
  "blocker",
];

const TAG_ORDER: ChatMessageTag[] = [
  "decision",
  "blocker",
  "action-item",
  "update",
  "question",
  "follow-up",
];

const DEFAULT_RANGE_DAYS = 7;
const MAX_RANGE_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

class ShareArtifactValidationError extends Error {
  status = 400;
}

function firstQueryValue(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

function parseDateInput(value: unknown, fieldName: string) {
  const rawValue = firstQueryValue(value);
  if (typeof rawValue !== "string" || rawValue.trim() === "") {
    return null;
  }

  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) {
    throw new ShareArtifactValidationError(`${fieldName} must be a valid date`);
  }

  return date;
}

function formatRangeLabel(from: Date, to: Date) {
  const sameYear = from.getUTCFullYear() === to.getUTCFullYear();
  const formatPart = (date: Date, includeYear: boolean) =>
    date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      ...(includeYear ? { year: "numeric" } : {}),
      timeZone: "UTC",
    });

  return `${formatPart(from, !sameYear)} - ${formatPart(to, true)}`;
}

export function normalizeShareArtifactRange(params: {
  from?: unknown;
  to?: unknown;
}): ShareRange {
  const now = new Date();
  const defaultFrom = new Date(now.getTime() - DEFAULT_RANGE_DAYS * MS_PER_DAY);
  const from = parseDateInput(params.from, "from") ?? defaultFrom;
  const to = parseDateInput(params.to, "to") ?? now;

  if (from.getTime() > to.getTime()) {
    throw new ShareArtifactValidationError("from must be before to");
  }

  const rangeDays = Math.ceil((to.getTime() - from.getTime()) / MS_PER_DAY);
  if (rangeDays > MAX_RANGE_DAYS) {
    throw new ShareArtifactValidationError(
      `Range cannot be longer than ${MAX_RANGE_DAYS} days`,
    );
  }

  return {
    from,
    to,
    label: formatRangeLabel(from, to),
  };
}

function normalizeLimit(value: unknown) {
  const rawValue = firstQueryValue(value);
  const parsed =
    typeof rawValue === "string" || typeof rawValue === "number"
      ? Number(rawValue)
      : NaN;

  if (!Number.isFinite(parsed)) {
    return 12;
  }

  return Math.max(1, Math.min(24, Math.trunc(parsed)));
}

function normalizeOptionalUuid(value: unknown, fieldName: string) {
  const rawValue = firstQueryValue(value);
  if (rawValue == null || rawValue === "") {
    return null;
  }

  if (typeof rawValue !== "string") {
    throw new ShareArtifactValidationError(`${fieldName} must be a string`);
  }

  return rawValue;
}

function getPrimaryTag(tags: ChatMessageTag[]) {
  return TAG_ORDER.find((tag) => tags.includes(tag)) ?? tags[0] ?? "decision";
}

function uniqueCount(values: Array<string | null | undefined>) {
  return new Set(values.filter(Boolean)).size;
}

async function getWorkspaceSummary(companyId: string): Promise<WorkspaceSummary> {
  const rows = await prisma.$queryRaw<Array<Record<string, any>>>`
    SELECT id, name, logo_url
    FROM companies
    WHERE id = ${companyId}::uuid
    LIMIT 1`;

  const workspace = rows[0];
  if (!workspace) {
    throw new ShareArtifactValidationError("Workspace not found");
  }

  return {
    id: String(workspace.id),
    name: workspace.name ?? "Workspace",
    logoUrl: workspace.logo_url ?? null,
  };
}

function buildHighlights(params: {
  completedTasks: number;
  overdueTasks: number;
  decisionsMade: number;
  blockersRaised: number;
  activeProjects: number;
  health: WorkspaceHealthScore;
}) {
  const highlights: string[] = [];

  if (params.completedTasks > 0) {
    highlights.push(
      `${params.completedTasks} ${params.completedTasks === 1 ? "task" : "tasks"} completed in this period`,
    );
  }

  if (params.decisionsMade > 0) {
    highlights.push(
      `${params.decisionsMade} key ${params.decisionsMade === 1 ? "decision" : "decisions"} captured from chat`,
    );
  }

  if (params.overdueTasks > 0) {
    highlights.push(
      `${params.overdueTasks} overdue ${params.overdueTasks === 1 ? "task needs" : "tasks need"} attention`,
    );
  } else {
    highlights.push("No overdue task pressure in this period");
  }

  if (params.blockersRaised > 0) {
    highlights.push(
      `${params.blockersRaised} blocker ${params.blockersRaised === 1 ? "signal" : "signals"} raised`,
    );
  }

  if (highlights.length < 3 && params.activeProjects > 0) {
    highlights.push(
      `${params.activeProjects} active ${params.activeProjects === 1 ? "project" : "projects"} in motion`,
    );
  }

  if (highlights.length < 3) {
    highlights.push(params.health.summary);
  }

  return highlights.slice(0, 4);
}

export const ShareArtifactService = {
  async getDecisionTimeline(
    params: DecisionTimelineParams,
  ): Promise<DecisionTimelineArtifact> {
    const range = normalizeShareArtifactRange(params);
    const limit = normalizeLimit(params.limit);
    const conversationId = normalizeOptionalUuid(
      params.conversationId,
      "conversationId",
    );
    const decisionRowsPromise = conversationId
      ? prisma.$queryRaw<Array<Record<string, any>>>`
        SELECT
          m.id AS message_id,
          m.body,
          m.created_at,
          c.id AS conversation_id,
          COALESCE(c.name, 'Group chat') AS conversation_name,
          tm.user_id AS contributor_user_id,
          COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''), u.display_name, tm.email, 'Unknown teammate') AS contributor_name,
          COALESCE(u.avatar, u.photo_url) AS contributor_avatar,
          COALESCE(tags.tags, '[]'::json) AS tags
        FROM chat_messages m
        INNER JOIN chat_conversations c ON c.id = m.conversation_id
        INNER JOIN chat_conversation_members cm
          ON cm.conversation_id = c.id
         AND cm.user_id = ${params.userId}::uuid
         AND cm.removed_at IS NULL
        LEFT JOIN team_members tm ON tm.id = m.sender_team_member_id
        LEFT JOIN users u ON u.id = tm.user_id
        LEFT JOIN LATERAL (
          SELECT json_agg(t.tag ORDER BY
            CASE t.tag
              WHEN 'decision' THEN 0
              WHEN 'blocker' THEN 1
              WHEN 'action-item' THEN 2
              ELSE 3
            END,
            t.created_at DESC
          ) AS tags
          FROM chat_message_tags t
          WHERE t.message_id = m.id
        ) tags ON TRUE
        WHERE m.company_id = ${params.companyId}::uuid
          AND c.company_id = ${params.companyId}::uuid
          AND c.id = ${conversationId}::uuid
          AND c.type = 'group'
          AND m.deleted_at IS NULL
          AND m.created_at >= ${range.from}
          AND m.created_at <= ${range.to}
          AND EXISTS (
            SELECT 1
            FROM chat_message_tags t
            WHERE t.message_id = m.id
              AND t.tag IN ('decision', 'action-item', 'blocker')
          )
        ORDER BY m.created_at DESC
        LIMIT ${limit}`
      : prisma.$queryRaw<Array<Record<string, any>>>`
        SELECT
          m.id AS message_id,
          m.body,
          m.created_at,
          c.id AS conversation_id,
          COALESCE(c.name, 'Group chat') AS conversation_name,
          tm.user_id AS contributor_user_id,
          COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''), u.display_name, tm.email, 'Unknown teammate') AS contributor_name,
          COALESCE(u.avatar, u.photo_url) AS contributor_avatar,
          COALESCE(tags.tags, '[]'::json) AS tags
        FROM chat_messages m
        INNER JOIN chat_conversations c ON c.id = m.conversation_id
        INNER JOIN chat_conversation_members cm
          ON cm.conversation_id = c.id
         AND cm.user_id = ${params.userId}::uuid
         AND cm.removed_at IS NULL
        LEFT JOIN team_members tm ON tm.id = m.sender_team_member_id
        LEFT JOIN users u ON u.id = tm.user_id
        LEFT JOIN LATERAL (
          SELECT json_agg(t.tag ORDER BY
            CASE t.tag
              WHEN 'decision' THEN 0
              WHEN 'blocker' THEN 1
              WHEN 'action-item' THEN 2
              ELSE 3
            END,
            t.created_at DESC
          ) AS tags
          FROM chat_message_tags t
          WHERE t.message_id = m.id
        ) tags ON TRUE
        WHERE m.company_id = ${params.companyId}::uuid
          AND c.company_id = ${params.companyId}::uuid
          AND c.type = 'group'
          AND m.deleted_at IS NULL
          AND m.created_at >= ${range.from}
          AND m.created_at <= ${range.to}
          AND EXISTS (
            SELECT 1
            FROM chat_message_tags t
            WHERE t.message_id = m.id
              AND t.tag IN ('decision', 'action-item', 'blocker')
          )
        ORDER BY m.created_at DESC
        LIMIT ${limit}`;

    const [workspace, rows] = await Promise.all([
      getWorkspaceSummary(params.companyId),
      decisionRowsPromise,
    ]);

    const items: DecisionTimelineItem[] = rows.map((row) => {
      const tags = (Array.isArray(row.tags) ? row.tags : []).filter((tag) =>
        IMPORTANT_TAGS.includes(tag as ChatMessageTag),
      ) as ChatMessageTag[];

      return {
        id: `decision-${row.message_id}`,
        messageId: row.message_id,
        conversationId: row.conversation_id,
        conversationName: row.conversation_name,
        decisionText: row.body ?? "",
        primaryTag: getPrimaryTag(tags),
        tags,
        contributor: {
          id: row.contributor_user_id ?? null,
          name: row.contributor_name ?? "Unknown teammate",
          avatar: row.contributor_avatar ?? null,
        },
        createdAt: new Date(row.created_at).toISOString(),
        approvalState: null,
      };
    });

    return {
      artifactType: "decision-timeline",
      workspace,
      range: {
        from: range.from.toISOString(),
        to: range.to.toISOString(),
        label: range.label,
      },
      summary: {
        decisions: items.filter((item) => item.tags.includes("decision")).length,
        actionItems: items.filter((item) =>
          item.tags.includes("action-item"),
        ).length,
        blockers: items.filter((item) => item.tags.includes("blocker")).length,
        contributors: uniqueCount(items.map((item) => item.contributor.id)),
      },
      items,
      generatedAt: new Date().toISOString(),
    };
  },

  async getWorkspaceSnapshot(
    params: WorkspaceSnapshotParams,
  ): Promise<WorkspaceSnapshotArtifact> {
    const range = normalizeShareArtifactRange(params);

    const [workspace, metricRows] = await Promise.all([
      getWorkspaceSummary(params.companyId),
      prisma.$queryRaw<Array<Record<string, any>>>`
        SELECT
          COUNT(*) FILTER (
            WHERE t.status = 'Done'
              AND t.updated_at >= ${range.from}
              AND t.updated_at <= ${range.to}
          )::int AS completed_tasks,
          COUNT(*) FILTER (
            WHERE t.due_date IS NOT NULL
              AND t.due_date < ${range.to}
              AND t.status <> 'Done'
          )::int AS overdue_tasks,
          COUNT(*)::int AS total_tasks,
          COUNT(*) FILTER (WHERE t.status = 'Done')::int AS all_completed_tasks,
          (
            SELECT COUNT(DISTINCT m.id)::int
            FROM chat_messages m
            INNER JOIN chat_conversations c ON c.id = m.conversation_id
            WHERE m.company_id = ${params.companyId}::uuid
              AND c.company_id = ${params.companyId}::uuid
              AND c.type = 'group'
              AND m.deleted_at IS NULL
              AND m.created_at >= ${range.from}
              AND m.created_at <= ${range.to}
              AND EXISTS (
                SELECT 1
                FROM chat_message_tags decision_tags
                WHERE decision_tags.message_id = m.id
                  AND decision_tags.tag = 'decision'
              )
          ) AS decisions_made,
          (
            SELECT COUNT(DISTINCT m.id)::int
            FROM chat_messages m
            INNER JOIN chat_conversations c ON c.id = m.conversation_id
            WHERE m.company_id = ${params.companyId}::uuid
              AND c.company_id = ${params.companyId}::uuid
              AND c.type = 'group'
              AND m.deleted_at IS NULL
              AND m.created_at >= ${range.from}
              AND m.created_at <= ${range.to}
              AND EXISTS (
                SELECT 1
                FROM chat_message_tags blocker_tags
                WHERE blocker_tags.message_id = m.id
                  AND blocker_tags.tag = 'blocker'
              )
          ) AS blockers_raised,
          (
            SELECT COUNT(*)::int
            FROM projects p
            WHERE p.company_id = ${params.companyId}::uuid
              AND p.status NOT IN ('Completed', 'Archived')
          ) AS active_projects
        FROM tasks t
        WHERE t.company_id = ${params.companyId}::uuid`,
    ]);

    const metrics = metricRows[0] ?? {};
    const totalTasks = Number(metrics.total_tasks ?? 0);
    const allCompletedTasks = Number(metrics.all_completed_tasks ?? 0);
    const completedTasks = Number(metrics.completed_tasks ?? 0);
    const overdueTasks = Number(metrics.overdue_tasks ?? 0);
    const decisionsMade = Number(metrics.decisions_made ?? 0);
    const blockersRaised = Number(metrics.blockers_raised ?? 0);
    const activeProjects = Number(metrics.active_projects ?? 0);

    const health = buildWorkspaceHealthScore({
      totalTasks,
      completedTasks: allCompletedTasks,
      overdueTasks,
      overloadedMembers: 0,
      behindMembers: 0,
      blockerSignals: blockersRaised,
    });

    return {
      artifactType: "workspace-snapshot",
      workspace,
      range: {
        from: range.from.toISOString(),
        to: range.to.toISOString(),
        label: range.label,
      },
      metrics: {
        completedTasks,
        overdueTasks,
        decisionsMade,
        blockersRaised,
        activeProjects,
        completionRate: health.metrics.completionRate,
      },
      health,
      highlights: buildHighlights({
        completedTasks,
        overdueTasks,
        decisionsMade,
        blockersRaised,
        activeProjects,
        health,
      }),
      generatedAt: new Date().toISOString(),
    };
  },
};

export { ShareArtifactValidationError };
