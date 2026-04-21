import { Response, NextFunction, Request } from "express";
import { logger } from "../utils/logger";

export const authorize =
  (access: string[]) => (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.access || !access.includes(req.user.access || "")) {
      logger.warn("authorize: access denied", {
        path: req.originalUrl,
        method: req.method,
        currentAccess: req.user?.access ?? null,
        requiredAccess: access,
        userId: req.user?.id ?? req.user?.user_id ?? null,
      });

      return res.status(403).json({
        error: "You are not authorized to perform this action.",
        code: "FORBIDDEN_ACTION",
        requiredAccess: access.join(", "),
      });
    }

    next();
  };
