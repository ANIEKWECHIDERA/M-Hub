import { NextFunction, Request, Response } from "express";
import { TaskService } from "../services/task.service";
import { NotificationService } from "../services/notification.service";
import { EmailNotificationService } from "../services/emailNotification.service";
import { logger } from "../utils/logger";

export const TaskController = {
  async getTasksByProject(req: any, res: Response) {
    const { projectId } = req.params;
    const companyId = req.user.company_id;

    try {
      const tasks = await TaskService.findAllEnrichedByProject(
        companyId,
        projectId,
      );
      // Return empty array if no tasks
      return res.json(tasks || []);
    } catch (error) {
      logger.error("TaskController: getTasksByProject failed", { error });
      return res.status(500).json({ error: "Failed to fetch tasks" });
    }
  },

  async getTaskById(req: any, res: Response) {
    const { taskId } = req.params;
    const companyId = req.user.company_id;

    logger.info("TaskController: getTaskById: fetching task", {
      taskId,
      companyId,
    });

    if (!taskId || taskId.trim() === "") {
      return res
        .status(400)
        .json({ error: "Invalid task ID or task does not exist" });
    }

    try {
      const task = await TaskService.findByIdEnriched(taskId, companyId);

      return res.json(task || null);
    } catch (error) {
      logger.error("TaskController: getTaskById failed", { error });
      return res.status(500).json({ error: "Failed to fetch task" });
    }
  },

  async getProjectTaskStats(req: any, res: Response) {
    const { projectId } = req.params;
    const companyId = req.user.company_id;

    if (!projectId) {
      return res.status(400).json({ error: "Invalid project ID" });
    }

    try {
      const stats = await TaskService.getProjectTaskStats(companyId, projectId);

      return res.json(stats || []);
    } catch (error) {
      logger.error("getProjectTaskStats failed", { error });
      return res
        .status(500)
        .json({ error: "Failed to fetch project task stats" });
    }
  },

  async createTask(req: any, res: Response) {
    const { projectId } = req.params;
    const companyId = req.user.company_id;
    const actorUserId = req.user.user_id;

    try {
      const task = await TaskService.create({
        ...req.body,
        company_id: companyId,
        project_id: projectId,
      });

      if (Array.isArray(req.body.team_member_ids) && req.body.team_member_ids.length) {
        await NotificationService.createTaskAssignmentNotifications({
          companyId,
          projectId,
          taskId: task.id,
          taskTitle: task.title,
          teamMemberIds: req.body.team_member_ids,
          actorUserId,
        });
        void EmailNotificationService.sendTaskAssignmentEmails({
          companyId,
          taskId: task.id,
          teamMemberIds: req.body.team_member_ids,
          actorUserId,
        }).catch((error: any) => {
          logger.error("TaskController.createTask: assignment email failed", {
            taskId: task.id,
            error: error.message,
          });
        });
      }

      return res.status(201).json(task);
    } catch (error) {
      logger.error("createTask failed", { error });
      return res.status(500).json({ error: "Failed to create task" });
    }
  },

  async updateTask(req: any, res: Response) {
    const { taskId } = req.params;
    const companyId = req.user.company_id;
    const actorUserId = req.user.user_id;

    try {
      const previousTask = await TaskService.findByIdEnriched(taskId, companyId);
      const updatedTask = await TaskService.update(taskId, companyId, req.body);

      if (updatedTask) {
        if (Array.isArray(req.body.team_member_ids)) {
          const previousIds = new Set(
            previousTask?.assignees?.map((assignee: any) => assignee.id) ?? [],
          );
          const newAssigneeIds = req.body.team_member_ids.filter(
            (teamMemberId: string) => !previousIds.has(teamMemberId),
          );

          if (newAssigneeIds.length > 0) {
            await NotificationService.createTaskAssignmentNotifications({
              companyId,
              projectId: updatedTask.projectId,
              taskId,
              taskTitle: updatedTask.title,
              teamMemberIds: newAssigneeIds,
              actorUserId,
            });
            void EmailNotificationService.sendTaskAssignmentEmails({
              companyId,
              taskId,
              teamMemberIds: newAssigneeIds,
              actorUserId,
            }).catch((error: any) => {
              logger.error("TaskController.updateTask: assignment email failed", {
                taskId,
                error: error.message,
              });
            });
          }
        }

        if (req.body.status && req.body.status !== previousTask?.status) {
          await NotificationService.createTaskStatusNotifications({
            companyId,
            projectId: updatedTask.projectId,
            taskId,
            taskTitle: updatedTask.title,
            status: req.body.status,
            actorUserId,
          });
        }
      }

      return res.json(updatedTask || null);
    } catch (error) {
      logger.error("TaskController: updateTask failed", { error });
      return res.status(500).json({ error: "Failed to update task" });
    }
  },

  async deleteTask(req: any, res: Response) {
    const { taskId } = req.params;
    const companyId = req.user.company_id;

    try {
      await TaskService.deleteById(taskId, companyId);
      return res.json({ success: true });
    } catch (error) {
      logger.error("deleteTask failed", { error });
      return res.status(500).json({ error: "Failed to delete task" });
    }
  },

  ///////// MY TASKS /////////

  async getMyTasks(req: any, res: Response) {
    res.setHeader("Cache-Control", "private, no-store");

    const companyId = req.user.company_id;
    const userId = req.user.user_id;

    try {
      const myTasks = await TaskService.getAssignedTasks(userId, companyId);
      logger.info("fetched my tasks:", myTasks);

      return res.status(200).json(myTasks);
    } catch (error) {
      logger.error("Controller error: getMyTasks failed", { error });
      return res.status(500).json({ error: "Failed to fetch my tasks" });
    }
  },
};
