import type { Request } from "express";
import type { AppUser } from "./types";

export interface AuthenticatedRequest extends Request {
  user: AppUser;
}
