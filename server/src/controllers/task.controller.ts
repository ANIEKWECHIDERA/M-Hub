import { Request, Response } from "express";
import { TaskService } from "../services/task.service";
import { logger } from "../utils/logger";

export const TaskController = {
  async getTasks(req: any, res: Response) {
    const companyId = req.user.company_id;

    try {
      const tasks = await TaskService.findAll(companyId);

      if (!tasks.length) {
        return res.status(404).json({ error: "Tasks not found" });
      }

      return res.json(tasks);
    } catch (error) {
      logger.error("getTasks failed", { error });
      return res.status(500).json({ error: "Failed to fetch tasks" });
    }
  },

  async getTask(req: any, res: Response) {
    const { id } = req.params;
    const companyId = req.user.company_id;

    try {
      const task = await TaskService.findById(id, companyId);

      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }

      return res.json(task);
    } catch (error) {
      logger.error("getTask failed", { error });
      return res.status(500).json({ error: "Failed to fetch task" });
    }
  },

  async createTask(req: any, res: Response) {
    const companyId = req.user.company_id;

    try {
      const task = await TaskService.create({
        ...req.body,
        company_id: companyId,
      });

      return res.status(201).json(task);
    } catch (error) {
      logger.error("createTask failed", { error });
      return res.status(500).json({ error: "Failed to create task" });
    }
  },

  async updateTask(req: any, res: Response) {
    const { id } = req.params;
    const companyId = req.user.company_id;

    try {
      const updatedTask = await TaskService.update(id, companyId, req.body);

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
    const { id } = req.params;
    const companyId = req.user.company_id;

    try {
      await TaskService.deleteById(id, companyId);
      return res.json({ success: true });
    } catch (error) {
      logger.error("deleteTask failed", { error });
      return res.status(500).json({ error: "Failed to delete task" });
    }
  },
};
