import crypto from "crypto";
import { nanoid } from "nanoid";

export function generateInviteToken() {
  // return crypto.randomBytes(10).toString("hex");
  const token = nanoid(10);

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  return { token, hashedToken };
}
