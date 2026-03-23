import { prisma } from "../lib/prisma";
import { WorkspaceService } from "./workspace.service";
import { CHAT_MESSAGE_TAGS, type ChatMessageTag } from "../types/chat.types";

type RetentionAccess = "admin" | "superAdmin" | "team_member" | "member" | null;

type DailyFocusUrgency = "overdue" | "today" | "soon" | "watch";
type DailyFocusKind = "task" | "decision" | "blocker" | "action-item";

export type DailyFocusItem = {
  id: string;
  taskId: string | null;
  kind: DailyFocusKind;
  urgency: DailyFocusUrgency;
  title: string;
  description: string | null;
  dueAt: string | null;
  project: {
    id: string;
    title: string;
  } | null;
  conversation: {
    id: string;
    name: string;
  } | null;
  messageId: string | null;
  tag: ChatMessageTag | null;
  statusLabel: string;
};

export type DecisionFeedItem = {
  id: string;
  conversationId: string;
  conversationName: string;
  messageId: string;
  preview: string;
  createdAt: string;
  sender: {
    name: string;
    avatar: string | null;
  };
  tags: ChatMessageTag[];
  primaryTag: ChatMessageTag;
};

export type WorkspaceHealthScore = {
  score: number;
  status: "Healthy" | "At Risk" | "Critical";
  summary: string;
  breakdown: Array<{
    label: string;
    value: string;
    tone: "good" | "neutral" | "warning" | "critical";
  }>;
  metrics: {
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    overloadedMembers: number;
    behindMembers: number;
    blockerSignals: number;
    completionRate: number;
  };
};

export type RetentionDashboardSnapshot = {
  dailyFocus: {
    items: DailyFocusItem[];
  };
  decisionFeed: {
    items: DecisionFeedItem[];
    counts: Record<string, number>;
  };
  workspaceHealth: WorkspaceHealthScore | null;
};

type WorkspaceHealthInputs = {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  overloadedMembers: number;
  behindMembers: number;
  blockerSignals: number;
};

const IMPORTANT_DECISION_TAGS: ChatMessageTag[] = [
  "decision",
  "action-item",
  "blocker",
];

const PRIMARY_TAG_ORDER: ChatMessageTag[] = [
  "decision",
  "blocker",
  "action-item",
  "update",
  "question",
  "follow-up",
];

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getPrimaryTag(tags: ChatMessageTag[]) {
  return (
    PRIMARY_TAG_ORDER.find((candidate) => tags.includes(candidate)) ??
    tags[0] ??
    "decision"
  );
}

function getFocusUrgency(dueAt: string | null): DailyFocusUrgency {
  if (!dueAt) {
    return "watch";
  }

  const now = new Date();
  const due = new Date(dueAt);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const soonEnd = new Date(todayStart);
  soonEnd.setDate(soonEnd.getDate() + 4);

  if (due.getTime() < todayStart.getTime()) {
    return "overdue";
  }

  if (due.getTime() < tomorrowStart.getTime()) {
    return "today";
  }

  if (due.getTime() < soonEnd.getTime()) {
    return "soon";
  }

  return "watch";
}

function getFocusSortWeight(item: DailyFocusItem) {
  if (item.kind === "blocker") {
    return 1;
  }

  if (item.kind === "action-item") {
    return 4;
  }

  if (item.kind === "decision") {
    return 5;
  }

  switch (item.urgency) {
    case "overdue":
      return 0;
    case "today":
      return 2;
    case "soon":
      return 3;
    default:
      return 6;
  }
}

function mapBreakdownTone(value: number, thresholds: {
  critical: number;
  warning: number;
  good?: number;
}) {
  if (value >= thresholds.critical) {
    return "critical" as const;
  }
  if (value >= thresholds.warning) {
    return "warning" as const;
  }
  if (typeof thresholds.good === "number" && value <= thresholds.good) {
    return "good" as const;
  }
  return "neutral" as const;
}

export function buildWorkspaceHealthScore(
  inputs: WorkspaceHealthInputs,
): WorkspaceHealthScore {
  const completionRate =
    inputs.totalTasks > 0 ? inputs.completedTasks / inputs.totalTasks : 1;

  let score = 100;
  score -= Math.min(32, inputs.overdueTasks * 5);
  score -= Math.min(18, inputs.behindMembers * 9);
  score -= Math.min(14, inputs.overloadedMembers * 5);
  score -= Math.min(12, inputs.blockerSignals * 3);

  if (completionRate < 0.25) {
    score -= 16;
  } else if (completionRate < 0.45) {
    score -= 10;
  } else if (completionRate < 0.65) {
    score -= 5;
  }

  const normalizedScore = clampScore(score);
  const status =
    normalizedScore >= 75
      ? "Healthy"
      : normalizedScore >= 45
        ? "At Risk"
        : "Critical";

  const driverPhrases: string[] = [];
  if (inputs.overdueTasks > 0) {
    driverPhrases.push(
      `${inputs.overdueTasks} overdue ${inputs.overdueTasks === 1 ? "task is" : "tasks are"} slowing the workspace down`,
    );
  }
  if (inputs.behindMembers > 0) {
    driverPhrases.push(
      `${inputs.behindMembers} ${inputs.behindMembers === 1 ? "person is" : "people are"} behind`,
    );
  }
  if (inputs.overloadedMembers > 0) {
    driverPhrases.push(
      `${inputs.overloadedMembers} ${inputs.overloadedMembers === 1 ? "teammate is" : "teammates are"} overloaded`,
    );
  }
  if (inputs.blockerSignals > 0) {
    driverPhrases.push(
      `${inputs.blockerSignals} recent blocker ${inputs.blockerSignals === 1 ? "signal needs" : "signals need"} attention`,
    );
  }

  const summary =
    driverPhrases[0] ??
    (inputs.totalTasks === 0
      ? "This workspace is clear of active task pressure right now."
      : completionRate >= 0.65
        ? "Delivery is moving steadily with manageable risk."
        : "Work is progressing, but delivery discipline needs attention.");

  return {
    score: normalizedScore,
    status,
    summary,
    breakdown: [
      {
        label: "Overdue tasks",
        value: String(inputs.overdueTasks),
        tone: mapBreakdownTone(inputs.overdueTasks, {
          critical: 5,
          warning: 1,
          good: 0,
        }),
      },
      {
        label: "Completion rate",
        value: `${Math.round(completionRate * 100)}%`,
        tone:
          completionRate >= 0.65
            ? "good"
            : completionRate >= 0.45
              ? "neutral"
              : "warning",
      },
      {
        label: "Overloaded teammates",
        value: String(inputs.overloadedMembers),
        tone: mapBreakdownTone(inputs.overloadedMembers, {
          critical: 3,
          warning: 1,
          good: 0,
        }),
      },
      {
        label: "Behind teammates",
        value: String(inputs.behindMembers),
        tone: mapBreakdownTone(inputs.behindMembers, {
          critical: 2,
          warning: 1,
          good: 0,
        }),
      },
      {
        label: "Recent blocker signals",
        value: String(inputs.blockerSignals),
        tone: mapBreakdownTone(inputs.blockerSignals, {
          critical: 3,
          warning: 1,
          good: 0,
        }),
      },
    ],
    metrics: {
      ...inputs,
      completionRate: Math.round(completionRate * 100),
    },
  };
}

export const RetentionService = {
  async getDashboardSnapshot(params: {
    companyId: string;
    userId: string;
    access: RetentionAccess;
  }): Promise<RetentionDashboardSnapshot> {
    const [dailyFocus, decisionFeed, workspaceHealth] = await Promise.all([
      this.getDailyFocus(params),
      this.getDecisionFeed(params),
      params.access === "admin" || params.access === "superAdmin"
        ? this.getWorkspaceHealthScore(params.companyId)
        : Promise.resolve(null),
    ]);

    return {
      dailyFocus: {
        items: dailyFocus,
      },
      decisionFeed,
      workspaceHealth,
    };
  },

  async getDailyFocus(params: {
    companyId: string;
    userId: string;
    access: RetentionAccess;
  }): Promise<DailyFocusItem[]> {
    const taskRows = await prisma.$queryRaw<Array<Record<string, any>>>`
      SELECT
        t.id,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.due_date,
        p.id AS project_id,
        p.title AS project_title
      FROM tasks t
      INNER JOIN task_team_member_assignees ta ON ta.task_id = t.id
      INNER JOIN team_members tm ON tm.id = ta.team_member_id
      LEFT JOIN projects p ON p.id = t.project_id
      WHERE t.company_id = ${params.companyId}::uuid
        AND tm.user_id = ${params.userId}::uuid
        AND tm.status = 'active'
        AND t.status <> 'Done'
        AND (
          t.due_date IS NOT NULL
          AND t.due_date < NOW() + INTERVAL '4 day'
        )
      ORDER BY
        t.due_date ASC NULLS LAST,
        CASE t.priority
          WHEN 'high' THEN 0
          WHEN 'medium' THEN 1
          ELSE 2
        END,
        t.created_at ASC
      LIMIT 6`;

    const decisionRows = await prisma.$queryRaw<Array<Record<string, any>>>`
      SELECT
        m.id AS message_id,
        m.body,
        m.created_at,
        c.id AS conversation_id,
        COALESCE(c.name, 'Group chat') AS conversation_name,
        COALESCE(tags.tags, '[]'::json) AS tags
      FROM chat_messages m
      INNER JOIN chat_conversations c ON c.id = m.conversation_id
      INNER JOIN chat_conversation_members cm
        ON cm.conversation_id = c.id
       AND cm.user_id = ${params.userId}::uuid
       AND cm.removed_at IS NULL
      LEFT JOIN LATERAL (
        SELECT json_agg(t.tag ORDER BY
          CASE t.tag
            WHEN 'blocker' THEN 0
            WHEN 'decision' THEN 1
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
        AND EXISTS (
          SELECT 1
          FROM chat_message_tags t
          WHERE t.message_id = m.id
            AND t.tag IN ('decision', 'blocker', 'action-item')
        )
      ORDER BY
        CASE
          WHEN EXISTS (
            SELECT 1
            FROM chat_message_tags t
            WHERE t.message_id = m.id AND t.tag = 'blocker'
          ) THEN 0
          WHEN EXISTS (
            SELECT 1
            FROM chat_message_tags t
            WHERE t.message_id = m.id AND t.tag = 'decision'
          ) THEN 1
          ELSE 2
        END,
        m.created_at DESC
      LIMIT 4`;

    const taskItems: DailyFocusItem[] = taskRows.map((row) => {
      const dueAt = row.due_date ? new Date(row.due_date).toISOString() : null;
      const urgency = getFocusUrgency(dueAt);

      return {
        id: `task-${row.id}`,
        taskId: row.id,
        kind: "task",
        urgency,
        title: row.title,
        description: row.description ?? null,
        dueAt,
        project:
          row.project_id && row.project_title
            ? {
                id: row.project_id,
                title: row.project_title,
              }
            : null,
        conversation: null,
        messageId: null,
        tag: null,
        statusLabel:
          urgency === "overdue"
            ? "Overdue"
            : urgency === "today"
              ? "Due today"
              : urgency === "soon"
                ? "Due soon"
                : "Watch next",
      };
    });

    const decisionItems: DailyFocusItem[] = decisionRows.map((row) => {
      const tags = Array.isArray(row.tags)
        ? (row.tags as ChatMessageTag[])
        : [];
      const primaryTag = getPrimaryTag(tags);

      return {
        id: `message-${row.message_id}`,
        taskId: null,
        kind:
          primaryTag === "blocker"
            ? "blocker"
            : primaryTag === "action-item"
              ? "action-item"
              : "decision",
        urgency: primaryTag === "blocker" ? "today" : "watch",
        title:
          primaryTag === "blocker"
            ? "Blocker raised in chat"
            : primaryTag === "action-item"
              ? "Action item captured in chat"
              : "Decision made in chat",
        description: row.body ?? null,
        dueAt: null,
        project: null,
        conversation: {
          id: row.conversation_id,
          name: row.conversation_name,
        },
        messageId: row.message_id,
        tag: primaryTag,
        statusLabel:
          primaryTag === "blocker"
            ? "Needs attention"
            : primaryTag === "action-item"
              ? "Action captured"
              : "Decision captured",
      };
    });

    return [...taskItems, ...decisionItems]
      .sort((left, right) => {
        const sortDelta = getFocusSortWeight(left) - getFocusSortWeight(right);
        if (sortDelta !== 0) {
          return sortDelta;
        }

        const leftDate = left.dueAt ?? "";
        const rightDate = right.dueAt ?? "";
        return leftDate.localeCompare(rightDate);
      })
      .slice(0, 8);
  },

  async getDecisionFeed(params: {
    companyId: string;
    userId: string;
    access: RetentionAccess;
  }): Promise<RetentionDashboardSnapshot["decisionFeed"]> {
    const rows = await prisma.$queryRaw<Array<Record<string, any>>>`
      SELECT
        m.id AS message_id,
        m.body,
        m.created_at,
        c.id AS conversation_id,
        COALESCE(c.name, 'Group chat') AS conversation_name,
        COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''), u.display_name, tm.email) AS sender_name,
        COALESCE(u.avatar, u.photo_url) AS sender_avatar,
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
        AND EXISTS (
          SELECT 1
          FROM chat_message_tags t
          WHERE t.message_id = m.id
            AND t.tag IN ('decision', 'action-item', 'blocker')
        )
      ORDER BY
        CASE
          WHEN EXISTS (
            SELECT 1
            FROM chat_message_tags t
            WHERE t.message_id = m.id AND t.tag = 'decision'
          ) THEN 0
          WHEN EXISTS (
            SELECT 1
            FROM chat_message_tags t
            WHERE t.message_id = m.id AND t.tag = 'blocker'
          ) THEN 1
          ELSE 2
        END,
        m.created_at DESC
      LIMIT 24`;

    const items: DecisionFeedItem[] = rows.map((row) => {
      const tags = (Array.isArray(row.tags) ? row.tags : []).filter((tag: string) =>
        IMPORTANT_DECISION_TAGS.includes(tag as ChatMessageTag),
      ) as ChatMessageTag[];

      return {
        id: `decision-${row.message_id}`,
        conversationId: row.conversation_id,
        conversationName: row.conversation_name,
        messageId: row.message_id,
        preview: row.body,
        createdAt: new Date(row.created_at).toISOString(),
        sender: {
          name: row.sender_name ?? "Unknown sender",
          avatar: row.sender_avatar ?? null,
        },
        tags,
        primaryTag: getPrimaryTag(tags),
      };
    });

    const counts = {
      all: items.length,
      decision: items.filter((item) => item.tags.includes("decision")).length,
      "action-item": items.filter((item) =>
        item.tags.includes("action-item"),
      ).length,
      blocker: items.filter((item) => item.tags.includes("blocker")).length,
    };

    return { items, counts };
  },

  async getWorkspaceHealthScore(companyId: string) {
    const workspaceSnapshot = await WorkspaceService.getManagerSnapshot(companyId);
    const workload = workspaceSnapshot.workload;

    const taskCounts = await prisma.$queryRaw<Array<Record<string, any>>>`
      SELECT
        COUNT(*)::int AS total_tasks,
        COUNT(*) FILTER (WHERE status = 'Done')::int AS completed_tasks,
        COUNT(*) FILTER (WHERE due_date IS NOT NULL AND due_date < NOW() AND status <> 'Done')::int AS overdue_tasks
      FROM tasks
      WHERE company_id = ${companyId}::uuid`;

    const blockerCounts = await prisma.$queryRaw<Array<Record<string, any>>>`
      SELECT COUNT(DISTINCT m.id)::int AS blocker_signals
      FROM chat_messages m
      INNER JOIN chat_conversations c ON c.id = m.conversation_id
      WHERE m.company_id = ${companyId}::uuid
        AND c.company_id = ${companyId}::uuid
        AND c.type = 'group'
        AND m.deleted_at IS NULL
        AND m.created_at >= NOW() - INTERVAL '14 day'
        AND EXISTS (
          SELECT 1
          FROM chat_message_tags t
          WHERE t.message_id = m.id
            AND t.tag = 'blocker'
        )`;

    const totals = taskCounts[0] ?? {};
    const blockers = blockerCounts[0] ?? {};

    return buildWorkspaceHealthScore({
      totalTasks: Number(totals.total_tasks ?? 0),
      completedTasks: Number(totals.completed_tasks ?? 0),
      overdueTasks: Number(totals.overdue_tasks ?? 0),
      overloadedMembers: workload.filter(
        (member) => member.capacityStatus === "overloaded",
      ).length,
      behindMembers: workload.filter(
        (member) => member.capacityStatus === "behind",
      ).length,
      blockerSignals: Number(blockers.blocker_signals ?? 0),
    });
  },
};
