import { AppUser } from "./types";

declare global {
  namespace Express {
    interface Request {
      user?: AppUser;
    }
  }
}

export {};
