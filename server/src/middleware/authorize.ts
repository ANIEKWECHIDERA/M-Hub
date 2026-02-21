import { Response, NextFunction, Request } from "express";
// import { AuthRequest } from "./authenticate";

export const authorize =
  (access: string[]) => (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !access.includes(req.user.access || "")) {
      return res.status(403).json({ error: "authorize: Unauthorized access" });
    }

    next();
  };
