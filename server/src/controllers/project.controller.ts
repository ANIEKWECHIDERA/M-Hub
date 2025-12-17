import { Request, Response } from "express";
import { ProjectService } from "../services/project.service";
import { logger } from "../utils/logger";

export const ProjectController = {
  async getProjects(req: any, res: Response) {
    const companyId = req.user.company_id;
    logger.info("getProjects: Fetching projects for company:", companyId);
    const projects = await ProjectService.findAll(companyId);
    if (!projects) {
      console.info("getProjects: project not found for Id:", companyId);
      return res.status(404).json({ error: "project not found" });
    }
    res.json(projects);
  },

  async getProject(req: any, res: Response) {
    const { id } = req.params;
    const companyId = req.user.company_id;
    logger.info(
      "getProjectById: fetching project by Id:",
      id,
      " for company:",
      companyId
    );
    const project = await ProjectService.findById(id, companyId);
    res.json(project);
  },

  async createProject(req: any, res: Response) {
    const companyId = req.user.company_id;
    logger.info(`creating project for company: ${companyId}`);
    const project = await ProjectService.create({
      ...req.body,
      company_id: companyId,
    });

    res.status(201).json(project);
  },

  async updateProject(req: any, res: Response) {
    const { id } = req.params;
    const companyId = req.user.company_id;
    logger.info(
      "updateProject: Updating for project for companyId:",
      companyId,
      "with data:",
      req.body
    );
    const UpdatedProject = await ProjectService.update(id, companyId, req.body);
    logger.info("updatedProject:", UpdatedProject);
    res.json(UpdatedProject);
  },

  async deleteProject(req: any, res: Response) {
    const { id } = req.params;
    const companyId = req.user.company_id;
    logger.info("deleteUser: Deleting for firebase_uid:", companyId);
    await ProjectService.deleteProjectById(id, companyId);
    res.json({ success: true });
  },
};
