import { supabaseAdmin } from "../config/supabaseClient";
import { logger } from "../utils/logger";
import {
  CreateNotificationDTO,
  NotificationResponseDTO,
} from "../types/notification.types";
import { notificationRealtimeService } from "./notificationRealtime.service";
import { RequestCacheService } from "./requestCache.service";

function toNotificationDTO(row: any): NotificationResponseDTO {
  return {
    id: row.id,
    user_id: row.user_id,
    company_id: row.company_id,
    type: row.type,
    title: row.title,
    message: row.message,
    read: row.read,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function uniqueNotifications(payloads: CreateNotificationDTO[]) {
  const seen = new Set<string>();

  return payloads.filter((payload) => {
    const key = [
      payload.user_id,
      payload.company_id,
      payload.type,
      payload.title,
      payload.message,
    ].join("|");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

async function getUserRecordByFirebaseUid(firebaseUid: string) {
  const cachedUser = RequestCacheService.getUser(firebaseUid, {
    requestPath: "/api/notifications/stream",
  });

  if (cachedUser) {
    return cachedUser;
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id, company_id, first_name, last_name, display_name, email")
    .eq("firebase_uid", firebaseUid)
    .maybeSingle();

  if (error) {
    logger.error("NotificationService.getUserRecordByFirebaseUid: error", {
      error,
      firebaseUid,
    });
    throw error;
  }

  if (data) {
    RequestCacheService.setUser(firebaseUid, data, {
      requestPath: "/api/notifications/stream",
    });
  }

  return data;
}

async function getProjectMemberUsers(companyId: string, projectId: string) {
  const { data, error } = await supabaseAdmin
    .from("project_team_members")
    .select("team_member_id")
    .eq("company_id", companyId)
    .eq("project_id", projectId);

  if (error) {
    logger.error("NotificationService.getProjectMemberUsers: error", {
      error,
      companyId,
      projectId,
    });
    throw error;
  }

  const teamMemberIds = (data ?? [])
    .map((row: any) => row.team_member_id ?? null)
    .filter(Boolean) as string[];

  return getUserIdsForTeamMembers(teamMemberIds);
}

async function getTaskAssigneeUsers(companyId: string, taskId: string) {
  const { data, error } = await supabaseAdmin
    .from("task_team_member_assignees")
    .select("team_member_id")
    .eq("company_id", companyId)
    .eq("task_id", taskId);

  if (error) {
    logger.error("NotificationService.getTaskAssigneeUsers: error", {
      error,
      companyId,
      taskId,
    });
    throw error;
  }

  const teamMemberIds = (data ?? [])
    .map((row: any) => row.team_member_id ?? null)
    .filter(Boolean) as string[];

  return getUserIdsForTeamMembers(teamMemberIds);
}

async function getUserIdsForTeamMembers(teamMemberIds: string[]) {
  if (teamMemberIds.length === 0) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("team_members")
    .select("id, user_id")
    .in("id", teamMemberIds);

  if (error) {
    logger.error("NotificationService.getUserIdsForTeamMembers: error", {
      error,
      teamMemberIds,
    });
    throw error;
  }

  return (data ?? [])
    .map((row: any) => row.user_id ?? null)
    .filter(Boolean) as string[];
}

async function getCompanyAdmins(companyId: string) {
  const { data, error } = await supabaseAdmin
    .from("team_members")
    .select("user_id")
    .eq("company_id", companyId)
    .in("access", ["admin", "superAdmin"]);

  if (error) {
    logger.error("NotificationService.getCompanyAdmins: error", {
      error,
      companyId,
    });
    throw error;
  }

  return (data ?? [])
    .map((row: any) => row.user_id ?? null)
    .filter(Boolean) as string[];
}

async function emitCreatedNotifications(rows: NotificationResponseDTO[]) {
  rows.forEach((notification) => {
    notificationRealtimeService.emit({
      type: "notification.created",
      user_id: notification.user_id,
      company_id: notification.company_id,
      notification,
    });
  });
}

export const NotificationService = {
  async findByUser(
    companyId: string,
    userId: string,
    limit = 50,
  ): Promise<NotificationResponseDTO[]> {
    logger.info("NotificationService.findByUser", {
      companyId,
      userId,
      limit,
    });

    const { data, error } = await supabaseAdmin
      .from("notifications")
      .select(
        "id, user_id, company_id, type, title, message, read, created_at, updated_at",
      )
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      logger.error("NotificationService.findByUser: error", { error });
      throw error;
    }

    return (data ?? []).map(toNotificationDTO);
  },

  async getUnreadCount(companyId: string, userId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .eq("read", false);

    if (error) {
      logger.error("NotificationService.getUnreadCount: error", {
        error,
        companyId,
        userId,
      });
      throw error;
    }

    return count ?? 0;
  },

  async markAsRead(
    id: string,
    companyId: string,
    userId: string,
  ): Promise<NotificationResponseDTO | null> {
    logger.info("NotificationService.markAsRead", {
      id,
      companyId,
      userId,
    });

    const { data, error } = await supabaseAdmin
      .from("notifications")
      .update({ read: true })
      .eq("id", id)
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .select(
        "id, user_id, company_id, type, title, message, read, created_at, updated_at",
      )
      .maybeSingle();

    if (error) {
      logger.error("NotificationService.markAsRead: error", { error });
      throw error;
    }

    const notification = data ? toNotificationDTO(data) : null;

    if (notification) {
      RequestCacheService.invalidateNotificationUser(userId, {
        reason: "mark_one_read",
      });
      notificationRealtimeService.emit({
        type: "notification.read",
        user_id: userId,
        company_id: companyId,
        notificationId: notification.id,
      });
    }

    return notification;
  },

  async markAllAsRead(companyId: string, userId: string): Promise<number> {
    const { error } = await supabaseAdmin
      .from("notifications")
      .update({ read: true })
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .eq("read", false);

    if (error) {
      logger.error("NotificationService.markAllAsRead: error", {
        error,
        companyId,
        userId,
      });
      throw error;
    }

    RequestCacheService.invalidateNotificationUser(userId, {
      reason: "mark_all_read",
    });
    notificationRealtimeService.emit({
      type: "notification.read_all",
      user_id: userId,
      company_id: companyId,
    });

    return 0;
  },

  async clearOne(
    id: string,
    companyId: string,
    userId: string,
  ): Promise<boolean> {
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .delete()
      .eq("id", id)
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();

    if (error) {
      logger.error("NotificationService.clearOne: error", {
        error,
        id,
        companyId,
        userId,
      });
      throw error;
    }

    if (data) {
      RequestCacheService.invalidateNotificationUser(userId, {
        reason: "notification_cleared_one",
      });
      notificationRealtimeService.emit({
        type: "notification.deleted",
        user_id: userId,
        company_id: companyId,
        notificationId: id,
      });
    }

    return Boolean(data);
  },

  async clearAll(companyId: string, userId: string): Promise<number> {
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .delete()
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .select("id");

    if (error) {
      logger.error("NotificationService.clearAll: error", {
        error,
        companyId,
        userId,
      });
      throw error;
    }

    const clearedCount = data?.length ?? 0;

    RequestCacheService.invalidateNotificationUser(userId, {
      reason: "notification_cleared_all",
    });
    notificationRealtimeService.emit({
      type: "notification.cleared_all",
      user_id: userId,
      company_id: companyId,
    });

    return clearedCount;
  },

  async create(payload: CreateNotificationDTO): Promise<NotificationResponseDTO> {
    logger.info("NotificationService.create", payload);

    const { data, error } = await supabaseAdmin
      .from("notifications")
      .insert(payload)
      .select(
        "id, user_id, company_id, type, title, message, read, created_at, updated_at",
      )
      .single();

    if (error) {
      logger.error("NotificationService.create: error", { error });
      throw error;
    }

    const notification = toNotificationDTO(data);
    RequestCacheService.invalidateNotificationUser(notification.user_id, {
      reason: "notification_created",
    });
    await emitCreatedNotifications([notification]);

    return notification;
  },

  async createMany(
    payloads: CreateNotificationDTO[],
  ): Promise<NotificationResponseDTO[]> {
    const uniquePayloads = uniqueNotifications(
      payloads.filter((payload) => Boolean(payload.user_id)),
    );

    if (uniquePayloads.length === 0) {
      return [];
    }

    const { data, error } = await supabaseAdmin
      .from("notifications")
      .insert(uniquePayloads)
      .select(
        "id, user_id, company_id, type, title, message, read, created_at, updated_at",
      );

    if (error) {
      logger.error("NotificationService.createMany: error", {
        error,
        count: uniquePayloads.length,
      });
      throw error;
    }

    const notifications = (data ?? []).map(toNotificationDTO);
    notifications.forEach((notification) => {
      RequestCacheService.invalidateNotificationUser(notification.user_id, {
        reason: "notification_created_many",
      });
    });
    await emitCreatedNotifications(notifications);

    return notifications;
  },

  async createTaskAssignmentNotifications(params: {
    companyId: string;
    projectId: string;
    taskId: string;
    taskTitle: string;
    teamMemberIds: string[];
    actorUserId?: string;
  }) {
    const recipientIds = await getUserIdsForTeamMembers(params.teamMemberIds);
    const uniqueRecipients = [...new Set(recipientIds)].filter(
      (userId) => userId !== params.actorUserId,
    );

    if (uniqueRecipients.length === 0) {
      return [];
    }

    return this.createMany(
      uniqueRecipients.map((userId) => ({
        user_id: userId,
        company_id: params.companyId,
        type: `task_assigned:${params.taskId}:${params.projectId}`,
        title: "New task assigned",
        message: `You were assigned to "${params.taskTitle}".`,
      })),
    );
  },

  async createTaskStatusNotifications(params: {
    companyId: string;
    projectId: string;
    taskId: string;
    taskTitle: string;
    status: string;
    actorUserId?: string;
  }) {
    const recipientIds = await getTaskAssigneeUsers(
      params.companyId,
      params.taskId,
    );
    const uniqueRecipients = [...new Set(recipientIds)].filter(
      (userId) => userId !== params.actorUserId,
    );

    if (uniqueRecipients.length === 0) {
      return [];
    }

    return this.createMany(
      uniqueRecipients.map((userId) => ({
        user_id: userId,
        company_id: params.companyId,
        type: `task_status:${params.taskId}:${params.projectId}`,
        title: "Task status updated",
        message: `"${params.taskTitle}" is now ${params.status}.`,
      })),
    );
  },

  async createCommentNotifications(params: {
    companyId: string;
    projectId: string;
    taskId?: string | null;
    commentText: string;
    authorUserId: string;
  }) {
    const recipientIds = params.taskId
      ? await getTaskAssigneeUsers(params.companyId, params.taskId)
      : await getProjectMemberUsers(params.companyId, params.projectId);

    const uniqueRecipients = [...new Set(recipientIds)].filter(
      (userId) => userId !== params.authorUserId,
    );

    if (uniqueRecipients.length === 0) {
      return [];
    }

    const trimmedComment =
      params.commentText.length > 80
        ? `${params.commentText.slice(0, 77)}...`
        : params.commentText;

    const typeBase = params.taskId
      ? `task_comment:${params.taskId}:${params.projectId}`
      : `project_comment:${params.projectId}`;

    return this.createMany(
      uniqueRecipients.map((userId) => ({
        user_id: userId,
        company_id: params.companyId,
        type: typeBase,
        title: "New comment",
        message: trimmedComment || "A new comment was added.",
      })),
    );
  },

  async createAssetUploadNotifications(params: {
    companyId: string;
    projectId: string;
    actorUserId: string;
    fileCount: number;
  }) {
    const recipientIds = await getProjectMemberUsers(
      params.companyId,
      params.projectId,
    );
    const uniqueRecipients = [...new Set(recipientIds)].filter(
      (userId) => userId !== params.actorUserId,
    );

    if (uniqueRecipients.length === 0) {
      return [];
    }

    const fileLabel =
      params.fileCount === 1 ? "A new file was uploaded" : "New files were uploaded";

    return this.createMany(
      uniqueRecipients.map((userId) => ({
        user_id: userId,
        company_id: params.companyId,
        type: `asset_uploaded:${params.projectId}`,
        title: "Assets updated",
        message: `${fileLabel} in a project you belong to.`,
      })),
    );
  },

  async createInviteAcceptedNotifications(params: {
    companyId: string;
    acceptedUserId: string;
    acceptedEmail: string;
  }) {
    const adminIds = await getCompanyAdmins(params.companyId);
    const uniqueRecipients = [...new Set(adminIds)].filter(
      (userId) => userId !== params.acceptedUserId,
    );

    if (uniqueRecipients.length === 0) {
      return [];
    }

    return this.createMany(
      uniqueRecipients.map((userId) => ({
        user_id: userId,
        company_id: params.companyId,
        type: `invite_accepted:${params.companyId}`,
        title: "Invite accepted",
        message: `${params.acceptedEmail} joined the workspace.`,
      })),
    );
  },

  async createInviteReceivedNotification(params: {
    companyId: string;
    inviteId: string;
    recipientUserId: string;
    workspaceName: string;
  }) {
    return this.create({
      user_id: params.recipientUserId,
      company_id: params.companyId,
      type: `invite_received:${params.companyId}:${params.inviteId}`,
      title: "Workspace invite",
      message: `You have been invited to join ${params.workspaceName}.`,
    });
  },

  async getStreamUser(firebaseUid: string) {
    return getUserRecordByFirebaseUid(firebaseUid);
  },
};
