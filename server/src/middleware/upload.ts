import multer from "multer";

export const upload = multer({
  limits: {
    files: 5,
    fileSize: 20 * 1024 * 1024, // 20MB
  },
});
