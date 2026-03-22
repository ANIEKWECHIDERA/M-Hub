const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const DEFAULT_MAX_SIZE_MB = 5;

type PrepareImageUploadOptions = {
  maxSizeMB?: number;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
};

export function validateImageFile(
  file: File,
  { maxSizeMB = DEFAULT_MAX_SIZE_MB }: PrepareImageUploadOptions = {},
) {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Please upload a JPG, PNG, or WebP image.");
  }

  if (file.size > maxSizeMB * 1024 * 1024) {
    throw new Error(`Please upload an image smaller than ${maxSizeMB}MB.`);
  }
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to read the selected image."));
    };

    image.src = objectUrl;
  });
}

export async function prepareImageUpload(
  file: File,
  {
    maxSizeMB = DEFAULT_MAX_SIZE_MB,
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.82,
  }: PrepareImageUploadOptions = {},
) {
  validateImageFile(file, { maxSizeMB });

  const image = await loadImage(file);
  const widthRatio = maxWidth / image.width;
  const heightRatio = maxHeight / image.height;
  const ratio = Math.min(1, widthRatio, heightRatio);
  const targetWidth = Math.round(image.width * ratio);
  const targetHeight = Math.round(image.height * ratio);

  if (
    ratio === 1 &&
    file.size <= maxSizeMB * 1024 * 1024 * 0.75 &&
    file.type !== "image/png"
  ) {
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Image compression is not supported in this browser.");
  }

  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (nextBlob) => {
        if (!nextBlob) {
          reject(new Error("Failed to process the selected image."));
          return;
        }

        resolve(nextBlob);
      },
      "image/jpeg",
      quality,
    );
  });

  return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}
