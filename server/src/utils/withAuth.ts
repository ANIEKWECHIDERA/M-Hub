import { Request, Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types/express";
import { AppUser } from "../types/types";

declare global {
  namespace Express {
    interface Request {
      user?: AppUser;
    }
  }
}

export function withAuth(
  handler: (req: AuthenticatedRequest, res: Response) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    return handler(req as AuthenticatedRequest, res).catch(next);
  };
}
