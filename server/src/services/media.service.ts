import { UploadApiResponse } from "cloudinary";
import streamifier from "streamifier";
import cloudinary from "../config/cloudinary";
import { logger } from "../utils/logger";

function sanitizeFolderSegment(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9-_]/g, "_");
}

export const MediaService = {
  async uploadImage(
    file: Express.Multer.File,
    folder: string,
    publicId?: string,
  ): Promise<UploadApiResponse> {
    logger.info("MediaService.uploadImage:start", {
      filename: file.originalname,
      folder,
      mimetype: file.mimetype,
    });

    const safeFolder = sanitizeFolderSegment(folder);
    const safePublicId = publicId ? sanitizeFolderSegment(publicId) : undefined;

    return new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          resource_type: "image",
          folder: `m-hub/${safeFolder}`,
          public_id: safePublicId,
          overwrite: Boolean(safePublicId),
          transformation: [{ width: 800, height: 800, crop: "limit" }],
        },
        (error, result) => {
          if (error) {
            logger.error("MediaService.uploadImage:error", { error });
            return reject(error);
          }

          if (!result) {
            return reject(new Error("Image upload failed"));
          }

          logger.info("MediaService.uploadImage:success", {
            secure_url: result.secure_url,
            public_id: result.public_id,
          });

          resolve(result);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(stream);
    });
  },
};
