import { Request, Response } from "express";
import { ProjectService } from "../services/project.service";
import { logger } from "../utils/logger";

export const ProjectController = {
  async getProjects(req: Request, res: Response) {
    logger.info("REQ.USER:", req.user);

    if (!req.user?.company_id) {
      logger.error("Missing company_id on request", { user: req.user });
      return res.status(401).json({ error: "Unauthorized" });
    }

    const companyId = req.user.company_id;
    logger.info(`CompanyId: ${companyId}`);

    try {
      logger.info("getProjects: fetching projects", { companyId });

      const projects = await ProjectService.findAll(companyId);

      if (!projects.length) {
        logger.warn("getProjects: no projects found", { companyId });
        return res.status(404).json({ error: "Projects not found" });
      }

      return res.json(projects);
    } catch (error) {
      logger.error("getProjects: failed to fetch projects", {
        companyId,
        error,
      });
      return res.status(500).json({ error: "Failed to fetch projects" });
    }
  },

  async getProject(req: any, res: Response) {
    const { id } = req.params;
    const companyId = req.user.company_id;

    try {
      logger.info("getProject: fetching project", { id, companyId });

      const project = await ProjectService.findById(id, companyId);

      if (!project) {
        logger.warn("getProject: project not found", { id, companyId });
        return res.status(404).json({ error: "Project not found" });
      }

      logger.info("getProject: project fetched successfully", {
        id,
        companyId,
      });

      return res.json(project);
    } catch (error) {
      logger.error("getProject: failed to fetch project", {
        id,
        companyId,
        error,
      });

      return res.status(500).json({ error: "Failed to fetch project" });
    }
  },

  async createProject(req: any, res: Response) {
    const companyId = req.user.company_id;

    try {
      logger.info("createProject: creating project", {
        companyId,
        payload: req.body,
      });

      const project = await ProjectService.create({
        ...req.body,
        company_id: companyId,
      });

      logger.info("createProject: project created successfully", {
        companyId,
        projectId: project?.id,
      });

      return res.status(201).json(project);
    } catch (error) {
      logger.error("createProject: failed to create project", {
        companyId,
        payload: req.body,
        error,
      });

      return res.status(500).json({ error: "Failed to create project" });
    }
  },

  async updateProject(req: any, res: Response) {
    const { id } = req.params;
    const companyId = req.user.company_id;

    try {
      logger.info("updateProject: updating project", {
        id,
        companyId,
        payload: req.body,
      });

      const updatedProject = await ProjectService.update(
        id,
        companyId,
        req.body
      );

      if (!updatedProject) {
        logger.warn("updateProject: project not found", { id, companyId });
        return res.status(404).json({ error: "Project not found" });
      }

      logger.info("updateProject: project updated successfully", {
        id,
        companyId,
      });

      return res.json(updatedProject);
    } catch (error) {
      logger.error("updateProject: failed to update project", {
        id,
        companyId,
        payload: req.body,
        error,
      });

      return res.status(500).json({ error: "Failed to update project" });
    }
  },

  async deleteProject(req: any, res: Response) {
    const { id } = req.params;
    const companyId = req.user.company_id;

    try {
      logger.info("deleteProject: deleting project", { id, companyId });

      await ProjectService.deleteProjectById(id, companyId);

      logger.info("deleteProject: project deleted successfully", {
        id,
        companyId,
      });

      return res.json({ success: true });
    } catch (error) {
      logger.error("deleteProject: failed to delete project", {
        id,
        companyId,
        error,
      });

      return res.status(500).json({ error: "Failed to delete project" });
    }
  },
};
