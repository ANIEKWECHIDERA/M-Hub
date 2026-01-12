import { Request, Response } from "express";
import { TaskService } from "../services/task.service";
import { logger } from "../utils/logger";

export const TaskController = {
  async getTasksByProject(req: any, res: Response) {
    const { projectId } = req.params;
    const companyId = req.user.company_id;

    try {
      const tasks = await TaskService.findAllEnrichedByProject(
        companyId,
        projectId
      );

      return res.json(tasks);
    } catch (error) {
      logger.error("getTasksByProject failed", { error });
      return res.status(500).json({ error: "Failed to fetch tasks" });
    }
  },

  async getTaskById(req: any, res: Response) {
    const { taskId } = req.params;
    const companyId = req.user.company_id;

    logger.info("getCommentsByProject: fetching tasks", {
      taskId,
      companyId,
    });

    if (!taskId || "" === taskId) {
      return res.status(400).json({ error: "Invalid task ID" });
    }

    try {
      const task = await TaskService.findByIdEnriched(taskId, companyId);

      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      return res.json(task);
    } catch (error) {
      logger.error("getTaskById failed", { error });
      return res.status(500).json({ error: "Failed to fetch task" });
    }
  },

  async createTask(req: any, res: Response) {
    const { projectId } = req.params;
    const companyId = req.user.company_id;

    try {
      const task = await TaskService.create({
        ...req.body,
        company_id: companyId,
        project_id: projectId,
      });

      return res.status(201).json(task);
    } catch (error) {
      logger.error("createTask failed", { error });
      return res.status(500).json({ error: "Failed to create task" });
    }
  },

  async updateTask(req: any, res: Response) {
    const { taskId } = req.params;
    const companyId = req.user.company_id;

    try {
      const updatedTask = await TaskService.update(taskId, companyId, req.body);

      if (!updatedTask) {
        return res.status(404).json({ error: "Task not found" });
      }

      return res.json(updatedTask);
    } catch (error) {
      logger.error("updateTask failed", { error });
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
};
