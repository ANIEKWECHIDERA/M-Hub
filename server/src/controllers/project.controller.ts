import { Request, Response } from "express";
import { ProjectService } from "../services/project.service";
import { EmailNotificationService } from "../services/emailNotification.service";
import { CreateProjectDTO, UpdateProjectDTO } from "../types/project.types";
import { logger } from "../utils/logger";

export const ProjectController = {
  async getProjects(req: Request, res: Response) {
    if (!req.user?.company_id) {
      logger.error("ProjectController: Missing company_id on request", {
        userId: req.user?.id ?? null,
        firebaseUid: req.user?.firebase_uid ?? req.user?.uid ?? null,
      });
      return res.status(401).json({ error: "Unauthorized" });
    }

    const companyId = req.user.company_id;

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
    const rawClientId = String(req.body?.client_id ?? "").trim();
    const isUuid =
      !rawClientId ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        rawClientId,
      );

    const payload: CreateProjectDTO = {
      ...req.body,
      company_id: companyId,
      client_id: isUuid ? rawClientId || undefined : undefined,
      client:
        !isUuid && rawClientId
          ? {
              name: rawClientId,
            }
          : req.body?.client,
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
    const rawClientId = String(req.body?.client_id ?? "").trim();
    const isUuid =
      !rawClientId ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        rawClientId,
      );

    const payload: UpdateProjectDTO & {
      client?: { name: string };
    } = {
      ...req.body,
      client_id: isUuid ? rawClientId || undefined : undefined,
      client:
        !isUuid && rawClientId
          ? {
              name: rawClientId,
            }
          : req.body?.client,
    };

    try {
      logger.info("ProjectController: updateProject: updating project", {
        id,
        companyId,
        payload,
      });

      const previousProject = await ProjectService.findById(id, companyId);
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

      const changedFields = Object.keys(payload).filter(
        (key) => payload[key as keyof typeof payload] !== undefined,
      );

      if (previousProject && updatedProject && changedFields.length > 0) {
        void EmailNotificationService.sendProjectUpdateEmails({
          companyId,
          projectId: id,
          actorUserId: req.user.user_id,
          previousProject: {
            title: previousProject.title,
            status: previousProject.status,
            deadline: previousProject.deadline,
            clientName: previousProject.client?.name ?? null,
          },
          updatedProject: {
            title: updatedProject.title,
            status: updatedProject.status,
            deadline: updatedProject.deadline,
            clientName: updatedProject.client?.name ?? null,
          },
          changedFields,
        }).catch((error: any) => {
          logger.error("ProjectController.updateProject: project update email failed", {
            id,
            companyId,
            error: error.message,
          });
        });
      }

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
