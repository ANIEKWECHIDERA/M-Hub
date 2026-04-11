import { prisma } from "../lib/prisma";
import { logger } from "../utils/logger";
import { NotificationService } from "./notification.service";
import { EmailNotificationService } from "./emailNotification.service";
import { RetentionService } from "./retention.service";

type TaskDueMilestone = "due_in_2_days" | "due_today";

type TaskDueReminderRow = {
  task_id: string;
  company_id: string;
  title: string;
  due_date: Date | string | null;
  project_title: string | null;
  client_name: string | null;
  user_id: string;
  user_email: string | null;
  first_name: string | null;
  display_name: string | null;
  notifications_enabled: boolean | null;
  email_notifications_enabled: boolean | null;
  task_assignment_notifications: boolean | null;
};

type DailyFocusRecipientRow = {
  user_id: string;
  company_id: string;
  email: string | null;
  first_name: string | null;
  display_name: string | null;
  access: string | null;
};

const DEFAULT_SCHEDULER_INTERVAL_MS = 60 * 60 * 1000;
const DEFAULT_DAILY_FOCUS_HOUR = 8;

let schedulerTimer: NodeJS.Timeout | null = null;
let schedulerRunning = false;

function startOfUtcDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatDateLabel(value: Date | string | null) {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
}

function getFirstName(row: { first_name?: string | null; display_name?: string | null; email?: string | null }) {
  return row.first_name || row.display_name?.split(" ").filter(Boolean)[0] || row.email || "";
}

async function claimTaskDueReminder(row: TaskDueReminderRow, milestone: TaskDueMilestone) {
  const inserted = await prisma.$executeRaw`
    INSERT INTO task_due_notification_log (task_id, user_id, company_id, milestone)
    VALUES (${row.task_id}::uuid, ${row.user_id}::uuid, ${row.company_id}::uuid, ${milestone})
    ON CONFLICT (task_id, user_id, milestone) DO NOTHING`;

  return inserted > 0;
}

async function claimDailyFocusEmail(row: DailyFocusRecipientRow, focusDate: string) {
  const inserted = await prisma.$executeRaw`
    INSERT INTO daily_focus_email_log (user_id, company_id, focus_date)
    VALUES (${row.user_id}::uuid, ${row.company_id}::uuid, ${focusDate}::date)
    ON CONFLICT (user_id, focus_date) DO NOTHING`;

  return inserted > 0;
}

async function getTaskDueRows(params: {
  milestone: TaskDueMilestone;
  startsAt: Date;
  endsAt: Date;
}) {
  return prisma.$queryRaw<TaskDueReminderRow[]>`
    SELECT
      t.id AS task_id,
      t.company_id,
      t.title,
      t.due_date,
      COALESCE(p.title, 'Project') AS project_title,
      COALESCE(c.name, 'No client') AS client_name,
      u.id AS user_id,
      u.email AS user_email,
      u.first_name,
      u.display_name,
      COALESCE(us.notifications_enabled, true) AS notifications_enabled,
      COALESCE(us.email_notifications_enabled, true) AS email_notifications_enabled,
      COALESCE(us.task_assignment_notifications, true) AS task_assignment_notifications
    FROM tasks t
    INNER JOIN task_team_member_assignees ta ON ta.task_id = t.id
    INNER JOIN team_members tm ON tm.id = ta.team_member_id
    INNER JOIN users u ON u.id = tm.user_id
    LEFT JOIN projects p ON p.id = t.project_id
    LEFT JOIN clients c ON c.id = p.client_id
    LEFT JOIN user_settings us ON us.user_id = u.id
    WHERE t.status <> 'Done'
      AND tm.status = 'active'
      AND t.due_date >= ${params.startsAt}
      AND t.due_date < ${params.endsAt}
      AND NOT EXISTS (
        SELECT 1
        FROM task_due_notification_log log
        WHERE log.task_id = t.id
          AND log.user_id = u.id
          AND log.milestone = ${params.milestone}
      )
    ORDER BY t.due_date ASC, t.priority DESC, t.created_at ASC
    LIMIT 250`;
}

async function sendTaskDueRemindersForMilestone(
  milestone: TaskDueMilestone,
  startsAt: Date,
  endsAt: Date,
) {
  const rows = await getTaskDueRows({ milestone, startsAt, endsAt });
  let sent = 0;
  let skipped = 0;

  for (const row of rows) {
    const hasInApp = row.notifications_enabled !== false;
    const hasEmail =
      row.email_notifications_enabled !== false &&
      row.task_assignment_notifications !== false &&
      Boolean(row.user_email);

    if (!hasInApp && !hasEmail) {
      skipped += 1;
      continue;
    }

    const claimed = await claimTaskDueReminder(row, milestone);

    if (!claimed) {
      skipped += 1;
      continue;
    }

    const milestoneLabel =
      milestone === "due_today" ? "due today" : "due in 2 days";

    if (hasInApp) {
      await NotificationService.create({
        user_id: row.user_id,
        company_id: row.company_id,
        type: `task_due:${milestone}:${row.task_id}`,
        title: `Task ${milestoneLabel}`,
        message: `Task '${row.title}' is ${milestoneLabel}. Please take action to avoid delays.`,
      });
    }

    if (hasEmail && row.user_email) {
      await EmailNotificationService.sendTaskDueReminderEmail({
        recipientEmail: row.user_email,
        recipientName: getFirstName({
          first_name: row.first_name,
          display_name: row.display_name,
          email: row.user_email,
        }),
        taskName: row.title,
        projectName: row.project_title ?? "Project",
        clientName: row.client_name ?? "No client",
        dueDate: formatDateLabel(row.due_date),
        milestone,
      });
    }

    sent += 1;
  }

  return { sent, skipped, candidates: rows.length };
}

async function sendDailyFocusEmails(now = new Date()) {
  const hour = Number(process.env.DAILY_FOCUS_EMAIL_HOUR ?? DEFAULT_DAILY_FOCUS_HOUR);

  if (now.getHours() !== hour) {
    return { sent: 0, skipped: 0, reason: "outside_focus_hour" };
  }

  const focusDate = now.toISOString().slice(0, 10);
  const rows = await prisma.$queryRaw<DailyFocusRecipientRow[]>`
    SELECT DISTINCT
      u.id AS user_id,
      u.company_id,
      u.email,
      u.first_name,
      u.display_name,
      tm.access
    FROM users u
    INNER JOIN team_members tm ON tm.user_id = u.id
    INNER JOIN user_settings us ON us.user_id = u.id
    WHERE u.company_id IS NOT NULL
      AND tm.status = 'active'
      AND COALESCE(us.email_notifications_enabled, true) = true
      AND COALESCE(us.daily_focus_email_enabled, false) = true
      AND u.email IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM daily_focus_email_log log
        WHERE log.user_id = u.id
          AND log.focus_date = ${focusDate}::date
      )
    LIMIT 250`;

  let sent = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!row.email) {
      skipped += 1;
      continue;
    }

    const claimed = await claimDailyFocusEmail(row, focusDate);

    if (!claimed) {
      skipped += 1;
      continue;
    }

    const items = await RetentionService.getDailyFocus({
      companyId: row.company_id,
      userId: row.user_id,
      access: row.access as any,
    });

    await EmailNotificationService.sendDailyFocusEmail({
      recipientEmail: row.email,
      recipientName: getFirstName({
        first_name: row.first_name,
        display_name: row.display_name,
        email: row.email,
      }),
      focusDate,
      items,
    });

    sent += 1;
  }

  return { sent, skipped, candidates: rows.length };
}

export const ScheduledNotificationService = {
  async runOnce(now = new Date()) {
    const todayStart = startOfUtcDay(now);
    const tomorrowStart = addUtcDays(todayStart, 1);
    const twoDaysStart = addUtcDays(todayStart, 2);
    const threeDaysStart = addUtcDays(todayStart, 3);

    const [dueToday, dueInTwoDays, dailyFocus] = await Promise.all([
      sendTaskDueRemindersForMilestone("due_today", todayStart, tomorrowStart),
      sendTaskDueRemindersForMilestone("due_in_2_days", twoDaysStart, threeDaysStart),
      sendDailyFocusEmails(now),
    ]);

    logger.info("ScheduledNotificationService.runOnce complete", {
      dueToday,
      dueInTwoDays,
      dailyFocus,
    });

    return { dueToday, dueInTwoDays, dailyFocus };
  },

  start() {
    if (schedulerTimer || process.env.ENABLE_NOTIFICATION_SCHEDULER === "false") {
      return;
    }

    const intervalMs = Number(
      process.env.NOTIFICATION_SCHEDULER_INTERVAL_MS ?? DEFAULT_SCHEDULER_INTERVAL_MS,
    );

    const runSafely = async () => {
      if (schedulerRunning) {
        return;
      }

      schedulerRunning = true;
      try {
        await this.runOnce();
      } catch (error) {
        logger.error("ScheduledNotificationService.runOnce failed", { error });
      } finally {
        schedulerRunning = false;
      }
    };

    schedulerTimer = setInterval(runSafely, intervalMs);
    setTimeout(runSafely, 60_000);
    logger.info("ScheduledNotificationService started", { intervalMs });
  },

  stop() {
    if (!schedulerTimer) {
      return;
    }

    clearInterval(schedulerTimer);
    schedulerTimer = null;
  },
};
