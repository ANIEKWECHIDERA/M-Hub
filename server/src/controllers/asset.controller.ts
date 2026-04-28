import { Response } from "express";
import { AssetService } from "../services/asset.service";
import { NotificationService } from "../services/notification.service";
import { logger } from "../utils/logger";
import { sendPublicError } from "../utils/httpErrors";

export const AssetController = {
  async upload(req: any, res: Response) {
    const companyId = req.user.company_id;
    const userId = req.user.user_id;
    const { project_id, task_id } = req.body;
    const files = req.files as Express.Multer.File[];

    logger.info("Asset.upload:start", {
      companyId,
      project_id,
      task_id,
      fileCount: files?.length,
    });

    if (!files || files.length === 0) {
      return sendPublicError(req, res, {
        status: 400,
        error: "At least one file is required",
        code: "FILES_REQUIRED",
      });
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

      if (assets.length > 0 && project_id) {
        await NotificationService.createAssetUploadNotifications({
          companyId,
          projectId: project_id,
          actorUserId: userId,
          fileCount: assets.length,
        });
      }

      return res.status(201).json(assets);
    } catch (error) {
      logger.error("Asset.upload:error", { companyId, error });
      return sendPublicError(req, res, {
        status: 500,
        error: "Asset upload failed",
        code: "ASSET_UPLOAD_FAILED",
      });
    }
  },

  async getAll(req: any, res: Response) {
    const companyId = req.user.company_id;

    try {
      const assets = await AssetService.findAll(companyId);
      return res.json(assets);
    } catch (error) {
      logger.error("Asset.getAll:error", { companyId, error });
      return sendPublicError(req, res, {
        status: 500,
        error: "Failed to fetch assets",
        code: "ASSET_LIST_FAILED",
      });
    }
  },

  async getById(req: any, res: Response) {
    const { id } = req.params;
    const companyId = req.user.company_id;

    try {
      const asset = await AssetService.findById(id, companyId);
      if (!asset) {
        return sendPublicError(req, res, {
          status: 404,
          error: "Asset not found",
          code: "ASSET_NOT_FOUND",
        });
      }

      return res.json(asset);
    } catch (error) {
      logger.error("Asset.getById:error", { id, companyId, error });
      return sendPublicError(req, res, {
        status: 500,
        error: "Failed to fetch asset",
        code: "ASSET_FETCH_FAILED",
      });
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

      return sendPublicError(req, res, {
        status: 500,
        error: "Failed to fetch project assets",
        code: "PROJECT_ASSET_FETCH_FAILED",
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
      return sendPublicError(req, res, {
        status: 500,
        error: "Failed to delete asset",
        code: "ASSET_DELETE_FAILED",
      });
    }
  },
};
