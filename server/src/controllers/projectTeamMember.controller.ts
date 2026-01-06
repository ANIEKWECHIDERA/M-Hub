import { Request, Response } from "express";
import { ProjectTeamMemberService } from "../services/projectTeamMember.service";
import { logger } from "../utils/logger";

export const ProjectTeamMemberController = {
  async getAll(req: any, res: Response) {
    const companyId = req.user.company_id;
    logger.info("PTM.getAll: start", { companyId });

    try {
      const records = await ProjectTeamMemberService.findAll(companyId);

      logger.info("PTM.getAll: success", {
        companyId,
        count: records.length,
      });

      return res.json(records);
    } catch (error) {
      logger.error("PTM.getAll: failed", { companyId, error });
      return res.status(500).json({ error: "Failed to fetch project members" });
    }
  },

  async getById(req: any, res: Response) {
    const { id } = req.params;
    const companyId = req.user.company_id;

    logger.info("PTM.getById: start", { id, companyId });

    try {
      const record = await ProjectTeamMemberService.findById(id, companyId);

      if (!record) {
        logger.warn("PTM.getById: not found", { id, companyId });
        return res.status(404).json({ error: "Record not found" });
      }

      logger.info("PTM.getById: success", { id, companyId });
      return res.json(record);
    } catch (error) {
      logger.error("PTM.getById: failed", { id, companyId, error });
      return res.status(500).json({ error: "Failed to fetch record" });
    }
  },

  async create(req: any, res: Response) {
    const companyId = req.user.company_id;

    logger.info("PTM.create: start", {
      companyId,
      payload: req.body,
    });

    try {
      const record = await ProjectTeamMemberService.create({
        ...req.body,
        company_id: companyId,
      });

      logger.info("PTM.create: success", {
        id: record.id,
        companyId,
      });

      return res.status(201).json(record);
    } catch (error) {
      logger.error("PTM.create: failed", {
        companyId,
        payload: req.body,
        error,
      });

      return res.status(500).json({ error: "Failed to assign team member" });
    }
  },

  async update(req: any, res: Response) {
    const { id } = req.params;
    const companyId = req.user.company_id;

    logger.info("PTM.update: start", {
      id,
      companyId,
      payload: req.body,
    });

    try {
      const updated = await ProjectTeamMemberService.update(
        id,
        companyId,
        req.body
      );

      if (!updated) {
        logger.warn("PTM.update: not found", { id, companyId });
        return res.status(404).json({ error: "Record not found" });
      }

      logger.info("PTM.update: success", { id, companyId });
      return res.json(updated);
    } catch (error) {
      logger.error("PTM.update: failed", {
        id,
        companyId,
        payload: req.body,
        error,
      });

      return res.status(500).json({ error: "Failed to update assignment" });
    }
  },

  async delete(req: any, res: Response) {
    const { id } = req.params;
    const companyId = req.user.company_id;

    logger.info("PTM.delete: start", { id, companyId });

    try {
      await ProjectTeamMemberService.deleteById(id, companyId);

      logger.info("PTM.delete: success", { id, companyId });
      return res.json({ success: true });
    } catch (error) {
      logger.error("PTM.delete: failed", { id, companyId, error });
      return res.status(500).json({ error: "Failed to remove team member" });
    }
  },

  async bulkAssign(req: any, res: Response) {
    const companyId = req.user.company_id;
    const { project_id, team_member_ids, role } = req.body;

    logger.info("PTM.bulkAssign: start", {
      companyId,
      project_id,
      team_member_count: team_member_ids?.length,
    });

    if (!Array.isArray(team_member_ids) || team_member_ids.length === 0) {
      logger.warn("PTM.bulkAssign: invalid payload", { team_member_ids });
      return res.status(400).json({
        error: "team_member_ids must be a non-empty array",
      });
    }

    try {
      const result = await ProjectTeamMemberService.bulkAssign({
        company_id: companyId,
        project_id,
        team_member_ids,
        role,
      });

      logger.info("PTM.bulkAssign: success", {
        project_id,
        assigned: result.length,
        companyId,
      });

      return res.status(201).json(result);
    } catch (error) {
      logger.error("PTM.bulkAssign: failed", {
        companyId,
        project_id,
        team_member_ids,
        error,
      });

      return res.status(500).json({ error: "Failed to assign team members" });
    }
  },
};
