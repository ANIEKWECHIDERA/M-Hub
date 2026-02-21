import { Request, Response } from "express";
import { ProjectService } from "../services/project.service";
import { CreateProjectDTO, UpdateProjectDTO } from "../types/project.types";
import { logger } from "../utils/logger";

export const ProjectController = {
  async getProjects(req: Request, res: Response) {
    logger.info(
      "REQ.USER:",
      req.user?.uid,
      req.user?.company_id,
      req.user?.email,
    );

    if (!req.user?.company_id) {
      logger.error("ProjectController: Missing company_id on request", {
        user: req.user,
      });
      return res.status(401).json({ error: "Unauthorized" });
    }

    const companyId = req.user.company_id;
    logger.info(`ProjectController: CompanyId: ${companyId}`);

    try {
      logger.info("ProjectController: getProjects: fetching projects", {
        companyId,
      });

      const projects = await ProjectService.findAll(companyId);

      if (!projects.length) {
        logger.info("ProjectController: getProjects: no projects yet", {
          companyId,
        });
      }

      return res.json(projects);
    } catch (error) {
      logger.error("ProjectController: getProjects: failed to fetch projects", {
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
      logger.info("ProjectController: getProject: fetching project", {
        id,
        companyId,
      });

      const project = await ProjectService.findById(id, companyId);

      if (!project) {
        logger.warn("getProject: project not found", { id, companyId });
        return res.status(404).json({ error: "Project not found" });
      }

      logger.info(
        "ProjectController: getProject: project fetched successfully",
        {
          id,
          companyId,
          project,
        },
      );

      return res.json(project);
    } catch (error) {
      logger.error("ProjectController: getProject: failed to fetch project", {
        id,
        companyId,
        error,
      });

      return res.status(500).json({ error: "Failed to fetch project" });
    }
  },

  async createProject(req: any, res: Response) {
    const companyId = req.user.company_id;

    const payload: CreateProjectDTO = {
      ...req.body,
      company_id: companyId,
    };

    try {
      logger.info("ProjectController: createProject: creating project", {
        companyId,
        payload,
      });

      const project = await ProjectService.create(payload);

      logger.info(
        "ProjectController: createProject: project created successfully",
        {
          companyId,
          projectId: project?.id,
        },
      );

      return res.status(201).json(project);
    } catch (error) {
      logger.error(
        "ProjectController: createProject: failed to create project",
        {
          companyId,
          payload,
          error,
        },
      );

      return res.status(500).json({ error: "Failed to create project" });
    }
  },

  async updateProject(req: any, res: Response) {
    const { id } = req.params;
    const companyId = req.user.company_id;

    const payload: UpdateProjectDTO = req.body;

    try {
      logger.info("ProjectController: updateProject: updating project", {
        id,
        companyId,
        payload,
      });

      const updatedProject = await ProjectService.update(
        id,
        companyId,
        payload,
      );

      if (!updatedProject) {
        logger.warn("ProjectController: updateProject: project not found", {
          id,
          companyId,
        });
        return res.status(404).json({ error: "Project not found" });
      }

      logger.info("updateProject: project updated successfully", {
        id,
        companyId,
      });

      return res.json(updatedProject);
    } catch (error) {
      logger.error(
        "ProjectController: updateProject: failed to update project",
        {
          id,
          companyId,
          payload,
          error,
        },
      );

      return res.status(500).json({ error: "Failed to update project" });
    }
  },

  async deleteProject(req: any, res: Response) {
    const { id } = req.params;
    const companyId = req.user.company_id;

    try {
      logger.info("ProjectController: deleteProject: deleting project", {
        id,
        companyId,
      });

      await ProjectService.deleteProjectById(id, companyId);

      logger.info("deleteProject: project deleted successfully", {
        id,
        companyId,
      });

      return res.json({ success: true });
    } catch (error) {
      logger.error(
        "ProjectController: deleteProject: failed to delete project",
        {
          id,
          companyId,
          error,
        },
      );

      return res.status(500).json({ error: "Failed to delete project" });
    }
  },
};
