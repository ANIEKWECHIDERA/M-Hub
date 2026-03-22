import { supabaseAdmin } from "../config/supabaseClient";
import { emailConfig } from "../config/email";
import { EmailService } from "./email.service";

type InternalPreferenceKey =
  | "task_assignment_notifications"
  | "project_update_notifications"
  | "comment_notifications";

type UserRow = {
  id: string;
  email: string | null;
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
};

type InternalRecipient = {
  userId: string;
  email: string;
  firstName: string;
  fullName: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getDisplayName(user?: Partial<UserRow> | null) {
  const fullName = [user?.first_name, user?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || user?.display_name || user?.email || "Crevo user";
}

function getFirstName(user?: Partial<UserRow> | null) {
  return (
    user?.first_name ||
    user?.display_name?.split(" ").filter(Boolean)[0] ||
    ""
  );
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function formatAbsoluteDateTime(value?: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatAbsoluteDate(value?: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatRole(value?: string | null) {
  if (!value) {
    return "Team Member";
  }

  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase())
    .trim();
}

function renderPrimaryButton(label: string, href: string) {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;margin-top:24px;padding:14px 22px;border-radius:999px;background:#d9ff43;color:#111111;text-decoration:none;font-weight:700;">${escapeHtml(label)}</a>`;
}

function renderEmailShell(params: {
  preheader: string;
  bodyHtml: string;
}) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charSet="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(emailConfig.appName)}</title>
  </head>
  <body style="margin:0;background:#f6f4ef;color:#111827;font-family:Inter,Segoe UI,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(params.preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #e7e0d4;border-radius:24px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px 16px;">
                <div style="display:inline-flex;align-items:center;gap:12px;">
                  <div style="height:36px;width:36px;border-radius:10px;background:#111111;color:#ffffff;font-weight:700;font-size:18px;line-height:36px;text-align:center;">C</div>
                  <div>
                    <div style="font-size:20px;font-weight:700;line-height:1.2;">${escapeHtml(emailConfig.appName)}</div>
                    <div style="font-size:12px;color:#6b7280;line-height:1.4;">${escapeHtml(emailConfig.tagline)}</div>
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 32px;">${params.bodyHtml}</td>
            </tr>
            <tr>
              <td style="border-top:1px solid #eee7db;padding:20px 32px 28px;font-size:12px;color:#6b7280;line-height:1.6;">
                <div>${escapeHtml(emailConfig.footerText)}</div>
                <div>Questions? <a href="mailto:${escapeHtml(emailConfig.supportEmail)}" style="color:#111111;">${escapeHtml(emailConfig.supportEmail)}</a></div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function getUsers(userIds: string[]) {
  if (userIds.length === 0) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, email, first_name, last_name, display_name")
    .in("id", userIds);

  if (error) {
    throw error;
  }

  return (data ?? []) as UserRow[];
}

async function getUserById(userId: string) {
  const users = await getUsers([userId]);
  return users[0] ?? null;
}

async function getTeamMembersByIds(teamMemberIds: string[]) {
  if (teamMemberIds.length === 0) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("team_members")
    .select("id, user_id, email")
    .in("id", teamMemberIds);

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function getInternalRecipientsByUserIds(
  userIds: string[],
  preferenceKey?: InternalPreferenceKey,
) {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];

  if (uniqueUserIds.length === 0) {
    return [];
  }

  const [users, settingsResponse] = await Promise.all([
    getUsers(uniqueUserIds),
    supabaseAdmin
      .from("user_settings")
      .select(
        "user_id, email_notifications_enabled, task_assignment_notifications, project_update_notifications, comment_notifications",
      )
      .in("user_id", uniqueUserIds),
  ]);

  if (settingsResponse.error) {
    throw settingsResponse.error;
  }

  const settingsMap = new Map(
    (settingsResponse.data ?? []).map((row: any) => [row.user_id, row]),
  );

  return users
    .filter((user) => Boolean(user.email))
    .filter((user) => {
      const settings = settingsMap.get(user.id);

      if (settings?.email_notifications_enabled === false) {
        return false;
      }

      if (preferenceKey && settings?.[preferenceKey] === false) {
        return false;
      }

      return true;
    })
    .map((user) => ({
      userId: user.id,
      email: user.email!,
      firstName: getFirstName(user),
      fullName: getDisplayName(user),
    })) satisfies InternalRecipient[];
}

async function getCompanyName(companyId: string) {
  const { data, error } = await supabaseAdmin
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.name ?? "your workspace";
}

async function getCompanyAdmins(companyId: string) {
  const { data, error } = await supabaseAdmin
    .from("team_members")
    .select("user_id")
    .eq("company_id", companyId)
    .in("access", ["admin", "superAdmin"]);

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row: any) => row.user_id ?? null)
    .filter(Boolean) as string[];
}

async function getProjectMemberUserIds(companyId: string, projectId: string) {
  const { data, error } = await supabaseAdmin
    .from("project_team_members")
    .select("team_member_id")
    .eq("company_id", companyId)
    .eq("project_id", projectId);

  if (error) {
    throw error;
  }

  const teamMembers = await getTeamMembersByIds(
    (data ?? [])
      .map((row: any) => row.team_member_id ?? null)
      .filter(Boolean) as string[],
  );

  return teamMembers
    .map((row: any) => row.user_id ?? null)
    .filter(Boolean) as string[];
}

async function getTaskAssigneeUserIds(companyId: string, taskId: string) {
  const { data, error } = await supabaseAdmin
    .from("task_team_member_assignees")
    .select("team_member_id")
    .eq("company_id", companyId)
    .eq("task_id", taskId);

  if (error) {
    throw error;
  }

  const teamMembers = await getTeamMembersByIds(
    (data ?? [])
      .map((row: any) => row.team_member_id ?? null)
      .filter(Boolean) as string[],
  );

  return teamMembers
    .map((row: any) => row.user_id ?? null)
    .filter(Boolean) as string[];
}

async function getTaskContext(taskId: string, companyId: string) {
  const { data: task, error: taskError } = await supabaseAdmin
    .from("tasks")
    .select("id, title, description, priority, due_date, project_id")
    .eq("id", taskId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (taskError) {
    throw taskError;
  }

  if (!task) {
    return null;
  }

  const { data: project, error: projectError } = await supabaseAdmin
    .from("projects")
    .select("id, title, clients(name)")
    .eq("id", task.project_id)
    .eq("company_id", companyId)
    .maybeSingle();

  if (projectError) {
    throw projectError;
  }

  return {
    ...task,
    projectTitle: project?.title ?? "Project",
    clientName: (project as any)?.clients?.name ?? "No client",
  };
}

async function getProjectContext(projectId: string, companyId: string) {
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("id, title, status, deadline, clients(name)")
    .eq("id", projectId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    ...data,
    clientName: (data as any)?.clients?.name ?? "No client",
  };
}

function makeInviteEmail(params: {
  firstName?: string;
  inviterName: string;
  workspaceName: string;
  invitedEmail: string;
  role: string;
  inviteUrl: string;
}) {
  const greeting = params.firstName ? `Hey ${params.firstName},` : "Hey,";
  return {
    subject: `You've been invited to join ${params.workspaceName} on Crevo`,
    html: renderEmailShell({
      preheader: `You're invited to join ${params.workspaceName} on Crevo`,
      bodyHtml: `
        <div style="font-size:16px;line-height:1.7;color:#111827;">
          <p style="margin:0 0 18px;">${escapeHtml(greeting)}</p>
          <p style="margin:0 0 18px;">${escapeHtml(params.inviterName)} has invited you to join ${escapeHtml(params.workspaceName)} on Crevo — where the team manages their projects, clients, and deliverables.</p>
          ${renderPrimaryButton("Accept invitation →", params.inviteUrl)}
          <div style="margin-top:24px;padding:18px 20px;border:1px solid #e7e0d4;border-radius:18px;background:#faf8f3;">
            <p style="margin:0 0 8px;font-weight:600;">A few things to know:</p>
            <ul style="margin:0;padding-left:20px;">
              <li>This invite is for ${escapeHtml(params.invitedEmail)} only</li>
              <li>It expires in 24 hours</li>
              <li>You'll be joining as ${escapeHtml(formatRole(params.role))}</li>
            </ul>
          </div>
          <p style="margin:20px 0 0;color:#6b7280;">If you weren't expecting this, you can safely ignore it. Nothing will change on your end.</p>
        </div>`,
    }),
    text: `${greeting}

${params.inviterName} has invited you to join ${params.workspaceName} on Crevo.

Accept invitation:
${params.inviteUrl}

A few things to know:
- This invite is for ${params.invitedEmail} only
- It expires in 24 hours
- You'll be joining as ${formatRole(params.role)}

If you weren't expecting this, you can safely ignore it.`,
  };
}

function makeInviteAcceptedEmail(params: {
  adminFirstName: string;
  newMemberName: string;
  newMemberEmail: string;
  role: string;
  joinedAt: string;
  workspaceName: string;
  teamSettingsUrl: string;
}) {
  const greeting = params.adminFirstName ? `Hey ${params.adminFirstName},` : "Hey,";
  return {
    subject: `${params.newMemberName} just joined ${params.workspaceName}`,
    html: renderEmailShell({
      preheader: `${params.newMemberName} joined ${params.workspaceName}`,
      bodyHtml: `
        <div style="font-size:16px;line-height:1.7;color:#111827;">
          <p style="margin:0 0 18px;">${escapeHtml(greeting)}</p>
          <p style="margin:0 0 18px;">Good news — ${escapeHtml(params.newMemberName)} accepted your invite and is now part of ${escapeHtml(params.workspaceName)} on Crevo.</p>
          <div style="padding:18px 20px;border:1px solid #e7e0d4;border-radius:18px;background:#faf8f3;">
            <p style="margin:0 0 6px;"><strong>Name:</strong> ${escapeHtml(params.newMemberName)}</p>
            <p style="margin:0 0 6px;"><strong>Email:</strong> ${escapeHtml(params.newMemberEmail)}</p>
            <p style="margin:0 0 6px;"><strong>Role:</strong> ${escapeHtml(formatRole(params.role))}</p>
            <p style="margin:0;"><strong>Joined:</strong> ${escapeHtml(params.joinedAt)}</p>
          </div>
          <p style="margin:18px 0 0;">They're ready to get to work.</p>
          ${renderPrimaryButton("Go to team settings →", params.teamSettingsUrl)}
        </div>`,
    }),
    text: `${greeting}

Good news — ${params.newMemberName} accepted your invite and is now part of ${params.workspaceName} on Crevo.

Name: ${params.newMemberName}
Email: ${params.newMemberEmail}
Role: ${formatRole(params.role)}
Joined: ${params.joinedAt}

Go to team settings:
${params.teamSettingsUrl}`,
  };
}

function makeTaskAssignmentEmail(params: {
  assigneeName: string;
  assignerName: string;
  taskName: string;
  projectName: string;
  clientName: string;
  dueDate: string;
  priority: string;
  taskDescription: string;
  taskUrl: string;
}) {
  const greeting = params.assigneeName ? `Hey ${params.assigneeName},` : "Hey,";
  return {
    subject: `You've been assigned: ${params.taskName}`,
    html: renderEmailShell({
      preheader: `${params.taskName} was assigned to you`,
      bodyHtml: `
        <div style="font-size:16px;line-height:1.7;color:#111827;">
          <p style="margin:0 0 18px;">${escapeHtml(greeting)}</p>
          <p style="margin:0 0 18px;">${escapeHtml(params.assignerName)} assigned you a task in ${escapeHtml(params.projectName)}.</p>
          <div style="padding:18px 20px;border:1px solid #e7e0d4;border-radius:18px;background:#faf8f3;">
            <p style="margin:0 0 6px;"><strong>Task:</strong> ${escapeHtml(params.taskName)}</p>
            <p style="margin:0 0 6px;"><strong>Project:</strong> ${escapeHtml(params.projectName)}</p>
            <p style="margin:0 0 6px;"><strong>Client:</strong> ${escapeHtml(params.clientName)}</p>
            <p style="margin:0 0 6px;"><strong>Due:</strong> ${escapeHtml(params.dueDate)}</p>
            <p style="margin:0;"><strong>Priority:</strong> ${escapeHtml(params.priority)}</p>
          </div>
          <p style="margin:18px 0 0;">${escapeHtml(params.taskDescription)}</p>
          ${renderPrimaryButton("View task →", params.taskUrl)}
          <p style="margin:16px 0 0;"><a href="${escapeHtml(`${emailConfig.baseUrl}/settings?section=notifications`)}" style="color:#6b7280;">Manage notification preferences</a></p>
        </div>`,
    }),
    text: `${greeting}

${params.assignerName} assigned you a task in ${params.projectName}.

Task: ${params.taskName}
Project: ${params.projectName}
Client: ${params.clientName}
Due: ${params.dueDate}
Priority: ${params.priority}

${params.taskDescription}

View task:
${params.taskUrl}`,
  };
}

function makeCommentEmail(params: {
  recipientName: string;
  commenterName: string;
  subject: string;
  entityName: string;
  commentTime: string;
  commentText: string;
  taskUrl: string;
}) {
  const greeting = params.recipientName ? `Hey ${params.recipientName},` : "Hey,";
  return {
    subject: params.subject,
    html: renderEmailShell({
      preheader: `${params.commenterName} commented on ${params.entityName}`,
      bodyHtml: `
        <div style="font-size:16px;line-height:1.7;color:#111827;">
          <p style="margin:0 0 18px;">${escapeHtml(greeting)}</p>
          <p style="margin:0 0 18px;">${escapeHtml(params.commenterName)} added a comment on ${escapeHtml(params.entityName)}.</p>
          <div style="margin:20px 0;border-left:4px solid #d9ff43;padding:14px 16px;background:#faf8f3;border-radius:14px;">
            <div style="font-size:13px;color:#6b7280;margin-bottom:10px;">${escapeHtml(params.commenterName)} · ${escapeHtml(params.commentTime)}</div>
            <div style="font-size:15px;color:#111827;">"${escapeHtml(params.commentText)}"</div>
          </div>
          ${renderPrimaryButton("Reply in Crevo →", params.taskUrl)}
          <p style="margin:16px 0 0;"><a href="${escapeHtml(`${emailConfig.baseUrl}/settings?section=notifications`)}" style="color:#6b7280;">Manage notification preferences</a></p>
        </div>`,
    }),
    text: `${greeting}

${params.commenterName} added a comment on ${params.entityName}.

${params.commenterName} · ${params.commentTime}
"${params.commentText}"

Reply in Crevo:
${params.taskUrl}`,
  };
}

function makeProjectUpdateEmail(params: {
  recipientName: string;
  projectName: string;
  clientName: string;
  updatedByName: string;
  previousStatus: string;
  newStatus: string;
  updatedAt: string;
  updateType: string;
  changeList: string[];
  projectUrl: string;
}) {
  const greeting = params.recipientName ? `Hey ${params.recipientName},` : "Hey,";
  const changeItems = params.changeList
    .map((change) => `<li style="margin-bottom:6px;">${escapeHtml(change)}</li>`)
    .join("");
  return {
    subject: `Update on ${params.projectName}: ${params.updateType}`,
    html: renderEmailShell({
      preheader: `${params.projectName} was updated`,
      bodyHtml: `
        <div style="font-size:16px;line-height:1.7;color:#111827;">
          <p style="margin:0 0 18px;">${escapeHtml(greeting)}</p>
          <p style="margin:0 0 18px;">There's an update on ${escapeHtml(params.projectName)} for ${escapeHtml(params.clientName)}.</p>
          <div style="padding:18px 20px;border:1px solid #e7e0d4;border-radius:18px;background:#faf8f3;">
            <p style="margin:0 0 6px;"><strong>Project:</strong> ${escapeHtml(params.projectName)}</p>
            <p style="margin:0 0 6px;"><strong>Client:</strong> ${escapeHtml(params.clientName)}</p>
            <p style="margin:0 0 6px;"><strong>Updated by:</strong> ${escapeHtml(params.updatedByName)}</p>
            <p style="margin:0 0 6px;"><strong>Status:</strong> ${escapeHtml(params.previousStatus)} → ${escapeHtml(params.newStatus)}</p>
            <p style="margin:0;"><strong>Date:</strong> ${escapeHtml(params.updatedAt)}</p>
          </div>
          <div style="margin-top:18px;">
            <p style="margin:0 0 10px;font-weight:600;">What changed:</p>
            <ul style="margin:0;padding-left:20px;">${changeItems}</ul>
          </div>
          ${renderPrimaryButton("View project →", params.projectUrl)}
          <p style="margin:16px 0 0;"><a href="${escapeHtml(`${emailConfig.baseUrl}/settings?section=notifications`)}" style="color:#6b7280;">Manage notification preferences</a></p>
        </div>`,
    }),
    text: `${greeting}

There's an update on ${params.projectName} for ${params.clientName}.

Project: ${params.projectName}
Client: ${params.clientName}
Updated by: ${params.updatedByName}
Status: ${params.previousStatus} -> ${params.newStatus}
Date: ${params.updatedAt}

What changed:
${params.changeList.map((item) => `- ${item}`).join("\n")}

View project:
${params.projectUrl}`,
  };
}

function buildProjectChangeList(
  previousProject: {
    title: string;
    status: string;
    deadline: string | null;
    clientName?: string | null;
  },
  updatedProject: {
    title: string;
    status: string;
    deadline: string | null;
    clientName?: string | null;
  },
  changedFields: string[],
) {
  const changes: string[] = [];

  if (changedFields.includes("status") && previousProject.status !== updatedProject.status) {
    changes.push(`Status changed from ${previousProject.status} to ${updatedProject.status}`);
  }
  if (changedFields.includes("deadline") && previousProject.deadline !== updatedProject.deadline) {
    changes.push(`Due date updated to ${formatAbsoluteDate(updatedProject.deadline)}`);
  }
  if (changedFields.includes("title") && previousProject.title !== updatedProject.title) {
    changes.push(`Project renamed to ${updatedProject.title}`);
  }
  if (changedFields.includes("client_id") && previousProject.clientName !== updatedProject.clientName) {
    changes.push(`Client changed to ${updatedProject.clientName || "No client"}`);
  }
  if (changedFields.includes("description")) {
    changes.push("Project description updated");
  }
  if (changes.length === 0) {
    changes.push("Project details were updated");
  }

  return changes.slice(0, 4);
}

export const EmailNotificationService = {
  async sendWorkspaceInviteEmail(params: {
    companyId: string;
    inviterUserId: string;
    invitedEmail: string;
    role: string;
    inviteToken: string;
  }) {
    const [workspaceName, inviter] = await Promise.all([
      getCompanyName(params.companyId),
      getUserById(params.inviterUserId),
    ]);

    const inviteUrl = `${emailConfig.baseUrl}/invite/accept/${params.inviteToken}`;
    const email = makeInviteEmail({
      inviterName: getDisplayName(inviter),
      workspaceName,
      invitedEmail: params.invitedEmail,
      role: params.role,
      inviteUrl,
    });

    return EmailService.send({
      to: params.invitedEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
  },

  async sendInviteAcceptedEmails(params: {
    companyId: string;
    acceptedUserId: string;
    role: string;
    joinedAt: string;
  }) {
    const [workspaceName, acceptedUser, adminUserIds] = await Promise.all([
      getCompanyName(params.companyId),
      getUserById(params.acceptedUserId),
      getCompanyAdmins(params.companyId),
    ]);

    const recipients = await getInternalRecipientsByUserIds(
      adminUserIds.filter((userId) => userId !== params.acceptedUserId),
    );

    return Promise.all(
      recipients.map((recipient) => {
        const email = makeInviteAcceptedEmail({
          adminFirstName: recipient.firstName,
          newMemberName: getDisplayName(acceptedUser),
          newMemberEmail: acceptedUser?.email ?? "Unknown email",
          role: params.role,
          joinedAt: formatAbsoluteDateTime(params.joinedAt),
          workspaceName,
          teamSettingsUrl: `${emailConfig.baseUrl}/settings?section=team`,
        });

        return EmailService.send({
          to: recipient.email,
          subject: email.subject,
          html: email.html,
          text: email.text,
        });
      }),
    );
  },

  async sendTaskAssignmentEmails(params: {
    companyId: string;
    taskId: string;
    teamMemberIds: string[];
    actorUserId?: string;
  }) {
    const [task, actor, teamMembers] = await Promise.all([
      getTaskContext(params.taskId, params.companyId),
      params.actorUserId ? getUserById(params.actorUserId) : Promise.resolve(null),
      getTeamMembersByIds(params.teamMemberIds),
    ]);

    if (!task) {
      return [];
    }

    const recipients = await getInternalRecipientsByUserIds(
      teamMembers
        .map((member: any) => member.user_id ?? null)
        .filter((userId) => Boolean(userId) && userId !== params.actorUserId) as string[],
      "task_assignment_notifications",
    );

    return Promise.all(
      recipients.map((recipient) => {
        const email = makeTaskAssignmentEmail({
          assigneeName: recipient.firstName,
          assignerName: getDisplayName(actor),
          taskName: task.title,
          projectName: task.projectTitle,
          clientName: task.clientName,
          dueDate: formatAbsoluteDate(task.due_date),
          priority: formatRole(task.priority),
          taskDescription:
            truncate(stripHtml(task.description ?? ""), 200) ||
            "No description added yet.",
          taskUrl: `${emailConfig.baseUrl}/mytasks`,
        });

        return EmailService.send({
          to: recipient.email,
          subject: email.subject,
          html: email.html,
          text: email.text,
        });
      }),
    );
  },

  async sendCommentEmails(params: {
    companyId: string;
    projectId: string;
    taskId?: string | null;
    commentText: string;
    authorUserId: string;
    commentCreatedAt: string;
  }) {
    const [author, project, task] = await Promise.all([
      getUserById(params.authorUserId),
      getProjectContext(params.projectId, params.companyId),
      params.taskId ? getTaskContext(params.taskId, params.companyId) : Promise.resolve(null),
    ]);

    const recipientUserIds = params.taskId
      ? (await getTaskAssigneeUserIds(params.companyId, params.taskId)).filter(
          (userId) => userId !== params.authorUserId,
        )
      : (await getProjectMemberUserIds(params.companyId, params.projectId)).filter(
          (userId) => userId !== params.authorUserId,
        );

    const recipients = await getInternalRecipientsByUserIds(
      recipientUserIds,
      "comment_notifications",
    );

    const entityName = task?.title ?? project?.title ?? "this project";
    const subject = task
      ? `New comment on ${task.title}`
      : `New comment on ${project?.title ?? "your project"}`;

    return Promise.all(
      recipients.map((recipient) => {
        const email = makeCommentEmail({
          recipientName: recipient.firstName,
          commenterName: getDisplayName(author),
          subject,
          entityName,
          commentTime: formatAbsoluteDateTime(params.commentCreatedAt),
          commentText: truncate(stripHtml(params.commentText), 300),
          taskUrl: `${emailConfig.baseUrl}/projectdetails/${params.projectId}`,
        });

        return EmailService.send({
          to: recipient.email,
          subject: email.subject,
          html: email.html,
          text: email.text,
        });
      }),
    );
  },

  async sendProjectUpdateEmails(params: {
    companyId: string;
    projectId: string;
    actorUserId: string;
    previousProject: {
      title: string;
      status: string;
      deadline: string | null;
      clientName?: string | null;
    };
    updatedProject: {
      title: string;
      status: string;
      deadline: string | null;
      clientName?: string | null;
    };
    changedFields: string[];
  }) {
    const [actor, recipientUserIds] = await Promise.all([
      getUserById(params.actorUserId),
      getProjectMemberUserIds(params.companyId, params.projectId),
    ]);

    const recipients = await getInternalRecipientsByUserIds(
      recipientUserIds.filter((userId) => userId !== params.actorUserId),
      "project_update_notifications",
    );
    const changeList = buildProjectChangeList(
      params.previousProject,
      params.updatedProject,
      params.changedFields,
    );
    const updateType = changeList[0] ?? "Project updated";

    return Promise.all(
      recipients.map((recipient) => {
        const email = makeProjectUpdateEmail({
          recipientName: recipient.firstName,
          projectName: params.updatedProject.title,
          clientName:
            params.updatedProject.clientName ||
            params.previousProject.clientName ||
            "No client",
          updatedByName: getDisplayName(actor),
          previousStatus: params.previousProject.status,
          newStatus: params.updatedProject.status,
          updatedAt: formatAbsoluteDateTime(new Date().toISOString()),
          updateType,
          changeList,
          projectUrl: `${emailConfig.baseUrl}/projectdetails/${params.projectId}`,
        });

        return EmailService.send({
          to: recipient.email,
          subject: email.subject,
          html: email.html,
          text: email.text,
        });
      }),
    );
  },
};
