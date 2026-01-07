import { Response } from "express";
import { AssetService } from "../services/asset.service";
import { logger } from "../utils/logger";

export const AssetController = {
  async upload(req: any, res: Response) {
    const companyId = req.user.company_id;
    const userId = req.user.id;
    const { project_id, task_id } = req.body;
    const files = req.files as Express.Multer.File[];

    logger.info("Asset.upload:start", {
      companyId,
      project_id,
      task_id,
      fileCount: files?.length,
    });

    if (!files || files.length === 0) {
      return res.status(400).json({ error: "At least one file is required" });
    }

    try {
      const assets = [];

      for (const file of files) {
        logger.info("Asset.upload:file", {
          originalname: file.originalname,
          size: file.size,
          type: file.mimetype,
        });

        const uploadResult = await AssetService.uploadToCloudinary(
          file,
          companyId
        );

        const asset = await AssetService.create({
          company_id: companyId,
          project_id,
          task_id,
          uploaded_by_id: userId,
          name: file.originalname,
          size: file.size.toString(),
          type: file.mimetype,
          url: uploadResult.secure_url,
        });

        assets.push(asset);
      }

      logger.info("Asset.upload:success", {
        companyId,
        project_id,
        createdCount: assets.length,
      });

      return res.status(201).json(assets);
    } catch (error) {
      logger.error("Asset.upload:error", { companyId, error });
      return res.status(500).json({ error: "Asset upload failed" });
    }
  },

  async getAll(req: any, res: Response) {
    const companyId = req.user.company_id;

    try {
      const assets = await AssetService.findAll(companyId);
      return res.json(assets);
    } catch (error) {
      logger.error("Asset.getAll:error", { companyId, error });
      return res.status(500).json({ error: "Failed to fetch assets" });
    }
  },

  async getById(req: any, res: Response) {
    const { id } = req.params;
    const companyId = req.user.company_id;

    try {
      const asset = await AssetService.findById(id, companyId);
      if (!asset) {
        return res.status(404).json({ error: "Asset not found" });
      }

      return res.json(asset);
    } catch (error) {
      logger.error("Asset.getById:error", { id, companyId, error });
      return res.status(500).json({ error: "Failed to fetch asset" });
    }
  },

  async getByProject(req: any, res: Response) {
    const companyId = req.user.company_id;
    const { projectId } = req.params;

    logger.info("Asset.getByProject:start", {
      companyId,
      projectId,
    });

    try {
      const assets = await AssetService.findByProject({
        companyId,
        projectId,
      });

      return res.json(assets);
    } catch (error) {
      logger.error("Asset.getByProject:error", {
        companyId,
        projectId,
        error,
      });

      return res.status(500).json({
        error: "Failed to fetch project assets",
      });
    }
  },

  async delete(req: any, res: Response) {
    const { id } = req.params;
    const companyId = req.user.company_id;

    try {
      await AssetService.deleteById(id, companyId);
      return res.json({ success: true });
    } catch (error) {
      logger.error("Asset.delete:error", { id, companyId, error });
      return res.status(500).json({ error: "Failed to delete asset" });
    }
  },
};
