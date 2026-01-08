import cloudinary from "../config/cloudinary";
import { supabaseAdmin } from "../config/supabaseClient";
import { CreateAssetDTO } from "../types/asset.types";
import { logger } from "../utils/logger";

export const AssetService = {
  async uploadToCloudinary(file: Express.Multer.File, companyId: string) {
    logger.info("Asset.uploadToCloudinary:start", {
      companyId,
      filename: file.originalname,
    });

    const result = await cloudinary.uploader.upload(
      file.buffer.toString("base64"),
      {
        resource_type: "auto",
        folder: `m-hub/${companyId}`,
      }
    );

    logger.info("Asset.uploadToCloudinary:success", {
      public_id: result.public_id,
    });

    return result;
  },

  async create(payload: CreateAssetDTO) {
    logger.info("Asset.create:start", {
      company_id: payload.company_id,
      project_id: payload.project_id,
    });

    const { data, error } = await supabaseAdmin
      .from("assets")
      .insert(payload)
      .select()
      .single();

    if (error) {
      logger.error("Asset.create:error", { payload, error });
      throw error;
    }

    return data;
  },

  async findAll(companyId: string) {
    logger.info("Asset.findAll:start", { companyId });

    const { data, error } = await supabaseAdmin
      .from("assets")
      .select("*")
      .eq("company_id", companyId)
      .order("upload_date", { ascending: false });

    if (error) {
      logger.error("Asset.findAll:error", { companyId, error });
      throw error;
    }

    return data ?? [];
  },

  async findById(id: string, companyId: string) {
    logger.info("Asset.findById:start", { id, companyId });

    const { data, error } = await supabaseAdmin
      .from("assets")
      .select("*")
      .eq("id", id)
      .eq("company_id", companyId)
      .maybeSingle();

    if (error) {
      logger.error("Asset.findById:error", { id, companyId, error });
      throw error;
    }

    return data;
  },

  async findByProject({
    companyId,
    projectId,
  }: {
    companyId: string;
    projectId: string;
  }) {
    logger.info("Asset.findByProject:start", {
      companyId,
      projectId,
    });

    const { data, error } = await supabaseAdmin
      .from("assets")
      .select("*")
      .eq("company_id", companyId)
      .eq("project_id", projectId)
      .order("upload_date", { ascending: false });

    if (error) {
      logger.error("Asset.findByProject:error", {
        companyId,
        projectId,
        error,
      });
      throw error;
    }

    return data ?? [];
  },

  async deleteById(id: string, companyId: string) {
    logger.info("Asset.delete:start", { id, companyId });

    const { error } = await supabaseAdmin
      .from("assets")
      .delete()
      .eq("id", id)
      .eq("company_id", companyId);

    if (error) {
      logger.error("Asset.delete:error", { id, companyId, error });
      throw error;
    }
  },
};
