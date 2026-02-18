// src/controllers/company.controller.ts
import { Request, Response } from "express";
import { CompanyService } from "../services/company.service";
import { logger } from "../utils/logger";

export const CompanyController = {
  async getCompany(req: any, res: Response) {
    const companyId = req.user.company_id;

    try {
      const company = await CompanyService.findById(companyId);

      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      return res.json(company);
    } catch (error) {
      logger.error("getCompany failed", { error });
      return res.status(500).json({ error: "Failed to fetch company" });
    }
  },

  async createCompany(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const company = await CompanyService.create(req.body, req.user);
      return res.status(201).json(company);
    } catch (error) {
      logger.error("createCompany failed", { error });
      return res.status(500).json({ error: "Failed to create company" });
    }
  },

  async updateCompany(req: any, res: Response) {
    const companyId = req.user.company_id;

    try {
      const company = await CompanyService.update(companyId, req.body);

      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      return res.json(company);
    } catch (error) {
      logger.error("updateCompany failed", { error });
      return res.status(500).json({ error: "Failed to update company" });
    }
  },

  async deleteCompany(req: any, res: Response) {
    const companyId = req.user.company_id;

    try {
      await CompanyService.deleteById(companyId);
      return res.json({ success: true });
    } catch (error) {
      logger.error("deleteCompany failed", { error });
      return res.status(500).json({ error: "Failed to delete company" });
    }
  },
};
