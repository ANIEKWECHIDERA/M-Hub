import { Request, Response } from "express";
import { SubtaskService } from "../services/subtask.service";
import { logger } from "../utils/logger";

export const SubtaskController = {
  async getSubtasks(req: any, res: Response) {
    const companyId = req.user.company_id;
    const teamMemberId = req.user.team_member_id;
    const { task_id } = req.query;

    try {
      const subtasks = await SubtaskService.findAll(
        companyId,
        teamMemberId,
        task_id,
      );

      if (!subtasks.length) {
        return res.status(404).json({ error: "Subtasks not found" });
      }

      return res.json(subtasks);
    } catch (error) {
      logger.error("getSubtasks failed", { error });
      return res.status(500).json({ error: "Failed to fetch subtasks" });
    }
  },

  async getSubtask(req: any, res: Response) {
    const { id } = req.params;
    const companyId = req.user.company_id;
    const teamMemberId = req.user.team_member_id;

    try {
      const subtask = await SubtaskService.findById(
        id,
        teamMemberId,
        companyId,
      );

      if (!subtask) {
        return res.status(404).json({ error: "Subtask not found" });
      }

      return res.json(subtask);
    } catch (error) {
      logger.error("getSubtask failed", { error });
      return res.status(500).json({ error: "Failed to fetch subtask" });
    }
  },

  async createSubtask(req: any, res: Response) {
    const companyId = req.user.company_id;
    const teamMemberId = req.user.team_member_id;

    try {
      const subtask = await SubtaskService.create({
        ...req.body,
        company_id: companyId,
        team_member_id: teamMemberId,
      });

      return res.status(201).json(subtask);
    } catch (error) {
      logger.error("createSubtask failed", { error });
      return res.status(500).json({ error: "Failed to create subtask" });
    }
  },

  async updateSubtask(req: any, res: Response) {
    const { id } = req.params;
    const companyId = req.user.company_id;
    const teamMemberId = req.user.team_member_id;

    try {
      const updatedSubtask = await SubtaskService.update(
        id,
        companyId,
        teamMemberId,
        req.body,
      );

      if (!updatedSubtask) {
        return res.status(404).json({ error: "Subtask not found" });
      }

      return res.json(updatedSubtask);
    } catch (error) {
      logger.error("updateSubtask failed", { error });
      return res.status(500).json({ error: "Failed to update subtask" });
    }
  },

  async deleteSubtask(req: any, res: Response) {
    const { id } = req.params;
    const companyId = req.user.company_id;
    const teamMemberId = req.user.team_member_id;

    try {
      await SubtaskService.deleteById(id, companyId, teamMemberId);
      return res.json({ success: true });
    } catch (error) {
      logger.error("deleteSubtask failed", { error });
      return res.status(500).json({ error: "Failed to delete subtask" });
    }
  },
};
