// src/types/express.ts
import { Request } from "express";
import { AppUser } from "./types";

export interface AuthenticatedRequest extends Request {
  user: AppUser;
}
