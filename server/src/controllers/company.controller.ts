// src/controllers/company.controller.ts
import { Request, Response } from "express";
import { CompanyService } from "../services/company.service";
import { MediaService } from "../services/media.service";
import { logger } from "../utils/logger";
import { sendPublicError } from "../utils/httpErrors";

export const CompanyController = {
  async getCompany(req: any, res: Response) {
    const companyId = req.user.company_id;

    try {
      const company = await CompanyService.findById(companyId);

      if (!company) {
        return sendPublicError(req, res, {
          status: 404,
          error: "Company not found",
          code: "COMPANY_NOT_FOUND",
        });
      }

      return res.json(company);
    } catch (error) {
      logger.error("getCompany failed", { error });
      return sendPublicError(req, res, {
        status: 500,
        error: "Failed to fetch company",
        code: "COMPANY_FETCH_FAILED",
      });
    }
  },

  async createCompany(req: Request, res: Response) {
    try {
      logger.info("CompanyController.createCompany: start", {
        user: req.user,
        body: req.body,
        file: req.file,
      });

      logger.info("Incoming request headers", {
        contentType: req.headers["content-type"],
      });

      if (!req.user) {
        return sendPublicError(req, res, {
          status: 401,
          error: "Unauthorized",
          code: "AUTH_REQUIRED",
        });
      }

      const payload = {
        ...req.body,
      };

      if (req.file) {
        const upload = await MediaService.uploadImage(
          req.file,
          `companies/${req.user.id ?? "new-company"}`,
          "logo",
        );
        payload.logoUrl = upload.secure_url;
      }

      const company = await CompanyService.create(req.user, payload);

      return res.status(201).json(company);
    } catch (error) {
      logger.error("CompanyController.createCompany failed", {
        error: error instanceof Error ? error.message : error,
      });
      return sendPublicError(req, res, {
        status: 500,
        error: "Failed to create company",
        code: "COMPANY_CREATE_FAILED",
      });
    }
  },

  async updateCompany(req: any, res: Response) {
    const companyId = req.user.company_id;

    try {
      const payload = {
        ...req.body,
      };

      if (req.file) {
        const upload = await MediaService.uploadImage(
          req.file,
          `companies/${companyId}`,
          "logo",
        );
        payload.logoUrl = upload.secure_url;
      }

      const company = await CompanyService.update(companyId, payload);

      if (!company) {
        return sendPublicError(req, res, {
          status: 404,
          error: "Company not found",
          code: "COMPANY_NOT_FOUND",
        });
      }

      return res.json(company);
    } catch (error) {
      logger.error("updateCompany failed", {
        error: error instanceof Error ? error.message : error,
      });
      return sendPublicError(req, res, {
        status: 500,
        error: "Failed to update company",
        code: "COMPANY_UPDATE_FAILED",
      });
    }
  },

  async deleteCompany(req: any, res: Response) {
    const companyId = req.user.company_id;

    try {
      await CompanyService.deleteById(companyId);
      return res.json({ success: true });
    } catch (error) {
      logger.error("deleteCompany failed", { error });
      if (error instanceof Error && error.message === "Company not found") {
        return sendPublicError(req, res, {
          status: 404,
          error: "Company not found",
          code: "COMPANY_NOT_FOUND",
        });
      }
      return sendPublicError(req, res, {
        status: 500,
        error: "Failed to delete company",
        code: "COMPANY_DELETE_FAILED",
      });
    }
  },
};
