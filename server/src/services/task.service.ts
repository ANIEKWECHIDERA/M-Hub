import { supabaseAdmin } from "../config/supabaseClient";
import { logger } from "../utils/logger";
import { TaskWithAssigneesDTO } from "../dtos/task.dto";
import { TASK_SELECT } from "../dbSelect/task.select";

/**
 * Maps raw task row → base DTO (no relations)
 */
function mapTaskBase(task: any) {
  return {
    id: task.id,
    companyId: task.company_id,
    projectId: task.project_id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    progress: task.progress,
    dueDate: task.due_date,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
  };
}

export const TaskService = {
  /**
   * Fetch ALL tasks for a project (ENRICHED)
   * Used by: GET /projects/:projectId/tasks
   */
  async findAllEnrichedByProject(
    companyId: string,
    projectId: string
  ): Promise<TaskWithAssigneesDTO[]> {
    const { data: tasks, error: taskError } = await supabaseAdmin
      .from("tasks")
      .select("*")
      .eq("company_id", companyId)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (taskError) throw taskError;
    if (!tasks?.length) return [];

    const taskIds = tasks.map((t) => t.id);

    // Fetch assignments
    const { data: assignments, error: assignError } = await supabaseAdmin
      .from("task_team_member_assignees")
      .select("task_id, team_member_id")
      .in("task_id", taskIds);

    if (assignError) throw assignError;

    if (!assignments?.length) {
      return tasks.map((task) => ({
        ...mapTaskBase(task),
        assignees: [],
      }));
    }

    const teamMemberIds = [
      ...new Set(assignments.map((a) => a.team_member_id)),
    ];

    // Fetch team members + users
    const { data: teamMembers, error: teamError } = await supabaseAdmin
      .from("team_members")
      .select(TASK_SELECT)
      .in("id", teamMemberIds);

    if (teamError) throw teamError;

    // Build team member lookup
    const teamMap = Object.fromEntries(
      teamMembers.map((tm) => {
        const user = Array.isArray(tm.user) ? tm.user[0] : tm.user;

        const firstName =
          user?.first_name ??
          (user?.display_name ? user.display_name.split(" ")[0] : null);

        const lastName =
          user?.last_name ??
          (user?.display_name
            ? user.display_name.split(" ").slice(1).join(" ") || null
            : null);

        return [
          tm.id,
          {
            id: tm.id,
            email: tm.email,
            role: tm.role,
            status: tm.status,
            firstName,
            lastName,
            avatar: user?.photo_url ?? user?.avatar ?? null,
          },
        ];
      })
    );

    // Build assignment map
    const assignmentMap = assignments.reduce<Record<string, string[]>>(
      (acc, a) => {
        acc[a.task_id] ??= [];
        acc[a.task_id].push(a.team_member_id);
        return acc;
      },
      {}
    );

    // Enrich tasks
    return tasks.map((task) => ({
      ...mapTaskBase(task),
      assignees:
        assignmentMap[task.id]?.map((tmId) => teamMap[tmId]).filter(Boolean) ??
        [],
    }));
  },

  /**
   * Fetch SINGLE task (ENRICHED)
   * Used by: GET /tasks/:taskId
   */
  async findByIdEnriched(
    taskId: string,
    companyId: string
  ): Promise<TaskWithAssigneesDTO | null> {
    // Fetch the task
    const { data: task, error: taskError } = await supabaseAdmin
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (taskError) throw taskError;
    if (!task) return null;

    // Fetch assignments
    const { data: assignments, error: assignError } = await supabaseAdmin
      .from("task_team_member_assignees")
      .select("team_member_id")
      .eq("task_id", taskId);

    if (assignError) throw assignError;

    if (!assignments?.length) {
      return {
        ...mapTaskBase(task),
        assignees: [],
      };
    }

    const teamMemberIds = assignments.map((a) => a.team_member_id);

    // Fetch team members
    const { data: teamMembers, error: teamError } = await supabaseAdmin
      .from("team_members")
      .select(TASK_SELECT)
      .in("id", teamMemberIds);

    if (teamError) throw teamError;

    const enrichedAssignees = teamMembers.map((tm) => {
      const user = Array.isArray(tm.user) ? tm.user[0] : tm.user;

      const firstName =
        user?.first_name ??
        (user?.display_name ? user.display_name.split(" ")[0] : null);

      const lastName =
        user?.last_name ??
        (user?.display_name
          ? user.display_name.split(" ").slice(1).join(" ") || null
          : null);

      return {
        id: tm.id,
        email: tm.email,
        role: tm.role,
        status: tm.status,
        firstName,
        lastName,
        avatar: user?.photo_url ?? user?.avatar ?? null,
      };
    });

    return {
      ...mapTaskBase(task),
      assignees: enrichedAssignees,
    };
  },

  /**
   * Create task WITH assignees
   * Used by: POST /projects/:projectId/tasks
   */
  async create(taskData: {
    company_id: string;
    project_id: string;
    title: string;
    description?: string;
    status?: string;
    priority: string;
    due_date?: string;
    team_member_ids?: string[];
  }): Promise<TaskWithAssigneesDTO> {
    logger.info("TaskService.create", {
      companyId: taskData.company_id,
      projectId: taskData.project_id,
      teamMemberIds: taskData.team_member_ids,
    });

    // Extract team_member_ids before inserting task
    const { team_member_ids, ...taskInsertData } = taskData;

    // Insert task
    const { data: task, error: taskError } = await supabaseAdmin
      .from("tasks")
      .insert(taskInsertData)
      .select()
      .single();

    if (taskError) {
      logger.error("TaskService.create - task insert error", {
        error: taskError,
      });
      throw taskError;
    }

    // If no assignees, return early
    if (!team_member_ids || team_member_ids.length === 0) {
      return {
        ...mapTaskBase(task),
        assignees: [],
      };
    }

    // Insert assignments in bulk
    const assignments = team_member_ids.map((memberId) => ({
      company_id: taskData.company_id,
      project_id: taskData.project_id,
      task_id: task.id,
      team_member_id: memberId,
    }));

    const { error: assignError } = await supabaseAdmin
      .from("task_team_member_assignees")
      .insert(assignments);

    if (assignError) {
      logger.error("TaskService.create - assignment insert error", {
        error: assignError,
      });
      // Rollback: delete the task if assignments fail
      await supabaseAdmin.from("tasks").delete().eq("id", task.id);
      throw new Error("Failed to assign team members to task");
    }

    // Fetch team member details
    const { data: teamMembers, error: teamError } = await supabaseAdmin
      .from("team_members")
      .select(TASK_SELECT)
      .in("id", team_member_ids);

    if (teamError) {
      logger.error("TaskService.create - team member fetch error", {
        error: teamError,
      });
      // Still return task but with empty assignees
      return {
        ...mapTaskBase(task),
        assignees: [],
      };
    }

    const enrichedAssignees = teamMembers.map((tm) => {
      const user = Array.isArray(tm.user) ? tm.user[0] : tm.user;

      const firstName =
        user?.first_name ??
        (user?.display_name ? user.display_name.split(" ")[0] : null);

      const lastName =
        user?.last_name ??
        (user?.display_name
          ? user.display_name.split(" ").slice(1).join(" ") || null
          : null);

      return {
        id: tm.id,
        email: tm.email,
        role: tm.role,
        status: tm.status,
        firstName,
        lastName,
        avatar: user?.photo_url ?? user?.avatar ?? null,
      };
    });

    return {
      ...mapTaskBase(task),
      assignees: enrichedAssignees,
    };
  },

  /**
   * Update task WITH assignees
   * Used by: PATCH /tasks/:taskId
   */
  async update(
    taskId: string,
    companyId: string,
    taskData: Partial<{
      title: string;
      description: string;
      status: string;
      priority: string;
      due_date: string;
      progress: number;
      team_member_ids: string[];
    }>
  ): Promise<TaskWithAssigneesDTO | null> {
    logger.info("TaskService.update", { taskId, companyId });

    // Extract team_member_ids before updating task
    const { team_member_ids, ...taskUpdateData } = taskData;

    // Update task fields
    const { data: task, error: taskError } = await supabaseAdmin
      .from("tasks")
      .update(taskUpdateData)
      .eq("id", taskId)
      .eq("company_id", companyId)
      .select()
      .maybeSingle();

    if (taskError) {
      logger.error("TaskService.update - task update error", {
        error: taskError,
      });
      throw taskError;
    }

    if (!task) return null;

    // If team_member_ids is provided, update assignments
    if (team_member_ids !== undefined) {
      // Delete existing assignments
      const { error: deleteError } = await supabaseAdmin
        .from("task_team_member_assignees")
        .delete()
        .eq("task_id", taskId);

      if (deleteError) {
        logger.error("TaskService.update - assignment delete error", {
          error: deleteError,
        });
        throw deleteError;
      }

      // Insert new assignments if any
      if (team_member_ids.length > 0) {
        const assignments = team_member_ids.map((memberId) => ({
          company_id: companyId,
          project_id: task.project_id,
          task_id: taskId,
          team_member_id: memberId,
        }));

        const { error: insertError } = await supabaseAdmin
          .from("task_team_member_assignees")
          .insert(assignments);

        if (insertError) {
          logger.error("TaskService.update - assignment insert error", {
            error: insertError,
          });
          throw insertError;
        }
      }
    }

    // Fetch current assignees
    const { data: assignments } = await supabaseAdmin
      .from("task_team_member_assignees")
      .select("team_member_id")
      .eq("task_id", taskId);

    if (!assignments || assignments.length === 0) {
      return {
        ...mapTaskBase(task),
        assignees: [],
      };
    }

    const teamMemberIds = assignments.map((a) => a.team_member_id);

    const { data: teamMembers } = await supabaseAdmin
      .from("team_members")
      .select(TASK_SELECT)
      .in("id", teamMemberIds);

    const enrichedAssignees = (teamMembers || []).map((tm) => {
      const user = Array.isArray(tm.user) ? tm.user[0] : tm.user;

      const firstName =
        user?.first_name ??
        (user?.display_name ? user.display_name.split(" ")[0] : null);

      const lastName =
        user?.last_name ??
        (user?.display_name
          ? user.display_name.split(" ").slice(1).join(" ") || null
          : null);

      return {
        id: tm.id,
        email: tm.email,
        role: tm.role,
        status: tm.status,
        firstName,
        lastName,
        avatar: user?.photo_url ?? user?.avatar ?? null,
      };
    });

    return {
      ...mapTaskBase(task),
      assignees: enrichedAssignees,
    };
  },

  /**
   * Delete task (cascade will handle assignees)
   * Used by: DELETE /tasks/:taskId
   */
  async deleteById(taskId: string, companyId: string): Promise<boolean> {
    logger.info("TaskService.deleteById", { taskId, companyId });

    const { error } = await supabaseAdmin
      .from("tasks")
      .delete()
      .eq("id", taskId)
      .eq("company_id", companyId);

    if (error) {
      logger.error("TaskService.deleteById error", { error });
      throw error;
    }

    return true;
  },
};
