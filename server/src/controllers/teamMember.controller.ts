import { Response } from "express";
import { TeamMemberService } from "../services/teamMember.service";
import {
  CreateTeamMemberDTO,
  UpdateTeamMemberDTO,
} from "../types/teamMember.types";
import { logger } from "../utils/logger";

export const TeamMemberController = {
  async getTeamMembers(req: any, res: Response) {
    const companyId = req.user.company_id;

    try {
      const members = await TeamMemberService.findAll(companyId);
      return res.json(members);
    } catch (error) {
      logger.error("getTeamMembers failed", { error });
      return res.status(500).json({ error: "Failed to fetch team members" });
    }
  },

  async getTeamMember(req: any, res: Response) {
    const companyId = req.user.company_id;
    const { id } = req.params;

    try {
      const member = await TeamMemberService.findById(companyId, id);

      if (!member) {
        return res.status(404).json({ error: "Team member not found" });
      }

      return res.json(member);
    } catch (error) {
      logger.error("getTeamMember failed", { error });
      return res.status(500).json({ error: "Failed to fetch team member" });
    }
  },

  async createTeamMember(req: any, res: Response) {
    const companyId = req.user.company_id;

    const payload: CreateTeamMemberDTO = {
      ...req.body,
      company_id: companyId,
    };

    try {
      const member = await TeamMemberService.create(payload);
      return res.status(201).json(member);
    } catch (error) {
      logger.error("createTeamMember failed", { error });
      return res.status(500).json({ error: "Failed to create team member" });
    }
  },

  async updateTeamMember(req: any, res: Response) {
    const companyId = req.user.company_id;
    const { id } = req.params;

    const payload: UpdateTeamMemberDTO = req.body;

    try {
      const member = await TeamMemberService.update(companyId, id, payload);

      if (!member) {
        return res.status(404).json({ error: "Team member not found" });
      }

      return res.json(member);
    } catch (error) {
      logger.error("updateTeamMember failed", { error });
      return res.status(500).json({ error: "Failed to update team member" });
    }
  },

  async deleteTeamMember(req: any, res: Response) {
    const companyId = req.user.company_id;
    const { id } = req.params;

    try {
      await TeamMemberService.deleteById(companyId, id);
      return res.json({ success: true });
    } catch (error) {
      logger.error("deleteTeamMember failed", { error });
      return res.status(500).json({ error: "Failed to delete team member" });
    }
  },
};
