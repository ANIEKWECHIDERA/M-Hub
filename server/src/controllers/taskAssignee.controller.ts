import { Response } from "express";
import { TaskAssigneeService } from "../services/taskAssignee.service";
import { logger } from "../utils/logger";

export const TaskAssigneeController = {
  async getAll(req: any, res: Response) {
    const companyId = req.user.company_id;

    logger.info("TaskAssignee.getAll:start", { companyId });

    try {
      const data = await TaskAssigneeService.findAll(companyId);

      logger.info("TaskAssignee.getAll:success", {
        companyId,
        count: data.length,
      });

      return res.json(data || []);
    } catch (error) {
      logger.error("TaskAssignee.getAll:error", { companyId, error });
      return res.status(500).json({ error: "Failed to fetch task assignees" });
    }
  },

  async getById(req: any, res: Response) {
    const { id } = req.params;
    const companyId = req.user.company_id;

    logger.info("TaskAssignee.getById:start", { id, companyId });

    try {
      const record = await TaskAssigneeService.findById(id, companyId);

      if (!record) {
        logger.warn("TaskAssignee.getById:not_found", { id, companyId });
        return res.status(404).json({ error: "Assignment not found" });
      }

      logger.info("TaskAssignee.getById:success", { id, companyId });

      return res.json(record);
    } catch (error) {
      logger.error("TaskAssignee.getById:error", { id, companyId, error });
      return res.status(500).json({ error: "Failed to fetch assignment" });
    }
  },

  async create(req: any, res: Response) {
    const companyId = req.user.company_id;

    logger.info("TaskAssignee.create:start", {
      companyId,
      payload: req.body,
    });

    try {
      const record = await TaskAssigneeService.create({
        ...req.body,
        company_id: companyId,
      });

      logger.info("TaskAssignee.create:success", {
        companyId,
        assignmentId: record.id,
      });

      return res.status(201).json(record);
    } catch (error) {
      logger.error("TaskAssignee.create:error", {
        companyId,
        payload: req.body,
        error,
      });

      return res.status(500).json({ error: "Failed to assign task" });
    }
  },

  async bulkAssign(req: any, res: Response) {
    const companyId = req.user.company_id;
    const { project_id, task_id, team_member_ids } = req.body;

    logger.info("TaskAssignee.bulkAssign:start", {
      companyId,
      project_id,
      task_id,
      teamMemberCount: team_member_ids?.length,
    });

    try {
      const result = await TaskAssigneeService.bulkAssign({
        company_id: companyId,
        project_id,
        task_id,
        team_member_ids,
      });

      logger.info("TaskAssignee.bulkAssign:success", {
        companyId,
        task_id,
        createdCount: result.length,
      });

      return res.status(201).json(result);
    } catch (error) {
      logger.error("TaskAssignee.bulkAssign:error", {
        companyId,
        project_id,
        task_id,
        error,
      });

      return res
        .status(500)
        .json({ error: "Failed to assign task to team members" });
    }
  },

  async delete(req: any, res: Response) {
    const { id } = req.params;
    const companyId = req.user.company_id;

    logger.info("TaskAssignee.delete:start", { id, companyId });

    try {
      await TaskAssigneeService.deleteById(id, companyId);

      logger.info("TaskAssignee.delete:success", { id, companyId });

      return res.json({ success: true });
    } catch (error) {
      logger.error("TaskAssignee.delete:error", { id, companyId, error });
      return res.status(500).json({ error: "Failed to remove assignment" });
    }
  },
};
