import { Response, NextFunction } from "express";
import { AuthRequest } from "./authenticate";

export const authorize =
  (roles: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role || "")) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
