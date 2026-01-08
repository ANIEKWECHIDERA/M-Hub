import { v2 as cloudinary } from "cloudinary";

export async function uploadUserAvatar(
  file: string,
  userId: string
): Promise<string> {
  const result = await cloudinary.uploader.upload(file, {
    folder: `M-hub/${userId}`,
    public_id: "avatar",
    overwrite: true,
    transformation: [
      { width: 300, height: 300, crop: "fill", gravity: "face" },
    ],
  });

  return result.secure_url;
}
