import path from "path";
import multer from "multer";
import { AppHttpError } from "../utils/httpErrors";

type UploadPreset = {
  allowedMimeTypes: Record<string, readonly string[]>;
  maxFileSizeBytes: number;
  maxFiles: number;
  label: string;
};

const BLOCKED_MIME_TYPES = new Set([
  "image/svg+xml",
  "text/html",
  "application/javascript",
  "text/javascript",
  "application/x-msdownload",
  "application/x-sh",
]);

function buildUpload(preset: UploadPreset) {
  return multer({
    storage: multer.memoryStorage(),
    limits: {
      files: preset.maxFiles,
      fileSize: preset.maxFileSizeBytes,
    },
    fileFilter: (_req, file, callback) => {
      const extension = path.extname(file.originalname || "").toLowerCase();

      if (BLOCKED_MIME_TYPES.has(file.mimetype)) {
        callback(
          new AppHttpError(
            400,
            "UPLOAD_TYPE_BLOCKED",
            "This file type is not allowed.",
            {
              details: {
                fileName: file.originalname,
                mimeType: file.mimetype,
                reason: "blocked_type",
              },
            },
          ),
        );
        return;
      }

      const allowedExtensions = preset.allowedMimeTypes[file.mimetype];
      if (!allowedExtensions) {
        callback(
          new AppHttpError(
            400,
            "UPLOAD_TYPE_NOT_ALLOWED",
            `${preset.label} type is not allowed.`,
            {
              details: {
                fileName: file.originalname,
                mimeType: file.mimetype,
                allowedMimeTypes: Object.keys(preset.allowedMimeTypes),
              },
            },
          ),
        );
        return;
      }

      if (!allowedExtensions.includes(extension)) {
        callback(
          new AppHttpError(
            400,
            "UPLOAD_EXTENSION_MISMATCH",
            `${preset.label} extension does not match its file type.`,
            {
              details: {
                fileName: file.originalname,
                mimeType: file.mimetype,
                extension,
              },
            },
          ),
        );
        return;
      }

      callback(null, true);
    },
  });
}

const safeImageMimeTypes = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
} as const;

const safeAssetMimeTypes = {
  ...safeImageMimeTypes,
  "image/gif": [".gif"],
  "application/pdf": [".pdf"],
  "text/plain": [".txt"],
  "text/csv": [".csv"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    ".docx",
  ],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    ".xlsx",
  ],
  "application/vnd.ms-powerpoint": [".ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    [".pptx"],
} as const;

export const avatarUpload = buildUpload({
  allowedMimeTypes: safeImageMimeTypes,
  maxFileSizeBytes: 5 * 1024 * 1024,
  maxFiles: 1,
  label: "Avatar image",
});

export const workspaceLogoUpload = buildUpload({
  allowedMimeTypes: safeImageMimeTypes,
  maxFileSizeBytes: 5 * 1024 * 1024,
  maxFiles: 1,
  label: "Workspace logo",
});

export const assetUpload = buildUpload({
  allowedMimeTypes: safeAssetMimeTypes,
  maxFileSizeBytes: 20 * 1024 * 1024,
  maxFiles: 5,
  label: "Asset",
});
