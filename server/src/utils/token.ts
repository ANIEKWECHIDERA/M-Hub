import crypto from "crypto";
import { nanoid } from "nanoid";

export function generateInviteToken() {
  // return crypto.randomBytes(10).toString("hex");
  return nanoid(10);
}
